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
  PluggyInvestmentInfo,
  PluggyItemInfo,
  PluggyTransactionInfo,
} from '@/types/electron';

const HISTORY_DAYS = 90;

/**
 * Pluggy classifies movement between a user's own accounts/wallets under
 * the "04" category tree:
 *   04000000 — Same person transfer
 *   04010000 — Same person transfer - CASH (PicPay Cofrinho aporte/resgate)
 *   04020000 — Pagamento de fatura de cartão (own CC)
 *   04030000 — Investimento próprio
 *
 * These are NOT real income or expense — they're just money moving between
 * places the user owns. If we import them, every Cofrinho deposit shows as
 * an expense AND a matching income, every CC invoice payment double-counts
 * the spending that was already recorded as the card transactions, and
 * stats become useless. Filtering by the "04" prefix removes the noise
 * without dropping legitimate third-party transfers (which live under "05").
 *
 * Description fallback catches rows where Pluggy didn't tag a categoryId:
 *   "Cofrinho", "Aporte ... Cofrinho", "Resgate ... Cofrinho",
 *   "Pagamento de fatura"
 */
function isSamePersonTransfer(tx: PluggyTransactionInfo): boolean {
  if (tx.categoryId && tx.categoryId.startsWith('04')) return true;
  const text = `${tx.description ?? ''} ${tx.descriptionRaw ?? ''}`.toLowerCase();
  if (text.includes('cofrinho')) return true;
  if (text.includes('pagamento de fatura')) return true;
  if (/\baporte\b/.test(text) && /\bcofrinho\b/.test(text)) return true;
  if (/\bresgate\b/.test(text) && /\bcofrinho\b/.test(text)) return true;
  return false;
}

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

/** Investments don't have marketingName, but they DO have name (security
 * name) + sometimes issuer (institution). We build a label like:
 *   "Tesouro Selic 2029 (Banco Inter)"
 * falling back to a generic when the connector leaves name blank. */
function investmentDisplayName(inv: PluggyInvestmentInfo, institutionName?: string): string {
  const name = inv.name?.trim();
  const issuer = inv.issuer?.trim() || institutionName;
  if (name && issuer && !name.toLowerCase().includes(issuer.toLowerCase())) {
    return `${name} (${issuer})`;
  }
  if (name) return name;
  // Without a name, prefer subtype (TREASURY, CDB, FII, STOCK) over type.
  const fallback = inv.subtype || inv.type || 'Investimento';
  return issuer ? `${fallback} (${issuer})` : fallback;
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
  /** Internal transfers filtered out (Cofrinho aporte/resgate, CC invoice
   * payment, etc). Surfaced so the UI can show "12 importadas, 4 internas
   * ignoradas". */
  skippedInternal: number;
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
      skippedInternal: 0,
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
      return {
        ok: true,
        fetched: 0,
        skippedInternal: 0,
        incomes: [],
        syncedAt: new Date().toISOString(),
      };
    }

    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - HISTORY_DAYS);
    const from = isoDay(fromDate);
    const to = isoDay(now);

    const incomes: Income[] = [];
    let fetchedTotal = 0;
    let skippedInternal = 0;
    for (const acc of accounts) {
      const txs = await pluggy.listTransactions(acc.id, { from, to });
      fetchedTotal += txs.length;
      for (const tx of txs) {
        if (isSamePersonTransfer(tx)) {
          skippedInternal++;
          continue;
        }
        incomes.push(txToIncome(tx, connectionId));
      }
    }

    return {
      ok: true,
      fetched: fetchedTotal,
      skippedInternal,
      incomes,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      fetched: 0,
      skippedInternal: 0,
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
  /** Internal transfers filtered out — see SyncResult.skippedInternal. */
  skippedInternal: number;
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
      skippedInternal: 0,
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

    // Investments live behind a separate endpoint. Each holding (Tesouro,
    // FII, CDB, ação) becomes its own Account with type='investment' and
    // balance = current market value. We don't pull investment-level
    // transactions yet — most users care about the total invested + last
    // appreciation, which `balance` already gives us. Best-effort: some
    // connectors don't expose /investments and 403 instead of 200-empty.
    try {
      const investments = await pluggy.listInvestments(pluggyItemId);
      for (const inv of investments) {
        const label = investmentDisplayName(inv, institutionName);
        mappedAccounts.push({
          pluggyAccountId: `inv-${inv.id}`,
          name: label,
          type: 'investment',
          balance: inv.balance ?? inv.amount ?? 0,
        });
      }
    } catch {
      // No investments / connector doesn't support it / 403 — silently skip.
    }

    const transactions: FullSyncTransaction[] = [];
    let skippedInternal = 0;
    for (const acc of accounts) {
      const txs = await pluggy.listTransactions(acc.id, { from, to });
      for (const tx of txs) {
        if (isSamePersonTransfer(tx)) {
          skippedInternal++;
          continue;
        }
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
      skippedInternal,
      accountCount: accounts.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      fetchedTransactions: 0,
      skippedInternal: 0,
      accountCount: 0,
    };
  }
}
