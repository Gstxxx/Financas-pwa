'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn, getCurrentMonth, getCurrentYear, getEntityHue, parseMoney } from '@/lib/utils';
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
        numeric
        value={installmentValue}
        onChange={(e) => setInstallmentValue(e.target.value)}
        required
        placeholder="0,00"
      />
      <Input
        label="Número de parcelas (0 = fixo/recorrente)"
        type="number"
        min="0"
        numeric
        value={numberOfInstallments}
        onChange={(e) => setNumberOfInstallments(e.target.value)}
      />
      <Input
        label="Dia de vencimento"
        type="number"
        min="1"
        max="31"
        numeric
        value={dueDay}
        onChange={(e) => setDueDay(e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input
          label="Mês início"
          type="number"
          min="1"
          max="12"
          numeric
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />
        <Input
          label="Ano início"
          type="number"
          min="2020"
          numeric
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
        />
      </div>
      {entities.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Categorias</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {entities.map((ent) => {
              const active = entityIds.includes(ent.id);
              const hue = getEntityHue(ent);
              return (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => toggleEntity(ent.id)}
                  className={cn('pill')}
                  style={
                    active
                      ? {
                          height: 30,
                          padding: '0 12px',
                          fontSize: 12,
                          color: `oklch(0.85 0.10 ${hue})`,
                          borderColor: `oklch(0.55 0.10 ${hue})`,
                          background: `oklch(0.30 0.06 ${hue} / 0.55)`,
                          cursor: 'pointer',
                        }
                      : {
                          height: 30,
                          padding: '0 12px',
                          fontSize: 12,
                          cursor: 'pointer',
                        }
                  }
                >
                  <span className="dot" style={{ background: `oklch(0.78 0.12 ${hue})` }} />
                  {ent.name}
                </button>
              );
            })}
          </div>
          {entityIds.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
              Sem categoria
            </p>
          )}
        </div>
      )}
      <Button type="submit" variant="accent">
        {isEdit ? 'Salvar alterações' : 'Salvar conta'}
      </Button>
      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Cancelar
      </Button>
    </form>
  );
}
