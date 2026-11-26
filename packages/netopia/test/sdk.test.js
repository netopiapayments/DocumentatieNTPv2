import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import { Netopia, verifyIpn, parseIpn, isValidPosSignature, isoDateTime, NetopiaError, BASE_URLS, STATUS } from '../src/index.js';

const SIG = 'ABCD-EFGH-IJKL-MNOP-QRST';

function mockFetch(response = { payment: { paymentURL: 'https://pay/x', ntpID: '1', status: 1 } }, status = 200) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(response), { status });
  };
  fn.calls = calls;
  return fn;
}

const client = (fetch, extra = {}) => new Netopia({ apiKey: 'KEY', posSignature: SIG, posID: '123', notifyUrl: 'https://shop/notify', redirectUrl: 'https://shop/return', fetch, ...extra });

test('startPayment trimite request-ul din ghid §5.1 la Sandbox', async () => {
  const f = mockFetch();
  const r = await client(f).startPayment({ amount: 100, description: 'Test', billing: { email: 'a@b.ro' } });
  const { url, init, body } = f.calls[0];
  assert.equal(url, `${BASE_URLS.sandbox}/payment/card/start`);
  assert.equal(init.headers.Authorization, 'KEY');
  assert.equal(body.order.posSignature, SIG);
  assert.equal(body.order.amount, 100);
  assert.equal(body.order.currency, 'RON');
  assert.equal(body.order.billing.country, 642);
  assert.match(body.order.dateTime, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
  assert.equal(body.config.notifyUrl, 'https://shop/notify');
  assert.equal(body.config.redirectUrl, 'https://shop/return');
  assert.deepEqual(body.payment.instrument, { type: 'card' });
  assert.equal(r.paymentURL, 'https://pay/x');
  assert.equal(r.orderID, body.order.orderID);
});

test('Producție folosește secure.mobilpay.ro/pay', async () => {
  const f = mockFetch({});
  await client(f, { sandbox: false }).refund({ ntpID: '9', amount: 5 });
  assert.equal(f.calls[0].url, 'https://secure.mobilpay.ro/pay/operation/credit');
  assert.deepEqual(f.calls[0].body, { ntpID: '9', amount: 5 });
});

test('status și expire includ posID', async () => {
  const f = mockFetch({});
  const n = client(f);
  await n.getStatus({ ntpID: 7, orderID: 'O1' });
  await n.expire({ ntpID: '7', orderID: 'O1' });
  assert.deepEqual(f.calls[0].body, { posID: '123', ntpID: '7', orderID: 'O1' });
  assert.ok(f.calls[1].url.endsWith('/operation/expire'));
});

test('plata cu token cere IP-ul plătitorului (§7.1)', async () => {
  const n = client(mockFetch());
  await assert.rejects(n.startPayment({ amount: 1, token: 't' }), /ipAddress/);
  const f = mockFetch();
  await client(f).startPayment({ amount: 1, token: 't', scaExemptionInd: 'MIT', ipAddress: '1.2.3.4' });
  assert.equal(f.calls[0].body.payment.instrument.token, 't');
  assert.equal(f.calls[0].body.payment.data.IP_ADDRESS, '1.2.3.4');
  assert.equal(f.calls[0].body.order.scaExemptionInd, 'MIT');
});

test('erorile HTTP devin NetopiaError', async () => {
  const n = client(mockFetch({ message: 'Invalid API key' }, 401));
  await assert.rejects(n.startPayment({ amount: 1 }), (e) => e instanceof NetopiaError && e.status === 401 && /Invalid API key/.test(e.message));
});

test('fromEnv deduce URL-urile din NETOPIA_APP_URL', () => {
  const n = Netopia.fromEnv({ NETOPIA_API_KEY: 'k', NETOPIA_POS_SIGNATURE: SIG, NETOPIA_SANDBOX: 'false', NETOPIA_APP_URL: 'https://shop.ro/' }, { fetch: () => {} });
  assert.equal(n.sandbox, false);
  assert.equal(n.notifyUrl, 'https://shop.ro/api/netopia/notify');
  assert.equal(n.redirectUrl, 'https://shop.ro/netopia/return');
  assert.throws(() => Netopia.fromEnv({}), /apiKey/);
});

test('validare semnătură POS și dată', () => {
  assert.ok(isValidPosSignature(SIG));
  assert.ok(!isValidPosSignature('ABCD-EFGH'));
  assert.match(isoDateTime(new Date()), /[+-]\d\d:\d\d$/);
});

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pub = publicKey.export({ type: 'spki', format: 'pem' });
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function sign(rawBody, claims = {}, key = privateKey) {
  const head = b64u({ alg: 'RS512', typ: 'JWT' });
  const sub = createHash('sha512').update(rawBody).digest('base64');
  const payload = b64u({ iss: 'NETOPIA Payments', aud: [SIG], sub, iat: Math.floor(Date.now() / 1000), ...claims });
  const s = createSign('RSA-SHA512').update(`${head}.${payload}`).sign(key).toString('base64url');
  return `${head}.${payload}.${s}`;
}

const ipnBody = JSON.stringify({ order: { orderID: 'O1' }, payment: { ntpID: '2502464', amount: 100, currency: 'RON', code: '00', message: 'Approved', status: 3, instrument: { token: 'tok' } } });

test('IPN valid este acceptat (Authorization: Bearer și Verification-token)', () => {
  const jwt = sign(ipnBody);
  for (const headers of [{ authorization: `Bearer ${jwt}` }, { 'Verification-token': jwt }, new Headers({ Authorization: jwt })]) {
    const r = verifyIpn(ipnBody, headers, { publicKey: pub, posSignature: SIG });
    assert.equal(r.valid, true, r.reason);
  }
  const s = parseIpn(JSON.parse(ipnBody));
  assert.equal(s.paid, true);
  assert.equal(s.statusName, 'paid');
  assert.equal(s.token, 'tok');
  assert.equal(s.ntpID, '2502464');
});

test('IPN cu body modificat / semnătură străină / alt POS este respins', () => {
  const jwt = sign(ipnBody);
  const tampered = ipnBody.replace('"amount":100', '"amount":1');
  assert.match(verifyIpn(tampered, { authorization: jwt }, { publicKey: pub }).reason, /SHA-512/);

  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  assert.match(verifyIpn(ipnBody, { authorization: sign(ipnBody, {}, other) }, { publicKey: pub }).reason, /semnătura/);

  assert.match(verifyIpn(ipnBody, { authorization: jwt }, { publicKey: pub, posSignature: 'ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ' }).reason, /aud/);
  assert.match(verifyIpn(ipnBody, {}, { publicKey: pub }).reason, /lipsește/);
  assert.match(verifyIpn(ipnBody, { authorization: sign(ipnBody, { exp: 1 }) }, { publicKey: pub }).reason, /expirat/);
});

test('cheia publică NETOPIA implicită respinge un token semnat de altcineva', () => {
  assert.equal(verifyIpn(ipnBody, { authorization: sign(ipnBody) }).valid, false);
});

test('STATUS conține codurile din ghid', () => {
  assert.equal(STATUS.PAID, 3);
  assert.equal(STATUS.CONFIRMED, 5);
  assert.equal(STATUS.NEEDS_3DS, 15);
});
