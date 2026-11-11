// NETOPIA Payments API v2 — client fără dependențe (Node.js 18+).
// Sursa de adevăr: „API Ghid de Integrare.md” (secțiunile 2–9).
import { createHash, createPublicKey, createVerify, randomUUID } from 'node:crypto';

export const BASE_URLS = Object.freeze({
  sandbox: 'https://secure.sandbox.netopia-payments.com',
  production: 'https://secure.mobilpay.ro/pay',
});

/** IP-urile din care NETOPIA trimite IPN (ghid §3.3). */
export const IPN_IPS = Object.freeze({
  sandbox: '217.156.103.69',
  production: '217.156.103.68',
});

/** Coduri de status ale plății (ghid §8.1) + 15 = necesită 3-D Secure (§7.1, §9.3). */
export const STATUS = Object.freeze({
  NEW: 1,
  PAID: 3,
  CANCELED: 4,
  CONFIRMED: 5,
  REFUNDED: 8,
  ERROR: 11,
  FRAUD: 13,
  NEEDS_3DS: 15,
  EXPIRED: 23,
});

const STATUS_NAMES = Object.freeze({
  1: 'new', 3: 'paid', 4: 'canceled', 5: 'confirmed', 8: 'refunded',
  11: 'error', 13: 'fraud', 15: 'needs3ds', 23: 'expired',
});

export const statusName = (code) => STATUS_NAMES[Number(code)] ?? 'unknown';
/** Plata e încasată (autorizată sau capturată). */
export const isPaid = (code) => Number(code) === STATUS.PAID || Number(code) === STATUS.CONFIRMED;

