'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getTodayISO, parseMoney } from '@/lib/utils';
import type { IncomeDirection } from '@/lib/types';

interface IncomeFormProps {
  onClose: () => void;
  onSuccess: (direction: IncomeDirection) => void;
  initialDirection?: IncomeDirection;
}

export function IncomeForm({ onClose, onSuccess, initialDirection = 'entrada' }: IncomeFormProps) {
  const { dispatch } = useFinanceData();

  const [direction, setDirection] = useState<IncomeDirection>(initialDirection);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseMoney(amount);
    if (value <= 0) return;
    dispatch({
      type: 'ADD_INCOME',
      payload: {
        description: description.trim() || (direction === 'entrada' ? 'Entrada' : 'PIX'),
        amount: value,
        date,
        direction,
      },
    });
    onSuccess(direction);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">Tipo</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <DirectionToggle
            active={direction === 'entrada'}
            tone="accent"
            label="Entrada"
            onClick={() => setDirection('entrada')}
          />
          <DirectionToggle
            active={direction === 'saida'}
            tone="neg"
            label="PIX / Saída"
            onClick={() => setDirection('saida')}
          />
        </div>
      </div>

      <Input
        label="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={direction === 'entrada' ? 'Ex: Freela design' : 'Ex: PIX padaria'}
        maxLength={60}
        autoComplete="off"
      />
      <Input
        label="Valor (R$)"
        type="text"
        inputMode="decimal"
        numeric
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        placeholder="0,00"
      />
      <Input
        label="Data"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <Button type="submit" variant="accent">
        {direction === 'entrada' ? 'Salvar entrada' : 'Salvar saída'}
      </Button>
      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Cancelar
      </Button>
    </form>
  );
}

interface ToggleProps {
  active: boolean;
  tone: 'accent' | 'neg';
  label: string;
  onClick: () => void;
}

function DirectionToggle({ active, tone, label, onClick }: ToggleProps) {
  const colorVar = tone === 'accent' ? 'var(--accent)' : 'var(--neg)';
  const style: React.CSSProperties = active
    ? {
        background: `color-mix(in oklch, ${colorVar} 18%, transparent)`,
        border: `1px solid color-mix(in oklch, ${colorVar} 55%, transparent)`,
        color: colorVar,
      }
    : {
        background: 'transparent',
        border: '1px solid var(--hair)',
        color: 'var(--ink-mute)',
      };
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn"
      style={{ ...style, padding: '12px 18px', justifyContent: 'center' }}
    >
      {label}
    </button>
  );
}
