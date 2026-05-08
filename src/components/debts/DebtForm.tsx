'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCurrentMonth, getCurrentYear } from '@/lib/utils';

interface DebtFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function DebtForm({ onClose, onSuccess }: DebtFormProps) {
  const { entities, dispatch } = useFinanceData();
  const [accountName, setAccountName] = useState('');
  const [installmentValue, setInstallmentValue] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('0');
  const [dueDay, setDueDay] = useState('10');
  const [startMonth, setStartMonth] = useState(String(getCurrentMonth()));
  const [startYear, setStartYear] = useState(String(getCurrentYear()));
  const [entityId, setEntityId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entity = entities.find((ent) => ent.id === entityId);
    dispatch({
      type: 'ADD_DEBT',
      payload: {
        accountName: accountName.trim(),
        installmentValue: parseFloat(installmentValue),
        numberOfInstallments: parseInt(numberOfInstallments) || 0,
        dueDay: parseInt(dueDay) || 10,
        startMonth: parseInt(startMonth),
        startYear: parseInt(startYear),
        entityId: entityId,
        entityName: entity?.name || '',
      },
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Nome da conta"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        required
        placeholder="Ex: Aluguel"
        maxLength={60}
        autoComplete="off"
      />
      <Input
        label="Valor da parcela (R$)"
        type="number"
        step="0.01"
        min="0"
        value={installmentValue}
        onChange={(e) => setInstallmentValue(e.target.value)}
        required
        placeholder="0,00"
        inputMode="decimal"
      />
      <Input
        label="Numero de parcelas (0 = fixo/recorrente)"
        type="number"
        min="0"
        value={numberOfInstallments}
        onChange={(e) => setNumberOfInstallments(e.target.value)}
      />
      <Input
        label="Dia de vencimento"
        type="number"
        min="1"
        max="31"
        value={dueDay}
        onChange={(e) => setDueDay(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Input
          label="Mes inicio"
          type="number"
          min="1"
          max="12"
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />
        <Input
          label="Ano inicio"
          type="number"
          min="2020"
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
        />
      </div>
      {entities.length > 0 && (
        <Select
          label="Categoria"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          options={[
            { value: '', label: 'Sem categoria' },
            ...entities.map((ent) => ({ value: ent.id, label: ent.name })),
          ]}
        />
      )}
      <Button type="submit">Salvar conta</Button>
      <Button variant="ghost" type="button" onClick={onClose}>
        Cancelar
      </Button>
    </form>
  );
}
