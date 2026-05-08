'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SettingsFormProps {
  onSave: () => void;
}

export function SettingsForm({ onSave }: SettingsFormProps) {
  const { user, dispatch } = useFinanceData();
  const [salary, setSalary] = useState(String(user.salary));
  const [balance, setBalance] = useState(String(user.currentBalance));
  const [budget, setBudget] = useState(String(user.monthlyBudget));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'SET_USER',
      payload: {
        salary: parseFloat(salary) || 0,
        currentBalance: parseFloat(balance) || 0,
        monthlyBudget: parseFloat(budget) || 0,
      },
    });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[18px] p-5">
      <h3 className="font-display text-lg font-semibold mb-4">Configuracoes</h3>
      <Input
        label="Salario mensal (R$)"
        type="number"
        step="0.01"
        value={salary}
        onChange={(e) => setSalary(e.target.value)}
        inputMode="decimal"
      />
      <Input
        label="Saldo atual (R$)"
        type="number"
        step="0.01"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        inputMode="decimal"
      />
      <Input
        label="Orcamento mensal (R$)"
        type="number"
        step="0.01"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        inputMode="decimal"
      />
      <Button type="submit">Salvar configuracoes</Button>
    </form>
  );
}
