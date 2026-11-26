import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const guidePath = resolve(pkgDir, '../../API Ghid de Integrare.md');
const out = join(pkgDir, 'skill/netopia-integration/reference.md');

const guide = readFileSync(guidePath, 'utf8');
const version = guide.match(/Versiune document:\s*([\d.]+)/)?.[1] ?? '?';
const start = guide.indexOf('## 1. Checklist');
const end = guide.indexOf('## Glosar');
if (start < 0 || end < 0) throw new Error('Structura ghidului s-a schimbat: nu găsesc „## 1. Checklist” sau „## Glosar”.');

const body = guide.slice(start, end)
  .replace(/\[([^\]]+)\]\(https:\/\/netopia\.atlassian\.net[^)]*\)/g, '$1')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

writeFileSync(out, `# NETOPIA Payments API v2 — referință

> Generat automat din „API Ghid de Integrare.md” v${version} de \`npm run sync:reference\`. Nu editați manual.

${body}
`);
console.log(`reference.md actualizat din ghidul v${version}`);
