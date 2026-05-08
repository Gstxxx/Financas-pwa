'use client';

import { useMemo } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { fmtBRL, fmtMonthYear, cn } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface MonthlyBudgetCardProps {
  month: number;
  year: number;
}

export function MonthlyBudgetCard({ month, year }: MonthlyBudgetCardProps) {
  const { user, debts, installments } = useFinanceData();

  const budget = useMemo(() => {
    let totalExpenses = 0;

    debts.forEach((debt) => {
      if (debt.isRecurring) {
        const startDate = new Date(debt.startYear, debt.startMonth - 1);
        const checkDate = new Date(year, month - 1);
        if (checkDate >= startDate) {
          totalExpenses += debt.installmentValue;
        }
      } else {
        const monthInstallments = installments.filter((i) => {
          if (i.debtId !== debt.id) return false;
          const [iy, im] = i.dueDate.split('-').map(Number);
          return im === month && iy === year;
        });
        totalExpenses += monthInstallments.length * debt.installmentValue;
      }
    });

    return {
      income: user.salary,
      expenses: totalExpenses,
      remaining: user.salary - totalExpenses,
      usagePercent: user.salary > 0 ? (totalExpenses / user.salary) * 100 : 0,
    };
  }, [user, debts, installments, month, year]);

  return (
    <div className="bg-surface border border-border rounded-[18px] p-5">
      <div className="text-[11px] tracking-[0.1em] uppercase text-text-3 font-medium mb-1">
        Orcamento de {fmtMonthYear(month, year)}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <div className="text-[10px] uppercase text-text-3 tracking-wider">Receita</div>
          <div className="font-display text-base font-semibold text-income tabular-nums mt-1">
            {fmtBRL(budget.income)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-text-3 tracking-wider">Despesas</div>
          <div className="font-display text-base font-semibold text-expense tabular-nums mt-1">
            {fmtBRL(budget.expenses)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-text-3 tracking-wider">Saldo</div>
          <div className={cn(
            'font-display text-base font-semibold tabular-nums mt-1',
            budget.remaining >= 0 ? 'text-income' : 'text-expense'
          )}>
            {fmtBRL(budget.remaining)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-text-3 mb-1.5">
          <span>Uso do orcamento</span>
          <span className="font-mono tabular-nums">{budget.usagePercent.toFixed(1)}%</span>
        </div>
        <ProgressBar value={budget.usagePercent} />
      </div>
    </div>
  );
}
