/**
 * Vite plugin: turns the integration guide (Markdown) into the data the site renders.
 *
 * The Markdown file is the single source of truth. Everything shown on the site —
 * navigation, metadata, examples that can be run, search index — is derived from it
 * at build time, so editing the .md on GitHub and pushing is enough to update the site.
 *
 * Runnable examples are detected automatically (JSON request bodies, with the endpoint
 * taken from the surrounding section). Authors can override detection by placing an
 * HTML comment right before a code block:
 *   <!-- try: /operation/credit -->   force an example to call this endpoint
 *   <!-- try: off -->                 never make this block runnable
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';
import MarkdownIt from 'markdown-it';
import JSON5 from 'json5';
import { createHighlighter, type Highlighter } from 'shiki';

const VIRTUAL_ID = 'virtual:netopia-docs';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const THEME = 'github-dark-default';
const NO_SANDBOX_RE = /nu\s+(?:este|e|poate\s+fi)\s+(?:disponibil\w*|testat\w*|utilizat\w*)\s+(?:[îi]n\s+)?(?:mediul\s+)?sandbox|sandbox\s*:\s*indisponibil/i;
const ENDPOINT_RE = /\/(payment\/card\/start|operation\/(?:credit|expire|status)|disbursement\/card\/auth)\b/;

export interface DocsOptions {
  /** Path to the Markdown source, relative to the project root. */
  source: string;
}

