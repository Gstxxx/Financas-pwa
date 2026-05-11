'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn, getTodayISO, parseMoney } from '@/lib/utils';
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
      <div className="mb-3.5">
        <div className="block text-[11px] text-text-2 mb-1.5 tracking-widest uppercase font-medium">
          Tipo
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DirectionToggle
            active={direction === 'entrada'}
            tone="income"
            label="Entrada"
            onClick={() => setDirection('entrada')}
          />
          <DirectionToggle
            active={direction === 'saida'}
            tone="expense"
            label="PIX / Saida"
            onClick={() => setDirection('saida')}
          />
        </div>
      </div>

      <Input
        label="Descricao"
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
      <Button type="submit">
        {direction === 'entrada' ? 'Salvar entrada' : 'Salvar saida'}
      </Button>
      <Button variant="ghost" type="button" onClick={onClose}>
        Cancelar
      </Button>
    </form>
  );
}

interface ToggleProps {
  active: boolean;
  tone: 'income' | 'expense';
  label: string;
  onClick: () => void;
}

function DirectionToggle({ active, tone, label, onClick }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'py-3 rounded-sm font-display text-sm font-semibold tracking-tight transition-all border',
        'active:scale-[0.98]',
        active
          ? tone === 'income'
            ? 'bg-income/15 border-income/50 text-income'
            : 'bg-expense/15 border-expense/50 text-expense'
          : 'bg-transparent border-border-strong text-text-3'
      )}
    >
      {label}
    </button>
  );
}
