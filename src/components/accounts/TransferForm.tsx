'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { fmtBRL, fmtMoneyInput, getTodayISO, parseMoney } from '@/lib/utils';

interface TransferFormProps {
  onClose: () => void;
  onSuccess: () => void;
  /** When set, pre-fills the from-account dropdown. */
  initialFromId?: string;
}

export function TransferForm({ onClose, onSuccess, initialFromId }: TransferFormProps) {
  const { accounts, dispatch } = useFinanceData();
  const visible = accounts.filter((a) => !a.archived);
  const defaultFrom = initialFromId ?? visible[0]?.id ?? '';
  const defaultTo = visible.find((a) => a.id !== defaultFrom)?.id ?? '';

  const [fromId, setFromId] = useState(defaultFrom);
  const [toId, setToId] = useState(defaultTo);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState('');

  const fromAcc = visible.find((a) => a.id === fromId);
  const value = parseMoney(amount);
  const wouldOverdraft = fromAcc && value > 0 && fromAcc.currentBalance - value < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId || value <= 0) return;
    dispatch({
      type: 'ADD_TRANSFER',
      payload: {
        fromAccountId: fromId,
        toAccountId: toId,
        amount: value,
        date,
        note: note.trim() || undefined,
      },
    });
    onSuccess();
  };

  if (visible.length < 2) {
    return (
      <div style={{ padding: '14px 0' }}>
        <p style={{ fontSize: 13, color: 'var(--ink-mid)', marginBottom: 14 }}>
          Você precisa de pelo menos duas contas pra transferir. Crie outra carteira primeiro.
        </p>
        <Button variant="ghost" type="button" onClick={onClose}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="tr-from">De</label>
      <select
        id="tr-from"
        value={fromId}
        onChange={(e) => setFromId(e.target.value)}
        style={selectStyle}
      >
        {visible.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} — {fmtBRL(a.currentBalance)}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="tr-to" style={{ marginTop: 12 }}>
        Para
      </label>
      <select
        id="tr-to"
        value={toId}
        onChange={(e) => setToId(e.target.value)}
        style={selectStyle}
      >
        {visible
          .filter((a) => a.id !== fromId)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {fmtBRL(a.currentBalance)}
            </option>
          ))}
      </select>

      <Input
        label="Valor (R$)"
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(fmtMoneyInput(e.target.value))}
        required
        placeholder="0,00"
      />
      {wouldOverdraft && (
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--neg)',
            marginTop: -10,
            marginBottom: 14,
          }}
        >
          O saldo de {fromAcc?.name} ficará negativo após a transferência.
        </div>
      )}

      <Input
        label="Data"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <Input
        label="Anotação (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Pagamento de cartão, sobra do mês..."
        maxLength={120}
      />

      <Button type="submit" variant="accent" disabled={!fromId || !toId || fromId === toId || value <= 0}>
        Transferir
      </Button>
      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Cancelar
      </Button>
    </form>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: 14,
  background: 'var(--surface)',
  border: '1px solid var(--hair)',
  color: 'var(--ink)',
  borderRadius: 12,
  fontFamily: 'var(--f-sans)',
  marginBottom: 14,
  outline: 'none',
};
