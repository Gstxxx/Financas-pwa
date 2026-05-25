/**
 * Pluggy Open Finance client. Lives in the main process so the
 * clientSecret never touches the renderer (and so the apiKey cache
 * survives renderer reloads).
 *
 * Pluggy auth model:
 *   1. POST /auth { clientId, clientSecret } → { apiKey } (~24h TTL)
 *   2. POST /connect_token { itemId? } → { accessToken } (~30min, for the
 *      web-connect widget)
 *   3. GET /items/:id, /accounts?itemId=, /transactions?accountId= use
 *      `X-API-KEY: <apiKey>` header
 *
 * We cache apiKey in memory + write it to KV so a renderer poll right
 * after boot doesn't need a network roundtrip first.
 */

import { kvGetRaw, kvSetRaw, kvDelete } from './db';

const API_DEV = 'https://api.pluggy.ai';
const API_DASHBOARD = 'https://my-api.pluggy.ai';
const KEY_CREDENTIALS = 'finance_pluggy_credentials';
const KEY_API_KEY = 'finance_pluggy_api_key';
const KEY_APP_SESSION = 'finance_pluggy_app_session';

interface Credentials {
  clientId: string;
  clientSecret: string;
}

interface ApiKeyCache {
  apiKey: string;
  /** ISO; we proactively refresh ~1h before. */
  expiresAt: string;
}

let apiKeyMem: ApiKeyCache | null = null;

