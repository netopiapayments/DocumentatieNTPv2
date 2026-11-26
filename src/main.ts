import './styles.css';
import logoSvg from './assets/netopia-logo.svg?raw';
import docs from 'virtual:netopia-docs';
import { store } from './store';
import { icon } from './icons';
import { escapeHtml } from './highlight';
import { mountPlayground, copy, type Refs } from './playground';
import { createSearch } from './search';

const { meta, html, toc, cards, examples } = docs;
const isMac = navigator.platform.includes('Mac');
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; }
};

const sections = toc.filter((t) => t.level === 2);
const childrenOf = (id: string) => {
  const i = toc.findIndex((t) => t.id === id);
  const out = [];
  for (let j = i + 1; j < toc.length && toc[j].level === 3; j++) out.push(toc[j]);
  return out;
};
const firstNumbered = sections.find((s) => s.num) ?? sections[0];

document.title = `${meta.title} · ${meta.company.split(' ')[0] || 'NETOPIA'}`;

const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="progress" aria-hidden="true"><span></span></div>
  <header class="topbar">
    <button class="icon-btn only-mobile" data-menu aria-label="Meniu">${icon('menu', 18)}</button>
    <a class="brand" href="#top" aria-label="NETOPIA Payments — API Docs, început">
      ${logoSvg}
      <span class="brand-tag">API Docs</span>
    </a>
    <button class="search-trigger" data-search>
      ${icon('search', 15)}<span>Caută în documentație…</span><kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd>
    </button>
    <div class="top-actions">
      <span class="env-badge" title="Exemplele din documentație rulează doar în Sandbox"><i aria-hidden="true"></i>Sandbox</span>
      <button class="creds-btn" data-creds aria-label="Credențiale">${icon('key', 15)}<span class="status-dot"></span><span class="creds-label">Credențiale</span></button>
      <button class="icon-btn" data-theme-toggle aria-label="Schimbă tema">${icon('sun', 17)}${icon('moon', 17)}</button>
      ${meta.repo ? `<a class="icon-btn hide-mobile" href="https://github.com/${meta.repo}" target="_blank" rel="noopener" aria-label="GitHub">${icon('github', 17)}</a>` : ''}
    </div>
  </header>

  <div class="layout">
    <aside class="sidebar" aria-label="Navigare">
      <nav class="nav">
        <div class="nav-label">Ghid de integrare</div>
        ${sections
          .map((s) => {
            const kids = childrenOf(s.id);
            return `<div class="nav-group" data-group="${s.id}">
              <a class="nav-link nav-h2" href="#${s.id}" data-nav="${s.id}">
                <span class="nav-num">${s.num || '·'}</span><span>${escapeHtml(s.title)}</span>
              </a>
              ${kids.length ? `<div class="nav-children">${kids.map((k) => `<a class="nav-link nav-h3" href="#${k.id}" data-nav="${k.id}">${escapeHtml(k.title)}</a>`).join('')}</div>` : ''}
            </div>`;
          })
          .join('')}
      </nav>
      <div class="sidebar-foot">
        <span>v${escapeHtml(meta.version)}</span>
        ${meta.contact ? `<a href="mailto:${escapeHtml(meta.contact)}">${escapeHtml(meta.contact)}</a>` : ''}
      </div>
    </aside>
    <div class="scrim" data-scrim></div>

    <main class="content" id="top">
      <section class="hero">
        <h1 class="hero-title">${escapeHtml(meta.title)}</h1>
        <p class="hero-lead" data-lead>Tot ce ai nevoie pentru a integra plățile cu cardul NETOPIA — de la prima plată până la refund, plăți recurente și Money Send.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#${firstNumbered?.id ?? ''}">Începe integrarea</a>
          <button class="btn btn-ghost" data-creds>Configurează credențialele</button>
        </div>
        <dl class="hero-meta">
          ${meta.version ? `<div><dt>Versiune</dt><dd>${escapeHtml(meta.version)}</dd></div>` : ''}
          ${meta.updated ? `<div><dt>Actualizat</dt><dd>${escapeHtml(meta.updated)}</dd></div>` : ''}
          ${meta.authors.length ? `<div><dt>Autori</dt><dd>${meta.authors.map(escapeHtml).join(', ')}</dd></div>` : ''}
          <div><dt>Exemple rulabile</dt><dd>${examples.length}</dd></div>
        </dl>
      </section>

      <section class="overview" aria-label="Secțiuni">
        <div class="ov-head" aria-hidden="true"><span>#</span><span>Secțiune</span><span>Conținut</span></div>
        ${cards
          .filter((c) => c.num)
          .map(
            (c) => `<a class="ov-row" href="#${c.id}">
              <span class="ov-num">${c.num.padStart(2, '0')}</span>
              <span class="ov-title">${escapeHtml(c.title)}</span>
              <span class="ov-sum">${escapeHtml(c.summary)}</span>
            </a>`,
          )
          .join('')}
      </section>

      <article class="doc">${html}</article>

      <footer class="doc-footer">
        <div class="foot-row">
          ${meta.editUrl ? `<a href="${meta.editUrl}" target="_blank" rel="noopener">${icon('edit', 15)} Editează pe GitHub</a>` : ''}
          ${meta.historyUrl ? `<a href="${meta.historyUrl}" target="_blank" rel="noopener">${icon('history', 15)} Istoric modificări</a>` : ''}
          ${meta.commit ? `<span class="muted">Sincronizat din <code>${escapeHtml(meta.source)}</code> · commit <code>${escapeHtml(meta.commit)}</code>${meta.commitDate ? ` · ${fmtDate(meta.commitDate)}` : ''}</span>` : `<span class="muted">Generat din <code>${escapeHtml(meta.source)}</code></span>`}
        </div>
        ${meta.notice ? `<p class="notice">${escapeHtml(meta.notice)}</p>` : ''}
      </footer>
    </main>

    <aside class="rail" aria-label="Pe această pagină">
      <div class="rail-inner">
        <div class="rail-label">Pe această pagină</div>
        <nav class="rail-toc" data-rail-toc></nav>
        <div class="session-card" data-session></div>
      </div>
    </aside>
  </div>

  <div class="drawer-backdrop" data-drawer-close hidden></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>
    <header class="drawer-head">
      <div>
        <h2 id="drawer-title">Credențiale API</h2>
        <p>Pentru mediul <b>Sandbox</b> — exemplele din documentație rulează doar în Sandbox.</p>
      </div>
      <button class="icon-btn" data-drawer-close aria-label="Închide">${icon('close', 18)}</button>
    </header>
    <div class="drawer-body">
      <label class="field">
        <span class="field-label">Cheie API Sandbox <em>obligatoriu</em></span>
        <span class="input-wrap">
          <input type="password" autocomplete="off" spellcheck="false" data-field="apiKey" placeholder="Lipește cheia API" />
          <button type="button" class="input-btn" data-reveal aria-label="Arată cheia">${icon('eye', 16)}</button>
        </span>
        <small>Profil → Securitate → Cheie API (cheia generată pentru Sandbox). Se trimite în header-ul <code>Authorization</code>. Nu folosi cheia de Producție.</small>
      </label>
      <label class="field">
        <span class="field-label">Semnătură POS</span>
        <input type="text" autocomplete="off" spellcheck="false" data-field="posSignature" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" />
        <small>Admin → Puncte de vânzare → Setări tehnice. Completează <code>order.posSignature</code> la plăți și <code>posID</code> la Status / Expirare.</small>
      </label>
      <label class="toggle">
        <input type="checkbox" data-remember />
        <span class="toggle-ui" aria-hidden="true"></span>
        <span><b>Ține minte pe acest dispozitiv</b><small>Altfel, datele se șterg când închizi tab-ul.</small></span>
      </label>
      <div class="privacy">
        ${icon('lock', 16)}
        <p>Credențialele rămân în browserul tău. Request-urile pleacă <b>direct</b> din browser către NETOPIA — nu trec prin niciun server intermediar.</p>
      </div>
    </div>
    <footer class="drawer-foot">
      <button class="btn btn-ghost btn-sm" data-clear>Șterge tot</button>
      <button class="btn btn-primary btn-sm" data-drawer-close>Gata</button>
    </footer>
  </aside>

  <div class="palette" role="dialog" aria-modal="true" aria-label="Căutare" hidden>
    <div class="palette-box">
      <div class="palette-input">${icon('search', 18)}<input type="text" placeholder="Caută endpoint-uri, câmpuri, coduri de status…" data-search-input /><kbd>Esc</kbd></div>
      <div class="palette-results" data-search-results></div>
      <div class="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navighează</span><span><kbd>↵</kbd> deschide</span></div>
    </div>
  </div>

  <div class="toasts" aria-live="polite"></div>
