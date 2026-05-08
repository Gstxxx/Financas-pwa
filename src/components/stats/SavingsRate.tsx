'use client';

import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { fmtBRL, cn } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function SavingsRate() {
  const { getTotalIncome, getTotalExpenses } = useFinanceData();
  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const savings = income - expenses;
  const rate = income > 0 ? (savings / income) * 100 : 0;

  return (
    <div className="bg-surface border border-border rounded-[18px] p-5">
      <div className="text-[11px] tracking-[0.1em] uppercase text-text-3 font-medium mb-1">
        Taxa de poupanca
      </div>
      <div className={cn(
        'font-display text-3xl font-semibold tabular-nums mt-2',
        rate >= 20 ? 'text-income' : rate >= 0 ? 'text-warn' : 'text-expense'
      )}>
        {rate.toFixed(1)}%
      </div>
      <div className="text-sm text-text-3 mt-1">
        {fmtBRL(savings)} por mes
      </div>
      <div className="mt-3">
        <ProgressBar value={Math.max(0, rate)} />
      </div>
      <div className="text-[11px] text-text-3 mt-3">
        {rate >= 20
          ? 'Excelente! Acima da meta de 20%.'
          : rate >= 10
          ? 'Bom, mas tente chegar a 20%.'
          : rate >= 0
          ? 'Tente poupar pelo menos 10% da renda.'
          : 'Atencao: despesas excedem a receita.'}
      </div>
    </div>
  );
}
