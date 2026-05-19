'use client';

import { useMemo } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Bars } from '@/components/charts/Bars';
import { getCurrentMonth, getCurrentYear } from '@/lib/utils';

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function TrendChart() {
  const { getMonthlyExpenses } = useFinanceData();
  const year = getCurrentYear();
  const currentMonthIdx = getCurrentMonth() - 1;
  const values = useMemo(() => getMonthlyExpenses(year), [getMonthlyExpenses, year]);

  return (
    <div style={{ padding: '0 22px 12px' }}>
      <div className="card" style={{ padding: '20px 18px 14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <div className="t-overline">Tendência {year}</div>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              color: 'var(--ink-faint)',
              letterSpacing: '0.04em',
            }}
          >
            MÊS ATUAL EM DESTAQUE
          </span>
        </div>
        <Bars
          values={values}
          labels={MONTH_ABBR}
          highlight={currentMonthIdx}
          width={340}
          height={140}
        />
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 6,
            fontSize: 11,
            color: 'var(--ink-mute)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: 'var(--accent)',
              }}
            />
            Mês atual
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: 'var(--surface-2)',
              }}
            />
            Demais
          </span>
        </div>
      </div>
    </div>
  );
}
