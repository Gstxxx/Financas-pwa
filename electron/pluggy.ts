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

const BASE_URL = 'https://api.pluggy.ai';
const KEY_CREDENTIALS = 'finance_pluggy_credentials';
const KEY_API_KEY = 'finance_pluggy_api_key';

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

/**
 * Returns a valid apiKey, refreshing if cache is missing/expired.
 * Throws if credentials aren't configured.
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

  const data = await fetchJson<{ apiKey: string }>(`${BASE_URL}/auth`, {
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
  let apiKey = await getApiKey();
  const callOnce = (key: string) =>
    fetchJson<T>(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        'X-API-KEY': key,
        'Content-Type': 'application/json',
      },
    });
  try {
    return await callOnce(apiKey);
  } catch (err) {
    // 401/403 likely means the apiKey expired — refresh once.
    const msg = err instanceof Error ? err.message : String(err);
    if (/401|403/.test(msg)) {
      apiKey = await getApiKey(true);
      return await callOnce(apiKey);
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
