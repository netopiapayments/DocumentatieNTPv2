/**
 * Turns a documentation example into a ready-to-send request, and generates code samples.
 *
 * Example bodies are edited as text (so comments from the guide survive); substitutions are
 * key-based regex replacements, and parsing uses JSON5 so `//` and `/* *\/` comments are tolerated.
 */
import JSON5 from 'json5';
import type { Credentials, LastTx } from './store';

export const isPayment = (path: string) => path.startsWith('/payment/') || path.startsWith('/disbursement/');
export const isOperation = (path: string) => path.startsWith('/operation/');

const setString = (body: string, key: string, value: string) =>
  body.replace(new RegExp(`("${key}"\\s*:\\s*)"[^"\\n]*"`, 'g'), (_m, p: string) => p + JSON.stringify(value));

const setRaw = (body: string, key: string, value: string) =>
  body.replace(new RegExp(`("${key}"\\s*:\\s*)("[^"\\n]*"|[^,\\n}\\s]+)`, 'g'), (_m, p: string) => p + value);

export function nowWithOffset(d = new Date()) {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${off >= 0 ? '+' : '-'}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`
  );
}

export const newOrderId = () => `DOCS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export interface TemplateContext { creds: Credentials; lastTx: LastTx | null }

/** Fills an example body with the user's credentials, a fresh order id/date, or the last transaction. */
export function applyTemplate(body: string, path: string, { creds, lastTx }: TemplateContext) {
  let out = body;
  if (creds.posSignature) out = setString(out, 'posSignature', creds.posSignature);

  if (isPayment(path)) {
    out = setString(out, 'orderID', newOrderId());
    if (path.startsWith('/disbursement/')) out = setString(out, 'id', newOrderId());
    out = setString(out, 'dateTime', nowWithOffset());
  }

  if (isOperation(path)) {
    // In the operation calls, posID is the POS signature.
    if (creds.posSignature) out = setString(out, 'posID', creds.posSignature);
    if (lastTx?.ntpID) out = setString(out, 'ntpID', lastTx.ntpID);
    if (lastTx?.orderID) out = setString(out, 'orderID', lastTx.orderID);
  }
  return out;
}

export function fillTestCard(body: string, cardNumber: string) {
  const year = new Date().getFullYear() + 2;
  let out = setString(body, 'account', cardNumber.replace(/\s+/g, ''));
  out = setRaw(out, 'expMonth', '12');
  out = setRaw(out, 'expYear', String(year));
  out = setString(out, 'secretCode', '111');
  return out;
}

export function parseBody(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON5.parse(text) };
  } catch (e) {
    const msg = e instanceof Error ? e.message.replace(/^JSON5:\s*/, '') : String(e);
    return { ok: false, error: msg };
  }
}

/** Values that are still the guide's placeholders — highlighted so the user knows what to fill in. */
export function findPlaceholders(text: string) {
  const found = new Set<string>();
  for (const m of text.matchAll(/"(XXXX[-X]*|<[^">]+>|bxxx[^"]*|YOUR_[A-Z_]+)"/gi)) found.add(m[1]);
  return [...found];
}

/* ------------------------------------------------------------------ */
/* Code samples                                                        */

export type SnippetLang = 'curl' | 'node' | 'php' | 'python';

export const SNIPPET_LANGS: { id: SnippetLang; label: string; shiki: string }[] = [
  { id: 'curl', label: 'cURL', shiki: 'bash' },
  { id: 'node', label: 'Node.js', shiki: 'javascript' },
  { id: 'php', label: 'PHP', shiki: 'php' },
  { id: 'python', label: 'Python', shiki: 'python' },
];

export function snippet(lang: SnippetLang, url: string, body: unknown): string {
  const json = JSON.stringify(body, null, 2);
  switch (lang) {
    case 'curl':
      return [
        `curl -X POST "${url}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -H "Authorization: $NETOPIA_API_KEY" \\`,
        `  -d '${json.replace(/'/g, `'\\''`)}'`,
      ].join('\n');
    case 'node':
      return [
        `const response = await fetch("${url}", {`,
        `  method: "POST",`,
        `  headers: {`,
        `    "Content-Type": "application/json",`,
        `    Authorization: process.env.NETOPIA_API_KEY,`,
        `  },`,
        `  body: JSON.stringify(${indent(json, 2).trimStart()}),`,
        `});`,
        ``,
        `const data = await response.json();`,
        `console.log(response.status, data);`,
      ].join('\n');
    case 'php':
      return [
        `<?php`,
        `$payload = <<<'JSON'`,
        json,
        `JSON;`,
        ``,
        `$ch = curl_init('${url}');`,
        `curl_setopt_array($ch, [`,
        `    CURLOPT_POST           => true,`,
        `    CURLOPT_RETURNTRANSFER => true,`,
        `    CURLOPT_HTTPHEADER     => [`,
        `        'Content-Type: application/json',`,
        `        'Authorization: ' . getenv('NETOPIA_API_KEY'),`,
        `    ],`,
        `    CURLOPT_POSTFIELDS     => $payload,`,
        `]);`,
        ``,
        `$response = json_decode(curl_exec($ch), true);`,
        `$status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);`,
        `curl_close($ch);`,
      ].join('\n');
    case 'python':
      return [
        `import os`,
        `import requests`,
        ``,
        `payload = ${py(body, 0)}`,
        ``,
        `response = requests.post(`,
        `    "${url}",`,
        `    json=payload,`,
        `    headers={"Authorization": os.environ["NETOPIA_API_KEY"]},`,
        `    timeout=30,`,
        `)`,
        `print(response.status_code, response.json())`,
      ].join('\n');
  }
}

const indent = (s: string, n: number) => s.split('\n').map((l) => ' '.repeat(n) + l).join('\n');

function py(v: unknown, level: number): string {
  const pad = '    '.repeat(level + 1);
  const end = '    '.repeat(level);
  if (v === null) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every((x) => typeof x !== 'object' || x === null)) return `[${v.map((x) => py(x, level)).join(', ')}]`;
    return `[\n${v.map((x) => pad + py(x, level + 1)).join(',\n')},\n${end}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (!entries.length) return '{}';
  return `{\n${entries.map(([k, x]) => `${pad}${JSON.stringify(k)}: ${py(x, level + 1)}`).join(',\n')},\n${end}}`;
}
