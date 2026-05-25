'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { NumMono } from '@/components/ui/NumMono';
import { I } from '@/components/icons/I';
import { fmtMoneyInput, getCurrentMonth, getCurrentYear, parseMoney } from '@/lib/utils';
import type { RecurringIncome } from '@/lib/types';

export function RecurringIncomeSection() {
  const { recurringIncomes, dispatch } = useFinanceData();
  const [editing, setEditing] = useState<RecurringIncome | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <h3 className="t-h3">Receitas fixas</h3>
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              textTransform: 'uppercase',
            }}
          >
            + Adicionar
          </button>
        </div>

        <p
          style={{
            fontSize: 12.5,
            color: 'var(--ink-mute)',
            marginTop: 0,
            marginBottom: 14,
          }}
        >
          Receitas que entram todo mês (salário, freela, aluguel a receber)
          viram lançamentos automaticamente no dia escolhido.
        </p>

        {recurringIncomes.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-faint)',
              fontStyle: 'italic',
              padding: '14px 0',
              textAlign: 'center',
            }}
          >
            Nenhuma receita fixa cadastrada.
          </div>
        ) : (
          <div>
            {recurringIncomes.map((r, idx) => (
              <div
                key={r.id}
                onClick={() => setEditing(r)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--hair-soft)',
                  cursor: 'pointer',
                  opacity: r.isActive ? 1 : 0.55,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {r.name}
                    {!r.isActive && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-faint)',
                          fontFamily: 'var(--f-mono)',
                          textTransform: 'uppercase',
                        }}
                      >
                        · pausada
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-mute)',
                      marginTop: 3,
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Todo dia {r.dueDay} · desde {r.startMonth}/{r.startYear}
                  </div>
                </div>
                <NumMono value={r.amount} sign="pos" color="var(--accent)" size={14} />
                <I.chev size={12} color="var(--ink-mute)" />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        title={editing ? 'Editar receita fixa' : 'Nova receita fixa'}
      >
        <RecurringIncomeForm
          initial={editing ?? undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onDelete={
            editing
              ? () => {
                  if (window.confirm('Apagar esta receita fixa? Lançamentos já criados ficam.')) {
                    dispatch({ type: 'DELETE_RECURRING_INCOME', payload: editing.id });
                    setEditing(null);
                  }
                }
              : undefined
          }
        />
      </BottomSheet>
    </div>
  );
}

function RecurringIncomeForm({
  initial,
  onClose,
  onDelete,
}: {
  initial?: RecurringIncome;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const { dispatch } = useFinanceData();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(
    initial?.amount ? initial.amount.toFixed(2).replace('.', ',') : ''
  );
  const [dueDay, setDueDay] = useState(String(initial?.dueDay ?? 5));
  const [startMonth, setStartMonth] = useState(String(initial?.startMonth ?? getCurrentMonth()));
  const [startYear, setStartYear] = useState(String(initial?.startYear ?? getCurrentYear()));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      amount: parseMoney(amount),
      dueDay: Math.max(1, Math.min(31, Number(dueDay) || 1)),
      startMonth: Math.max(1, Math.min(12, Number(startMonth) || 1)),
      startYear: Number(startYear) || getCurrentYear(),
      isActive,
    };
    if (isEdit && initial) {
      dispatch({ type: 'UPDATE_RECURRING_INCOME', payload: { id: initial.id, ...payload } });
    } else {
      dispatch({ type: 'ADD_RECURRING_INCOME', payload });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Salário, Freela X..."
        maxLength={60}
        autoComplete="off"
      />
      <Input
        label="Valor (R$)"
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(fmtMoneyInput(e.target.value))}
        required
        placeholder="0,00"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Input
          label="Dia do mês"
          type="number"
          min={1}
          max={31}
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          required
        />
        <Input
          label="Mês início"
          type="number"
          min={1}
          max={12}
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
          required
        />
        <Input
          label="Ano início"
          type="number"
          min={2020}
          max={2100}
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
          required
        />
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 0',
          fontSize: 13,
          color: 'var(--ink-mid)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Ativa (gera lançamentos automaticamente)
      </label>

      <Button type="submit" variant="accent">
        {isEdit ? 'Salvar' : 'Cadastrar receita fixa'}
      </Button>
      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Cancelar
      </Button>
      {onDelete && (
        <Button variant="danger" type="button" onClick={onDelete} className="mt-2">
          Apagar
        </Button>
      )}
    </form>
  );
}
