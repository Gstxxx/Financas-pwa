'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { parseMoney } from '@/lib/utils';

interface SettingsFormProps {
  onSave: () => void;
}

export function SettingsForm({ onSave }: SettingsFormProps) {
  const { user, dispatch } = useFinanceData();
  const toEdit = (v: number) => (v ? v.toFixed(2).replace('.', ',') : '');
  const [salary, setSalary] = useState(toEdit(user.salary));
  const [balance, setBalance] = useState(toEdit(user.currentBalance));
  const [budget, setBudget] = useState(toEdit(user.monthlyBudget));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'SET_USER',
      payload: {
        salary: parseMoney(salary),
        currentBalance: parseMoney(balance),
        monthlyBudget: parseMoney(budget),
      },
    });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[18px] p-5">
      <h3 className="font-display text-lg font-semibold mb-4">Configuracoes</h3>
      <Input
        label="Salario mensal (R$)"
        type="text"
        inputMode="decimal"
        value={salary}
        onChange={(e) => setSalary(e.target.value)}
      />
      <Input
        label="Saldo atual (R$)"
        type="text"
        inputMode="decimal"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
      />
      <Input
        label="Orcamento mensal (R$)"
        type="text"
        inputMode="decimal"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
      />
      <Button type="submit">Salvar configuracoes</Button>
    </form>
  );
}
