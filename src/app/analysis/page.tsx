'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { MonthSelector } from '@/components/analysis/MonthSelector';
import { MonthlyBudgetCard } from '@/components/analysis/MonthlyBudgetCard';
import { ExpenseBreakdown } from '@/components/analysis/ExpenseBreakdown';
import { getCurrentMonth, getCurrentYear } from '@/lib/utils';
import Link from 'next/link';

export default function AnalysisPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

  return (
    <Container>
      <Header title="Analise" subtitle="Orcamento mensal" />

      <div className="mt-2 space-y-3">
        <MonthSelector
          month={month}
          year={year}
          onChange={(m, y) => { setMonth(m); setYear(y); }}
        />
        <MonthlyBudgetCard month={month} year={year} />
        <ExpenseBreakdown month={month} year={year} />

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/stats"
            className="bg-surface border border-border rounded-[18px] p-4 text-center transition-all active:scale-[0.98]"
          >
            <div className="font-display text-sm font-semibold">Estatisticas</div>
            <div className="text-[11px] text-text-3 mt-1">Ver tendencias</div>
          </Link>
          <Link
            href="/goals"
            className="bg-surface border border-border rounded-[18px] p-4 text-center transition-all active:scale-[0.98]"
          >
            <div className="font-display text-sm font-semibold">Metas</div>
            <div className="text-[11px] text-text-3 mt-1">Ver objetivos</div>
          </Link>
        </div>
      </div>
    </Container>
  );
}