function readCredentials(): Credentials | null {
  const raw = kvGetRaw(KEY_CREDENTIALS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Credentials;
    if (!parsed.clientId || !parsed.clientSecret) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readApiKey(): ApiKeyCache | null {
  if (apiKeyMem) return apiKeyMem;
  const raw = kvGetRaw(KEY_API_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ApiKeyCache;
    apiKeyMem = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeApiKey(entry: ApiKeyCache): void {
  apiKeyMem = entry;
  kvSetRaw(KEY_API_KEY, JSON.stringify(entry));
}

function clearApiKey(): void {
  apiKeyMem = null;
  kvDelete(KEY_API_KEY);
}

async function fetchJson<T>(
  url: string,
  init: RequestInit & { silent4xx?: boolean } = {}
): Promise<T> {
  const { silent4xx, ...rest } = init;
  const res = await fetch(url, rest);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (silent4xx && res.status >= 400 && res.status < 500) {
      throw new Error(`Pluggy ${res.status}: ${text || res.statusText}`);
    }
    throw new Error(`Pluggy ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

// ─── App-session mode (dashboard JWT) ──────────────────────────────
// Alternative auth: user pastes their `my-api.pluggy.ai` JWT (captured
// from the meu.pluggy.ai web app). We then call the dashboard API
// directly with `Authorization: Bearer <jwt>` instead of going through
// the dev clientId/secret + apiKey dance. Tokens expire in ~24h so the
// user has to re-paste; we surface the expiry in the UI.

function readAppSession(): string | null {
  const raw = kvGetRaw(KEY_APP_SESSION);
  return raw && raw.trim() ? raw.trim() : null;
}

interface AuthInfo {
  mode: 'session' | 'dev';
  baseUrl: string;
  headers: Record<string, string>;
}

async function getAuth(): Promise<AuthInfo> {
  // Session takes priority. If the user pasted a JWT, we use the
  // dashboard API regardless of whether dev credentials are also set.
  const session = readAppSession();
  if (session) {
    return {
      mode: 'session',
      baseUrl: API_DASHBOARD,
      headers: {
        Authorization: `Bearer ${session}`,
        // Mimic the browser request — some dashboard endpoints check
        // Referer to keep random scripts away.
        Referer: 'https://meu.pluggy.ai/',
      },
    };
  }
  const apiKey = await getApiKey();
  return {
    mode: 'dev',
    baseUrl: API_DEV,
    headers: { 'X-API-KEY': apiKey },
  };
}

/**
 * Returns a valid apiKey, refreshing if cache is missing/expired.
 * Throws if credentials aren't configured. (Dev-API path only — session
 * mode never calls this.)
 */
async function getApiKey(force = false): Promise<string> {
  const creds = readCredentials();
  if (!creds) throw new Error('Credenciais Pluggy não configuradas');

  const cached = readApiKey();
  if (!force && cached) {
    const ttlMs = new Date(cached.expiresAt).getTime() - Date.now();
    if (ttlMs > 60 * 60 * 1000) {
      return cached.apiKey;
    }
  }

  const data = await fetchJson<{ apiKey: string }>(`${API_DEV}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret }),
  });
  // Pluggy apiKey is good for ~2h but we cache 90min to leave headroom.
  const expiresAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  writeApiKey({ apiKey: data.apiKey, expiresAt });
  return data.apiKey;
}

async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let auth = await getAuth();
  const callOnce = (a: AuthInfo) =>
    fetchJson<T>(`${a.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...a.headers,
        ...(init.headers ?? {}),
      },
    });
  try {
    return await callOnce(auth);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/401|403/.test(msg)) {
      // Dev mode: try refreshing the apiKey once and re-call.
      // Session mode: the JWT can't be refreshed from here — caller has
      // to paste a fresh one. Surface the error so the UI can prompt.
      if (auth.mode === 'dev') {
        await getApiKey(true);
        auth = await getAuth();
        return await callOnce(auth);
      }
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Public surface — exposed via IPC in main.ts
// ─────────────────────────────────────────────────────────────────────

export function setCredentials(creds: Credentials): void {
  kvSetRaw(KEY_CREDENTIALS, JSON.stringify(creds));
  clearApiKey(); // force fresh /auth on next call
}

export function hasCredentials(): boolean {
  return !!readCredentials();
}

export function clearCredentials(): void {
  kvDelete(KEY_CREDENTIALS);
  clearApiKey();
}

export async function testCredentials(): Promise<{ ok: boolean; message?: string }> {
  try {
    await getApiKey(true);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

// ─── App session (dashboard JWT) public surface ────────────────────

export interface AppSessionInfo {
  hasSession: boolean;
  email?: string;
  expiresAt?: string; // ISO
  expired?: boolean;
  subject?: string;
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → standard base64 + pad
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export function setAppSession(token: string): void {
  const trimmed = token.trim();
  if (!trimmed) {
    kvDelete(KEY_APP_SESSION);
    return;
  }
  kvSetRaw(KEY_APP_SESSION, trimmed);
}

export function clearAppSession(): void {
  kvDelete(KEY_APP_SESSION);
}

export function getAppSessionInfo(): AppSessionInfo {
  const token = readAppSession();
  if (!token) return { hasSession: false };
  const claims = decodeJwt(token);
  if (!claims) return { hasSession: true };
  const exp = typeof claims.exp === 'number' ? (claims.exp as number) * 1000 : undefined;
  const sub = typeof claims.sub === 'string' ? (claims.sub as string) : undefined;
  // The email lives under a custom claim Pluggy issues:
  //   "https://api.pluggy.ai/email": "..."
  const email = (claims as Record<string, unknown>)['https://api.pluggy.ai/email'];
  return {
    hasSession: true,
    email: typeof email === 'string' ? email : undefined,
    expiresAt: exp ? new Date(exp).toISOString() : undefined,
    expired: exp ? exp < Date.now() : undefined,
    subject: sub,
  };
}

/**
 * Pings an authenticated endpoint to verify the pasted JWT is valid.
 * Uses /items because both dev API and dashboard API expose it.
 */
export async function testAppSession(): Promise<{ ok: boolean; message?: string }> {
  try {
    await listItems();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Lists all items the current auth context has access to.
 *
 * Dev API: `/items` returns `{ results: [...] }` directly under your
 *   clientId scope. Easy.
 * Dashboard API: the user JWT is scoped to a user account, but items
 *   are scoped to *applications* the user owns. Plain `/items` on
 *   my-api.pluggy.ai returns empty in that mode — you need to either
 *   hit `/me/items` (some endpoints expose this) or list the user's
 *   applications/clients first and pull items per app.
 *
 * Strategy: cascade through known paths in priority order, return the
 * first non-empty result. If everything is empty we still return [] so
 * the caller's "no items" branch works, and the debug trace is
 * available via listItemsWithDebug.
 */
type ListShape<T> = T[] | { results: T[] };

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'results' in data) {
    const r = (data as { results: unknown }).results;
    if (Array.isArray(r)) return r as T[];
  }
  return [];
}

export interface ListItemsAttempt {
  path: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface ListItemsDebug {
  mode: 'session' | 'dev';
  baseUrl: string;
  attempts: ListItemsAttempt[];
  items: PluggyItem[];
}

export async function listItemsWithDebug(): Promise<ListItemsDebug> {
  const auth = await getAuth();
  const attempts: ListItemsAttempt[] = [];
  let items: PluggyItem[] = [];

  const tryPath = async (path: string): Promise<PluggyItem[]> => {
    try {
      const data = await authedFetch<ListShape<PluggyItem>>(path);
      const list = unwrapList<PluggyItem>(data);
      attempts.push({ path, ok: true, count: list.length });
      return list;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ path, ok: false, count: 0, error: msg.slice(0, 200) });
      return [];
    }
  };

  // 1. Vanilla /items — works in dev mode + some dashboard scopes
  items = await tryPath('/items?pageSize=100');
  if (items.length > 0) return { mode: auth.mode, baseUrl: auth.baseUrl, attempts, items };

  // Dashboard JWT scoped to user: items live under applications/clients.
  if (auth.mode === 'session') {
    // 2. Try /me/items — some dashboard scopes expose this shortcut
    items = await tryPath('/me/items');
    if (items.length > 0) return { mode: auth.mode, baseUrl: auth.baseUrl, attempts, items };

    // 3. List clients, then items per client
    try {
      const data = await authedFetch<ListShape<{ id: string; name?: string }>>(`/clients`);
      const clients = unwrapList<{ id: string; name?: string }>(data);
      attempts.push({ path: '/clients', ok: true, count: clients.length });
      for (const c of clients) {
        const sub = await tryPath(
          `/clients/${encodeURIComponent(c.id)}/items?pageSize=100`
        );
        items.push(...sub);
      }
      if (items.length > 0) return { mode: auth.mode, baseUrl: auth.baseUrl, attempts, items };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ path: '/clients', ok: false, count: 0, error: msg.slice(0, 200) });
    }

    // 4. List applications, then items per application
    try {
      const data = await authedFetch<ListShape<{ id: string; name?: string }>>(
        `/applications`
      );
      const apps = unwrapList<{ id: string; name?: string }>(data);
      attempts.push({ path: '/applications', ok: true, count: apps.length });
      for (const a of apps) {
        const sub = await tryPath(
          `/applications/${encodeURIComponent(a.id)}/items?pageSize=100`
        );
        items.push(...sub);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ path: '/applications', ok: false, count: 0, error: msg.slice(0, 200) });
    }
  }

  return { mode: auth.mode, baseUrl: auth.baseUrl, attempts, items };
}

export async function listItems(): Promise<PluggyItem[]> {
  const { items } = await listItemsWithDebug();
  return items;
}

/**
 * Returns a short-lived token the renderer hands to the Pluggy web-connect
 * widget. Pass an existing itemId when reconnecting (e.g. user changed
 * the bank password and the item went into 'login_in_progress').
 */
export async function createConnectToken(itemId?: string): Promise<string> {
  const body = itemId ? { itemId } : {};
  const res = await authedFetch<{ accessToken: string }>(`/connect_token`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.accessToken;
}

export interface PluggyItem {
  id: string;
  status: string;
  statusDetail?: string;
  connector: {
    id: number;
    name: string;
    institutionUrl?: string;
    imageUrl?: string;
    primaryColor?: string;
    type?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  return authedFetch<PluggyItem>(`/items/${encodeURIComponent(itemId)}`);
}

/** Asks Pluggy to refresh the item's data right now. Useful before
 * pulling fresh transactions. */
export async function refreshItem(itemId: string): Promise<PluggyItem> {
  return authedFetch<PluggyItem>(`/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  await authedFetch<unknown>(`/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
}

export interface PluggyAccount {
  id: string;
  type: string; // BANK | CREDIT
  subtype?: string; // CHECKING_ACCOUNT | SAVINGS_ACCOUNT | CREDIT_CARD | ...
  name: string;
  marketingName?: string;
  balance: number;
  currencyCode?: string;
  itemId: string;
}

export async function listAccounts(itemId: string): Promise<PluggyAccount[]> {
  const data = await authedFetch<{ results: PluggyAccount[] }>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`
  );
  return data.results ?? [];
}

export interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number; // positive = credit (income), negative = debit (expense)
  date: string; // ISO datetime
  category?: string;
  categoryId?: string;
  type?: 'DEBIT' | 'CREDIT';
  accountId: string;
}

