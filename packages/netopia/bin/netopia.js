#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { isValidPosSignature } from '../src/index.js';
import * as T from './templates.js';

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8')).version;

const c = process.stdout.isTTY && !process.env.NO_COLOR
  ? { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` }
  : { g: String, y: String, r: String, b: String, d: String };
const ok = (m) => console.log(`${c.g('✓')} ${m}`);
const warn = (m) => console.log(`${c.y('!')} ${m}`);
const fail = (m) => { console.error(`${c.r('✗')} ${m}`); process.exit(1); };

const HELP = `netopia ${VERSION}

Utilizare:
  npx netopia init [opțiuni]    Integrează NETOPIA în proiectul curent
  npx netopia skill             Instalează skill-ul pentru agenți AI în .claude/skills/
  npx netopia --help

Opțiuni init:
  --api-key <cheie>          Cheia API (sau variabila NETOPIA_API_KEY; recomandat, nu rămâne în istoric)
  --pos-signature <XXXX-…>   Semnătura POS (sau NETOPIA_POS_SIGNATURE)
  --pos-id <id>              POS ID (sau NETOPIA_POS_ID)
  --production               Mediul Producție (implicit: Sandbox)
  --app-url <url>            URL-ul public al aplicației (pentru notifyUrl / redirectUrl)
  --framework <next|express|node>   Suprascrie detectarea automată
  --package <spec>           Ce se instalează (implicit: netopia@^${VERSION}); ex. o cale locală
  --no-install               Nu rula instalarea pachetului
  --no-mount                 (Express) nu modifica fișierul aplicației
  --force                    Suprascrie fișierele generate (nu și pe cele cu hook-uri)
  --yes, -y                  Fără întrebări; folosește valorile din opțiuni / mediu
`;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-y') { out.yes = true; continue; }
    if (a === '-h') { out.help = true; continue; }
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [k, inline] = a.slice(2).split(/=(.*)/s);
    const key = k.replace(/-([a-z])/g, (_, x) => x.toUpperCase());
    if (key.startsWith('no') && key.length > 2 && inline === undefined) { out[key[2].toLowerCase() + key.slice(3)] = false; continue; }
    const BOOL = new Set(['production', 'force', 'yes', 'help', 'sandbox']);
    if (BOOL.has(key)) { out[key] = inline === undefined ? true : inline !== 'false'; continue; }
    out[key] = inline ?? argv[++i];
  }
  return out;
}

let rl;
const getRl = () => (rl ??= createInterface({ input: process.stdin, output: process.stdout, terminal: true }));

function ask(question, { def, secret } = {}) {
  return new Promise((res) => {
    const r = getRl();
    const q = `${c.b('?')} ${question}${def ? c.d(` (${def})`) : ''}: `;
    if (!secret) return r.question(q, (a) => res(a.trim() || def || ''));
    const orig = r._writeToOutput;
    r._writeToOutput = (s) => { if (s.startsWith(q)) orig.call(r, q); else if (s.includes('\n') || s.includes('\r')) orig.call(r, '\n'); else orig.call(r, '*'.repeat(s.length)); };
    r.question(q, (a) => { r._writeToOutput = orig; res(a.trim()); });
  });
}

function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return undefined; } }

function detect(root) {
  const pkg = readJson(join(root, 'package.json'));
  if (!pkg) fail('Nu găsesc package.json în directorul curent. Rulați comanda din rădăcina proiectului.');
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const esm = pkg.type === 'module';
  const ts = existsSync(join(root, 'tsconfig.json'));
  let framework = 'node';
  let appDir;
  if (deps.next) {
    appDir = ['src/app', 'app'].find((d) => existsSync(join(root, d)));
    framework = appDir ? 'next' : 'next-pages';
  } else if (deps.express) framework = 'express';
  const pm = existsSync(join(root, 'pnpm-lock.yaml')) ? 'pnpm'
    : existsSync(join(root, 'yarn.lock')) ? 'yarn'
    : existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock')) ? 'bun' : 'npm';
  return { pkg, deps, esm, ts, framework, appDir, pm };
}

function findExpressEntry(root, pkg) {
  const candidates = [pkg.main, 'app.js', 'server.js', 'index.js', 'src/app.js', 'src/server.js', 'src/index.js',
    'app.mjs', 'server.mjs', 'index.mjs', 'src/app.mjs', 'src/server.mjs', 'src/index.mjs',
    'app.ts', 'server.ts', 'index.ts', 'src/app.ts', 'src/server.ts', 'src/index.ts'].filter(Boolean);
  for (const f of [...new Set(candidates)]) {
    const p = join(root, f);
    if (existsSync(p) && /\b(\w+)\s*=\s*express\s*\(\s*\)/.test(readFileSync(p, 'utf8'))) return p;
  }
  return undefined;
}

function writeFile(root, rel, content, { force, keep, created }) {
  const p = join(root, rel);
  if (existsSync(p) && (keep || !force)) { warn(`${rel} există — ${keep ? 'păstrat (hook-uri)' : 'neatins (folosiți --force)'}`); return false; }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  created.push(rel);
  return true;
}

function upsertEnv(file, values) {
  let text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${/[\s#"']/.test(v) ? JSON.stringify(v) : v}`;
    const re = new RegExp(`^${k}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`;
  }
  writeFileSync(file, text, { mode: 0o600 });
}

