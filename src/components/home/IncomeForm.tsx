'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getTodayISO, parseMoney } from '@/lib/utils';

interface IncomeFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function IncomeForm({ onClose, onSuccess }: IncomeFormProps) {
  const { dispatch } = useFinanceData();

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
        description: description.trim() || 'Entrada',
        amount: value,
        date,
      },
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Descricao"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ex: Freela design"
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
      <Button type="submit">Salvar entrada</Button>
      <Button variant="ghost" type="button" onClick={onClose}>
        Cancelar
      </Button>
    </form>
  );
}
