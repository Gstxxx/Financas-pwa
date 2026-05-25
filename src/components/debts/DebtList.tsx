'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import {
  getNextUnpaidInstallment,
  getDebtProgress,
  isDebtFullyPaid,
  getRecurringNextDue,
  getPaidCount,
} from '@/lib/services/installment';
import {
  fmtBRL,
  fmtDate,
  getInstallmentStatus,
  getDueDateLabel,
  getCurrentMonth,
  getCurrentYear,
  type DebtStatusType,
} from '@/lib/utils';
import { AccountRow } from '@/components/ui/AccountRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { DebtForm } from '@/components/debts/DebtForm';
import type { Debt } from '@/lib/types';

interface ResolvedDebt {
  debt: Debt;
  dueDate: string;
  status: DebtStatusType;
  installmentInfo?: { current: number; total: number };
  progress?: number;
}

interface DebtListProps {
  sort?: 'venc' | 'valor' | 'nome';
}

export function DebtList({ sort = 'venc' }: DebtListProps) {
  const { debts, installments, entities, dispatch } = useFinanceData();
  const [selectedDebt, setSelectedDebt] = useState<ResolvedDebt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const month = getCurrentMonth();
  const year = getCurrentYear();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const items = useMemo<ResolvedDebt[]>(() => {
    const out: ResolvedDebt[] = [];
    debts.forEach((debt) => {
      if (debt.isRecurring) {
        const next = getRecurringNextDue(debt, installments, month, year);
        out.push({
          debt,
          dueDate: next.dueDate,
          status: getInstallmentStatus(next.dueDate, false),
        });
      } else {
        const fullyPaid = isDebtFullyPaid(debt, installments);
        if (fullyPaid) {
          out.push({ debt, dueDate: '', status: 'pago', progress: 100 });
        } else {
          const next = getNextUnpaidInstallment(installments, debt.id);
          out.push({
            debt,
            dueDate: next?.dueDate || '',
            status: next ? getInstallmentStatus(next.dueDate, false) : 'ok',
            installmentInfo: next
              ? { current: next.installmentNumber, total: debt.numberOfInstallments }
              : undefined,
            progress: getDebtProgress(debt, installments),
          });
        }
      }
    });

    const sorted = [...out];
    if (sort === 'venc') {
      sorted.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    } else if (sort === 'valor') {
      sorted.sort((a, b) => b.debt.installmentValue - a.debt.installmentValue);
    } else if (sort === 'nome') {
      sorted.sort((a, b) => a.debt.accountName.localeCompare(b.debt.accountName));
    }
    return sorted;
  }, [debts, installments, month, year, sort]);

  // Open the BottomSheet for ?focus=<debtId> (set by background-toast
  // clicks and keyboard shortcuts). Strip the param afterward so a refresh
  // doesn't keep re-opening it.
  useEffect(() => {
    const focusId = searchParams.get('focus');
    if (!focusId) return;
    const match = items.find((it) => it.debt.id === focusId);
    if (match) {
      setSelectedDebt(match);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('focus');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [searchParams, items, router, pathname]);

  if (debts.length === 0) {
    return (
      <div style={{ padding: '0 22px' }}>
        <EmptyState message="Nenhuma conta cadastrada. Adicione sua primeira conta!" />
      </div>
    );
  }

  const handleDelete = (debtId: string) => {
    if (window.confirm('Excluir esta conta?')) {
      dispatch({ type: 'DELETE_DEBT', payload: debtId });
      setSelectedDebt(null);
    }
  };

  return (
    <>
      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {items.map((item) => (
            <AccountRow
              key={item.debt.id}
              debt={item.debt}
              dueDate={item.dueDate}
              status={item.status}
              installmentInfo={item.installmentInfo}
              entities={entities}
              onClick={() => setSelectedDebt(item)}
            />
          ))}
        </div>
      </div>

      <BottomSheet
        isOpen={!!selectedDebt && !editingDebt}
        onClose={() => setSelectedDebt(null)}
        title={selectedDebt?.debt.accountName}
      >
        {selectedDebt && (
          <>
            <div style={{ marginBottom: 14 }}>
              <DetailRow label="Valor" value={fmtBRL(selectedDebt.debt.installmentValue)} />
              <DetailRow label="Dia vencimento" value={String(selectedDebt.debt.dueDay)} />
              <DetailRow
                label="Tipo"
                value={
                  selectedDebt.debt.isRecurring
                    ? 'Recorrente'
                    : `${selectedDebt.debt.numberOfInstallments} parcelas`
                }
              />
              {!selectedDebt.debt.isRecurring && (
                <DetailRow
                  label="Pagas"
                  value={`${getPaidCount(installments, selectedDebt.debt.id)}/${selectedDebt.debt.numberOfInstallments}`}
                />
              )}
              {selectedDebt.dueDate && (
                <DetailRow
                  label="Próximo vencimento"
                  value={`${fmtDate(selectedDebt.dueDate)} · ${getDueDateLabel(selectedDebt.dueDate)}`}
                />
              )}
              {selectedDebt.debt.entityNames.length > 0 && (
                <DetailRow label="Categorias" value={selectedDebt.debt.entityNames.join(', ')} />
              )}
              <DetailRow
                label="Início"
                value={`${selectedDebt.debt.startMonth}/${selectedDebt.debt.startYear}`}
              />
              <DetailRow label="Status" value={<StatusPill status={selectedDebt.status} />} />
            </div>
            <Button variant="primary" onClick={() => setEditingDebt(selectedDebt.debt)}>
              Editar conta
            </Button>
            <Button variant="ghost" onClick={() => setSelectedDebt(null)} className="mt-2">
              Fechar
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(selectedDebt.debt.id)}
              className="mt-2"
            >
              Excluir conta
            </Button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={!!editingDebt}
        onClose={() => setEditingDebt(null)}
        title="Editar conta"
      >
        {editingDebt && (
          <DebtForm
            initialDebt={editingDebt}
            onClose={() => setEditingDebt(null)}
            onSuccess={() => {
              setEditingDebt(null);
              setSelectedDebt(null);
            }}
          />
        )}
      </BottomSheet>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--hair-soft)',
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--ink-mute)', fontSize: 13 }}>{label}</span>
      <span
        style={{
          color: 'var(--ink)',
          fontFamily: 'var(--f-mono)',
          fontFeatureSettings: '"tnum" 1',
          fontSize: 14,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}
