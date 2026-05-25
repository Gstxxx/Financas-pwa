'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFinanceData, useFinance } from '@/lib/contexts/FinanceContext';
import { useChat } from '@/lib/contexts/ChatContext';
import { computeInsights, type Insight } from '@/lib/services/insights';
import { fetchAiInsights, type AiInsight } from '@/lib/services/aiInsights';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { I } from '@/components/icons/I';

export function InsightsCard() {
  const { isHydrated, debts, installments, incomes, entities, user } = useFinanceData();
  const { state } = useFinance();
  const { settings, configured } = useChat();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [aiInsights, setAiInsights] = useState<AiInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const stored = Storage.get<string[]>(STORAGE_KEYS.INSIGHTS_DISMISSED) || [];
    setDismissed(new Set(stored));
  }, []);

  // Fire the AI insight fetch once the app is hydrated and Ollama is
  // configured. The service caches per session-signature so re-mounts
  // don't trigger fresh calls.
  useEffect(() => {
    if (!isHydrated || !configured) return;
    let cancelled = false;
    const ac = new AbortController();
    setAiLoading(true);
    fetchAiInsights(state, settings, ac.signal)
      .then((res) => {
        if (!cancelled) setAiInsights(res.insights);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [isHydrated, configured, settings, state]);

  const insights = useMemo(() => {
    if (!isHydrated) return [];
    return computeInsights({ debts, installments, incomes, entities, user });
  }, [isHydrated, debts, installments, incomes, entities, user]);

  const visible = insights.filter((i) => !dismissed.has(i.id));
  const hasAi = aiInsights.length > 0;
  const hasAnything = visible.length > 0 || hasAi || aiLoading;
  if (!hasAnything) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      Storage.set(STORAGE_KEYS.INSIGHTS_DISMISSED, Array.from(next));
      return next;
    });
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: '18px 18px 6px' }}>
        <div
          className="t-overline"
          style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <I.spark size={14} color="var(--accent)" /> Insights
        </div>

        {aiLoading && aiInsights.length === 0 && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '8px 0',
            }}
          >
            ✦ analisando…
          </div>
        )}

        {aiInsights.map((insight, i) => (
          <AiInsightRow key={`ai-${i}`} insight={insight} isFirst={i === 0 && !aiLoading} />
        ))}

        {visible.map((insight, i) => (
          <InsightRow
            key={insight.id}
            insight={insight}
            onDismiss={() => dismiss(insight.id)}
            isFirst={i === 0 && aiInsights.length === 0 && !aiLoading}
          />
        ))}
      </div>
    </div>
  );
}

function AiInsightRow({ insight, isFirst }: { insight: AiInsight; isFirst: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '6px 1fr 36px',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderTop: isFirst ? 'none' : '1px solid var(--hair-soft)',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: 'var(--accent)',
          marginTop: 6,
        }}
      />
      <div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {insight.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 3, lineHeight: 1.45 }}>
          {insight.body}
        </div>
      </div>
      <span
        title="Gerado por IA"
        aria-label="Gerado por IA"
        style={{
          fontSize: 9.5,
          fontFamily: 'var(--f-mono)',
          color: 'var(--accent)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textAlign: 'right',
          paddingTop: 4,
        }}
      >
        IA
      </span>
    </div>
  );
}

function InsightRow({
  insight,
  onDismiss,
  isFirst,
}: {
  insight: Insight;
  onDismiss: () => void;
  isFirst: boolean;
}) {
  const color =
    insight.severity === 'danger' ? 'var(--neg)' : insight.severity === 'warn' ? 'var(--cat-1)' : 'var(--accent)';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '6px 1fr 28px',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderTop: isFirst ? 'none' : '1px solid var(--hair-soft)',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: color,
          marginTop: 6,
        }}
      />
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>
          {insight.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 3 }}>
          {insight.body}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar insight"
        style={{
          width: 22,
          height: 22,
          borderRadius: 99,
          background: 'transparent',
          border: '1px solid var(--hair)',
          color: 'var(--ink-mute)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <I.close size={10} />
      </button>
    </div>
  );
}
