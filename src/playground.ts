import type { Example } from 'virtual:netopia-docs';
import { store, SANDBOX_URL, PRODUCTION_URL } from './store';
import { createEditor, type JsonEditor } from './editor';
import { highlight, escapeHtml } from './highlight';
import {
  applyTemplate, fillTestCard, findPlaceholders, isOperation, isPayment, parseBody, snippet, SNIPPET_LANGS,
  type SnippetLang,
} from './requests';
import { icon } from './icons';

export interface Refs {
  statuses: Map<string, { name: string; description: string }>;
  errors: Map<string, string>;
  testCards: { number: string; label: string }[];
}

export interface UI {
  openCredentials(): void;
  toast(message: string, kind?: 'success' | 'info' | 'error'): void;
  goTo(id: string): void;
}

type Tab = 'json' | SnippetLang;

let preferredTab: Tab = 'json';
const tabListeners = new Set<(t: Tab) => void>();

export function mountPlayground(host: HTMLElement, ex: Example, refs: Refs, ui: UI) {
  const ctxKey = () => {
    const c = store.creds();
    const tx = isOperation(ex.path) ? store.lastTx : null;
    return [c.posSignature, tx?.ntpID, tx?.orderID].join('|');
  };
  let lastKey = ctxKey();
  let dirty = false;
  let tab: Tab = preferredTab;

  const root = document.createElement('div');
  root.className = 'pg';
  root.innerHTML = `
    <div class="pg-head">
      <div class="pg-heading">
        <span class="method">POST</span>
        <code class="pg-path">${escapeHtml(ex.path)}</code>
        <span class="pg-title">${escapeHtml(ex.subtitle || ex.title)}</span>
      </div>
      <span class="env-pill" data-env-pill></span>
    </div>
    <div class="pg-bar">
      <div class="pg-tabs" role="tablist">
        <button role="tab" data-tab="json">Body</button>
        ${SNIPPET_LANGS.map((l) => `<button role="tab" data-tab="${l.id}">${l.label}</button>`).join('')}
      </div>
      <div class="pg-tools">
        <button class="icon-btn" data-reset title="Resetează exemplul">${icon('reset')}</button>
        <button class="icon-btn" data-copy-pg title="Copiază">${icon('copy')}</button>
      </div>
    </div>
    <div class="pg-body">
      <div class="pg-editor"></div>
      <div class="pg-snippet" hidden></div>
    </div>
    <div class="pg-helpers"></div>
    <div class="pg-foot">
      <div class="pg-url"><span class="pg-url-base"></span><span class="pg-url-path">${escapeHtml(ex.path)}</span></div>
      <button class="run-btn" data-run>
        <span class="run-label">Trimite request</span>
        <kbd>${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} ↵</kbd>
      </button>
    </div>
    <div class="pg-response" hidden></div>`;

  host.replaceChildren(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const editorHost = $('.pg-editor');
  const snippetHost = $('.pg-snippet');
  const helpers = $('.pg-helpers');
  const response = $('.pg-response');
  const runBtn = $<HTMLButtonElement>('[data-run]');
  const envPill = $('[data-env-pill]');
  const urlBase = $('.pg-url-base');

  const unavailable = () => !ex.sandbox;
  const baseUrl = () => (unavailable() ? PRODUCTION_URL : SANDBOX_URL);

  const template = () => applyTemplate(ex.body, ex.path, { creds: store.creds(), lastTx: store.lastTx });

  const editor: JsonEditor = createEditor(
    editorHost,
    template(),
    (_text, user) => {
      if (user) dirty = true;
      renderHelpers();
      if (tab !== 'json') renderSnippet();
    },
    () => run(),
  );

  function setTab(next: Tab, broadcast = false) {
    tab = next;
    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === next)));
    editorHost.hidden = next !== 'json';
    snippetHost.hidden = next === 'json';
    if (next !== 'json') renderSnippet();
    if (broadcast) {
      preferredTab = next;
      tabListeners.forEach((l) => l(next));
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab as Tab, true)));
  const onGlobalTab = (t: Tab) => { if (t !== tab) setTab(t); };
  tabListeners.add(onGlobalTab);
  setTab(tab);

  async function renderSnippet() {
    const parsed = parseBody(editor.get());
    if (!parsed.ok) {
      snippetHost.innerHTML = `<div class="pg-error">${icon('alert')} JSON invalid — ${escapeHtml(parsed.error)}</div>`;
      return;
    }
    const lang = SNIPPET_LANGS.find((l) => l.id === tab)!;
    const code = snippet(lang.id, baseUrl() + ex.path, parsed.value);
    snippetHost.dataset.code = code;
    snippetHost.innerHTML = `<pre class="shiki github-dark-default"><code>${escapeHtml(code)}</code></pre>`;
    const html = await highlight(code, lang.shiki);
    if (snippetHost.dataset.code === code) snippetHost.innerHTML = html;
  }

  function renderHelpers() {
    const text = editor.get();
    const parts: string[] = [];

    if (unavailable()) {
      parts.push(`<span class="hint hint-warn">${icon('alert')} Indisponibil în Sandbox — nu poate fi rulat din documentație. Exemplele de cod (cURL, Node.js, PHP, Python) arată apelul în Producție.</span>`);
    } else if (!store.isConfigured()) {
      parts.push(`<button class="hint hint-warn" data-open-creds>${icon('key')} Adaugă cheia API de Sandbox ca să poți trimite request-ul</button>`);
    }

    const placeholders = findPlaceholders(text);
    if (placeholders.length) {
      const needsSig = /"posSignature"\s*:\s*"X/.test(text) && !store.creds().posSignature;
      parts.push(
        `<span class="hint">${icon('edit')} De completat: ${placeholders.map((p) => `<code>${escapeHtml(p)}</code>`).join(' ')}` +
          (needsSig ? ` <button class="link-btn" data-open-creds>Setează semnătura POS</button>` : '') +
          `</span>`,
      );
    }

    if (isOperation(ex.path)) {
      const tx = store.lastTx;
      parts.push(
        tx
          ? `<span class="hint hint-ok">${icon('link')} Completat din ultima plată · ntpID <code>${escapeHtml(tx.ntpID)}</code></span>`
          : `<span class="hint">${icon('info')} Rulează mai întâi o plată — <code>ntpID</code> și <code>orderID</code> se completează automat aici.</span>`,
      );
    }

    if (/"account"\s*:/.test(text) && refs.testCards.length) {
      parts.push(
        `<div class="cards-row"><span class="cards-label">${icon('card')} Card de test</span>` +
          refs.testCards
            .map((c) => `<button class="chip" data-card="${escapeHtml(c.number)}" title="${escapeHtml(c.number)}">${escapeHtml(c.label)}</button>`)
            .join('') +
          `</div>`,
      );
    }

    helpers.innerHTML = parts.join('');
    helpers.hidden = parts.length === 0;
  }

  helpers.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-open-creds]')) ui.openCredentials();
    const card = t.closest<HTMLElement>('[data-card]');
    if (card) {
      editor.set(fillTestCard(editor.get(), card.dataset.card!));
      dirty = true;
      renderHelpers();
      ui.toast(`Card de test completat · CVV 111`, 'info');
    }
  });

  $('[data-reset]').addEventListener('click', () => {
    editor.set(template());
    dirty = false;
    response.hidden = true;
    renderHelpers();
    if (tab !== 'json') renderSnippet();
  });

  $('[data-copy-pg]').addEventListener('click', async () => {
    const text = tab === 'json' ? editor.get() : snippetHost.dataset.code ?? '';
    await copy(text);
    ui.toast('Copiat în clipboard', 'success');
  });

  runBtn.addEventListener('click', () => run());

  envPill.textContent = unavailable() ? 'Indisponibil în Sandbox' : 'Sandbox';
  urlBase.textContent = baseUrl();
  root.classList.toggle('is-unavailable', unavailable());
  runBtn.disabled = unavailable();
  runBtn.querySelector('.run-label')!.textContent = unavailable() ? 'Indisponibil în Sandbox' : 'Trimite request';

  function syncState() {
    const key = ctxKey();
    if (key !== lastKey) {
      lastKey = key;
      if (!dirty) editor.set(template());
    }
    renderHelpers();
    if (tab !== 'json') renderSnippet();
  }
  store.subscribe(syncState);
  syncState();

  async function run() {
    if (unavailable()) {
      ui.toast('Indisponibil în Sandbox — nu poate fi rulat din documentație', 'info');
      return;
    }
    if (!store.isConfigured()) {
      ui.openCredentials();
      ui.toast('Adaugă mai întâi cheia API', 'info');
      return;
    }
    const parsed = parseBody(editor.get());
    if (!parsed.ok) {
      showResponse(`<div class="pg-error">${icon('alert')} JSON invalid — ${escapeHtml(parsed.error)}</div>`);
      return;
    }

    const url = SANDBOX_URL + ex.path;
    runBtn.disabled = true;
    root.classList.add('is-running');
    const started = performance.now();

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: store.creds().apiKey },
        body: JSON.stringify(parsed.value),
      });
      const text = await res.text();
      const ms = Math.round(performance.now() - started);
      let data: any = null;
      try { data = JSON.parse(text); } catch {}
      await renderResult(res, text, data, ms, parsed.value as any);
    } catch (err) {
      showResponse(
        `<div class="pg-error">${icon('alert')} Request-ul nu a ajuns la NETOPIA. Verifică conexiunea sau dacă o extensie de browser blochează cererea.` +
          `<small>${escapeHtml(err instanceof Error ? err.message : String(err))}</small></div>`,
      );
    } finally {
      runBtn.disabled = unavailable();
      root.classList.remove('is-running');
    }
  }

  async function renderResult(res: Response, text: string, data: any, ms: number, requestBody: any) {
    const ok = res.ok;
    const kind = res.status < 300 ? 'ok' : res.status < 500 ? 'warn' : 'err';
    const size = new Blob([text]).size;
    const insights: string[] = [];
    const actions: string[] = [];

    const status = data?.payment?.status;
    if (status !== undefined) {
      const s = refs.statuses.get(String(status));
      insights.push(`<span class="insight">Status plată <b>${status}</b>${s ? ` · ${escapeHtml(s.name)} — ${escapeHtml(s.description)}` : ''}</span>`);
    }
    const errCode = data?.error?.code ?? data?.code;
    if (errCode !== undefined) {
      const desc = refs.errors.get(String(errCode)) ?? data?.error?.message ?? data?.message;
      insights.push(`<span class="insight">Cod <b>${escapeHtml(String(errCode))}</b>${desc ? ` · ${escapeHtml(String(desc))}` : ''}</span>`);
    }

    const ntpID = data?.payment?.ntpID;
    if (ntpID && isPayment(ex.path)) {
      const orderID = requestBody?.order?.orderID ?? requestBody?.order?.id ?? '';
      store.setLastTx({ ntpID: String(ntpID), orderID: String(orderID), at: Date.now() });
      insights.push(`<span class="insight insight-ok">${icon('check')} ntpID <b>${escapeHtml(String(ntpID))}</b> salvat pentru Refund / Status / Expirare</span>`);
    }

    const paymentURL = data?.payment?.paymentURL;
    if (paymentURL) actions.push(`<a class="action-btn" href="${escapeHtml(paymentURL)}" target="_blank" rel="noopener">${icon('external')} Deschide pagina de plată</a>`);
    if (data?.customerAction?.url) actions.push(`<button class="action-btn" data-3ds>${icon('shield')} Continuă autentificarea 3-D Secure</button>`);

    const pretty = data ? JSON.stringify(data, null, 2) : text || '(răspuns gol)';
    const code = data ? await highlight(pretty, 'json') : `<pre class="shiki"><code>${escapeHtml(pretty)}</code></pre>`;

    showResponse(`
      <div class="res-head">
        <span class="res-status res-${kind}"><i></i>${res.status} ${escapeHtml(res.statusText || (ok ? 'OK' : ''))}</span>
        <span class="res-meta">${ms} ms</span>
        <span class="res-meta">${formatBytes(size)}</span>
        <button class="icon-btn res-copy" title="Copiază răspunsul">${icon('copy')}</button>
        <button class="icon-btn res-close" title="Închide">${icon('close')}</button>
      </div>
      ${insights.length || actions.length ? `<div class="res-insights">${insights.join('')}${actions.length ? `<div class="res-actions">${actions.join('')}</div>` : ''}</div>` : ''}
      <div class="res-body">${code}</div>`);

    response.querySelector('.res-copy')?.addEventListener('click', async () => { await copy(pretty); ui.toast('Răspuns copiat', 'success'); });
    response.querySelector('.res-close')?.addEventListener('click', () => { response.hidden = true; });
    response.querySelector('[data-3ds]')?.addEventListener('click', () => submit3ds(data.customerAction));
    if (ntpID && isPayment(ex.path)) ui.toast(`Tranzacție creată · ntpID ${ntpID}`, 'success');
  }

  function showResponse(html: string) {
    response.innerHTML = html;
    response.hidden = false;
    response.classList.remove('enter');
    void response.offsetWidth;
    response.classList.add('enter');
  }
}

function submit3ds(action: { url: string; formData?: Record<string, string> }) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action.url;
  form.target = '_blank';
  for (const [k, v] of Object.entries(action.formData ?? {})) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = String(v);
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

const formatBytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
