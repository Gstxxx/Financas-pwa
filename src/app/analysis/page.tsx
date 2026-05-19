'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { MonthSelector } from '@/components/analysis/MonthSelector';
import { MonthlyBudgetCard } from '@/components/analysis/MonthlyBudgetCard';
import { ExpenseBreakdown } from '@/components/analysis/ExpenseBreakdown';
import { I } from '@/components/icons/I';
import { getCurrentMonth, getCurrentYear } from '@/lib/utils';

export default function AnalysisPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

  return (
    <Container>
      <PageHead overline="Orçamento mensal" title="Análise" />

      <div style={{ padding: '0 22px 16px' }}>
        <MonthSelector
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
        />
      </div>

      <MonthlyBudgetCard month={month} year={year} />
      <ExpenseBreakdown month={month} year={year} />

      <div
        style={{
          padding: '0 22px 12px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <Link
          href="/stats"
          className="card-flat"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--hair)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <I.spark size={16} color="var(--cat-1)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Estatísticas</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 2 }}>
              Ver tendências
            </div>
          </div>
          <I.chev size={14} color="var(--ink-mute)" />
        </Link>
        <Link
          href="/goals"
          className="card-flat"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--hair)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <I.target size={16} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Metas</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 2 }}>
              Ver objetivos
            </div>
          </div>
          <I.chev size={14} color="var(--ink-mute)" />
        </Link>
      </div>
    </Container>
  );
}
