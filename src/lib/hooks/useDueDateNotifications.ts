'use client';

import { useEffect, useRef } from 'react';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { getBillsDueSoon, sendDueWebhook } from '@/lib/services/notifications';

const SENT_KEY = 'finance_notified_bills';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // re-check hourly while app is open

type SentMap = Record<string, string>;

function loadSent(): SentMap {
  return (Storage.get<SentMap>(SENT_KEY) as SentMap | null) ?? {};
}

function saveSent(map: SentMap): void {
  // Prune entries older than 30 days so the map doesn't grow unbounded.
  const cutoff = Date.now() - 30 * 86_400_000;
  const pruned: SentMap = {};
  for (const [k, v] of Object.entries(map)) {
    if (new Date(v).getTime() >= cutoff) pruned[k] = v;
  }
  Storage.set(SENT_KEY, pruned);
}

/**
 * Runs a due-date check on mount and then hourly while the app stays
 * open. No-op if the user hasn't configured a Discord webhook.
 *
 * Designed to be mounted once at the layout level — multiple mounts would
 * just no-op against the same dedupe map.
 */
export function useDueDateNotifications() {
  const { isHydrated, debts, installments } = useFinanceData();
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;

    const run = async () => {
      // Throttle re-entrant runs (data changes will trigger this effect).
      const now = Date.now();
      if (now - lastRunRef.current < 30_000) return;
      lastRunRef.current = now;

      const webhookUrl = Storage.get<string>(STORAGE_KEYS.DISCORD_WEBHOOK);
      if (!webhookUrl || !webhookUrl.startsWith('https://')) return;

      const bills = getBillsDueSoon({ debts, installments }, 1);
      if (bills.length === 0) return;

      const sent = loadSent();
      const fresh = bills.filter((b) => !sent[b.key]);
      if (fresh.length === 0) return;

      const ok = await sendDueWebhook(webhookUrl, fresh);
      if (cancelled || !ok) return;

      const stamp = new Date().toISOString();
      for (const b of fresh) sent[b.key] = stamp;
      saveSent(sent);
    };

    void run();
    const id = window.setInterval(() => void run(), CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isHydrated, debts, installments]);
}
