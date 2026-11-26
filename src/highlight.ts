import type { HighlighterCore } from 'shiki/core';

let instance: Promise<HighlighterCore> | undefined;

function get() {
  instance ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ]);
    return createHighlighterCore({
      themes: [import('shiki/themes/github-dark-default.mjs')],
      langs: [
        import('shiki/langs/json.mjs'),
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/javascript.mjs'),
        import('shiki/langs/php.mjs'),
        import('shiki/langs/python.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  instance.catch(() => { instance = undefined; });
  return instance;
}

const plain = (code: string) => `<pre class="shiki github-dark-default"><code>${escapeHtml(code)}</code></pre>`;

export async function highlight(code: string, lang: string) {
  try {
    const hl = await get();
    return hl.codeToHtml(code, { lang, theme: 'github-dark-default' });
  } catch (err) {
    console.warn('[highlight] fallback to plain text:', err);
    return plain(code);
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
