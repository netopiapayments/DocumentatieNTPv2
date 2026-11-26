
export interface Credentials { apiKey: string; posSignature: string }

export interface LastTx { ntpID: string; orderID: string; at: number }

export const SANDBOX_URL = 'https://secure.sandbox.netopia-payments.com';
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
      localStorage.setItem(KEY, JSON.stringify({ checklist: state.checklist, remember: false }));
    }
  }, undefined);
}

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
