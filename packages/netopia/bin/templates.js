
const HEADER = '// Generat de `npx netopia init`. Poate fi regenerat cu --force (fișierul cu hook-uri nu se suprascrie).';

export function nextLib({ ts }) {
  const t = (typed, plain) => (ts ? typed : plain);
  return `${HEADER}
import { Netopia } from 'netopia';

${t('let client: Netopia | undefined;', 'let client;')}

/** Clientul NETOPIA, construit din .env.local la prima utilizare. */
export function getNetopia()${t(': Netopia', '')} {
  client ??= Netopia.fromEnv();
  return client;
}
`;
}

export function nextHooks({ ts }) {
  const t = (typed, plain) => (ts ? typed : plain);
  return `// Logica magazinului pentru plăți NETOPIA. Generat o singură dată — editați liber.
${t("import type { StartPaymentInput, IpnSummary } from 'netopia';\n", '')}
/**
 * Transformă cererea din frontend într-o comandă de plată.
 * IMPORTANT: în producție, suma trebuie calculată pe server (din coș / baza de date),
 * nu luată din ce trimite browser-ul.
 */
export async function resolveOrder(body${t(': any', '')})${t(': Promise<StartPaymentInput>', '')} {
  if (process.env.NETOPIA_SANDBOX === 'false') {
    throw new Error('resolveOrder: implementați calculul sumei pe server înainte de Producție (lib/netopia-hooks)');
  }
  return {
    amount: Number(body?.amount ?? 1),
    currency: body?.currency ?? 'RON',
    description: body?.description ?? 'Comandă test',
    orderID: body?.orderID,
    billing: body?.billing ?? { email: 'client@example.com', firstName: 'Test', lastName: 'Client', city: 'Bucuresti' },
  };
}

/**
 * Apelat pentru fiecare IPN verificat. Actualizați aici comanda în baza de date.
 * Salvați ntpID (necesar pentru refund / status / expire) și, dacă există, token-ul cardului.
 * Trebuie să fie idempotent: NETOPIA poate retrimite aceeași notificare.
 */
export async function onPaymentUpdate(ipn${t(': IpnSummary', '')}, raw${t(': any', '')})${t(': Promise<void>', '')} {
  console.log('[netopia] IPN', ipn.orderID, ipn.statusName, ipn.ntpID);
}
`;
}

export function nextStartRoute({ ts }) {
  const t = (typed, plain) => (ts ? typed : plain);
  return `${HEADER}
import { NextResponse } from 'next/server';
import { getNetopia } from '../../../../lib/netopia';
import { resolveOrder } from '../../../../lib/netopia-hooks';

export const runtime = 'nodejs';

/** POST /api/netopia/start → { paymentURL, orderID }. Frontend-ul face redirect la paymentURL. */
export async function POST(req${t(': Request', '')}) {
  try {
    const body = await req.json().catch(() => ({}));
    const order = await resolveOrder(body);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const result = await getNetopia().startPayment({ ...order, ipAddress: order.ipAddress ?? ip });
    if (result.customerAction) return NextResponse.json({ orderID: result.orderID, customerAction: result.customerAction });
    if (!result.paymentURL) return NextResponse.json({ error: result.error ?? 'NETOPIA nu a întors paymentURL' }, { status: 502 });
    return NextResponse.json({ orderID: result.orderID, paymentURL: result.paymentURL });
  } catch (err${t(': any', '')}) {
    console.error('[netopia] start', err);
    return NextResponse.json({ error: err?.message ?? 'Eroare la inițierea plății' }, { status: err?.status ?? 500 });
  }
}
`;
}