export function netopiaDocs(options: DocsOptions): Plugin {
  const file = path.resolve(options.source);
  let highlighter: Highlighter | undefined;

  return {
    name: 'netopia-docs',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return;
      this.addWatchFile(file);
      highlighter ??= await createHighlighter({
        themes: [THEME],
        langs: ['json', 'jsonc', 'javascript', 'typescript', 'bash', 'php', 'python', 'html', 'xml', 'http'],
      });
      const raw = fs.readFileSync(file, 'utf8');
      const data = buildDocs(raw, highlighter, options.source);
      return `export default ${JSON.stringify(data)};`;
    },
    handleHotUpdate(ctx) {
      if (path.resolve(ctx.file) !== file) return;
      const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) ctx.server.moduleGraph.invalidateModule(mod);
      ctx.server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

/* ------------------------------------------------------------------ */

interface TocItem { id: string; level: number; num: string; title: string }
interface Example { id: number; path: string; title: string; subtitle: string; section: string; body: string; sandbox: boolean }
interface SearchEntry { id: string; title: string; section: string; text: string }
interface SectionCard { id: string; num: string; title: string; summary: string }

function buildDocs(raw: string, hl: Highlighter, sourceName: string) {
  const src = fixLooseBold(raw.replace(/\r\n?/g, '\n'));
  const { meta, body } = splitPreamble(src);

  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
  const env: Record<string, unknown> = {};
  const tokens = md.parse(body, env);

  /* Pass 1 — headings get stable ids, collected for the navigation. */
  const used = new Map<string, number>();
  const headings: TocItem[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'heading_open') continue;
    const level = Number(t.tag.slice(1));
    const text = inlineText(tokens[i + 1]);
    const id = uniqueSlug(text, used);
    const { num, title } = splitNumber(text);
    t.attrSet('id', id);
    t.meta = { id, level };
    headings.push({ id, level, num, title });
  }

  /* Pass 2 — links, runnable examples, search index, section summaries. */
  const examples: Example[] = [];
  const search: SearchEntry[] = [];
  const summaries = new Map<string, string>();
  const cellSummaries = new Map<string, string>();
  let h2: TocItem | undefined;
  let h3: TocItem | undefined;
  let endpoint: string | null = null;
  let label = '';
  let override: string | undefined;
  // Set when the current section says the feature is not available in Sandbox (e.g. Money Send).
  let noSandbox = false;
  let entry: SearchEntry | undefined;
  let hIndex = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t.type === 'heading_open') {
      const h = headings[hIndex++];
      if (h.level <= 3) { endpoint = null; noSandbox = false; }
      label = h.level >= 4 ? h.title : '';
      if (h.level === 2) { h2 = h; h3 = undefined; }
      if (h.level === 3) h3 = h;
      entry = { id: h.id, title: h.title, section: h2 && h2 !== h ? `${h2.num ? h2.num + '. ' : ''}${h2.title}` : '', text: '' };
      search.push(entry);
    }

    if (t.type === 'inline') {
      rewriteLinks(t, headings);
      const text = inlineText(t);
      const m = text.match(ENDPOINT_RE);
      if (m) endpoint = '/' + m[1];
      if (NO_SANDBOX_RE.test(text)) noSandbox = true;
      const inParagraph = tokens[i - 1]?.type === 'paragraph_open';
      if (inParagraph) label = text;
      if (entry && tokens[i - 1]?.type !== 'heading_open') entry.text += ' ' + text;
      if (inParagraph && h2 && !h3 && !summaries.has(h2.id) && text.length > 30) summaries.set(h2.id, text);
      if (tokens[i - 1]?.type === 'td_open' && h2 && !cellSummaries.has(h2.id) && text.length > 40) cellSummaries.set(h2.id, text);
    }

    if (t.type === 'html_block') {
      const m = t.content.match(/<!--\s*try:\s*(.+?)\s*-->/i);
      if (m) override = m[1].trim();
    }

    if (t.type === 'fence') {
      const lang = (t.info || '').trim().split(/\s+/)[0].toLowerCase() || 'text';
      let example: Example | null = null;

      if ((lang === 'json' || lang === 'jsonc' || lang === 'json5') && override !== 'off') {
        let parsed: any;
        try { parsed = JSON5.parse(t.content); } catch { parsed = undefined; }
        const looksLikeResponse =
          /r[ăa]spuns|response|primit|received/i.test(label) ||
          (parsed && (parsed.customerAction || parsed.payment?.paymentURL || parsed.error || parsed.errorCode !== undefined));
        const forced = override?.match(ENDPOINT_RE);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (forced || !looksLikeResponse)) {
          const ep = forced ? '/' + forced[1] : endpoint ?? (parsed.order || parsed.payment ? '/payment/card/start' : null);
          if (ep) {
            const cleanLabel = label.replace(/[:：]\s*$/, '').trim();
            const isEndpointLabel = /^endpoint/i.test(cleanLabel) || ENDPOINT_RE.test(cleanLabel);
            example = {
              id: examples.length,
              path: ep,
              title: ((h3 ?? h2)?.title ?? 'Request').replace(/\s*\(\/[^)]*\)\s*$/, ''),
              subtitle: isEndpointLabel ? '' : cleanLabel,
              section: (h3 ?? h2)?.id ?? '',
              body: t.content.replace(/\s+$/, ''),
              sandbox: !noSandbox,
            };
            examples.push(example);
          }
        }
      }
      override = undefined;
      t.meta = { lang, example };
    }
  }

  for (const s of search) s.text = s.text.replace(/\s+/g, ' ').trim().slice(0, 700);

  /* Render. */
  installRenderRules(md, hl);
  let html = md.renderer.render(tokens, md.options, env);
  html += '</section>';

  // Single-letter H3s (glossary "A", "B", …) stay linkable but don't clutter the navigation.
  const toc = headings.filter((h) => h.level === 2 || (h.level === 3 && h.title.length > 2));
  const cards: SectionCard[] = toc
    .filter((h) => h.level === 2)
    .map((h) => {
      const children = toc.filter((c) => c.level === 3 && isChildOf(toc, c, h)).map((c) => c.title);
      const summary = summaries.get(h.id) || children.join(' · ') || cellSummaries.get(h.id) || '';
      return { id: h.id, num: h.num, title: h.title, summary };
    });

  return {
    meta: { ...meta, ...gitInfo(sourceName), source: sourceName },
    html,
    toc,
    cards,
    examples,
    search,
  };
}

/* ------------------------------------------------------------------ */
/* Render rules                                                        */

