/**
 * Renderer-side coordination of a Pluggy sync. The main process owns the
 * HTTP client; here we orchestrate the per-connection flow:
 *   1. PATCH /items/:id  → ask Pluggy to refresh
 *   2. GET /accounts       → bank accounts under the item
 *   3. GET /transactions   → per account, in a rolling window
 *   4. Map → Income[] (dedup happens in the reducer via sourcePluggyId)
 */

import type { Income } from '@/lib/types';
import type { PluggyTransactionInfo } from '@/types/electron';

const HISTORY_DAYS = 90; // pull the last 90 days each sync

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function txToIncome(
  tx: PluggyTransactionInfo,
  connectionId: string
): Income {
  // Pluggy uses positive=credit (money in) and negative=debit (money out).
  // Our Income type stores `amount` as a magnitude with a `direction`.
  const direction: 'entrada' | 'saida' = tx.amount > 0 ? 'entrada' : 'saida';
  return {
    id: `pluggy-${tx.id}`,
    description: tx.description || tx.descriptionRaw || 'Transação',
    amount: Math.abs(tx.amount),
    date: tx.date.slice(0, 10), // strip time portion
    direction,
    sourcePluggyId: tx.id,
    sourceConnectionId: connectionId,
    createdAt: new Date().toISOString(),
  };
}

export interface SyncResult {
  ok: boolean;
  fetched: number;
  incomes: Income[];
  /** YYYY-MM-DDTHH:mm:ss.SSSZ — when the sync finished. */
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
    // Kick a refresh so the next reads return fresh data. The refresh is
    // async on Pluggy's side too — we still pull immediately because
    // results from past syncs are already there.
    try {
      await pluggy.refreshItem(pluggyItemId);
    } catch {
      // Refresh failing is OK — we proceed with cached data.
    }

    const accounts = await pluggy.listAccounts(pluggyItemId);
    if (accounts.length === 0) {
      return {
        ok: true,
        fetched: 0,
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
