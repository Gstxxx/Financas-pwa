'use client';

import { useMemo, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { getNextUnpaidInstallment, isRecurringActiveForMonth, getDebtProgress } from '@/lib/services/installment';
import { cn, fmtBRL, fmtDate, getInstallmentStatus, getDueDateLabel, makeDueDate, getCurrentMonth, getCurrentYear } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import type { Debt, Installment } from '@/lib/types';
import type { DebtStatusType } from '@/lib/utils';

type Filter = 'todas' | 'atrasado' | 'breve' | 'ok';

interface BillItem {
  debt: Debt;
  installment?: Installment;
  dueDate: string;
  status: DebtStatusType;
  progress?: number;
}

export function UpcomingBills() {
  const { isHydrated, debts, installments, dispatch } = useFinanceData();
  const [filter, setFilter] = useState<Filter>('todas');
  const [selectedBill, setSelectedBill] = useState<BillItem | null>(null);

  const bills = useMemo((): BillItem[] => {
    if (!isHydrated) return [];
    const month = getCurrentMonth();
    const year = getCurrentYear();
    const items: BillItem[] = [];

    debts.forEach((debt) => {
      if (debt.isRecurring) {
        if (isRecurringActiveForMonth(debt, month, year)) {
          const dueDate = makeDueDate(year, month, debt.dueDay);
          // Check if paid this month
          const paidInst = installments.find(
            (i) => i.debtId === debt.id && i.dueDate.startsWith(`${year}-${String(month).padStart(2, '0')}`) && i.isPaid
          );
          items.push({
            debt,
            dueDate,
            status: paidInst ? 'pago' : getInstallmentStatus(dueDate, false),
          });
        }
      } else {
        const next = getNextUnpaidInstallment(installments, debt.id);
        if (next) {
          items.push({
            debt,
            installment: next,
            dueDate: next.dueDate,
            status: getInstallmentStatus(next.dueDate, next.isPaid),
            progress: getDebtProgress(debt, installments),
          });
        }
      }
    });

    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [isHydrated, debts, installments]);

  const filteredBills = useMemo(() => {
    if (filter === 'todas') return bills;
    return bills.filter((b) => b.status === filter);
  }, [bills, filter]);

  const counts = useMemo(() => ({
    todas: bills.length,
    atrasado: bills.filter((b) => b.status === 'atrasado').length,
    breve: bills.filter((b) => b.status === 'breve').length,
    ok: bills.filter((b) => b.status === 'ok' || b.status === 'pago').length,
  }), [bills]);

  if (!isHydrated) {
    return (
      <div className="space-y-2.5 mt-3.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-[18px] p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const handleMarkPaid = (bill: BillItem) => {
    if (bill.installment) {
      dispatch({ type: 'MARK_PAID', payload: { debtId: bill.debt.id, installmentId: bill.installment.id } });
    } else {
      // Recurring
      dispatch({ type: 'MARK_PAID', payload: { debtId: bill.debt.id, dueDate: bill.dueDate } });
    }
    setSelectedBill(null);
  };

  return (
    <>
      <div className="flex justify-between items-baseline mt-6 mb-2.5">
        <h2 className="font-display text-[19px] font-semibold tracking-tight">Contas</h2>
        <span className="text-xs text-text-3 tabular-nums font-mono">
          {filteredBills.length}/{bills.length}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mx-[-20px] px-5 pb-1">
        {([
          ['todas', 'Todas'],
          ['atrasado', 'Atrasado'],
          ['breve', 'Vence em breve'],
          ['ok', 'Em dia'],
        ] as [Filter, string][]).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            count={counts[key]}
            active={filter === key}
            onClick={() => setFilter(key)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2.5 mt-3.5">
        {filteredBills.length === 0 ? (
          <EmptyState message="Nenhuma conta nesta categoria." />
        ) : (
          filteredBills.map((bill, idx) => (
            <div
              key={`${bill.debt.id}-${bill.dueDate}`}
              className={cn(
                'bg-surface border border-border rounded-[18px] p-4 flex flex-col gap-2.5 cursor-pointer transition-all relative overflow-hidden',
                'active:scale-[0.992] active:bg-surface-2',
                'animate-fadeUp',
                bill.status === 'atrasado' && 'txn-atrasado',
                bill.status === 'breve' && 'txn-breve'
              )}
              style={{ animationDelay: `${Math.min(idx, 7) * 0.04}s` }}
              onClick={() => setSelectedBill(bill)}
            >
              {bill.status === 'atrasado' && (
                <div className="absolute left-0 top-3.5 bottom-3.5 w-[3px] bg-critical rounded-r-sm" />
              )}
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] font-semibold tracking-tight capitalize break-words">
                    {bill.debt.accountName}
                  </div>
                  {bill.debt.entityName && (
                    <div className="flex gap-[5px] flex-wrap mt-1.5">
                      <span className="text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] bg-white/[0.06] text-text-2 tracking-wide uppercase">
                        {bill.debt.entityName}
                      </span>
                      {bill.debt.isRecurring && (
                        <span className="text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] tag-fixo tracking-wide uppercase">
                          Fixo
                        </span>
                      )}
                      {!bill.debt.isRecurring && (
                        <span className="text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] tag-parcelado tracking-wide uppercase">
                          Parcelado
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="font-display text-[17px] font-semibold tabular-nums tracking-tight whitespace-nowrap">
                  − {fmtBRL(bill.debt.installmentValue).replace('R$', 'R$ ')}
                </div>
              </div>

              {bill.progress !== undefined && bill.progress > 0 && (
                <ProgressBar
                  value={bill.progress}
                  label={`${bill.progress.toFixed(1)}%`}
                />
              )}

              <div className="flex justify-between items-center text-xs text-text-3 flex-wrap gap-2">
                <span className="flex items-center gap-[5px] font-mono text-[11.5px]">
                  {fmtDate(bill.dueDate)} · {getDueDateLabel(bill.dueDate)}
                </span>
                <StatusPill status={bill.status} />
              </div>
            </div>
          ))
        )}
      </div>

      <BottomSheet
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={selectedBill?.debt.accountName}
      >
        {selectedBill && (
          <>
            {selectedBill.debt.entityName && (
              <div className="flex gap-[5px] flex-wrap mb-3.5">
                <span className="text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] bg-white/[0.06] text-text-2 tracking-wide uppercase">
                  {selectedBill.debt.entityName}
                </span>
              </div>
            )}
            <div className="space-y-0">
              <DetailRow label="Direcao" value="&#9660; Saida" />
              <DetailRow label="Valor" value={fmtBRL(selectedBill.debt.installmentValue)} />
              <DetailRow label="Vencimento" value={fmtDate(selectedBill.dueDate)} />
              {!selectedBill.debt.isRecurring && (
                <DetailRow
                  label="Parcelas"
                  value={`${selectedBill.installment?.installmentNumber ?? '—'}/${selectedBill.debt.numberOfInstallments}`}
                />
              )}
              {selectedBill.progress !== undefined && (
                <DetailRow label="Conclusao" value={`${selectedBill.progress.toFixed(1)}%`} />
              )}
              <DetailRow
                label="Status"
                value={<StatusPill status={selectedBill.status} />}
              />
            </div>
            {selectedBill.status !== 'pago' && (
              <Button variant="primary" onClick={() => handleMarkPaid(selectedBill)}>
                Marcar como pago
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelectedBill(null)}>
              Fechar
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