function installRenderRules(md: InstanceType<typeof MarkdownIt>, hl: Highlighter) {
  const r = md.renderer.rules;
  let sectionOpen = false;

  r.heading_open = (tokens, idx, opts, _env, self) => {
    const t = tokens[idx];
    let prefix = '';
    if (t.tag === 'h2') {
      prefix = (sectionOpen ? '</section>' : '') + `<section class="doc-section" data-section="${t.attrGet('id')}">`;
      sectionOpen = true;
    }
    if (!sectionOpen) {
      prefix = '<section class="doc-section">' + prefix;
      sectionOpen = true;
    }
    return prefix + self.renderToken(tokens, idx, opts);
  };

  r.heading_close = (tokens, idx) => {
    const open = tokens[idx - 2];
    const id = open?.attrGet('id');
    const anchor = id ? `<a class="anchor" href="#${id}" aria-label="Link către secțiune">#</a>` : '';
    return `${anchor}</${tokens[idx].tag}>\n`;
  };

  r.fence = (tokens, idx) => {
    const t = tokens[idx];
    const { lang, example } = (t.meta ?? {}) as { lang: string; example: Example | null };
    const shikiLang = mapLang(lang);
    const code = hl.codeToHtml(t.content.replace(/\n$/, ''), { lang: shikiLang, theme: THEME });
    const block =
      `<div class="code-block" data-lang="${lang}">` +
      `<div class="code-head"><span class="code-lang">${langLabel(lang)}</span>` +
      `<button class="copy-btn" type="button" data-copy aria-label="Copiază codul">Copiază</button></div>` +
      code +
      `</div>`;
    return example ? `<div class="example" data-example="${example.id}">${block}</div>` : block;
  };

  r.blockquote_open = (tokens, idx) => {
    let text = '';
    for (let i = idx + 1; i < tokens.length && tokens[i].type !== 'blockquote_close'; i++) {
      if (tokens[i].type === 'inline') text += tokens[i].content + ' ';
    }
    const kind = /important|aten[țt]ie|warning|obligatoriu/i.test(text)
      ? 'warning'
      : /not[ăa]|note|info|sfat|tip/i.test(text)
        ? 'note'
        : 'info';
    return `<div class="callout callout-${kind}"><span class="callout-icon" aria-hidden="true"></span><div class="callout-body">`;
  };
  r.blockquote_close = () => '</div></div>';

  r.table_open = () => '<div class="table-wrap"><table>';
  r.table_close = () => '</table></div>';

  const defaultLink = r.link_open ?? ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
  r.link_open = (tokens, idx, opts, env, self) => {
    const href = String(tokens[idx].attrGet('href') ?? '');
    if (/^https?:\/\//.test(href)) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
    }
    return defaultLink(tokens, idx, opts, env, self);
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */

/** Pulls the title/metadata block above the first H2 and drops a "Cuprins" section (the site has its own nav). */
function splitPreamble(src: string) {
  const lines = src.split('\n');
  const firstH2 = lines.findIndex((l) => /^##\s/.test(l));
  const pre = firstH2 === -1 ? [] : lines.slice(0, firstH2);
  let rest = firstH2 === -1 ? lines : lines.slice(firstH2);

  const h1s = pre.filter((l) => /^#\s/.test(l)).map((l) => l.replace(/^#\s+/, '').trim());
  const fields: Record<string, string> = {};
  for (const l of pre) {
    const m = l.match(/^>\s*([^:]+?)\s*:\s*(.+)$/);
    if (m) fields[m[1].toLowerCase()] = m[2].trim();
  }
  const notice = pre.find((l) => /^\*[^*].*\*$/.test(l.trim()))?.trim().replace(/^\*|\*$/g, '') ?? '';

  const tocStart = rest.findIndex((l) => /^##\s+(cuprins|table of contents|contents)\s*$/i.test(l));
  if (tocStart !== -1) {
    const next = rest.findIndex((l, i) => i > tocStart && /^##\s/.test(l));
    rest = [...rest.slice(0, tocStart), ...rest.slice(next === -1 ? rest.length : next)];
  }

  const pick = (...keys: string[]) => keys.map((k) => Object.entries(fields).find(([f]) => f.startsWith(k))?.[1]).find(Boolean) ?? '';
  const fullTitle = h1s[h1s.length - 1] ?? 'API Ghid de Integrare';
  const [company, title] = fullTitle.includes('—') ? fullTitle.split('—').map((s) => s.trim()) : ['', fullTitle];

  return {
    meta: {
      title,
      company,
      version: pick('versiune', 'version'),
      updated: pick('ultima actualizare', 'last updated', 'actualizat'),
      authors: pick('autori', 'autor', 'authors')
        .split(',')
        .map((a) => a.replace(/@/g, '').trim())
        .filter(Boolean),
      contact: pick('contact'),
      notice,
    },
    body: rest.join('\n'),
  };
}

/** "** text **" / "**text: **" are not bold in CommonMark; tighten them so they render as intended. */
function fixLooseBold(src: string) {
  // Only touch prose: split on fenced code blocks and leave the odd-indexed (code) parts alone.
  return src
    .split(/(^```[\s\S]*?^```)/m)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/\*\*([ \t]*)([^*\n]+?)([ \t]*)\*\*/g, (_m, pre: string, inner: string, post: string) =>
            `${pre ? ' ' : ''}**${inner.trim()}**${post ? ' ' : ''}`,
          ),
    )
    .join('');
}

function inlineText(t: any): string {
  if (!t) return '';
  if (!t.children) return t.content ?? '';
  return t.children
    .map((c: any) => (c.type === 'text' || c.type === 'code_inline' ? c.content : c.type === 'softbreak' || c.type === 'hardbreak' ? ' ' : ''))
    .join('')
    .trim();
}

function slugify(s: string) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, '')
    .trim()
    .replace(/\.(?=\s|$)/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function uniqueSlug(text: string, used: Map<string, number>) {
  const base = slugify(text) || 'sectiune';
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n ? `${base}-${n}` : base;
}

function splitNumber(text: string) {
  const m = text.match(/^(\d+(?:\.\d+)*)\.?\s+(.+)$/);
  return m ? { num: m[1], title: m[2] } : { num: '', title: text };
}

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const stripNum = (s: string) => norm(s.replace(/^[\d.\-\s]+/, ''));

/** Links to the original Confluence page (or any URL with a #fragment matching a heading) become in-page anchors. */
function rewriteLinks(inline: any, headings: TocItem[]) {
  for (const c of inline.children ?? []) {
    if (c.type !== 'link_open') continue;
    const href: string = c.attrGet('href') ?? '';
    const hash = href.indexOf('#');
    if (hash === -1) continue;
    const isConfluence = /atlassian\.net\/wiki/.test(href);
    if (!isConfluence && hash !== 0) continue;
    let frag = href.slice(hash + 1);
    try { frag = decodeURIComponent(frag); } catch { /* keep raw */ }
    const target =
      headings.find((h) => h.id === frag) ??
      headings.find((h) => norm(h.id) === norm(frag)) ??
      headings.find((h) => stripNum(h.id) === stripNum(frag));
    if (target) c.attrSet('href', '#' + target.id);
  }
}

function isChildOf(toc: TocItem[], child: TocItem, parent: TocItem) {
  const ci = toc.indexOf(child);
  for (let i = ci - 1; i >= 0; i--) if (toc[i].level === 2) return toc[i] === parent;
  return false;
}

function mapLang(lang: string) {
  const map: Record<string, string> = {
    json: 'jsonc', json5: 'jsonc', jsonc: 'jsonc', js: 'javascript', javascript: 'javascript', ts: 'typescript',
    typescript: 'typescript', sh: 'bash', shell: 'bash', bash: 'bash', curl: 'bash', php: 'php', py: 'python',
    python: 'python', html: 'html', xml: 'xml', http: 'http',
  };
  return map[lang] ?? 'text';
}

function langLabel(lang: string) {
  const map: Record<string, string> = {
    json: 'JSON', jsonc: 'JSON', json5: 'JSON', js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript',
    bash: 'Shell', sh: 'Shell', php: 'PHP', python: 'Python', py: 'Python', http: 'HTTP', plain: 'Text', text: 'Text',
  };
  return map[lang] ?? lang.toUpperCase();
}

/** Commit info for the "last synced" badge; works locally and in GitHub Actions. */
function gitInfo(sourceName: string) {
  const run = (cmd: string) => {
    try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
  };
  const quoted = JSON.stringify(sourceName);
  const sha = run(`git log -1 --format=%h -- ${quoted}`);
  const date = run(`git log -1 --format=%cI -- ${quoted}`);
  const repo = process.env.GITHUB_REPOSITORY ?? '';
  const branch = process.env.GITHUB_REF_NAME ?? 'main';
  const encoded = sourceName.split('/').map(encodeURIComponent).join('/');
  return {
    commit: sha,
    commitDate: date,
    repo,
    editUrl: repo ? `https://github.com/${repo}/edit/${branch}/${encoded}` : '',
    historyUrl: repo ? `https://github.com/${repo}/commits/${branch}/${encoded}` : '',
  };
}