export function nextNotifyRoute({ ts }) {
  const t = (typed, plain) => (ts ? typed : plain);
  return `${HEADER}
import { NextResponse } from 'next/server';
import { IPN_ACK, parseIpn } from 'netopia';
import { getNetopia } from '../../../../lib/netopia';
import { onPaymentUpdate } from '../../../../lib/netopia-hooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/netopia/notify — IPN de la NETOPIA. Răspunde { errorCode: 0 } doar după procesare. */
export async function POST(req${t(': Request', '')}) {
  const raw = await req.text(); // body-ul brut, necesar pentru verificarea SHA-512
  const check = getNetopia().verifyIpn(raw, req.headers);
  if (!check.valid) {
    console.warn('[netopia] IPN respins:', check.reason);
    return NextResponse.json({ errorCode: 1, errorMessage: check.reason }, { status: 400 });
  }
  try {
    await onPaymentUpdate(parseIpn(check.payload), check.payload);
  } catch (err) {
    console.error('[netopia] onPaymentUpdate', err);
    return NextResponse.json({ errorCode: 1, errorMessage: 'procesare eșuată' }, { status: 500 }); // NETOPIA va retrimite
  }
  return NextResponse.json(IPN_ACK);
}
`;
}

export function nextReturnPage({ ts }) {
  return `${HEADER}
export default function NetopiaReturn() {
  return (
    <main style={{ maxWidth: 560, margin: '64px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Mulțumim!</h1>
      <p>Plata este în curs de confirmare. Vei primi un e-mail imediat ce comanda este confirmată.</p>
      <p><a href="/">Înapoi la magazin</a></p>
    </main>
  );
}
`;
}

const RETURN_HTML = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plată</title>
<main style="max-width:560px;margin:64px auto;padding:16px;font-family:system-ui,sans-serif"><h1>Mulțumim!</h1>
<p>Plata este în curs de confirmare. Vei primi un e-mail imediat ce comanda este confirmată.</p><p><a href="/">Înapoi la magazin</a></p></main>`;

export function expressRouter({ esm }) {
  const imports = esm
    ? `import express from 'express';
import { Netopia, IPN_ACK, parseIpn } from 'netopia';
import { resolveOrder, onPaymentUpdate } from './hooks.js';`
    : `const express = require('express');
const { resolveOrder, onPaymentUpdate } = require('./hooks.js');
const sdk = import('netopia'); // pachetul este ESM`;
  const getClient = esm
    ? `let client;
const getNetopia = async () => (client ??= Netopia.fromEnv());`
    : `let client;
const getNetopia = async () => (client ??= (await sdk).Netopia.fromEnv());`;
  const ack = esm ? 'IPN_ACK' : '(await sdk).IPN_ACK';
  const parse = esm ? 'parseIpn' : '(await sdk).parseIpn';
  return `${HEADER}
${imports}

// Citește .env dacă variabilele nu sunt deja setate (Node 20.12+).
if (!process.env.NETOPIA_API_KEY) { try { process.loadEnvFile?.(); } catch {} }

${getClient}

const router = express.Router();

/** POST /api/netopia/start → { paymentURL, orderID }. Frontend-ul face redirect la paymentURL. */
router.post('/api/netopia/start', express.json(), async (req, res) => {
  try {
    const order = await resolveOrder(req.body ?? {});
    const result = await (await getNetopia()).startPayment({ ...order, ipAddress: order.ipAddress ?? req.ip });
    if (result.customerAction) return res.json({ orderID: result.orderID, customerAction: result.customerAction });
    if (!result.paymentURL) return res.status(502).json({ error: result.error ?? 'NETOPIA nu a întors paymentURL' });
    res.json({ orderID: result.orderID, paymentURL: result.paymentURL });
  } catch (err) {
    console.error('[netopia] start', err);
    res.status(err?.status ?? 500).json({ error: err?.message ?? 'Eroare la inițierea plății' });
  }
});

/** POST /api/netopia/notify — IPN de la NETOPIA. Trebuie montat ÎNAINTE de express.json() global. */
router.post('/api/netopia/notify', express.raw({ type: () => true, limit: '1mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    console.error('[netopia] IPN: body-ul a fost deja parsat — montați routerul NETOPIA înainte de express.json()');
    return res.status(500).json({ errorCode: 1, errorMessage: 'raw body indisponibil' });
  }
  const check = (await getNetopia()).verifyIpn(req.body, req.headers);
  if (!check.valid) {
    console.warn('[netopia] IPN respins:', check.reason);
    return res.status(400).json({ errorCode: 1, errorMessage: check.reason });
  }
  try {
    await onPaymentUpdate(${parse}(check.payload), check.payload);
  } catch (err) {
    console.error('[netopia] onPaymentUpdate', err);
    return res.status(500).json({ errorCode: 1, errorMessage: 'procesare eșuată' }); // NETOPIA va retrimite
  }
  res.json(${ack});
});

/** GET /netopia/return — pagina la care revine clientul după plată. */
router.get('/netopia/return', (_req, res) => {
  res.type('html').send(${JSON.stringify(RETURN_HTML)});
});

${esm ? 'export default router;' : 'module.exports = router;'}
`;
}

