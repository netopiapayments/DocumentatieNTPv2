import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '../bin/netopia.js');
const SIG = 'ABCD-EFGH-IJKL-MNOP-QRST';

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'netopia-cli-'));
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), typeof c === 'string' ? c : JSON.stringify(c));
  }
  return dir;
}

function run(cwd, args = []) {
  const r = spawnSync(process.execPath, [BIN, 'init', '--yes', '--no-install', ...args], {
    cwd, encoding: 'utf8',
    env: { ...process.env, NETOPIA_API_KEY: 'secret-key-123', NETOPIA_POS_SIGNATURE: SIG, NETOPIA_POS_ID: '42', NO_COLOR: '1' },
  });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.ok(!r.stdout.includes('secret-key-123'), 'cheia API nu trebuie afișată');
  return r.stdout;
}

const read = (d, p) => readFileSync(join(d, p), 'utf8');

test('Express ESM: generează routerul și îl montează înainte de express.json()', () => {
  const d = project({
    'package.json': { type: 'module', dependencies: { express: '^5' } },
    'server.js': "import express from 'express';\nimport cors from 'cors';\n\nconst app = express();\napp.use(express.json());\napp.listen(3000);\n",
  });
  run(d, ['--app-url', 'https://shop.ro']);
  const server = read(d, 'server.js');
  assert.match(server, /import netopiaRouter from '\.\/netopia\/router\.js';/);
  assert.ok(server.indexOf('app.use(netopiaRouter)') < server.indexOf('app.use(express.json())'));
  assert.ok(existsSync(join(d, 'netopia/hooks.js')));
  const env = read(d, '.env');
  assert.match(env, /NETOPIA_API_KEY=secret-key-123/);
  assert.match(env, /NETOPIA_APP_URL=https:\/\/shop\.ro/);
  assert.match(env, /NETOPIA_SANDBOX=true/);
  assert.equal(statSync(join(d, '.env')).mode & 0o077, 0, '.env trebuie să fie privat');
  assert.match(read(d, '.gitignore'), /^\.env$/m);

  // A doua rulare nu dublează montarea și păstrează hook-urile.
  writeFileSync(join(d, 'netopia/hooks.js'), '// editat de comerciant\n');
  run(d, ['--force']);
  assert.equal(read(d, 'server.js').match(/app\.use\(netopiaRouter\)/g).length, 1);
  assert.equal(read(d, 'netopia/hooks.js'), '// editat de comerciant\n');
});

test('Express CommonJS în src/', () => {
  const d = project({
    'package.json': { main: 'src/index.js', dependencies: { express: '^4' } },
    'src/index.js': "const express = require('express');\nconst server = express();\nserver.use(express.json());\n",
  });
  run(d);
  const idx = read(d, 'src/index.js');
  assert.match(idx, /const netopiaRouter = require\('\.\/netopia\/router\.js'\);/);
  assert.match(idx, /server\.use\(netopiaRouter\)/);
  assert.match(read(d, 'src/netopia/router.js'), /module\.exports = router/);
  assert.match(read(d, 'src/netopia/hooks.js'), /module\.exports = \{ resolveOrder, onPaymentUpdate \}/);
});

test('Next.js App Router cu TypeScript', () => {
  const d = project({
    'package.json': { dependencies: { next: '^16', react: '^19' } },
    'tsconfig.json': '{}',
    'src/app/page.tsx': 'export default function P(){return null}',
    '.gitignore': '.env*.local\n',
  });
  run(d, ['--production', '--app-url', 'https://shop.ro']);
  for (const f of ['src/lib/netopia.ts', 'src/lib/netopia-hooks.ts', 'src/app/api/netopia/start/route.ts', 'src/app/api/netopia/notify/route.ts', 'src/app/netopia/return/page.tsx']) {
    assert.ok(existsSync(join(d, f)), f);
  }
  assert.match(read(d, '.env.local'), /NETOPIA_SANDBOX=false/);
  assert.equal(read(d, '.gitignore'), '.env*.local\n', '.gitignore deja acoperă .env.local');
  assert.match(read(d, 'src/app/api/netopia/notify/route.ts'), /await req\.text\(\)/);
});

test('fără framework: handlere generice; erori clare la date lipsă', () => {
  const d = project({ 'package.json': { name: 'x' } });
  run(d);
  assert.ok(existsSync(join(d, 'netopia/handlers.mjs')));
  assert.match(read(d, 'netopia/handlers.mjs'), /from '\.\/hooks\.mjs'/);

  const bad = spawnSync(process.execPath, [BIN, 'init', '--yes', '--no-install', '--pos-signature', 'gresit'], {
    cwd: d, encoding: 'utf8', env: { ...process.env, NETOPIA_API_KEY: 'k', NETOPIA_POS_SIGNATURE: '' },
  });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /Semnătura POS/);
});
