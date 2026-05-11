'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn, fmtBRL, fmtMonthYear, parseMoney } from '@/lib/utils';
import { forecastBillNextMonth, type BillForecast } from '@/lib/services/budget';

interface BillForecastFormProps {
  onClose: () => void;
}

const STATUS_COPY: Record<BillForecast['status'], { tone: string; title: string; subtitle: string }> = {
  ok: {
    tone: 'bg-income/15 text-income border-income/40',
    title: 'Cabe no orcamento',
    subtitle: 'Voce ainda fica com folga depois dessa conta.',
  },
  tight: {
    tone: 'bg-warn/15 text-warn border-warn/40',
    title: 'Vai ficar apertado',
    subtitle: 'Sobra menos de 10% da receita. De para encaixar, mas com cuidado.',
  },
  over: {
    tone: 'bg-critical/15 text-critical border-critical/40',
    title: 'Prejudica o orcamento',
    subtitle: 'Essa conta estoura o saldo previsto pro proximo mes.',
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
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setForecast(null);
        }}
        required
        placeholder="0,00"
        autoFocus
      />

      <Button type="submit">Simular impacto</Button>

      {forecast && (
        <div className="mt-4 space-y-3">
          <div className={cn('rounded-[14px] border p-4', STATUS_COPY[forecast.status].tone)}>
            <div className="font-display text-[15px] font-semibold tracking-tight">
              {STATUS_COPY[forecast.status].title}
            </div>
            <div className="text-[12px] mt-1 opacity-80">
              {STATUS_COPY[forecast.status].subtitle}
            </div>
          </div>

          <div className="text-[10.5px] tracking-[0.14em] uppercase text-text-3 font-medium pt-1">
            Projecao para {fmtMonthYear(forecast.month, forecast.year)}
          </div>

          <div className="space-y-0">
            <Row label="Receita prevista" value={fmtBRL(forecast.income)} />
            <Row label="Saidas ja agendadas" value={fmtBRL(forecast.expenses)} />
            <Row
              label="Saldo antes da conta"
              value={fmtBRL(forecast.remainingBefore)}
              tone={forecast.remainingBefore >= 0 ? 'income' : 'expense'}
            />
            <Row label="Conta hipotetica" value={`− ${fmtBRL(forecast.hypotheticalAmount)}`} />
            <Row
              label="Saldo apos a conta"
              value={fmtBRL(forecast.remainingAfter)}
              tone={forecast.remainingAfter >= 0 ? 'income' : 'expense'}
              strong
            />
            <Row label="Margem sobre receita" value={`${forecast.marginPct.toFixed(1)}%`} />
          </div>
        </div>
      )}

      <Button variant="ghost" type="button" onClick={onClose}>
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
  tone?: 'income' | 'expense';
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between py-2.5 border-b border-border last:border-b-0 text-sm items-center gap-3">
      <span className="text-text-3 text-[13px]">{label}</span>
      <span
        className={cn(
          'tabular-nums text-right',
          strong ? 'font-display font-semibold text-[15px]' : 'font-medium',
          tone === 'income' && 'text-income',
          tone === 'expense' && 'text-expense'
        )}
      >
        {value}
      </span>
    </div>
  );
}