function ensureGitignored(root, name) {
  const gi = join(root, '.gitignore');
  const text = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const covered = lines.some((l) => l === name || l === `/${name}` || l === '.env*' || (name.startsWith('.env') && l === '.env*.local' && name.endsWith('.local')));
  if (!covered) { writeFileSync(gi, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${name}\n`); ok(`${name} adăugat în .gitignore`); }
}

function mountExpress(entry, { esm, ts, routerRel }) {
  let src = readFileSync(entry, 'utf8');
  if (src.includes('netopia')) { warn(`${relative(process.cwd(), entry)} menționează deja netopia — nu îl modific`); return false; }
  const m = src.match(/^.*\b(\w+)\s*=\s*express\s*\(\s*\)\s*;?.*$/m);
  if (!m) return false;
  const appVar = m[1];
  const fileEsm = esm || /\.mjs$/.test(entry) || ts || /^\s*import\s/m.test(src);
  const importLine = fileEsm ? `import netopiaRouter from '${routerRel}';\n` : `const netopiaRouter = require('${routerRel}');\n`;
  src = src.replace(m[0], `${m[0]}\n${appVar}.use(netopiaRouter); // NETOPIA: /api/netopia/start, /api/netopia/notify, /netopia/return`);
  const lines = src.split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(import\s.+from\s|import\s+['"]|const\s.+=\s*require\()/.test(lines[i])) last = i;
    else if (last >= 0 && lines[i].trim() && !/^\s*(\/\/|\*|\/\*)/.test(lines[i])) break;
  }
  lines.splice(last + 1, 0, importLine.trimEnd());
  writeFileSync(entry, lines.join('\n'));
  return true;
}

async function init(args) {
  const root = process.cwd();
  const proj = detect(root);
  const framework = args.framework ?? (proj.framework === 'next-pages' ? 'node' : proj.framework);
  if (proj.framework === 'next-pages' && !args.framework) warn('Next.js cu Pages Router: generez handlere generice (node). Pentru rute gata făcute folosiți App Router.');
  if (!['next', 'express', 'node'].includes(framework)) fail(`Framework necunoscut: ${framework}`);
  console.log(`\n${c.b('NETOPIA')} — integrare plăți card ${c.d(`(detectat: ${framework}${proj.ts ? ', TypeScript' : ''})`)}\n`);

  const interactive = !args.yes && process.stdin.isTTY;
  const env = process.env;
  let apiKey = args.apiKey ?? env.NETOPIA_API_KEY;
  let posSignature = args.posSignature ?? env.NETOPIA_POS_SIGNATURE;
  let posID = args.posId ?? env.NETOPIA_POS_ID;
  const sandbox = args.production ? false : args.sandbox ?? (env.NETOPIA_SANDBOX ? env.NETOPIA_SANDBOX !== 'false' : true);
  let appUrl = args.appUrl ?? env.NETOPIA_APP_URL ?? env.APP_URL;
  const envLabel = sandbox ? 'Sandbox' : 'Producție';

  if (interactive) {
    apiKey ||= await ask(`Cheia API (${envLabel})`, { secret: true });
    while (!isValidPosSignature(posSignature ?? '')) {
      if (posSignature) warn('Format așteptat: XXXX-XXXX-XXXX-XXXX-XXXX');
      posSignature = await ask('Semnătura POS');
    }
    posID ||= await ask('POS ID (pentru status / expirare; Enter pentru mai târziu)');
    appUrl ||= await ask('URL-ul public al aplicației', { def: 'http://localhost:3000' });
    rl?.close();
  }
  appUrl ||= 'http://localhost:3000';
  if (!apiKey) fail('Lipsește cheia API: --api-key sau NETOPIA_API_KEY');
  if (!posSignature) fail('Lipsește semnătura POS: --pos-signature sau NETOPIA_POS_SIGNATURE');
  if (!isValidPosSignature(posSignature)) fail('Semnătura POS are alt format decât XXXX-XXXX-XXXX-XXXX-XXXX');
  if (!/^https?:\/\//.test(appUrl)) fail('--app-url trebuie să înceapă cu http:// sau https://');
  appUrl = appUrl.replace(/\/+$/, '');

  const envFile = framework === 'next' ? '.env.local' : '.env';
  upsertEnv(join(root, envFile), {
    NETOPIA_API_KEY: apiKey.trim(),
    NETOPIA_POS_SIGNATURE: posSignature.trim(),
    ...(posID ? { NETOPIA_POS_ID: String(posID).trim() } : {}),
    NETOPIA_SANDBOX: String(sandbox),
    NETOPIA_APP_URL: appUrl,
  });
  ok(`${envFile} actualizat (cheia API nu este afișată)`);
  ensureGitignored(root, envFile);

  if (args.install !== false) {
    const spec = args.package ?? `netopia@^${VERSION}`;
    const cmd = proj.pm === 'npm' ? ['install', spec] : ['add', spec];
    console.log(c.d(`  $ ${proj.pm} ${cmd.join(' ')}`));
    const r = spawnSync(proj.pm, cmd, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) fail(`Instalarea a eșuat (${proj.pm} ${cmd.join(' ')}). Rulați-o manual sau folosiți --package <cale locală>.`);
    ok(`pachetul netopia instalat`);
  }

  const created = [];
  const opts = { force: !!args.force, created };
  if (framework === 'next') {
    const base = proj.appDir.replace(/app$/, '');
    const ext = proj.ts ? 'ts' : 'js';
    const t = { ts: proj.ts };
    writeFile(root, `${base}lib/netopia.${ext}`, T.nextLib(t), opts);
    writeFile(root, `${base}lib/netopia-hooks.${ext}`, T.nextHooks(t), { ...opts, keep: existsSync(join(root, `${base}lib/netopia-hooks.${ext}`)) });
    writeFile(root, `${proj.appDir}/api/netopia/start/route.${ext}`, T.nextStartRoute(t), opts);
    writeFile(root, `${proj.appDir}/api/netopia/notify/route.${ext}`, T.nextNotifyRoute(t), opts);
    writeFile(root, `${proj.appDir}/netopia/return/page.${ext}x`, T.nextReturnPage(t), opts);
  } else if (framework === 'express') {
    const dir = existsSync(join(root, 'src')) ? 'src/netopia' : 'netopia';
    const esm = proj.esm;
    writeFile(root, `${dir}/router.js`, T.expressRouter({ esm }), opts);
    const hooks = `${dir}/hooks.js`;
    writeFile(root, hooks, T.expressHooks({ esm }), { ...opts, keep: existsSync(join(root, hooks)) });
    if (args.mount !== false) {
      const entry = findExpressEntry(root, proj.pkg);
      let rel = entry && relative(dirname(entry), join(root, dir, 'router.js')).replace(/\\/g, '/');
      if (rel && !rel.startsWith('.')) rel = `./${rel}`;
      if (entry && mountExpress(entry, { esm, ts: /\.ts$/.test(entry), routerRel: rel })) ok(`router montat în ${relative(root, entry)}`);
      else warn(`Nu am putut monta automat routerul. Adăugați imediat după \`const app = express()\`:\n    app.use(${esm ? `(await import('./${dir}/router.js')).default` : `require('./${dir}/router.js')`});`);
    }
  } else {
    const dir = existsSync(join(root, 'src')) ? 'src/netopia' : 'netopia';
    const ext = proj.esm ? 'js' : 'mjs';
    writeFile(root, `${dir}/handlers.${ext}`, T.plainHandlers().replace('./hooks.js', `./hooks.${ext}`), opts);
    const hooks = `${dir}/hooks.${ext}`;
    writeFile(root, hooks, T.expressHooks({ esm: true }), { ...opts, keep: existsSync(join(root, hooks)) });
    warn(`Legați handleStart / handleNotify din ${dir}/handlers.${ext} la rutele serverului (vezi comentariul din fișier).`);
  }
  created.forEach((f) => ok(f));

  const local = /localhost|127\.0\.0\.1/.test(appUrl);
  console.log(`
${c.b('Gata.')} Mediu: ${envLabel}

  Frontend:  POST /api/netopia/start  { "amount": 1 }  →  redirect la răspuns.paymentURL
  IPN:       ${appUrl}/api/netopia/notify
  Revenire:  ${appUrl}/netopia/return

${c.b('Următorii pași')}
  1. Implementați resolveOrder (suma calculată pe server) și onPaymentUpdate (salvare ntpID / token) în fișierul cu hook-uri.
${local ? `  2. NETOPIA nu poate trimite IPN la localhost: expuneți aplicația (ex. \`cloudflared tunnel --url ${appUrl}\`) și rulați din nou cu --app-url <url public>.\n` : ''}  ${local ? 3 : 2}. ${sandbox ? 'Test în Sandbox: card 9900 0048 1022 5098, orice dată viitoare, CVV 111.' : 'Producție: acceptați IPN doar de la 217.156.103.68 și folosiți HTTPS.'}
`);
}

function installSkill() {
  const dest = join(process.cwd(), '.claude', 'skills', 'netopia-integration');
  cpSync(join(PKG_DIR, 'skill', 'netopia-integration'), dest, { recursive: true });
  ok(`skill instalat în ${relative(process.cwd(), dest)}`);
  console.log(c.d('  Cereți agentului: „integrează plățile NETOPIA”.'));
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
if (args.help || !cmd || cmd === 'help') console.log(HELP);
else if (args.version || cmd === 'version') console.log(VERSION);
else if (cmd === 'init') await init(args);
else if (cmd === 'skill') installSkill();
else fail(`Comandă necunoscută: ${cmd}\n\n${HELP}`);