export function expressHooks({ esm }) {
  const exp = (name) => (esm ? `export async function ${name}` : `async function ${name}`);
  return `// Logica magazinului pentru plăți NETOPIA. Generat o singură dată — editați liber.

/**
 * Transformă cererea din frontend într-o comandă de plată.
 * IMPORTANT: în producție, suma trebuie calculată pe server (din coș / baza de date),
 * nu luată din ce trimite browser-ul.
 */
${exp('resolveOrder')}(body) {
  if (process.env.NETOPIA_SANDBOX === 'false') {
    throw new Error('resolveOrder: implementați calculul sumei pe server înainte de Producție (netopia/hooks.js)');
  }
  return {
    amount: Number(body.amount ?? 1),
    currency: body.currency ?? 'RON',
    description: body.description ?? 'Comandă test',
    orderID: body.orderID,
    billing: body.billing ?? { email: 'client@example.com', firstName: 'Test', lastName: 'Client', city: 'Bucuresti' },
  };
}

/**
 * Apelat pentru fiecare IPN verificat. Actualizați aici comanda în baza de date.
 * Salvați ntpID (necesar pentru refund / status / expire) și, dacă există, token-ul cardului.
 * Trebuie să fie idempotent: NETOPIA poate retrimite aceeași notificare.
 */
${exp('onPaymentUpdate')}(ipn, raw) {
  console.log('[netopia] IPN', ipn.orderID, ipn.statusName, ipn.ntpID);
}
${esm ? '' : '\nmodule.exports = { resolveOrder, onPaymentUpdate };\n'}`;
}

export function plainHandlers() {
  return `${HEADER}
// Handlere independente de framework. Legați-le la rutele serverului dvs.:
//   POST /api/netopia/start   → handleStart(jsonBody, clientIp)
//   POST /api/netopia/notify  → handleNotify(rawBodyBuffer, headers)   (body-ul BRUT, neparsat!)
import { Netopia, IPN_ACK, parseIpn } from 'netopia';
import { resolveOrder, onPaymentUpdate } from './hooks.js';

if (!process.env.NETOPIA_API_KEY) { try { process.loadEnvFile?.(); } catch {} }

let client;
export const getNetopia = () => (client ??= Netopia.fromEnv());

/** @returns {Promise<{ status: number, body: object }>} */
export async function handleStart(body, clientIp) {
  try {
    const order = await resolveOrder(body ?? {});
    const r = await getNetopia().startPayment({ ...order, ipAddress: order.ipAddress ?? clientIp });
    if (r.customerAction) return { status: 200, body: { orderID: r.orderID, customerAction: r.customerAction } };
    if (!r.paymentURL) return { status: 502, body: { error: r.error ?? 'NETOPIA nu a întors paymentURL' } };
    return { status: 200, body: { orderID: r.orderID, paymentURL: r.paymentURL } };
  } catch (err) {
    return { status: err?.status ?? 500, body: { error: err?.message ?? 'Eroare la inițierea plății' } };
  }
}

/** @returns {Promise<{ status: number, body: object }>} */
export async function handleNotify(rawBody, headers) {
  const check = getNetopia().verifyIpn(rawBody, headers);
  if (!check.valid) return { status: 400, body: { errorCode: 1, errorMessage: check.reason } };
  try {
    await onPaymentUpdate(parseIpn(check.payload), check.payload);
  } catch {
    return { status: 500, body: { errorCode: 1, errorMessage: 'procesare eșuată' } };
  }
  return { status: 200, body: IPN_ACK };
}
`;
}
