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
    <div style={{ padding: '0 22px 14px' }}>
      <form onSubmit={handleSubmit} className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 18 }}>
          Configurações
        </h3>
        <Input
          label="Salário mensal (R$)"
          type="text"
          inputMode="decimal"
          numeric
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />
        <Input
          label="Saldo atual (R$)"
          type="text"
          inputMode="decimal"
          numeric
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
        <Input
          label="Orçamento mensal (R$)"
          type="text"
          inputMode="decimal"
          numeric
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <Button type="submit" variant="accent">
          Salvar configurações
        </Button>
      </form>
    </div>
  );
}
