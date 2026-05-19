'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { fmtBRL, fmtMonthYear, parseMoney } from '@/lib/utils';
import { forecastBillNextMonth, type BillForecast } from '@/lib/services/budget';

interface BillForecastFormProps {
  onClose: () => void;
}

const STATUS_COPY: Record<BillForecast['status'], { color: string; title: string; subtitle: string }> = {
  ok: {
    color: 'var(--accent)',
    title: 'Cabe no orçamento',
    subtitle: 'Você ainda fica com folga depois dessa conta.',
  },
  tight: {
    color: 'var(--warn)',
    title: 'Vai ficar apertado',
    subtitle: 'Sobra menos de 10% da receita. Dá para encaixar, mas com cuidado.',
  },
  over: {
    color: 'var(--neg)',
    title: 'Prejudica o orçamento',
    subtitle: 'Essa conta estoura o saldo previsto pro próximo mês.',
  },
};

export function BillForecastForm({ onClose }: BillForecastFormProps) {
  const { user, debts, installments, incomes } = useFinanceData();
  const [amount, setAmount] = useState('');
  const [forecast, setForecast] = useState<BillForecast | null>(null);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseMoney(amount);
    if (value <= 0) return;
    setForecast(forecastBillNextMonth(user, debts, installments, incomes, value));
  };

  return (
    <form onSubmit={handleSimulate}>
      <Input
        label="Valor da conta (R$)"
        type="text"
        inputMode="decimal"
        numeric
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setForecast(null);
        }}
        required
        placeholder="0,00"
        autoFocus
      />

      <Button type="submit" variant="accent">
        Simular impacto
      </Button>

      {forecast && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              borderRadius: 14,
              border: `1px solid color-mix(in oklch, ${STATUS_COPY[forecast.status].color} 45%, transparent)`,
              background: `color-mix(in oklch, ${STATUS_COPY[forecast.status].color} 12%, transparent)`,
              padding: 16,
              color: STATUS_COPY[forecast.status].color,
            }}
          >
            <div className="t-h3">{STATUS_COPY[forecast.status].title}</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
              {STATUS_COPY[forecast.status].subtitle}
            </div>
          </div>

          <div className="t-overline" style={{ marginTop: 16, marginBottom: 4 }}>
            Projeção para {fmtMonthYear(forecast.month, forecast.year)}
          </div>

          <div style={{ marginTop: 6 }}>
            <Row label="Receita prevista" value={fmtBRL(forecast.income)} />
            <Row label="Saídas já agendadas" value={fmtBRL(forecast.expenses)} />
            <Row
              label="Saldo antes da conta"
              value={fmtBRL(forecast.remainingBefore)}
              tone={forecast.remainingBefore >= 0 ? 'accent' : 'neg'}
            />
            <Row label="Conta hipotética" value={`− ${fmtBRL(forecast.hypotheticalAmount)}`} />
            <Row
              label="Saldo após a conta"
              value={fmtBRL(forecast.remainingAfter)}
              tone={forecast.remainingAfter >= 0 ? 'accent' : 'neg'}
              strong
            />
            <Row label="Margem sobre receita" value={`${forecast.marginPct.toFixed(1)}%`} />
          </div>
        </div>
      )}

      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Fechar
      </Button>
    </form>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: 'accent' | 'neg';
  strong?: boolean;
}) {
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'neg' ? 'var(--neg)' : 'var(--ink)';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--hair-soft)',
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--ink-mute)', fontSize: 13 }}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontFeatureSettings: '"tnum" 1',
          fontSize: strong ? 16 : 14,
          fontWeight: strong ? 500 : 400,
          color,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}
