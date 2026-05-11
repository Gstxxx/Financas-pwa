'use client';

import { useMemo } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { fmtBRL, cn } from '@/lib/utils';
import { isRecurringActiveForMonth } from '@/lib/services/installment';

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function TrendChart() {
  const { user, debts, installments, getExtraIncomeForMonth, getPixOutForMonth } = useFinanceData();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const monthlyData = useMemo(() => {
    const data: { month: number; expenses: number; income: number }[] = [];

    for (let m = 1; m <= 12; m++) {
      let expenses = getPixOutForMonth(m, currentYear);

      debts.forEach((debt) => {
        if (debt.isRecurring) {
          if (isRecurringActiveForMonth(debt, m, currentYear)) {
            expenses += debt.installmentValue;
          }
        } else {
          const monthInsts = installments.filter((i) => {
            if (i.debtId !== debt.id) return false;
            const [iy, im] = i.dueDate.split('-').map(Number);
            return im === m && iy === currentYear;
          });
          expenses += monthInsts.length * debt.installmentValue;
        }
      });

      data.push({
        month: m,
        expenses,
        income: user.salary + getExtraIncomeForMonth(m, currentYear),
      });
    }

    return data;
  }, [debts, installments, user, currentYear, getExtraIncomeForMonth, getPixOutForMonth]);

  const maxValue = Math.max(...monthlyData.map((d) => Math.max(d.expenses, d.income)), 1);

  return (
    <div className="bg-surface border border-border rounded-[18px] p-5">
      <div className="text-[11px] tracking-[0.1em] uppercase text-text-3 font-medium mb-4">
        Tendencia {currentYear}
      </div>

      <div className="flex items-end gap-1 h-40">
        {monthlyData.map((d) => {
          const expenseHeight = (d.expenses / maxValue) * 100;
          const isCurrent = d.month === currentMonth;
          const isFuture = d.month > currentMonth;

          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end h-28">
                <div
                  className={cn(
                    'w-full max-w-[24px] rounded-t-sm transition-all',
                    isCurrent ? 'bg-accent' : isFuture ? 'bg-white/5' : 'bg-accent/40'
                  )}
                  style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                  title={fmtBRL(d.expenses)}
                />
              </div>
              <span className={cn(
                'text-[9px]',
                isCurrent ? 'text-accent font-semibold' : 'text-text-3'
              )}>
                {MONTH_ABBR[d.month - 1]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="text-[11px] text-text-3">Mes atual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
          <span className="text-[11px] text-text-3">Meses anteriores</span>
        </div>
      </div>
    </div>
  );
}
