export declare const BASE_URLS: { readonly sandbox: string; readonly production: string };
export declare const IPN_IPS: { readonly sandbox: string; readonly production: string };
export declare const STATUS: {
  readonly NEW: 1; readonly PAID: 3; readonly CANCELED: 4; readonly CONFIRMED: 5; readonly REFUNDED: 8;
  readonly ERROR: 11; readonly FRAUD: 13; readonly NEEDS_3DS: 15; readonly EXPIRED: 23;
};
export type StatusName = 'new' | 'paid' | 'canceled' | 'confirmed' | 'refunded' | 'error' | 'fraud' | 'needs3ds' | 'expired' | 'unknown';
export declare function statusName(code: number | string | undefined): StatusName;
export declare function isPaid(code: number | string | undefined): boolean;
export declare const NETOPIA_PUBLIC_KEY: string;
export declare const IPN_ACK: { readonly errorCode: 0 };
export declare function isoDateTime(d?: Date): string;
export declare function isValidPosSignature(s: unknown): boolean;

export declare class NetopiaError extends Error {
  status?: number;
  code?: string | number;
  response?: unknown;
}

export interface NetopiaOptions {
  apiKey: string;
  posSignature: string;
  posID?: string | number;
  sandbox?: boolean;
  baseUrl?: string;
  notifyUrl?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  language?: string;
  publicKey?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface Address {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: number;
  countryName?: string;
  state?: string;
  postalCode?: string;
  details?: string;
}

export interface StartPaymentInput {
  amount: number;
  currency?: string;
  orderID?: string;
  description?: string;
  dateTime?: string;
  billing?: Address;
  shipping?: Address;
  language?: string;
  notifyUrl?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  clientID?: string;
  token?: string;
  scaExemptionInd?: 'MIT' | 'TRA';
  ipAddress?: string;
  installments?: { selected?: number; available?: number[] };
  split?: { amount: number; posID: number }[];
  products?: unknown[];
  data?: Record<string, unknown>;
  paymentData?: Record<string, string>;
}

export interface CustomerAction {
  type?: 'Authentication3D' | string;
  url?: string;
  authenticationToken?: string;
  formData?: Record<string, string>;
}

export interface StartPaymentResult {
  orderID: string;
  paymentURL?: string;
  ntpID?: string;
  status?: number;
  token?: string;
  customerAction?: CustomerAction;
  error?: { code?: string; message?: string };
  raw: any;
}

export type IpnHeaders = Headers | Record<string, string | string[] | undefined> | string;

export type IpnVerification =
  | { valid: true; payload: any; claims: Record<string, unknown> }
  | { valid: false; reason: string; payload?: any };

export interface IpnSummary {
  orderID?: string;
  ntpID?: string;
  status?: number;
  statusName: StatusName;
  paid: boolean;
  amount?: number;
  currency?: string;
  code?: string;
  message?: string;
  token?: string;
}

export declare function extractIpnToken(headers: IpnHeaders): string | undefined;
export declare function verifyIpn(
  rawBody: string | Buffer,
  headers: IpnHeaders,
  opts?: { publicKey?: string; posSignature?: string; now?: number },
): IpnVerification;
export declare function parseIpn(payload: any): IpnSummary;

export declare class Netopia {
  constructor(opts: NetopiaOptions);
  static fromEnv(env?: Record<string, string | undefined>, overrides?: Partial<NetopiaOptions>): Netopia;
  readonly environment: 'sandbox' | 'production';
  apiKey: string;
  posSignature: string;
  posID?: string;
  sandbox: boolean;
  baseUrl: string;
  request<T = any>(path: string, body: unknown): Promise<T>;
  startPayment(input: StartPaymentInput): Promise<StartPaymentResult>;
  getStatus(q: { ntpID?: string; orderID?: string; posID?: string | number }): Promise<any>;
  refund(q: { ntpID: string; amount: number }): Promise<any>;
  expire(q: { ntpID?: string; orderID?: string; posID?: string | number }): Promise<any>;
  verifyIpn(rawBody: string | Buffer, headers: IpnHeaders, opts?: { now?: number }): IpnVerification;
  isNetopiaIp(ip: string | undefined): boolean;
}

export default Netopia;