`;

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];
const doc = $('.doc');

function toast(message: string, kind: 'success' | 'info' | 'error' = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${icon(kind === 'success' ? 'check' : kind === 'error' ? 'alert' : 'info', 15)}<span>${escapeHtml(message)}</span>`;
  $('.toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3000);
}

$('[data-theme-toggle]').addEventListener('click', () => {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('ntp-theme', next); } catch {}
});

function renderEnv() {
  const configured = store.isConfigured();
  const btn = $('[data-creds].creds-btn');
  btn.dataset.state = configured ? 'ok' : 'missing';
  $('.creds-label', btn).textContent = configured ? 'Conectat' : 'Credențiale';
  btn.setAttribute('aria-label', configured ? 'Credențiale: conectat' : 'Credențiale: lipsesc');

  const tx = store.lastTx;
  $('[data-session]').innerHTML = `
    <div class="session-row"><span>Mediu</span><b class="env-name">Sandbox</b></div>
    <div class="session-row"><span>Cheie API</span><b class="${configured ? 'ok' : 'missing'}">${configured ? 'Setată' : 'Lipsește'}</b></div>
    <div class="session-row"><span>Semnătură POS</span><b class="${store.creds().posSignature ? 'ok' : 'missing'}">${store.creds().posSignature ? 'Setată' : 'Lipsește'}</b></div>
    ${tx ? `<div class="session-row"><span>Ultimul ntpID</span><code>${escapeHtml(tx.ntpID)}</code></div>` : ''}
    <button class="btn btn-ghost btn-sm btn-block" data-creds>${icon('key', 14)} ${configured ? 'Editează credențialele' : 'Adaugă credențiale'}</button>`;
}

