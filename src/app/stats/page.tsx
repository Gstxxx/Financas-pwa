'use client';

import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { TrendChart } from '@/components/stats/TrendChart';
import { SavingsRate } from '@/components/stats/SavingsRate';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { fmtBRL } from '@/lib/utils';
import Link from 'next/link';

export default function StatsPage() {
  const { debts, installments } = useFinanceData();

  const totalDebtValue = debts.reduce((sum, d) => {
    if (d.isRecurring) return sum;
    return sum + d.installmentValue * d.numberOfInstallments;
  }, 0);

  const totalPaid = debts.reduce((sum, d) => {
    if (d.isRecurring) return sum;
    const paid = installments.filter((i) => i.debtId === d.id && i.isPaid).length;
    return sum + paid * d.installmentValue;
  }, 0);

  const recurringMonthly = debts
    .filter((d) => d.isRecurring)
    .reduce((sum, d) => sum + d.installmentValue, 0);

  return (
    <Container>
      <Header title="Estatisticas" subtitle="Visao detalhada" />

      <div className="mt-2 space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-surface border border-border rounded-[18px] p-4">
            <div className="text-[10px] uppercase text-text-3 tracking-wider">Total em dividas</div>
            <div className="font-display text-lg font-semibold tabular-nums mt-1 text-expense">
              {fmtBRL(totalDebtValue)}
            </div>
          </div>
          <div className="bg-surface border border-border rounded-[18px] p-4">
            <div className="text-[10px] uppercase text-text-3 tracking-wider">Total pago</div>
            <div className="font-display text-lg font-semibold tabular-nums mt-1 text-income">
              {fmtBRL(totalPaid)}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[18px] p-4">
          <div className="text-[10px] uppercase text-text-3 tracking-wider">Fixos mensais</div>
          <div className="font-display text-lg font-semibold tabular-nums mt-1">
            {fmtBRL(recurringMonthly)}
          </div>
          <div className="text-[11px] text-text-3 mt-1">
            {debts.filter((d) => d.isRecurring).length} contas recorrentes
          </div>
        </div>

        <TrendChart />
        <SavingsRate />

        <Link
          href="/analysis"
          className="block bg-surface border border-border rounded-[18px] p-4 text-center transition-all active:scale-[0.98]"
        >
          <span className="font-display text-sm font-semibold text-accent">
            ← Voltar para analise
          </span>
        </Link>
      </div>
    </Container>
  );
}
