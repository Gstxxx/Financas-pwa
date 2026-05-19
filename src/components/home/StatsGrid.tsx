'use client';

import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { NumMono } from '@/components/ui/NumMono';
import { I } from '@/components/icons/I';

export function StatsGrid() {
  const { isHydrated, getTotalIncome, getTotalExpenses } = useFinanceData();

  if (!isHydrated) {
    return (
      <div
        style={{
          padding: '12px 22px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <div className="card-flat" style={{ padding: 16, minHeight: 86 }} />
        <div className="card-flat" style={{ padding: 16, minHeight: 86 }} />
      </div>
    );
  }

  const income = getTotalIncome();
  const expenses = getTotalExpenses();

  return (
    <div
      className="animate-heroFade"
      style={{
        padding: '12px 22px 0',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        animationDelay: '0.08s',
      }}
    >
      <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <I.arrowUp size={11} stroke={2} color="var(--accent)" />
          <span className="t-overline">Entradas</span>
        </div>
        <div style={{ color: 'var(--accent)' }}>
          <NumMono value={income} sign="pos" size={20} weight={500} />
        </div>
      </div>
      <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <I.arrowDown size={11} stroke={2} color="var(--neg)" />
          <span className="t-overline">Saídas</span>
        </div>
        <div style={{ color: 'var(--neg)' }}>
          <NumMono value={expenses} sign="neg" size={20} weight={500} />
        </div>
      </div>
    </div>
  );
}
