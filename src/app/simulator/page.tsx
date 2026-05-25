'use client';

import { useMemo, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { Input } from '@/components/ui/Input';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import {
  getNextUnpaidInstallment,
  getPaidCount,
} from '@/lib/services/installment';
import { fmtBRL, fmtMoneyInput, parseMoney } from '@/lib/utils';
import type { Debt } from '@/lib/types';

interface DebtSnapshot {
  debt: Debt;
  remainingInstallments: number;
  remainingValue: number;
  monthsLeft: number;
}

export default function SimulatorPage() {
  const { debts, installments } = useFinanceData();
  const [extra, setExtra] = useState('200,00');
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');

  const snapshots = useMemo<DebtSnapshot[]>(() => {
    return debts
      .filter((d) => !d.isRecurring)
      .map((d) => {
        const total = d.numberOfInstallments;
        const paid = getPaidCount(installments, d.id);
        const next = getNextUnpaidInstallment(installments, d.id);
        const remaining = Math.max(0, total - paid);
        const remainingValue = remaining * d.installmentValue;
        return {
          debt: d,
          remainingInstallments: remaining,
          remainingValue,
          monthsLeft: next ? remaining : 0,
        };
      })
      .filter((s) => s.remainingInstallments > 0);
  }, [debts, installments]);

  const ranked = useMemo(() => {
    const copy = [...snapshots];
    if (strategy === 'snowball') {
      // Pay off smallest remaining first.
      copy.sort((a, b) => a.remainingValue - b.remainingValue);
    } else {
      // Avalanche w/o interest data: prioritize highest monthly impact.
      copy.sort((a, b) => b.debt.installmentValue - a.debt.installmentValue);
    }
    return copy;
  }, [snapshots, strategy]);

  const extraValue = parseMoney(extra);

  // Simulate applying `extra` per month using the chosen strategy. Each
  // month: pay normal installment for every active debt, then dump the
  // surplus on the priority debt (subtract whole installments at face
  // value until depleted or extras < installmentValue).
  const simulation = useMemo(() => {
    if (snapshots.length === 0) return { baseMonths: 0, fastMonths: 0, saved: 0 };

    const baseline = Math.max(...snapshots.map((s) => s.monthsLeft));
    if (extraValue <= 0) return { baseMonths: baseline, fastMonths: baseline, saved: 0 };

    // Clone counts
    let queue = ranked.map((s) => ({
      remainingInstallments: s.remainingInstallments,
      installmentValue: s.debt.installmentValue,
    }));

    let months = 0;
    const guard = 600; // 50 years sanity cap
    while (queue.some((q) => q.remainingInstallments > 0) && months < guard) {
      months++;
      // Each active debt advances by one month.
      for (const q of queue) {
        if (q.remainingInstallments > 0) q.remainingInstallments -= 1;
      }
      // Apply extra to the first non-finished debt.
      let surplus = extraValue;
      for (const q of queue) {
        if (q.remainingInstallments <= 0) continue;
        while (q.remainingInstallments > 0 && surplus >= q.installmentValue) {
          q.remainingInstallments -= 1;
          surplus -= q.installmentValue;
        }
        if (q.remainingInstallments > 0) break;
      }
      queue = queue.filter((q) => q.remainingInstallments > 0);
    }

    return { baseMonths: baseline, fastMonths: months, saved: Math.max(0, baseline - months) };
  }, [extraValue, ranked, snapshots]);

  return (
    <Container>
      <PageHead overline="Quanto antes você quita" title="Simulador" backHref="/debts" />

      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: 22 }}>
          <h3 className="t-h3" style={{ marginBottom: 14 }}>Aporte extra mensal</h3>
          <Input
            label="Valor extra (R$/mês)"
            type="text"
            inputMode="decimal"
            value={extra}
            onChange={(e) => setExtra(fmtMoneyInput(e.target.value))}
            placeholder="0,00"
          />
          <div style={{ marginBottom: 6 }}>
            <label className="field-label">Estratégia</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <StrategyChip
                active={strategy === 'snowball'}
                onClick={() => setStrategy('snowball')}
                title="Bola de neve"
                hint="Menor saldo primeiro · vitória rápida"
              />
              <StrategyChip
                active={strategy === 'avalanche'}
                onClick={() => setStrategy('avalanche')}
                title="Avalanche"
                hint="Maior parcela primeiro · alivia caixa"
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="t-overline" style={{ marginBottom: 12 }}>Resultado</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <Metric
              label="Hoje, sem aporte"
              value={`${simulation.baseMonths} ${simulation.baseMonths === 1 ? 'mês' : 'meses'}`}
              color="var(--ink-mid)"
            />
            <Metric
              label="Com aporte"
              value={`${simulation.fastMonths} ${simulation.fastMonths === 1 ? 'mês' : 'meses'}`}
              color="var(--accent)"
            />
          </div>
          {simulation.saved > 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-mid)', margin: 0 }}>
              Você quita as dívidas{' '}
              <strong style={{ color: 'var(--accent)' }}>
                {simulation.saved} {simulation.saved === 1 ? 'mês' : 'meses'} antes
              </strong>
              {' '}aplicando R$ {fmtBRL(extraValue).replace('R$', '').trim()} extra por mês na estratégia
              <strong> {strategy === 'snowball' ? 'bola de neve' : 'avalanche'}</strong>.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>
              Aumente o aporte para ver o ganho de tempo.
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="t-overline" style={{ marginBottom: 12 }}>
            Ordem de pagamento ({strategy === 'snowball' ? 'snowball' : 'avalanche'})
          </div>
          {ranked.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>
              Nenhuma dívida parcelada em aberto.
            </p>
          ) : (
            <ol style={{ paddingInlineStart: 18, margin: 0 }}>
              {ranked.map((s) => (
                <li key={s.debt.id} style={{ padding: '8px 0', fontSize: 13.5 }}>
                  <strong>{s.debt.accountName}</strong>{' '}
                  <span style={{ color: 'var(--ink-mute)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                    {s.remainingInstallments}× · {fmtBRL(s.debt.installmentValue)}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)' }}>
                    Resta {fmtBRL(s.remainingValue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Container>
  );
}

function StrategyChip({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        textAlign: 'left',
        borderRadius: 12,
        background: active ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--hair)'}`,
        color: 'var(--ink)',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{hint}</div>
    </button>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-mute)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
