'use client';

import { useMemo } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { fmtBRL, cn } from '@/lib/utils';
import { isRecurringActiveForMonth } from '@/lib/services/installment';

interface ExpenseBreakdownProps {
  month: number;
  year: number;
}

const COLORS = [
  'bg-accent',
  'bg-accent-2',
  'bg-income',
  'bg-warn',
  'bg-expense',
  'bg-[#60a5fa]',
  'bg-[#6ee7b7]',
  'bg-[#f9a8d4]',
];

export function ExpenseBreakdown({ month, year }: ExpenseBreakdownProps) {
  const { debts, installments, entities } = useFinanceData();

  const breakdown = useMemo(() => {
    const categoryTotals = new Map<string, { name: string; total: number }>();

    debts.forEach((debt) => {
      let amount = 0;

      if (debt.isRecurring) {
        if (isRecurringActiveForMonth(debt, month, year)) {
          amount = debt.installmentValue;
        }
      } else {
        const monthInsts = installments.filter((i) => {
          if (i.debtId !== debt.id) return false;
          const [iy, im] = i.dueDate.split('-').map(Number);
          return im === month && iy === year;
        });
        amount = monthInsts.length * debt.installmentValue;
      }

      if (amount > 0) {
        const category = debt.entityName || 'Sem categoria';
        const existing = categoryTotals.get(category);
        if (existing) {
          existing.total += amount;
        } else {
          categoryTotals.set(category, { name: category, total: amount });
        }
      }
    });

    const items = Array.from(categoryTotals.values()).sort((a, b) => b.total - a.total);
    const grandTotal = items.reduce((sum, i) => sum + i.total, 0);

    return items.map((item, idx) => ({
      ...item,
      percent: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
      colorClass: COLORS[idx % COLORS.length],
    }));
  }, [debts, installments, entities, month, year]);

  if (breakdown.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[18px] p-5 text-center text-text-3 text-sm">
        Sem despesas neste mes.
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-[18px] p-5">
      <div className="text-[11px] tracking-[0.1em] uppercase text-text-3 font-medium mb-4">
        Despesas por categoria
      </div>

      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-3 gap-[2px]">
        {breakdown.map((item) => (
          <div
            key={item.name}
            className={cn('rounded-full', item.colorClass)}
            style={{ width: `${Math.max(item.percent, 3)}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2.5">
        {breakdown.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', item.colorClass)} />
              <span className="text-sm">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tabular-nums">{fmtBRL(item.total)}</span>
              <span className="text-[11px] text-text-3 font-mono tabular-nums w-12 text-right">
                {item.percent.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
