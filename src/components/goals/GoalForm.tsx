'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getTodayISO, parseMoney } from '@/lib/utils';

interface GoalFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function GoalForm({ onClose, onSuccess }: GoalFormProps) {
  const { dispatch } = useFinanceData();
  const [name, setName] = useState('');
  const [type, setType] = useState<'savings' | 'emergency' | 'debt-free' | 'custom'>('savings');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'ADD_GOAL',
      payload: {
        name: name.trim(),
        type,
        targetValue: parseMoney(targetValue),
        currentValue: parseMoney(currentValue),
        deadline: deadline || getTodayISO(),
      },
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Nome da meta"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Ex: Reserva de emergencia"
        maxLength={60}
      />
      <Select
        label="Tipo"
        value={type}
        onChange={(e) => setType(e.target.value as typeof type)}
        options={[
          { value: 'savings', label: 'Poupanca' },
          { value: 'emergency', label: 'Reserva emergencia' },
          { value: 'debt-free', label: 'Quitar dividas' },
          { value: 'custom', label: 'Personalizada' },
        ]}
      />
      <Input
        label="Valor alvo (R$)"
        type="text"
        inputMode="decimal"
        value={targetValue}
        onChange={(e) => setTargetValue(e.target.value)}
        required
        placeholder="10000"
      />
      <Input
        label="Valor atual (R$)"
        type="text"
        inputMode="decimal"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
      />
      <Input
        label="Prazo"
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />
      <Button type="submit">Salvar meta</Button>
      <Button variant="ghost" type="button" onClick={onClose}>
        Cancelar
      </Button>
    </form>
  );
}
