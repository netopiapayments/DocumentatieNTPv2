import { defineConfig } from 'vite';
import { netopiaDocs } from './scripts/docs-plugin';

// The Markdown guide is the only content source. Change DOCS_SOURCE to point at another file.
const source = process.env.DOCS_SOURCE ?? 'API Ghid de Integrare.md';

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo>/ as well as on a custom domain.
  base: './',
  plugins: [netopiaDocs({ source })],
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
