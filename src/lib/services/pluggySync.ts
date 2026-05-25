/**
 * Renderer-side coordination of Pluggy syncs.
 *
 * Two entry points:
 *   - syncConnection(): thin sync that pulls transactions only for an
 *     existing BankConnection (used by the per-row "Sync" button).
 *   - fullSyncItem(): assembles a complete IMPORT_PLUGGY_FULL payload
 *     (connection + accounts + transactions) so the reducer can wire
 *     up account FKs in one shot. Powers the auto-login flow.
 */

import type { AccountType, Income, IncomeDirection } from '@/lib/types';
import type {
  PluggyAccountInfo,
  PluggyItemInfo,
  PluggyTransactionInfo,
} from '@/types/electron';

const HISTORY_DAYS = 90;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function txToIncome(tx: PluggyTransactionInfo, connectionId: string): Income {
  const direction: IncomeDirection = tx.amount > 0 ? 'entrada' : 'saida';
  return {
    id: `pluggy-${tx.id}`,
    description: tx.description || tx.descriptionRaw || 'Transação',
    amount: Math.abs(tx.amount),
    date: tx.date.slice(0, 10),
    direction,
    sourcePluggyId: tx.id,
    sourceConnectionId: connectionId,
    createdAt: new Date().toISOString(),
  };
}

/** Map Pluggy's classification onto our AccountType. Defaults to checking
 * when the shape is unfamiliar so the import never silently drops an
 * account. */
function mapPluggyAccountType(type: string, subtype?: string): AccountType {
  if (type === 'CREDIT' || subtype === 'CREDIT_CARD') return 'credit_card';
  if (subtype === 'SAVINGS_ACCOUNT') return 'savings';
  return 'checking';
}

function accountDisplayName(pa: PluggyAccountInfo, institutionName?: string): string {
  const base = pa.marketingName || pa.name;
  if (!institutionName) return base;
  // Many connectors already include the bank name in marketingName
  // ("Conta Nubank"). Skip the prefix when that's the case.
  if (base.toLowerCase().includes(institutionName.toLowerCase())) return base;
  return `${institutionName} · ${base}`;
}

function normalizeItemStatus(
  raw: string
): 'ok' | 'updating' | 'error' | 'needs_action' | 'login_in_progress' {
  switch ((raw || '').toUpperCase()) {
    case 'UPDATED':
      return 'ok';
    case 'UPDATING':
      return 'updating';
    case 'LOGIN_ERROR':
    case 'OUTDATED':
      return 'needs_action';
    case 'LOGIN_IN_PROGRESS':
    case 'WAITING_USER_INPUT':
      return 'login_in_progress';
    default:
      return 'updating';
  }
}

export interface SyncResult {
  ok: boolean;
  fetched: number;
  incomes: Income[];
  syncedAt: string;
  error?: string;
}

export async function syncConnection(
  connectionId: string,
  pluggyItemId: string
): Promise<SyncResult> {
  const pluggy = window.electron?.pluggy;
  if (!pluggy) {
    return {
      ok: false,
      fetched: 0,
      incomes: [],
      syncedAt: new Date().toISOString(),
      error: 'Pluggy só funciona no app desktop.',
    };
  }

  try {
    try {
      await pluggy.refreshItem(pluggyItemId);
    } catch {
      /* refresh is best-effort */
    }

    const accounts = await pluggy.listAccounts(pluggyItemId);
    if (accounts.length === 0) {
      return { ok: true, fetched: 0, incomes: [], syncedAt: new Date().toISOString() };
    }

    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - HISTORY_DAYS);
    const from = isoDay(fromDate);
    const to = isoDay(now);

    const incomes: Income[] = [];
    let fetchedTotal = 0;
    for (const acc of accounts) {
      const txs = await pluggy.listTransactions(acc.id, { from, to });
      fetchedTotal += txs.length;
      for (const tx of txs) incomes.push(txToIncome(tx, connectionId));
    }

    return {
      ok: true,
      fetched: fetchedTotal,
      incomes,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      fetched: 0,
      incomes: [],
      syncedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface FullSyncTransaction {
  sourcePluggyId: string;
  pluggyAccountId: string;
  description: string;
  amount: number;
  date: string;
  direction: IncomeDirection;
}

export interface FullSyncPayload {
  connection: {
    pluggyItemId: string;
    institutionName: string;
    institutionLogoUrl?: string;
    connectorId?: number;
    status: 'ok' | 'updating' | 'error' | 'needs_action' | 'login_in_progress';
    statusDetail?: string;
    existingId?: string;
  };
  accounts: Array<{
    pluggyAccountId: string;
    name: string;
    type: AccountType;
    balance: number;
  }>;
  transactions: FullSyncTransaction[];
  syncedAt: string;
}

export interface FullSyncResult {
  ok: boolean;
  error?: string;
  payload?: FullSyncPayload;
  fetchedTransactions: number;
  accountCount: number;
}

/**
 * Full sync of a Pluggy item: pulls the item metadata, every account
 * under it, then every transaction in the rolling history window.
 * Returns a single ready-to-dispatch payload so the reducer can wire
 * everything (connection + accounts + transactions) atomically.
 */
export async function fullSyncItem(
  pluggyItemId: string,
  existingConnectionId?: string
): Promise<FullSyncResult> {
  const pluggy = window.electron?.pluggy;
  if (!pluggy) {
    return {
      ok: false,
      error: 'Pluggy só funciona no app desktop.',
      fetchedTransactions: 0,
      accountCount: 0,
    };
  }

  try {
    let item: PluggyItemInfo;
    try {
      item = await pluggy.refreshItem(pluggyItemId);
    } catch {
      item = await pluggy.getItem(pluggyItemId);
    }

    const accounts = await pluggy.listAccounts(pluggyItemId);
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - HISTORY_DAYS);
    const from = isoDay(fromDate);
    const to = isoDay(now);

    const institutionName = item.connector?.name ?? 'Banco';

    const mappedAccounts = accounts.map((a) => ({
      pluggyAccountId: a.id,
      name: accountDisplayName(a, institutionName),
      type: mapPluggyAccountType(a.type, a.subtype),
      balance: a.balance ?? 0,
    }));

    const transactions: FullSyncTransaction[] = [];
    for (const acc of accounts) {
      const txs = await pluggy.listTransactions(acc.id, { from, to });
      for (const tx of txs) {
        transactions.push({
          sourcePluggyId: tx.id,
          pluggyAccountId: acc.id,
          description: tx.description || tx.descriptionRaw || 'Transação',
          amount: Math.abs(tx.amount),
          date: tx.date.slice(0, 10),
          direction: tx.amount > 0 ? 'entrada' : 'saida',
        });
      }
    }

    return {
      ok: true,
      payload: {
        connection: {
          pluggyItemId: item.id,
          institutionName,
          institutionLogoUrl: item.connector?.imageUrl,
          connectorId: item.connector?.id,
          status: normalizeItemStatus(item.status),
          statusDetail: item.statusDetail,
          existingId: existingConnectionId,
        },
        accounts: mappedAccounts,
        transactions,
        syncedAt: new Date().toISOString(),
      },
      fetchedTransactions: transactions.length,
      accountCount: accounts.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      fetchedTransactions: 0,
      accountCount: 0,
    };
  }
}