/** Cheia publică RSA NETOPIA pentru JWT-ul IPN (RS512), aceeași în Sandbox și Producție (ghid §3.4). */
export const NETOPIA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy6pUDAFLVul4y499gz1P
gGSvTSc82U3/ih3e5FDUs/F0Jvfzc4cew8TrBDrw7Y+AYZS37D2i+Xi5nYpzQpu7
ryS4W+qvgAA1SEjiU1Sk2a4+A1HeH+vfZo0gDrIYTh2NSAQnDSDxk5T475ukSSwX
L9tYwO6CpdAv3BtpMT5YhyS3ipgPEnGIQKXjh8GMgLSmRFbgoCTRWlCvu7XOg94N
fS8l4it2qrEldU8VEdfPDfFLlxl3lUoLEmCncCjmF1wRVtk4cNu+WtWQ4mBgxpt0
tX2aJkqp4PV3o5kI4bqHq/MS7HVJ7yxtj/p8kawlVYipGsQj3ypgltQ3bnYV/LRq
8QIDAQAB
-----END PUBLIC KEY-----`;

/** Răspunsul pe care notifyUrl trebuie să-l întoarcă (HTTP 200) ca NETOPIA să nu retrimită IPN-ul. */
export const IPN_ACK = Object.freeze({ errorCode: 0 });

export class NetopiaError extends Error {
  constructor(message, { status, code, response } = {}) {
    super(message);
    this.name = 'NetopiaError';
    this.status = status;
    this.code = code;
    this.response = response;
  }
}

/** Dată ISO 8601 cu offset local, ex. 2026-11-11T17:31:13+02:00. */
export function isoDateTime(d = new Date()) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    + `${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`;
}

const POS_SIGNATURE_RE = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){4}$/i;
export const isValidPosSignature = (s) => typeof s === 'string' && POS_SIGNATURE_RE.test(s.trim());

const envBool = (v) => v != null && /^(1|true|yes|da)$/i.test(String(v).trim());

export class Netopia {
  /**
   * @param {import('./index').NetopiaOptions} opts
   */
  constructor(opts = {}) {
    const { apiKey, posSignature, posID } = opts;
    if (!apiKey) throw new TypeError('Netopia: lipsește apiKey');
    if (!posSignature) throw new TypeError('Netopia: lipsește posSignature');
    this.apiKey = String(apiKey).trim();
    this.posSignature = String(posSignature).trim();
    this.posID = posID != null && posID !== '' ? String(posID).trim() : undefined;
    this.sandbox = opts.sandbox ?? true;
    this.baseUrl = (opts.baseUrl ?? BASE_URLS[this.sandbox ? 'sandbox' : 'production']).replace(/\/+$/, '');
    this.notifyUrl = opts.notifyUrl;
    this.redirectUrl = opts.redirectUrl;
    this.cancelUrl = opts.cancelUrl;
    this.language = opts.language ?? 'ro';
    this.publicKey = opts.publicKey ?? NETOPIA_PUBLIC_KEY;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.fetch = opts.fetch ?? globalThis.fetch;
    if (typeof this.fetch !== 'function') throw new TypeError('Netopia: fetch indisponibil — folosiți Node.js 18+ sau pasați opts.fetch');
  }

  /**
   * Construiește clientul din variabile de mediu:
   * NETOPIA_API_KEY, NETOPIA_POS_SIGNATURE, NETOPIA_POS_ID, NETOPIA_SANDBOX,
   * NETOPIA_NOTIFY_URL / NETOPIA_REDIRECT_URL / NETOPIA_CANCEL_URL
   * (sau APP_URL / NETOPIA_APP_URL, din care se deduc /netopia/notify și /netopia/return).
   */
  static fromEnv(env = process.env, overrides = {}) {
    const app = (env.NETOPIA_APP_URL ?? env.APP_URL ?? '').replace(/\/+$/, '');
    return new Netopia({
      apiKey: env.NETOPIA_API_KEY,
      posSignature: env.NETOPIA_POS_SIGNATURE,
      posID: env.NETOPIA_POS_ID,
      sandbox: env.NETOPIA_SANDBOX == null ? true : envBool(env.NETOPIA_SANDBOX),
      baseUrl: env.NETOPIA_API_BASE_URL || undefined,
      notifyUrl: env.NETOPIA_NOTIFY_URL || (app ? `${app}/api/netopia/notify` : undefined),
      redirectUrl: env.NETOPIA_REDIRECT_URL || (app ? `${app}/netopia/return` : undefined),
      cancelUrl: env.NETOPIA_CANCEL_URL || undefined,
      ...overrides,
    });
  }

  get environment() { return this.sandbox ? 'sandbox' : 'production'; }

  async request(path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try {
      res = await this.fetch(this.baseUrl + path, {
        method: 'POST',
        headers: { Authorization: this.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (err) {
      throw new NetopiaError(`NETOPIA ${path}: request eșuat — ${err?.name === 'AbortError' ? 'timeout' : err?.message ?? err}`);
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data?.message ?? data?.error?.message ?? res.statusText;
      throw new NetopiaError(`NETOPIA ${path}: HTTP ${res.status}${msg ? ` — ${msg}` : ''}`, {
        status: res.status, code: data?.code ?? data?.error?.code, response: data,
      });
    }
    return data;
  }

  /**
   * Inițiază o plată (ghid §5.1). Întoarce paymentURL pentru redirect.
   * @param {import('./index').StartPaymentInput} input
   */
  async startPayment(input) {
    if (input == null || input.amount == null) throw new TypeError('startPayment: lipsește amount');
    const notifyUrl = input.notifyUrl ?? this.notifyUrl;
    const redirectUrl = input.redirectUrl ?? this.redirectUrl;
    if (!notifyUrl) throw new TypeError('startPayment: lipsește notifyUrl (în opțiunile clientului sau în input)');
    if (input.token && !input.ipAddress) {
      // Ghid §7.1: banca procesatoare respinge plățile cu token fără IP-ul plătitorului.
      throw new TypeError('startPayment: ipAddress este obligatoriu pentru plățile cu token');
    }
    const orderID = input.orderID ?? `ORD-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const config = { notifyUrl, language: input.language ?? this.language };
    if (redirectUrl) config.redirectUrl = redirectUrl;
    const cancelUrl = input.cancelUrl ?? this.cancelUrl;
    if (cancelUrl) config.cancelUrl = cancelUrl;

    const order = {
      posSignature: this.posSignature,
      orderID,
      dateTime: input.dateTime ?? isoDateTime(),
      description: input.description ?? `Comanda ${orderID}`,
      amount: input.amount,
      currency: input.currency ?? 'RON',
    };
    if (input.billing) order.billing = { country: 642, countryName: 'Romania', ...input.billing };
    if (input.shipping) order.shipping = input.shipping;
    if (input.clientID) order.clientID = input.clientID;
    if (input.scaExemptionInd) order.scaExemptionInd = input.scaExemptionInd;
    if (input.installments) order.installments = input.installments;
    if (input.products) order.products = input.products;
    if (input.data) order.data = input.data;

    const instrument = { type: 'card' };
    if (input.token) instrument.token = input.token;
    const payment = { options: { installments: 0 }, instrument };
    if (input.split) payment.options.split = input.split;
    const data = { ...(input.paymentData ?? {}) };
    if (input.ipAddress) data.IP_ADDRESS = input.ipAddress;
    if (Object.keys(data).length) payment.data = data;

    const res = await this.request('/payment/card/start', { config, order, payment });
    return {
      orderID,
      paymentURL: res?.payment?.paymentURL,
      ntpID: res?.payment?.ntpID,
      status: res?.payment?.status,
      token: res?.payment?.token,
      customerAction: res?.customerAction && Object.keys(res.customerAction).length ? res.customerAction : undefined,
      error: res?.error,
      raw: res,
    };
  }

  /** Interogare status (ghid §6.3). */
  async getStatus({ ntpID, orderID, posID = this.posID } = {}) {
    if (!posID) throw new TypeError('getStatus: lipsește posID (NETOPIA_POS_ID)');
    return this.request('/operation/status', { posID: String(posID), ntpID: ntpID != null ? String(ntpID) : undefined, orderID });
  }

  /** Credit / refund total sau parțial (ghid §6.1). */
  async refund({ ntpID, amount }) {
    if (!ntpID) throw new TypeError('refund: lipsește ntpID');
    if (amount == null) throw new TypeError('refund: lipsește amount');
    return this.request('/operation/credit', { ntpID: String(ntpID), amount });
  }

  /** Expirarea unui link de plată (ghid §6.2). */
  async expire({ ntpID, orderID, posID = this.posID } = {}) {
    if (!posID) throw new TypeError('expire: lipsește posID (NETOPIA_POS_ID)');
    return this.request('/operation/expire', { posID: String(posID), ntpID: ntpID != null ? String(ntpID) : undefined, orderID });
  }

  /** Verifică un IPN cu cheia publică a clientului (vezi verifyIpn). */
  verifyIpn(rawBody, headers, opts = {}) {
    return verifyIpn(rawBody, headers, { publicKey: this.publicKey, posSignature: this.posSignature, ...opts });
  }

  /** IP-ul din care trebuie să vină IPN-ul pentru mediul curent. */
  isNetopiaIp(ip) {
    return normalizeIp(ip) === IPN_IPS[this.environment];
  }
}

