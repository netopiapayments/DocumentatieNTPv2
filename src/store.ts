/**
 * Client-side state: credentials and the last transaction.
 *
 * The documentation only ever calls the NETOPIA Sandbox. Credentials never leave the browser
 * except in the request sent directly to the Sandbox API. They live in sessionStorage by default,
 * or in localStorage when the user opts in to "remember".
 */

export interface Credentials { apiKey: string; posSignature: string }

export interface LastTx { ntpID: string; orderID: string; at: number }

/** The only host requests are sent to. */
export const SANDBOX_URL = 'https://secure-sandbox.netopia-payments.com';
/** Shown in code samples only, for features that don't exist in Sandbox (e.g. Money Send). Never called. */
export const PRODUCTION_URL = 'https://secure.mobilpay.ro/pay';

const KEY = 'ntp-docs:v1';
const empty = (): Credentials => ({ apiKey: '', posSignature: '' });

interface State {
  remember: boolean;
  creds: Credentials;
  lastTx: LastTx | null;
  checklist: Record<string, boolean>;
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

function load(): State {
  const read = (s: () => Storage) => safe(() => JSON.parse(s().getItem(KEY) ?? 'null'), null) as any;
  const local = read(() => localStorage);
  const session = read(() => sessionStorage);
  const parsed = local?.remember ? local : local || session ? { ...local, ...session } : null;
  // Older versions stored { sandbox, production } credentials; keep only Sandbox, drop Production.
  const savedCreds = parsed?.creds?.sandbox ?? parsed?.creds ?? {};
  const tx = parsed?.lastTx;
  return {
    remember: Boolean(local?.remember),
    creds: { apiKey: String(savedCreds.apiKey ?? ''), posSignature: String(savedCreds.posSignature ?? '') },
    lastTx: tx?.ntpID && tx.env !== 'production' ? { ntpID: String(tx.ntpID), orderID: String(tx.orderID ?? ''), at: Number(tx.at) || 0 } : null,
    checklist: parsed?.checklist ?? {},
  };
}

const state = load();
const listeners = new Set<() => void>();

function persist() {
  const json = JSON.stringify(state);
  safe(() => {
    if (state.remember) {
      localStorage.setItem(KEY, json);
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, json);
      // Keep non-sensitive preferences across visits even when credentials aren't remembered.
      localStorage.setItem(KEY, JSON.stringify({ checklist: state.checklist, remember: false }));
    }
  }, undefined);
}

// Rewrite storage right away so credentials saved for Production by older versions are erased.
persist();

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export const store = {
  get remember() { return state.remember; },
  get lastTx() { return state.lastTx; },
  creds(): Credentials { return state.creds; },
  isConfigured() { return Boolean(state.creds.apiKey); },
  checked(id: string) { return Boolean(state.checklist[id]); },

  setCreds(creds: Partial<Credentials>) { state.creds = { ...state.creds, ...creds }; emit(); },
  setRemember(v: boolean) { state.remember = v; emit(); },
  setLastTx(tx: LastTx | null) { state.lastTx = tx; emit(); },
  setChecked(id: string, v: boolean) { state.checklist[id] = v; emit(); },
  clearCreds() { state.creds = empty(); emit(); },

  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
};
