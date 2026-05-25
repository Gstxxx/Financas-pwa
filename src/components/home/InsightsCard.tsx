'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { computeInsights, type Insight } from '@/lib/services/insights';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { I } from '@/components/icons/I';

export function InsightsCard() {
  const { isHydrated, debts, installments, incomes, entities, user } = useFinanceData();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = Storage.get<string[]>(STORAGE_KEYS.INSIGHTS_DISMISSED) || [];
    setDismissed(new Set(stored));
  }, []);

  const insights = useMemo(() => {
    if (!isHydrated) return [];
    return computeInsights({ debts, installments, incomes, entities, user });
  }, [isHydrated, debts, installments, incomes, entities, user]);

  const visible = insights.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

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
        {visible.map((insight, i) => (
          <InsightRow
            key={insight.id}
            insight={insight}
            onDismiss={() => dismiss(insight.id)}
            isFirst={i === 0}
          />
        ))}
      </div>
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
