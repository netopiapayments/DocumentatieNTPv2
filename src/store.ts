/**
 * Client-side state: environment, credentials and the last transaction.
 *
 * Credentials never leave the browser except in the request sent directly to NETOPIA.
 * They live in sessionStorage by default, or in localStorage when the user opts in to "remember".
 */

export type Env = 'sandbox' | 'production';

export interface Credentials { apiKey: string; posSignature: string; posID: string }

export interface LastTx { env: Env; ntpID: string; orderID: string; at: number }

export const BASE_URLS: Record<Env, string> = {
  sandbox: 'https://secure.sandbox.netopia-payments.com',
  production: 'https://secure.mobilpay.ro/pay',
};

const KEY = 'ntp-docs:v1';
const empty = (): Credentials => ({ apiKey: '', posSignature: '', posID: '' });

interface State {
  env: Env;
  remember: boolean;
  creds: Record<Env, Credentials>;
  lastTx: LastTx | null;
  checklist: Record<string, boolean>;
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

function load(): State {
  const read = (s: () => Storage) => safe(() => JSON.parse(s().getItem(KEY) ?? 'null'), null) as Partial<State> | null;
  const local = read(() => localStorage);
  const session = read(() => sessionStorage);
  const parsed: Partial<State> | null = local?.remember ? local : local || session ? { ...local, ...session } : null;
  return {
    env: parsed?.env === 'production' ? 'production' : 'sandbox',
    remember: Boolean(local?.remember),
    creds: { sandbox: { ...empty(), ...parsed?.creds?.sandbox }, production: { ...empty(), ...parsed?.creds?.production } },
    lastTx: parsed?.lastTx ?? null,
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
      localStorage.setItem(KEY, JSON.stringify({ env: state.env, checklist: state.checklist, remember: false }));
    }
  }, undefined);
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export const store = {
  get env() { return state.env; },
  get remember() { return state.remember; },
  get lastTx() { return state.lastTx && state.lastTx.env === state.env ? state.lastTx : null; },
  creds(env: Env = state.env): Credentials { return state.creds[env]; },
  isConfigured(env: Env = state.env) { return Boolean(state.creds[env].apiKey); },
  baseUrl(env: Env = state.env) { return BASE_URLS[env]; },
  checked(id: string) { return Boolean(state.checklist[id]); },

  setEnv(env: Env) { state.env = env; emit(); },
  setCreds(env: Env, creds: Partial<Credentials>) { state.creds[env] = { ...state.creds[env], ...creds }; emit(); },
  setRemember(v: boolean) { state.remember = v; emit(); },
  setLastTx(tx: LastTx | null) { state.lastTx = tx; emit(); },
  setChecked(id: string, v: boolean) { state.checklist[id] = v; emit(); },
  clearCreds() { state.creds = { sandbox: empty(), production: empty() }; emit(); },

  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
};
