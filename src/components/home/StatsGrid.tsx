'use client';

import { fmtBRL } from '@/lib/utils';
import { useFinanceData } from '@/lib/contexts/FinanceContext';

export function StatsGrid() {
  const { isHydrated, getTotalIncome, getTotalExpenses } = useFinanceData();

  if (!isHydrated) {
    return (
      <div className="grid grid-cols-2 gap-2.5 mt-3 animate-pulse">
        <div className="bg-surface border border-border rounded-[18px] p-3.5 h-20" />
        <div className="bg-surface border border-border rounded-[18px] p-3.5 h-20" />
      </div>
    );
  }

  const income = getTotalIncome();
  const expenses = getTotalExpenses();

  return (
    <div className="grid grid-cols-2 gap-2.5 mt-3 animate-heroFade" style={{ animationDelay: '0.08s' }}>
      <div className="bg-surface border border-border rounded-[18px] p-3.5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-text-3 flex items-center gap-1.5 font-medium">
          <span className="text-xs">&#9650;</span> Entradas
        </div>
        <div className="font-display text-xl font-semibold mt-1.5 tabular-nums tracking-tight text-income">
          {fmtBRL(income)}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-[18px] p-3.5">
        <div className="text-[11px] tracking-[0.1em] uppercase text-text-3 flex items-center gap-1.5 font-medium">
          <span className="text-xs">&#9660;</span> Saidas
        </div>
        <div className="font-display text-xl font-semibold mt-1.5 tabular-nums tracking-tight text-expense">
          {fmtBRL(expenses)}
        </div>
      </div>
    </div>
  );
}
