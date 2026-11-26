import { defineConfig } from 'vite';
import { netopiaDocs } from './scripts/docs-plugin';

const source = process.env.DOCS_SOURCE ?? 'API Ghid de Integrare.md';

export default defineConfig({
  base: './',
  plugins: [netopiaDocs({ source, repo: 'xkcezar/DocumentatieNTPv2' })],
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
