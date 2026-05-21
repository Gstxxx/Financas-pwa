'use client';

import { useMemo } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { TrendChart } from '@/components/stats/TrendChart';
import { SavingsRate } from '@/components/stats/SavingsRate';
import { NumMono } from '@/components/ui/NumMono';
import { Sparkline } from '@/components/charts/Sparkline';
import { Ring } from '@/components/charts/Ring';
import { Donut } from '@/components/charts/Donut';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { fmtBRL, getCurrentMonth, getCurrentYear } from '@/lib/utils';

export default function StatsPage() {
  const {
    debts,
    installments,
    getMonthlyExpenses,
    getFixos,
    getBreakdown,
    getTotalExpenses,
  } = useFinanceData();

  const year = getCurrentYear();
  const month = getCurrentMonth();
  const currentMonthIdx = month - 1;

  const totalDebtValue = debts.reduce((sum, d) => {
    if (d.isRecurring) return sum;
    return sum + d.installmentValue * d.numberOfInstallments;
  }, 0);

  const totalPaid = debts.reduce((sum, d) => {
    if (d.isRecurring) return sum;
    const paid = installments.filter((i) => i.debtId === d.id && i.isPaid).length;
    return sum + paid * d.installmentValue;
  }, 0);

  const monthly = useMemo(() => getMonthlyExpenses(year), [getMonthlyExpenses, year]);
  const fixos = getFixos(month, year);
  const breakdown = useMemo(() => getBreakdown(month, year), [getBreakdown, month, year]);
  const totalOut = getTotalExpenses();
  const fixosPct = totalOut > 0 ? (fixos.value / totalOut) * 100 : 0;

  return (
    <Container>
      <PageHead overline="Visão detalhada" title="Estatísticas" backHref="/analysis" />

      <div
        style={{
          padding: '0 22px 12px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
          <div className="t-overline" style={{ marginBottom: 10 }}>
            Total em dívidas
          </div>
          <div style={{ color: 'var(--neg)' }}>
            <NumMono value={totalDebtValue} sign="neg" size={18} weight={500} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline
              values={monthly}
              width={132}
              height={22}
              color="var(--neg)"
              fill
              last={false}
            />
          </div>
        </div>
        <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
          <div className="t-overline" style={{ marginBottom: 10 }}>
            Total pago em {year}
          </div>
          <div style={{ color: 'var(--accent)' }}>
            <NumMono value={totalPaid} sign="pos" size={18} weight={500} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline
              values={monthly.slice(0, currentMonthIdx + 1)}
              width={132}
              height={22}
              color="var(--accent)"
              fill
              last={false}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 12px' }}>
        <div className="card-flat" style={{ padding: '16px 16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div className="t-overline" style={{ marginBottom: 10 }}>
                Fixos mensais
              </div>
              <div style={{ color: 'var(--ink)' }}>
                <NumMono value={fixos.value} sign="neg" size={18} weight={500} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink-mute)',
                  marginTop: 6,
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                {fixos.count} contas recorrentes · {fixosPct.toFixed(0)}% das saídas
              </div>
            </div>
            <Ring value={fixosPct} size={56} stroke={6} color="var(--cat-1)">
              <span style={{ fontSize: 12, color: 'var(--cat-1)' }}>{fixosPct.toFixed(0)}%</span>
            </Ring>
          </div>
        </div>
      </div>

      <TrendChart />
      <SavingsRate />

      {breakdown.length > 0 && (
        <div style={{ padding: '0 22px 12px' }}>
          <div className="card" style={{ padding: '22px' }}>
            <div className="t-overline" style={{ marginBottom: 18 }}>
              Distribuição das saídas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <Donut
                size={128}
                stroke={18}
                slices={breakdown.map((b) => ({
                  value: b.value,
                  color: `oklch(0.74 0.10 ${b.hue})`,
                }))}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-mute)',
                  }}
                >
                  Total
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontFeatureSettings: '"tnum" 1',
                    fontWeight: 600,
                    fontSize: 18,
                    letterSpacing: '-0.03em',
                    color: 'var(--ink)',
                    marginTop: 2,
                  }}
                >
                  {fmtBRL(totalOut)}
                </div>
              </Donut>
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                {breakdown.slice(0, 5).map((b) => (
                  <div
                    key={b.entityId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '8px 1fr auto',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background: `oklch(0.74 0.10 ${b.hue})`,
                      }}
                    />
                    <span style={{ fontSize: 12 }}>{b.name}</span>
                    <span
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 10.5,
                        color: 'var(--ink-faint)',
                      }}
                    >
                      {b.pct.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