function fillDrawer() {
  const c = store.creds();
  $$<HTMLInputElement>('[data-field]').forEach((input) => { input.value = c[input.dataset.field as keyof typeof c]; });
  $<HTMLInputElement>('[data-remember]').checked = store.remember;
}

function openDrawer() {
  fillDrawer();
  $('.drawer').hidden = false;
  $('.drawer-backdrop').hidden = false;
  requestAnimationFrame(() => document.body.classList.add('drawer-open'));
  setTimeout(() => $<HTMLInputElement>('[data-field="apiKey"]').focus(), 120);
}

function closeDrawer() {
  document.body.classList.remove('drawer-open');
  setTimeout(() => { $('.drawer').hidden = true; $('.drawer-backdrop').hidden = true; }, 220);
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-creds]')) openDrawer();
  if (t.closest('[data-drawer-close]')) closeDrawer();
});

$$<HTMLInputElement>('[data-field]').forEach((input) =>
  input.addEventListener('input', () => store.setCreds({ [input.dataset.field!]: input.value.trim() })),
);
$<HTMLInputElement>('[data-remember]').addEventListener('change', (e) => store.setRemember((e.target as HTMLInputElement).checked));
$('[data-reveal]').addEventListener('click', () => {
  const input = $<HTMLInputElement>('[data-field="apiKey"]');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('[data-reveal]').innerHTML = icon(show ? 'eyeOff' : 'eye', 16);
});
$('[data-clear]').addEventListener('click', () => {
  store.clearCreds();
  store.setLastTx(null);
  fillDrawer();
  toast('Credențialele au fost șterse', 'info');
});

