'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getTodayISO } from '@/lib/utils';

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
        targetValue: parseFloat(targetValue) || 0,
        currentValue: parseFloat(currentValue) || 0,
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
        type="number"
        step="0.01"
        min="0"
        value={targetValue}
        onChange={(e) => setTargetValue(e.target.value)}
        required
        placeholder="10000"
        inputMode="decimal"
      />
      <Input
        label="Valor atual (R$)"
        type="number"
        step="0.01"
        min="0"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        inputMode="decimal"
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