export async function listTransactions(
  accountId: string,
  options: { from?: string; to?: string; page?: number; pageSize?: number } = {}
): Promise<PluggyTransaction[]> {
  const params = new URLSearchParams();
  params.set('accountId', accountId);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  params.set('page', String(options.page ?? 1));
  params.set('pageSize', String(options.pageSize ?? 500));
  const data = await authedFetch<{ results: PluggyTransaction[]; total: number }>(
    `/transactions?${params.toString()}`
  );
  return data.results ?? [];
}

// ─── Investments ───────────────────────────────────────────────────
// Pluggy returns investments via a separate endpoint, not via /accounts.
// Each investment is a single holding (Tesouro, FII, CDB, action, etc).
// The fields we care about are: id, name, balance (current market value).

export interface PluggyInvestment {
  id: string;
  itemId: string;
  /** Pluggy's investment classification:
   *   FIXED_INCOME | EQUITY | MUTUAL_FUND | ETF | SECURITY | OTHER */
  type?: string;
  /** Finer-grained breakdown — e.g. TREASURY, CDB, LCI, STOCK, FII. */
  subtype?: string;
  /** User-facing label, e.g. "Tesouro Selic 2029". */
  name?: string;
  /** Owning institution name when present, e.g. "Banco Inter". */
  issuer?: string;
  /** Current market value in BRL. This is what we display as the
   * account balance. */
  balance?: number;
  /** Original amount invested. Diff between balance and amount =
   * profit/loss. */
  amount?: number;
  /** Total appreciation since acquisition. */
  amountProfit?: number;
  quantity?: number;
  /** Per-unit price at last update. */
  value?: number;
  currencyCode?: string;
  rate?: number;
  rateType?: string;
  dueDate?: string;
  issueDate?: string;
  date?: string;
}

export async function listInvestments(itemId: string): Promise<PluggyInvestment[]> {
  const data = await authedFetch<{ results: PluggyInvestment[] }>(
    `/investments?itemId=${encodeURIComponent(itemId)}`
  );
  return data.results ?? [];
}
