'use client';

import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Ring } from '@/components/charts/Ring';
import { NumMono } from '@/components/ui/NumMono';

export function SavingsRate() {
  const { getTotalIncome, getTotalExpenses } = useFinanceData();
  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const savings = income - expenses;
  const rate = income > 0 ? (savings / income) * 100 : 0;
  const negative = rate < 0;
  const color = negative ? 'var(--neg)' : 'var(--accent)';

  return (
    <div style={{ padding: '0 22px 12px' }}>
      <div className="card" style={{ padding: '22px' }}>
        <div className="t-overline" style={{ marginBottom: 14 }}>
          Taxa de poupança
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Ring value={Math.abs(rate)} max={100} size={84} stroke={9} color={color}>
            <span style={{ fontSize: 13, color }}>{rate.toFixed(0)}%</span>
          </Ring>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--f-display)',
                fontSize: 36,
                fontStyle: 'italic',
                color,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {rate.toFixed(1)}%
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink-mute)',
                marginTop: 8,
              }}
            >
              <NumMono
                value={Math.abs(savings)}
                sign={negative ? 'neg' : 'pos'}
                size={12}
                color={color}
              />{' '}
              por mês
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--ink-faint)',
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              {negative
                ? 'Atenção: despesas excedem a receita este mês.'
                : rate >= 20
                ? 'Excelente! Acima da meta de 20%.'
                : rate >= 10
                ? 'Bom, mas tente chegar a 20%.'
                : 'Tente poupar pelo menos 10% da renda.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
