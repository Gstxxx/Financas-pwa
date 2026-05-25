'use client';

import { useEffect, useRef } from 'react';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import {
  getBillsDueSoon,
  sendDueWebhook,
  formatDueToast,
  type DueBill,
} from '@/lib/services/notifications';

const SENT_WEBHOOK_KEY = 'finance_notified_bills';
const SENT_TOAST_KEY = 'finance_notified_bills_toast';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // re-check hourly while app is open

type SentMap = Record<string, string>;

function loadSent(key: string): SentMap {
  return (Storage.get<SentMap>(key) as SentMap | null) ?? {};
}

function saveSent(key: string, map: SentMap): void {
  // Prune entries older than 30 days so the map doesn't grow unbounded.
  const cutoff = Date.now() - 30 * 86_400_000;
  const pruned: SentMap = {};
  for (const [k, v] of Object.entries(map)) {
    if (new Date(v).getTime() >= cutoff) pruned[k] = v;
  }
  Storage.set(key, pruned);
}

function freshBills(bills: DueBill[], sent: SentMap): DueBill[] {
  return bills.filter((b) => !sent[b.key]);
}

function stampSent(bills: DueBill[], sent: SentMap): SentMap {
  const stamp = new Date().toISOString();
  for (const b of bills) sent[b.key] = stamp;
  return sent;
}

/**
 * Runs a due-date check on mount and then hourly while the app stays open.
 *
 * Two parallel channels: a Discord webhook (off unless configured) and the
 * native Windows toast (auto-enabled inside Electron). They dedupe
 * independently so the user can rely on either one.
 *
 * Designed to be mounted once at the layout level.
 */
export function useDueDateNotifications() {
  const { isHydrated, debts, installments, snoozes } = useFinanceData();
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;

    const run = async () => {
      // Throttle re-entrant runs (data changes will trigger this effect).
      const now = Date.now();
      if (now - lastRunRef.current < 30_000) return;
      lastRunRef.current = now;

      const bills = getBillsDueSoon({ debts, installments, snoozes }, 1);
      if (bills.length === 0) return;

      // --- Windows toast: only when the main process scheduler isn't
      // available. Inside Electron, electron/scheduler.ts owns the toast
      // path so it keeps running even if the renderer is unloaded. -------
      const desktop = typeof window !== 'undefined' ? window.electron?.desktop : null;
      if (desktop && !desktop.hasBackgroundScheduler) {
        const sent = loadSent(SENT_TOAST_KEY);
        const fresh = freshBills(bills, sent);
        if (fresh.length > 0) {
          const payload = formatDueToast(fresh);
          const ok = await desktop.notify(payload);
          if (!cancelled && ok) {
            saveSent(SENT_TOAST_KEY, stampSent(fresh, sent));
          }
        }
      }

      // --- Discord webhook (optional, lives in renderer for both web and
      // desktop because main has no built-in fetch retry/notion of urls) -
      const webhookUrl = Storage.get<string>(STORAGE_KEYS.DISCORD_WEBHOOK);
      if (webhookUrl && webhookUrl.startsWith('https://')) {
        const sent = loadSent(SENT_WEBHOOK_KEY);
        const fresh = freshBills(bills, sent);
        if (fresh.length > 0) {
          const ok = await sendDueWebhook(webhookUrl, fresh);
          if (!cancelled && ok) {
            saveSent(SENT_WEBHOOK_KEY, stampSent(fresh, sent));
          }
        }
      }
    };

    void run();
    const id = window.setInterval(() => void run(), CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isHydrated, debts, installments, snoozes]);
}
