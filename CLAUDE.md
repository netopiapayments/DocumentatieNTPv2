# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NETOPIA Payments API v2 integration guide (Romanian) as a static Vite + TypeScript site, with examples runnable against the Sandbox from the browser. No test or lint tooling is configured.

## Commands

```bash
npm install
npm run dev       # Vite dev server; editing the .md triggers a full reload
npm run build     # outputs dist/
npm run preview
DOCS_SOURCE="other.md" npm run build   # point at a different Markdown source
```

Per the user's global rules, any container work uses Podman only.

## Architecture

**`API Ghid de Integrare.md` is the single content source.** Content is edited only there (see PRODUCT.md). Everything the site shows is derived from it at build time.

- `scripts/docs-plugin.ts` — Vite plugin exposing the virtual module `virtual:netopia-docs` (typed in `src/virtual.d.ts`; keep the two interfaces in sync). It parses the Markdown with markdown-it and produces `{ meta, html, toc, cards, examples, search }`:
  - Preamble (title, `> Versiune document:`, `> Ultima actualizare:`, authors, contact) is parsed from the lines above the first `##`, and the `## Cuprins` section is dropped. Keep that header format intact.
  - Headings get slugged ids; Confluence links with `#fragment` are rewritten to in-page anchors.
  - Code blocks are highlighted with shiki at build time.
  - **Runnable examples are auto-detected**: JSON request bodies (not responses) become "try it" examples, with the endpoint inferred from the nearest preceding mention of `/payment/card/start`, `/operation/{credit,expire,status}`, or `/disbursement/card/auth`. Override with an HTML comment placed right before the block: `<!-- try: /operation/credit -->` or `<!-- try: off -->`.
  - Sections whose text says a feature isn't available in Sandbox (e.g. Money Send; regex `NO_SANDBOX_RE`) mark their examples `sandbox: false`.
  - Git info (last commit/date of the .md, edit/history URLs) comes from `git log`, with CF Pages / GitHub Actions env fallbacks. Repo is hardcoded in `vite.config.ts`.
- `src/main.ts` — builds the shell (topbar, sidebar nav, theme, search modal, progress) and injects the generated HTML; hydrates `.example` blocks via `src/playground.ts`.
- `src/playground.ts`, `src/requests.ts`, `src/editor.ts` — the interactive example runner. Bodies are edited as text (CodeMirror) so guide comments survive; `requests.ts` fills credentials, fresh `orderID`/`dateTime`, and last-tx IDs via key-based regex replacement, parses with JSON5, and generates code samples.
- `src/store.ts` — credentials and last transaction in `sessionStorage` (or `localStorage` if "remember"), checklist state.
- `src/search.ts`, `src/highlight.ts`, `src/icons.ts` — search UI over the generated index, escaping/highlight helpers, icons.

## Constraints

- The site calls **only** the Sandbox (`SANDBOX_URL` in `src/store.ts`); credentials stay in the browser. `PRODUCTION_URL` is for display in code samples only and must never be called.
- UI visual rules (carbon/console theme, tokens, do's and don'ts) are in `DESIGN.md`; styling is in `src/styles.css`.
- Site text and guide content are in Romanian; match that language.
- `package-lock.json` is gitignored.
