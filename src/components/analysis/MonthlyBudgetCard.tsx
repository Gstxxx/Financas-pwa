'use client';

import { useMemo } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { isRecurringActiveForMonth } from '@/lib/services/installment';
import { NumMono } from '@/components/ui/NumMono';
import { Bars } from '@/components/charts/Bars';
import { fmtBRL, fmtMonthYear, getCurrentMonth, getCurrentYear } from '@/lib/utils';

interface MonthlyBudgetCardProps {
  month: number;
  year: number;
}

const MONTHS_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function MonthlyBudgetCard({ month, year }: MonthlyBudgetCardProps) {
  const {
    user,
    debts,
    installments,
    getExtraIncomeForMonth,
    getPixOutForMonth,
    getMonthlyExpenses,
  } = useFinanceData();

  const budget = useMemo(() => {
    let expenses = getPixOutForMonth(month, year);
    debts.forEach((debt) => {
      if (debt.isRecurring) {
        if (isRecurringActiveForMonth(debt, month, year)) {
          expenses += debt.installmentValue;
        }
      } else {
        const monthInsts = installments.filter((i) => {
          if (i.debtId !== debt.id) return false;
          const [iy, im] = i.dueDate.split('-').map(Number);
          return im === month && iy === year;
        });
        expenses += monthInsts.length * debt.installmentValue;
      }
    });
    const income = user.salary + getExtraIncomeForMonth(month, year);
    return {
      income,
      expenses,
      remaining: income - expenses,
      usagePercent: income > 0 ? (expenses / income) * 100 : 0,
    };
  }, [user, debts, installments, month, year, getExtraIncomeForMonth, getPixOutForMonth]);

  const monthlyExpenses = useMemo(() => getMonthlyExpenses(year), [getMonthlyExpenses, year]);
  const total12m = monthlyExpenses.reduce((s, v) => s + v, 0);
  const avg12m = total12m / 12;
  const isCurrentYear = year === getCurrentYear();
  const currentMonthIdx = isCurrentYear ? getCurrentMonth() - 1 : -1;
  const highlight = year === getCurrentYear() ? currentMonthIdx : month - 1;
  const usage = budget.usagePercent;
  const overUsage = Math.min(100, usage - 100);

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: '20px 18px 14px', marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <div className="t-overline">Despesas por mês · {year}</div>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: 'var(--ink-mute)',
            }}
          >
            média <span style={{ color: 'var(--ink)' }}>{fmtBRL(avg12m)}</span>
          </span>
        </div>
        <Bars
          values={monthlyExpenses}
          labels={MONTHS_LABEL}
          highlight={highlight}
          width={340}
          height={130}
        />
      </div>

      <div className="card" style={{ padding: '22px 22px 20px' }}>
        <div className="t-overline" style={{ marginBottom: 18 }}>
          Orçamento de {fmtMonthYear(month, year)}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginBottom: 22,
          }}
        >
          <Stat label="Receita" value={budget.income} color="var(--accent)" sign="pos" />
          <Stat label="Despesas" value={budget.expenses} color="var(--neg)" sign="neg" />
          <Stat label="Saldo" value={budget.remaining} color="var(--ink)" sign="auto" />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--ink-mute)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          <span>Uso do orçamento</span>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              color: usage > 100 ? 'var(--neg)' : 'var(--accent)',
            }}
          >
            {usage.toFixed(1)}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 99,
            background: 'var(--surface-2)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, usage)}%`,
              background: usage > 100 ? 'var(--neg)' : 'var(--accent)',
              borderRadius: 99,
              transition: 'width 0.6s cubic-bezier(.2,.8,.2,1)',
            }}
          />
          {usage > 100 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${overUsage}%`,
                background:
                  'repeating-linear-gradient(45deg, var(--neg), var(--neg) 3px, transparent 3px, transparent 6px)',
                opacity: 0.5,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  sign,
}: {
  label: string;
  value: number;
  color: string;
  sign: 'pos' | 'neg' | 'auto';
}) {
  const auto = sign === 'auto';
  const s = auto ? (value < 0 ? 'neg' : value > 0 ? 'pos' : false) : sign;
  const finalColor = auto ? (value < 0 ? 'var(--neg)' : color) : color;
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-mute)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ color: finalColor }}>
        <NumMono value={value} sign={s as 'pos' | 'neg' | false} size={17} weight={500} />
      </div>
    </div>
  );
}