store.subscribe(renderEnv);
renderEnv();

const refs: Refs = { statuses: new Map(), errors: new Map(), testCards: [] };
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

$$('.doc h2, .doc h3').forEach((h) => {
  const first = h.firstChild;
  if (first?.nodeType !== Node.TEXT_NODE) return;
  const m = first.textContent!.match(/^(\d+(?:\.\d+)*)\.?\s+/);
  if (!m) return;
  first.textContent = first.textContent!.slice(m[0].length);
  const badge = document.createElement('span');
  badge.className = 'h-num';
  badge.textContent = m[1];
  h.prepend(badge);
});

for (const row of $$('.doc tr')) {
  const cells = $$('td', row);
  if (cells.length === 2 && norm(cells[0].textContent ?? '') === 'scop') {
    $('[data-lead]').textContent = cells[1].textContent!.trim();
    break;
  }
}

doc.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]');
  if (btn) {
    const code = btn.closest('.code-block')?.querySelector('pre')?.textContent ?? '';
    await copy(code);
    btn.textContent = 'Copiat';
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = 'Copiază'; btn.classList.remove('done'); }, 1400);
  }
  const chip = (e.target as HTMLElement).closest<HTMLElement>('td code, .copyable');
  if (chip && chip.closest('.table-wrap')) {
    await copy(chip.textContent!.trim());
    toast(`Copiat: ${chip.textContent!.trim()}`, 'success');
  }
});

