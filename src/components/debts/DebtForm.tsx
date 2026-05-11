'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCurrentMonth, getCurrentYear, parseMoney } from '@/lib/utils';
import type { Debt } from '@/lib/types';

interface DebtFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialDebt?: Debt;
}

function formatMoneyForEdit(value: number): string {
  if (!value) return '';
  return value.toFixed(2).replace('.', ',');
}

export function DebtForm({ onClose, onSuccess, initialDebt }: DebtFormProps) {
  const { entities, dispatch } = useFinanceData();
  const isEdit = !!initialDebt;

  const [accountName, setAccountName] = useState(initialDebt?.accountName ?? '');
  const [installmentValue, setInstallmentValue] = useState(
    initialDebt ? formatMoneyForEdit(initialDebt.installmentValue) : ''
  );
  const [numberOfInstallments, setNumberOfInstallments] = useState(
    String(initialDebt?.numberOfInstallments ?? 0)
  );
  const [dueDay, setDueDay] = useState(String(initialDebt?.dueDay ?? 10));
  const [startMonth, setStartMonth] = useState(
    String(initialDebt?.startMonth ?? getCurrentMonth())
  );
  const [startYear, setStartYear] = useState(
    String(initialDebt?.startYear ?? getCurrentYear())
  );
  const [entityIds, setEntityIds] = useState<string[]>(initialDebt?.entityIds ?? []);

  const toggleEntity = (id: string) => {
    setEntityIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = entities.filter((ent) => entityIds.includes(ent.id));
    const payload = {
      accountName: accountName.trim(),
      installmentValue: parseMoney(installmentValue),
      numberOfInstallments: parseInt(numberOfInstallments) || 0,
      dueDay: parseInt(dueDay) || 10,
      startMonth: parseInt(startMonth),
      startYear: parseInt(startYear),
      entityIds: selected.map((e) => e.id),
      entityNames: selected.map((e) => e.name),
    };

    if (isEdit && initialDebt) {
      dispatch({ type: 'UPDATE_DEBT', payload: { id: initialDebt.id, ...payload } });
    } else {
      dispatch({ type: 'ADD_DEBT', payload });
    }
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
        type="text"
        inputMode="decimal"
        value={installmentValue}
        onChange={(e) => setInstallmentValue(e.target.value)}
        required
        placeholder="0,00"
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
        <div className="mb-3.5">
          <label className="block text-[11px] text-text-2 mb-1.5 tracking-widest uppercase font-medium">
            Categorias
          </label>
          <div className="flex flex-wrap gap-2">
            {entities.map((ent) => {
              const active = entityIds.includes(ent.id);
              return (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => toggleEntity(ent.id)}
                  className={
                    active
                      ? 'text-[12px] px-3 py-1.5 rounded-full border border-accent bg-accent/15 text-accent font-medium transition-colors'
                      : 'text-[12px] px-3 py-1.5 rounded-full border border-border bg-bg text-text-2 font-medium transition-colors hover:border-border-strong'
                  }
                >
                  {ent.name}
                </button>
              );
            })}
          </div>
          {entityIds.length === 0 && (
            <p className="text-[11px] text-text-3 mt-1.5">Sem categoria</p>
          )}
        </div>
      )}
      <Button type="submit">{isEdit ? 'Salvar alteracoes' : 'Salvar conta'}</Button>
      <Button variant="ghost" type="button" onClick={onClose}>
        Cancelar
      </Button>
    </form>
  );
}
