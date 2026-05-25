'use client';

import { useMemo } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { NumMono } from '@/components/ui/NumMono';
import { StackedBar } from '@/components/charts/StackedBar';

interface ExpenseBreakdownProps {
  month: number;
  year: number;
  /** Optional entity inclusion filter. Empty/undefined = all entities. */
  entityFilter?: Set<string>;
}

export function ExpenseBreakdown({ month, year, entityFilter }: ExpenseBreakdownProps) {
  const { getBreakdown } = useFinanceData();
  const breakdown = useMemo(() => {
    const rows = getBreakdown(month, year);
    if (!entityFilter || entityFilter.size === 0) return rows;
    return rows.filter((r) => entityFilter.has(r.entityId));
  }, [getBreakdown, month, year, entityFilter]);

  if (breakdown.length === 0) {
    return (
      <div style={{ padding: '0 22px 14px' }}>
        <div
          className="card"
          style={{
            padding: '22px',
            textAlign: 'center',
            color: 'var(--ink-mute)',
            fontSize: 14,
          }}
        >
          Sem despesas neste mês.
        </div>
      </div>
    );
  }

  const stackItems = breakdown.map((b) => ({
    value: b.value,
    color: `oklch(0.74 0.10 ${b.hue})`,
  }));

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: '22px 22px 14px' }}>
        <div className="t-overline" style={{ marginBottom: 18 }}>
          Despesas por categoria
        </div>

        <StackedBar items={stackItems} height={8} />

        <div style={{ marginTop: 14 }}>
          {breakdown.map((b, i) => (
            <div
              key={b.entityId}
              style={{
                display: 'grid',
                gridTemplateColumns: '14px 1fr auto 56px',
                gap: 12,
                alignItems: 'center',
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--hair-soft)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: `oklch(0.74 0.10 ${b.hue})`,
                }}
              />
              <div style={{ fontSize: 14, fontWeight: 500 }}>{b.name}</div>
              <NumMono value={b.value} size={14} sign="neg" color="var(--ink-mid)" />
              <div
                style={{
                  textAlign: 'right',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.04em',
                }}
              >
                {b.pct.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
