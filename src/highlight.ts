/** Lazy, small syntax highlighter for generated snippets and API responses (JS regex engine, no WASM). */
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
  return instance;
}

export async function highlight(code: string, lang: string) {
  const hl = await get();
  return hl.codeToHtml(code, { lang, theme: 'github-dark-default' });
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
