'use client';

import { useMemo, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { HUE_PALETTE, fmtMoneyInput, getInitialGlyph, hashHue, parseMoney } from '@/lib/utils';
import type { Account, AccountType } from '@/lib/types';

interface AccountFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialAccount?: Account;
}

const TYPE_OPTIONS: { value: AccountType; label: string; hint: string }[] = [
  { value: 'checking', label: 'Conta corrente', hint: 'Banco, conta-salário' },
  { value: 'savings', label: 'Poupança', hint: 'Reserva' },
  { value: 'cash', label: 'Dinheiro', hint: 'Carteira física' },
  { value: 'credit_card', label: 'Cartão de crédito', hint: 'Saldo = fatura aberta' },
  { value: 'investment', label: 'Investimento', hint: 'Tesouro, FII, CDB, ação' },
];

export function AccountForm({ onClose, onSuccess, initialAccount }: AccountFormProps) {
  const { dispatch } = useFinanceData();
  const isEdit = !!initialAccount;
  const [name, setName] = useState(initialAccount?.name ?? '');
  const [type, setType] = useState<AccountType>(initialAccount?.type ?? 'checking');
  const [balance, setBalance] = useState(
    initialAccount?.currentBalance
      ? initialAccount.currentBalance.toFixed(2).replace('.', ',')
      : ''
  );
  const [hue, setHue] = useState<number>(
    initialAccount?.hue ?? hashHue(initialAccount?.name ?? '')
  );
  const [closingDay, setClosingDay] = useState(String(initialAccount?.closingDay ?? 1));
  const [dueDay, setDueDay] = useState(String(initialAccount?.dueDay ?? 10));
  const [creditLimit, setCreditLimit] = useState(
    initialAccount?.creditLimit
      ? initialAccount.creditLimit.toFixed(2).replace('.', ',')
      : ''
  );

  const previewHue = useMemo(() => hue || hashHue(name), [hue, name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const balanceValue = parseMoney(balance);
    const ccFields =
      type === 'credit_card'
        ? {
            closingDay: Math.max(1, Math.min(28, Number(closingDay) || 1)),
            dueDay: Math.max(1, Math.min(31, Number(dueDay) || 1)),
            creditLimit: parseMoney(creditLimit) || undefined,
          }
        : { closingDay: undefined, dueDay: undefined, creditLimit: undefined };
    if (isEdit && initialAccount) {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        payload: {
          id: initialAccount.id,
          name: name.trim(),
          type,
          currentBalance: balanceValue,
          hue,
          ...ccFields,
        },
      });
    } else {
      dispatch({
        type: 'ADD_ACCOUNT',
        payload: {
          name: name.trim(),
          type,
          currentBalance: balanceValue,
          hue,
          ...ccFields,
        },
      });
    }
    onSuccess();
  };

  const isPrimary = initialAccount?.isPrimary;

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Nome da conta"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Ex: Nubank, Inter, Carteira"
        maxLength={40}
        autoComplete="off"
        disabled={isPrimary}
      />
      {isPrimary && (
        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: -10, marginBottom: 14 }}>
          A conta principal não pode ser renomeada — ela espelha o saldo do seu perfil.
        </p>
      )}

      <div style={{ marginBottom: 16 }}>
        <label className="field-label">Tipo</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {TYPE_OPTIONS.map((opt) => {
            const active = opt.value === type;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  borderRadius: 12,
                  background: active ? 'var(--surface-2)' : 'var(--surface)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--hair)'}`,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-mute)',
                    marginTop: 2,
                  }}
                >
                  {opt.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label={type === 'credit_card' ? 'Fatura aberta (R$)' : 'Saldo atual (R$)'}
        type="text"
        inputMode="decimal"
        value={balance}
        onChange={(e) => setBalance(fmtMoneyInput(e.target.value))}
        placeholder="0,00"
      />

      {type === 'credit_card' && (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 4,
            }}
          >
            <Input
              label="Fecha dia"
              type="number"
              min={1}
              max={28}
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
            />
            <Input
              label="Vence dia"
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </div>
          <Input
            label="Limite total (R$, opcional)"
            type="text"
            inputMode="decimal"
            value={creditLimit}
            onChange={(e) => setCreditLimit(fmtMoneyInput(e.target.value))}
            placeholder="0,00"
          />
          <p
            style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              marginTop: -4,
            }}
          >
            Por enquanto a fatura é atualizada manualmente. Lançamentos
            automáticos de compras na fatura chegam em uma próxima atualização.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label className="field-label">Cor</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {HUE_PALETTE.map((h) => {
            const active = h === hue;
            const glyph = getInitialGlyph(name);
            return (
              <button
                key={h}
                type="button"
                onClick={() => setHue(h)}
                aria-label={`Hue ${h}`}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `oklch(0.30 0.06 ${h})`,
                  border: `2px solid ${active ? 'var(--ink)' : `oklch(0.45 0.08 ${h} / 0.6)`}`,
                  color: `oklch(0.85 0.10 ${h})`,
                  fontFamily: 'var(--f-sans)',
                  fontWeight: glyph.isEmoji ? 400 : 600,
                  fontSize: glyph.isEmoji ? 18 : 15,
                  letterSpacing: glyph.isEmoji ? 0 : '-0.01em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.12s ease',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                }}
              >
                {glyph.value}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
          Selecionado: hue {previewHue}°
        </div>
      </div>

      <Button type="submit" variant="accent">
        {isEdit ? 'Salvar alterações' : 'Adicionar conta'}
      </Button>
      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Cancelar
      </Button>
    </form>
  );
}