const normalizeIp = (ip) => String(ip ?? '').trim().replace(/^::ffff:/, '');

const b64urlDecode = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** Extrage JWT-ul din headere (Authorization: [Bearer] <jwt> sau Verification-token). */
export function extractIpnToken(headers) {
  if (!headers) return undefined;
  const get = (name) => {
    if (typeof headers.get === 'function') return headers.get(name) ?? undefined; // Fetch Headers
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    const v = key ? headers[key] : undefined;
    return Array.isArray(v) ? v[0] : v;
  };
  const raw = get('verification-token') ?? get('authorization');
  if (!raw) return undefined;
  return String(raw).replace(/^(Bearer|Token)\s+/i, '').trim() || undefined;
}

/**
 * Verifică autenticitatea unui IPN (ghid §3.4):
 * JWT RS512 semnat de NETOPIA, iar claim-ul `sub` = SHA-512 al body-ului raw.
 * @returns {{ valid: true, payload: object, claims: object } | { valid: false, reason: string, payload?: object }}
 */
export function verifyIpn(rawBody, headers, { publicKey = NETOPIA_PUBLIC_KEY, posSignature, now = Date.now() } = {}) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ''), 'utf8');
  let payload;
  try { payload = JSON.parse(body.toString('utf8')); } catch { return { valid: false, reason: 'body-ul nu este JSON valid' }; }

  const token = typeof headers === 'string' ? headers.replace(/^(Bearer|Token)\s+/i, '').trim() : extractIpnToken(headers);
  if (!token) return { valid: false, reason: 'lipsește token-ul JWT (Authorization / Verification-token)', payload };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'token JWT malformat', payload };

  let header, claims;
  try {
    header = JSON.parse(b64urlDecode(parts[0]).toString('utf8'));
    claims = JSON.parse(b64urlDecode(parts[1]).toString('utf8'));
  } catch { return { valid: false, reason: 'token JWT nedecodabil', payload }; }
  if (header.alg !== 'RS512') return { valid: false, reason: `algoritm JWT neașteptat: ${header.alg}`, payload };

  let sigOk = false;
  try {
    const v = createVerify('RSA-SHA512');
    v.update(`${parts[0]}.${parts[1]}`);
    sigOk = v.verify(createPublicKey(publicKey), b64urlDecode(parts[2]));
  } catch { sigOk = false; }
  if (!sigOk) return { valid: false, reason: 'semnătura RS512 invalidă', payload };

  if (claims.exp != null && Number(claims.exp) * 1000 < now - 60_000) return { valid: false, reason: 'token JWT expirat', payload };

  const digest = createHash('sha512').update(body).digest();
  const sub = String(claims.sub ?? '');
  // NETOPIA trimite hash-ul în base64; acceptăm și base64url / hex pentru robustețe.
  const subOk = sub === digest.toString('base64')
    || sub === digest.toString('base64url')
    || sub.toLowerCase() === digest.toString('hex');
  if (!subOk) return { valid: false, reason: 'hash-ul SHA-512 al body-ului nu corespunde cu claim-ul sub', payload };

  if (posSignature && claims.aud != null) {
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.map(String).includes(posSignature)) return { valid: false, reason: 'token-ul nu este emis pentru acest POS (aud)', payload };
  }
  return { valid: true, payload, claims };
}

/** Rezumat util dintr-un IPN valid. */
export function parseIpn(payload) {
  const p = payload?.payment ?? {};
  return {
    orderID: payload?.order?.orderID,
    ntpID: p.ntpID,
    status: p.status,
    statusName: statusName(p.status),
    paid: isPaid(p.status),
    amount: p.amount,
    currency: p.currency,
    code: p.code,
    message: p.message,
    token: p.instrument?.token ?? p.token,
  };
}

export default Netopia;
