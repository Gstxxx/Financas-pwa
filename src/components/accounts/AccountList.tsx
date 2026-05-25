'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { NumMono } from '@/components/ui/NumMono';
import { AccountForm } from '@/components/accounts/AccountForm';
import { TransferForm } from '@/components/accounts/TransferForm';
import { fmtBRL, getEntityHue, getInitialGlyph } from '@/lib/utils';
import type { Account, AccountType } from '@/lib/types';

const TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
};

export function AccountList() {
  const { accounts, dispatch } = useFinanceData();
  const [selected, setSelected] = useState<Account | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Account | null>(null);

  if (accounts.length === 0) {
    return (
      <div style={{ padding: '0 22px' }}>
        <EmptyState message="Nenhuma conta cadastrada." />
      </div>
    );
  }

  // Sum cash-style balances minus credit-card invoices (which are debts).
  const visible = accounts.filter((a) => !a.archived);
  const total = visible.reduce((s, a) => {
    const signed = a.type === 'credit_card' ? -(a.currentBalance || 0) : a.currentBalance || 0;
    return s + signed;
  }, 0);

  const handleDelete = () => {
    if (!selected || selected.isPrimary) return;
    if (window.confirm(`Excluir "${selected.name}"?`)) {
      dispatch({ type: 'DELETE_ACCOUNT', payload: selected.id });
      setSelected(null);
    }
  };

  return (
    <>
      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-mute)',
              marginBottom: 6,
            }}
          >
            Saldo total
          </div>
          <NumMono
            value={total}
            size={28}
            weight={500}
            sign={total < 0 ? 'neg' : false}
            color={total < 0 ? 'var(--neg)' : undefined}
          />
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              marginTop: 4,
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'} · {fmtBRL(total)}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {accounts.map((account, idx) => {
            const hue = getEntityHue(account);
            const glyph = getInitialGlyph(account.name);
            const isCC = account.type === 'credit_card';
            // CC display: balance is the invoice (positive in storage);
            // show in negative color, and percent of limit if set.
            const displayValue = isCC ? -(account.currentBalance || 0) : account.currentBalance;
            const utilization =
              isCC && account.creditLimit && account.creditLimit > 0
                ? Math.min(100, ((account.currentBalance || 0) / account.creditLimit) * 100)
                : null;
            return (
              <div
                key={account.id}
                onClick={() => setSelected(account)}
                style={{
                  padding: '18px 20px',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--hair-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  opacity: account.archived ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: `oklch(0.26 0.05 ${hue})`,
                    border: `1px solid oklch(0.40 0.08 ${hue} / 0.5)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--f-sans)',
                    fontWeight: glyph.isEmoji ? 400 : 600,
                    fontSize: glyph.isEmoji ? 20 : 16,
                    letterSpacing: glyph.isEmoji ? 0 : '-0.01em',
                    color: `oklch(0.85 0.10 ${hue})`,
                    flexShrink: 0,
                  }}
                >
                  {glyph.value}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      letterSpacing: '-0.005em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {account.name}
                    {account.isPrimary && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--accent)',
                          fontFamily: 'var(--f-mono)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          border: '1px solid var(--accent)',
                          borderRadius: 6,
                        }}
                      >
                        principal
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
                      textTransform: 'uppercase',
                    }}
                  >
                    {TYPE_LABEL[account.type]}
                    {isCC && account.closingDay && (
                      <> · fecha {account.closingDay}, vence {account.dueDay}</>
                    )}
                  </div>
                  {utilization !== null && (
                    <div
                      style={{
                        marginTop: 8,
                        height: 3,
                        borderRadius: 99,
                        background: 'var(--surface-2)',
                        overflow: 'hidden',
                      }}
                      aria-label={`Uso do limite: ${utilization.toFixed(0)}%`}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${utilization}%`,
                          background:
                            utilization > 80 ? 'var(--neg)' : `oklch(0.74 0.10 ${hue})`,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <NumMono
                    value={displayValue}
                    size={15}
                    sign={displayValue < 0 ? 'neg' : false}
                    color={displayValue < 0 ? 'var(--neg)' : undefined}
                  />
                  {isCC && account.creditLimit && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--ink-faint)',
                        marginTop: 3,
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      {fmtBRL(account.creditLimit)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomSheet
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Editar ${selected.name}` : ''}
      >
        {selected && (
          <>
            {selected.type === 'credit_card' && selected.currentBalance > 0 && visible.length >= 2 && (
              <Button
                variant="accent"
                type="button"
                onClick={() => {
                  setPayingInvoice(selected);
                  setSelected(null);
                }}
              >
                Pagar fatura ({fmtBRL(selected.currentBalance)})
              </Button>
            )}
            <AccountForm
              initialAccount={selected}
              onClose={() => setSelected(null)}
              onSuccess={() => setSelected(null)}
            />
            {!selected.isPrimary && (
              <Button variant="danger" type="button" onClick={handleDelete} className="mt-2">
                Excluir conta
              </Button>
            )}
          </>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        title={payingInvoice ? `Pagar fatura · ${payingInvoice.name}` : ''}
      >
        {payingInvoice && (
          <InvoicePaymentForm
            invoiceAccount={payingInvoice}
            onClose={() => setPayingInvoice(null)}
          />
        )}
      </BottomSheet>
    </>
  );
}

/**
 * Pre-fills a Transfer with the invoice amount and the CC as the receiving
 * "account" — paying off a credit card invoice is structurally identical
 * to a transfer (debit checking, credit the CC account which lowers what
 * you owe). User picks the source account.
 */
function InvoicePaymentForm({
  invoiceAccount,
  onClose,
}: {
  invoiceAccount: Account;
  onClose: () => void;
}) {
  const { accounts } = useFinanceData();
  // TransferForm handles the dispatch; we only choose initialFromId.
  const candidate = accounts.find(
    (a) => !a.archived && a.id !== invoiceAccount.id && a.type !== 'credit_card'
  );

  return (
    <TransferForm
      initialFromId={candidate?.id}
      onClose={onClose}
      onSuccess={onClose}
    />
  );
}
