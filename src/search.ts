/** ⌘K command palette over every heading and its text in the guide. */
import type { SearchEntry } from 'virtual:netopia-docs';
import { escapeHtml } from './highlight';
import { icon } from './icons';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

interface Hooks { open(): void; close(): void }

export function createSearch(entries: SearchEntry[], hooks: Hooks) {
  const palette = document.querySelector<HTMLElement>('.palette')!;
  const input = palette.querySelector<HTMLInputElement>('[data-search-input]')!;
  const list = palette.querySelector<HTMLElement>('[data-search-results]')!;
  const index = entries.map((e) => ({ ...e, ft: fold(e.title), fx: fold(e.text), fs: fold(e.section) }));
  let results: typeof index = [];
  let selected = 0;

  function query(q: string) {
    const terms = fold(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return index.filter((e) => !e.section).slice(0, 12);
    return index
      .map((e) => {
        let score = 0;
        for (const t of terms) {
          const inTitle = e.ft.includes(t);
          const inText = e.fx.includes(t) || e.fs.includes(t);
          if (!inTitle && !inText) return null;
          score += inTitle ? (e.ft.startsWith(t) ? 12 : 8) : 2;
        }
        if (!e.section) score += 1;
        return { e, score };
      })
      .filter((x): x is { e: (typeof index)[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((x) => x.e);
  }

  function mark(text: string, terms: string[]) {
    if (!terms.length) return escapeHtml(text);
    const folded = fold(text);
    const ranges: [number, number][] = [];
    for (const t of terms) {
      let i = folded.indexOf(t);
      while (i !== -1) { ranges.push([i, i + t.length]); i = folded.indexOf(t, i + t.length); }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let out = '';
    let pos = 0;
    for (const [s, e] of ranges) {
      if (s < pos) continue;
      out += escapeHtml(text.slice(pos, s)) + '<mark>' + escapeHtml(text.slice(s, e)) + '</mark>';
      pos = e;
    }
    return out + escapeHtml(text.slice(pos));
  }

  function excerpt(text: string, terms: string[]) {
    if (!text) return '';
    const folded = fold(text);
    const hit = terms.map((t) => folded.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
    const start = Math.max(0, hit - 40);
    const slice = text.slice(start, start + 140);
    return (start > 0 ? '…' : '') + mark(slice, terms) + (start + 140 < text.length ? '…' : '');
  }

  function render() {
    const q = input.value;
    const terms = fold(q).split(/\s+/).filter(Boolean);
    results = query(q);
    selected = Math.min(selected, Math.max(0, results.length - 1));
    list.innerHTML = results.length
      ? results
          .map(
            (r, i) => `<a class="result${i === selected ? ' selected' : ''}" href="#${r.id}" data-i="${i}">
              <span class="result-icon">${icon(r.section ? 'arrow' : 'bolt', 14)}</span>
              <span class="result-main">
                ${r.section ? `<span class="result-crumb">${escapeHtml(r.section)}</span>` : ''}
                <span class="result-title">${mark(r.title, terms)}</span>
                ${terms.length && r.text ? `<span class="result-text">${excerpt(r.text, terms)}</span>` : ''}
              </span>
            </a>`,
          )
          .join('')
      : `<div class="empty">Niciun rezultat pentru „${escapeHtml(q)}”</div>`;
  }

  function go(i: number) {
    const r = results[i];
    if (!r) return;
    close();
    const el = document.getElementById(r.id);
    if (el) {
      history.pushState(null, '', '#' + r.id);
      el.scrollIntoView({ block: 'start' });
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1300);
    }
  }

  function open() {
    palette.hidden = false;
    hooks.open();
    input.value = '';
    selected = 0;
    render();
    requestAnimationFrame(() => input.focus());
  }

  function close() {
    if (palette.hidden) return;
    palette.hidden = true;
    hooks.close();
  }

  input.addEventListener('input', () => { selected = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(results.length - 1, selected + 1); render(); scrollSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(0, selected - 1); render(); scrollSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(selected); }
  });
  list.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (a) { e.preventDefault(); go(Number(a.dataset.i)); }
  });
  list.addEventListener('mousemove', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (a && Number(a.dataset.i) !== selected) {
      selected = Number(a.dataset.i);
      list.querySelectorAll('.result').forEach((el, i) => el.classList.toggle('selected', i === selected));
    }
  });
  palette.addEventListener('click', (e) => { if (e.target === palette) close(); });

  const scrollSel = () => list.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });

  return { open, close, toggle: () => (palette.hidden ? open() : close()) };
}
