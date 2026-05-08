'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { cn, fmtBRL, fmtDate, getInstallmentStatus, getDueDateLabel, makeDueDate, getCurrentMonth, getCurrentYear } from '@/lib/utils';
import { getNextUnpaidInstallment, getDebtProgress, isRecurringActiveForMonth, isDebtFullyPaid } from '@/lib/services/installment';
import { StatusPill } from '@/components/ui/StatusPill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import type { Debt } from '@/lib/types';

export function DebtList() {
  const { debts, installments, entities, dispatch } = useFinanceData();
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const month = getCurrentMonth();
  const year = getCurrentYear();

  if (debts.length === 0) {
    return <EmptyState message="Nenhuma conta cadastrada. Adicione sua primeira conta!" />;
  }

  const handleDelete = (debtId: string) => {
    if (window.confirm('Excluir esta conta?')) {
      dispatch({ type: 'DELETE_DEBT', payload: debtId });
      setSelectedDebt(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {debts.map((debt, idx) => {
          const isRecurring = debt.isRecurring;
          let dueDate: string;
          let status: ReturnType<typeof getInstallmentStatus>;
          let progress: number | undefined;

          if (isRecurring) {
            dueDate = makeDueDate(year, month, debt.dueDay);
            const paidInst = installments.find(
              (i) => i.debtId === debt.id && i.dueDate.startsWith(`${year}-${String(month).padStart(2, '0')}`) && i.isPaid
            );
            status = paidInst ? 'pago' : getInstallmentStatus(dueDate, false);
          } else {
            const fullyPaid = isDebtFullyPaid(debt, installments);
            if (fullyPaid) {
              dueDate = '';
              status = 'pago';
              progress = 100;
            } else {
              const next = getNextUnpaidInstallment(installments, debt.id);
              dueDate = next?.dueDate || '';
              status = next ? getInstallmentStatus(next.dueDate, false) : 'ok';
              progress = getDebtProgress(debt, installments);
            }
          }

          return (
            <div
              key={debt.id}
              className={cn(
                'bg-surface border border-border rounded-[18px] p-4 flex flex-col gap-2.5 cursor-pointer',
                'transition-all active:scale-[0.992] active:bg-surface-2 animate-fadeUp',
                status === 'atrasado' && 'txn-atrasado',
                status === 'breve' && 'txn-breve'
              )}
              style={{ animationDelay: `${Math.min(idx, 7) * 0.04}s` }}
              onClick={() => setSelectedDebt(debt)}
            >
              {status === 'atrasado' && (
                <div className="absolute left-0 top-3.5 bottom-3.5 w-[3px] bg-critical rounded-r-sm" />
              )}
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] font-semibold tracking-tight capitalize">
                    {debt.accountName}
                  </div>
                  <div className="flex gap-[5px] flex-wrap mt-1">
                    {debt.entityName && (
                      <span className="text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] bg-white/[0.06] text-text-2 uppercase tracking-wide">
                        {debt.entityName}
                      </span>
                    )}
                    <span className={cn(
                      'text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] uppercase tracking-wide',
                      isRecurring ? 'tag-fixo' : 'tag-parcelado'
                    )}>
                      {isRecurring ? 'Fixo' : `${debt.numberOfInstallments}x`}
                    </span>
                  </div>
                </div>
                <div className="font-display text-[17px] font-semibold tabular-nums tracking-tight whitespace-nowrap">
                  {fmtBRL(debt.installmentValue)}
                </div>
              </div>

              {progress !== undefined && !isRecurring && (
                <ProgressBar value={progress} label={`${progress.toFixed(1)}%`} />
              )}

              <div className="flex justify-between items-center text-xs text-text-3 flex-wrap gap-2">
                {dueDate ? (
                  <span className="font-mono text-[11.5px]">
                    {fmtDate(dueDate)} · {getDueDateLabel(dueDate)}
                  </span>
                ) : (
                  <span className="font-mono text-[11.5px]">Concluido</span>
                )}
                <StatusPill status={status} />
              </div>
            </div>
          );
        })}
      </div>

      <BottomSheet
        isOpen={!!selectedDebt}
        onClose={() => setSelectedDebt(null)}
        title={selectedDebt?.accountName}
      >
        {selectedDebt && (
          <>
            <div className="space-y-0">
              <DetailRow label="Valor" value={fmtBRL(selectedDebt.installmentValue)} />
              <DetailRow label="Dia vencimento" value={String(selectedDebt.dueDay)} />
              <DetailRow label="Tipo" value={selectedDebt.isRecurring ? 'Recorrente' : `${selectedDebt.numberOfInstallments} parcelas`} />
              {selectedDebt.entityName && <DetailRow label="Categoria" value={selectedDebt.entityName} />}
              <DetailRow label="Inicio" value={`${selectedDebt.startMonth}/${selectedDebt.startYear}`} />
            </div>
            <Button variant="ghost" onClick={() => setSelectedDebt(null)}>
              Fechar
            </Button>
            <Button variant="danger" onClick={() => handleDelete(selectedDebt.id)}>
              Excluir conta
            </Button>
          </>
        )}
      </BottomSheet>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-border last:border-b-0 text-sm items-center gap-3">
      <span className="text-text-3 text-[13px]">{label}</span>
      <span className="text-text font-medium text-right tabular-nums">{value}</span>
    </div>
  );
}