for (const wrap of $$('.doc .table-wrap')) {
  const table = $('table', wrap);
  const headers = $$('thead th', table).map((th) => norm(th.textContent ?? ''));
  const rows = $$('tbody tr', table).map((tr) => $$('td', tr));

  if (headers[0] === 'cod' && headers[1] === 'status') {
    wrap.classList.add('t-status');
    for (const [code, status, desc] of rows) {
      const name = status.textContent!.trim();
      refs.statuses.set(code.textContent!.trim(), { name, description: desc?.textContent!.trim() ?? '' });
      status.innerHTML = `<span class="status-chip" data-s="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
      code.classList.add('num-cell');
    }
    continue;
  }

  if (headers.length === 2 && headers[0] === 'cod') {
    wrap.classList.add('t-codes');
    for (const [code, desc] of rows) {
      refs.errors.set(code.textContent!.trim(), desc.textContent!.trim());
      code.classList.add('num-cell');
    }
    continue;
  }

  if (headers.some((h) => h.includes('numar card'))) {
    wrap.classList.add('t-cards');
    for (const [num, result] of rows) {
      refs.testCards.push({ number: num.textContent!.trim(), label: result.textContent!.trim() });
      num.innerHTML = `<code class="copyable" title="Click pentru copiere">${escapeHtml(num.textContent!.trim())}</code>`;
    }
    continue;
  }

  if (headers[0] === 'pas') {
    const ol = document.createElement('ol');
    ol.className = 'steps';
    ol.innerHTML = rows
      .map((cells) => {
        const [step, ...rest] = cells;
        const label = step.innerHTML.replace(/^\s*\d+\s*[—–-]?\s*/, '');
        const [title, ...more] = rest;
        const titleHtml = label && rest.length === 1 ? label : (title?.innerHTML ?? label);
        const body = label && rest.length === 1 ? title?.innerHTML : more.map((c) => c.innerHTML).join(' ');
        return `<li><span class="step-dot">${escapeHtml(step.textContent!.match(/\d+/)?.[0] ?? '')}</span><div><div class="step-title">${titleHtml}</div>${body ? `<div class="step-body">${body}</div>` : ''}</div></li>`;
      })
      .join('');
    wrap.replaceWith(ol);
    continue;
  }

  if (headers[0]?.startsWith('versiune') && headers.includes('data')) {
    const idx = (name: string) => headers.findIndex((h) => h.startsWith(name));
    const items = rows
      .map((c) => ({
        v: c[0].textContent!.trim(),
        date: c[idx('data')]?.textContent!.trim() ?? '',
        author: idx('autor') >= 0 ? c[idx('autor')].textContent!.trim() : '',
        type: c[idx('tip')]?.textContent!.trim() ?? '',
        desc: c[idx('descriere')]?.innerHTML ?? '',
      }))
      .sort((a, b) => b.v.localeCompare(a.v, undefined, { numeric: true }));
    const ol = document.createElement('ol');
    ol.className = 'changelog';
    ol.innerHTML = items
      .map(
        (it, i) => `<li${i === 0 ? ' class="latest"' : ''}>
          <div class="cl-side"><span class="cl-v">v${escapeHtml(it.v)}</span><span class="cl-date">${escapeHtml(it.date)}</span></div>
          <div class="cl-main"><div class="cl-tags">${it.type ? `<span class="cl-type">${escapeHtml(it.type)}</span>` : ''}${i === 0 ? '<span class="cl-latest">Curentă</span>' : ''}${it.author ? `<span class="cl-author">${escapeHtml(it.author)}</span>` : ''}</div><p>${it.desc}</p></div>
        </li>`,
      )
      .join('');
    wrap.replaceWith(ol);
    continue;
  }

  if ($$('a', table).length >= 2) wrap.classList.add('t-links');
}

for (const ul of $$('.doc ul')) {
  const items = $$(':scope > li', ul).filter((li) => /^\s*[☐☑✅]/.test(li.textContent ?? ''));
  if (!items.length || items.length !== ul.children.length) continue;
  ul.classList.add('checklist');
  const progress = document.createElement('div');
  progress.className = 'checklist-progress';
  ul.before(progress);
  const update = () => {
    const done = items.filter((li) => li.classList.contains('done')).length;
    progress.innerHTML = `<div class="cp-bar"><span style="width:${(done / items.length) * 100}%"></span></div><span>${done} din ${items.length} completate</span>`;
  };
  items.forEach((li, i) => {
    const text = li.innerHTML.replace(/^\s*[☐☑✅]\s*/, '');
    const id = `c${i}-${norm(li.textContent ?? '').slice(2, 30)}`;
    li.innerHTML = `<label><input type="checkbox" ${store.checked(id) ? 'checked' : ''}/><span class="cb" aria-hidden="true">${icon('check', 12)}</span><span>${text}</span></label>`;
    li.classList.toggle('done', store.checked(id));
    $('input', li).addEventListener('change', (e) => {
      const v = (e.target as HTMLInputElement).checked;
      li.classList.toggle('done', v);
      store.setChecked(id, v);
      update();
    });
  });
  update();
}

const glossary = $$('.doc .doc-section').find((s) => norm(s.dataset.section ?? '').startsWith('glosar'));
if (glossary) {
  glossary.classList.add('glossary');
  for (const p of $$(':scope > p', glossary)) {
    const lines = p.innerHTML.split(/<br\s*\/?>\s*/i).map((l) => l.trim()).filter(Boolean);
    const frag = document.createDocumentFragment();
    for (const line of lines) {
      const plain = line.replace(/<[^>]+>/g, '').trim();
      if (/^\p{L}$/u.test(plain)) {
        const h = document.createElement('h3');
        h.className = 'gl-letter';
        h.textContent = plain;
        frag.appendChild(h);
        continue;
      }
      const m = line.match(/^(.+?)(?:\s{2,}|&nbsp;\s*)(.+)$/s) ?? line.match(/^([^<]{2,60}?\))\s+(.+)$/s);
      const item = document.createElement('div');
      item.className = 'gl-item';
      item.innerHTML = m ? `<dt>${m[1].trim()}</dt><dd>${m[2].trim()}</dd>` : `<dd class="gl-full">${line}</dd>`;
      frag.appendChild(item);
    }
    p.replaceWith(frag);
  }
  $$('h3:not(.gl-letter)', glossary).forEach((h) => h.classList.add('gl-letter'));
}

const ui = { openCredentials: openDrawer, toast, goTo: (id: string) => document.getElementById(id)?.scrollIntoView() };
$$('.doc .example').forEach((el) => {
  const ex = examples[Number(el.dataset.example)];
  if (ex) mountPlayground(el, ex, refs, ui);
});

const headings = toc.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
let activeId: string | null = null;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  $('.progress span').style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

  let current = headings[0];
  for (const h of headings) {
    if (h.getBoundingClientRect().top < Math.min(260, innerHeight * 0.3)) current = h;
    else break;
  }
  const id = y < 200 ? '' : (current?.id ?? '');
  if (id === activeId) return;
  activeId = id;

  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === id));
  const item = toc.find((t) => t.id === id);
  const parentId = item?.level === 3 ? [...toc.slice(0, toc.indexOf(item))].reverse().find((t) => t.level === 2)?.id : item?.id;
  $$('.nav-group').forEach((g) => g.classList.toggle('open', g.dataset.group === parentId));
  $$('[data-nav]').forEach((a) => a.classList.toggle('in-path', a.dataset.nav === parentId));

  const kids = parentId ? childrenOf(parentId) : [];
  const parent = toc.find((t) => t.id === parentId);
  $('[data-rail-toc]').innerHTML = parent
    ? `<a href="#${parent.id}" class="${id === parent.id ? 'active' : ''}">${escapeHtml(parent.title)}</a>` +
      kids.map((k) => `<a href="#${k.id}" class="sub ${k.id === id ? 'active' : ''}">${escapeHtml(k.title)}</a>`).join('')
    : sections.map((s) => `<a href="#${s.id}">${escapeHtml(s.title)}</a>`).join('');

  const activeLink = $(`.sidebar [data-nav="${CSS.escape(id)}"]`);
  if (activeLink && innerWidth > 960) {
    const sb = $('.sidebar');
    const r = activeLink.getBoundingClientRect();
    if (r.top < 80 || r.bottom > innerHeight - 60) sb.scrollTo({ top: activeLink.offsetTop - sb.clientHeight / 3 });
  }
}

let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { onScroll(); ticking = false; });
}, { passive: true });
onScroll();

const closeMenu = () => document.body.classList.remove('menu-open');
$('[data-menu]').addEventListener('click', () => document.body.classList.toggle('menu-open'));
$('[data-scrim]').addEventListener('click', closeMenu);
$$('.sidebar a').forEach((a) => a.addEventListener('click', closeMenu));

const search = createSearch(docs.search, {
  open: () => document.body.classList.add('palette-open'),
  close: () => document.body.classList.remove('palette-open'),
});
$('[data-search]').addEventListener('click', () => search.open());

addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.toggle(); }
  else if (e.key === '/' && !/input|textarea/i.test((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) { e.preventDefault(); search.open(); }
  else if (e.key === 'Escape') { search.close(); if (document.body.classList.contains('drawer-open')) closeDrawer(); closeMenu(); }
});

if (location.hash) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const jump = () => target?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
  requestAnimationFrame(jump);
  document.fonts?.ready.then(jump);
}
function flash(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1300);
}
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  const id = a ? decodeURIComponent(a.getAttribute('href')!.slice(1)) : '';
  if (id) requestAnimationFrame(() => flash(id));
});
