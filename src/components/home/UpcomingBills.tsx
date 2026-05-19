'use client';

import { useMemo, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import {
  getNextUnpaidInstallment,
  isRecurringActiveForMonth,
  getDebtProgress,
  getRecurringNextDue,
} from '@/lib/services/installment';
import {
  fmtBRL,
  fmtDate,
  fmtMonthYear,
  getCurrentMonth,
  getCurrentYear,
  getDueDateLabel,
  getInstallmentStatus,
} from '@/lib/utils';
import type { DebtStatusType } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';
import { Seg } from '@/components/ui/Seg';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { AccountRow } from '@/components/ui/AccountRow';
import type { Debt, Installment } from '@/lib/types';

type Filter = 'todas' | 'atrasado' | 'breve' | 'ok';

interface BillItem {
  debt: Debt;
  installment?: Installment;
  dueDate: string;
  status: DebtStatusType;
  progress?: number;
}

export function UpcomingBills() {
  const { isHydrated, debts, installments, entities, dispatch } = useFinanceData();
  const [filter, setFilter] = useState<Filter>('todas');
  const [selectedBill, setSelectedBill] = useState<BillItem | null>(null);

  const bills = useMemo<BillItem[]>(() => {
    if (!isHydrated) return [];
    const month = getCurrentMonth();
    const year = getCurrentYear();
    const items: BillItem[] = [];
    debts.forEach((debt) => {
      if (debt.isRecurring) {
        if (isRecurringActiveForMonth(debt, month, year)) {
          const next = getRecurringNextDue(debt, installments, month, year);
          items.push({
            debt,
            dueDate: next.dueDate,
            status: getInstallmentStatus(next.dueDate, false),
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

  const counts = useMemo(
    () => ({
      todas: bills.length,
      atrasado: bills.filter((b) => b.status === 'atrasado').length,
      breve: bills.filter((b) => b.status === 'breve').length,
      ok: bills.filter((b) => b.status === 'ok' || b.status === 'pago').length,
    }),
    [bills]
  );

  if (!isHydrated) {
    return (
      <div style={{ padding: '0 22px' }}>
        <div className="card" style={{ minHeight: 180 }} />
      </div>
    );
  }

  const handleMarkPaid = (bill: BillItem) => {
    if (bill.installment) {
      dispatch({
        type: 'MARK_PAID',
        payload: { debtId: bill.debt.id, installmentId: bill.installment.id },
      });
    } else {
      dispatch({ type: 'MARK_PAID', payload: { debtId: bill.debt.id, dueDate: bill.dueDate } });
    }
    setSelectedBill(null);
  };

  const month = getCurrentMonth();
  const year = getCurrentYear();
  const curMonthBills: BillItem[] = [];
  const groupedFuture = new Map<string, BillItem[]>();
  filteredBills.forEach((bill) => {
    const [by, bm] = bill.dueDate.split('-').map(Number);
    if (by < year || (by === year && bm <= month)) {
      curMonthBills.push(bill);
    } else {
      const key = `${by}-${bm}`;
      if (!groupedFuture.has(key)) groupedFuture.set(key, []);
      groupedFuture.get(key)!.push(bill);
    }
  });

  const segOptions: { value: Filter; label: string; count: number }[] = [
    { value: 'todas', label: 'Todas', count: counts.todas },
    { value: 'atrasado', label: 'Atrasado', count: counts.atrasado },
    { value: 'breve', label: 'Vence em breve', count: counts.breve },
    { value: 'ok', label: 'Em dia', count: counts.ok },
  ];

  return (
    <>
      <div className="section-label">
        <h2 className="t-h2">Contas</h2>
        <div className="line" />
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: 'var(--ink-mute)',
            letterSpacing: '0.04em',
          }}
        >
          {filteredBills.length}/{bills.length}
        </span>
      </div>

      <div style={{ padding: '0 22px 12px', overflowX: 'auto' }} className="hide-scrollbar">
        <Seg<Filter> value={filter} onChange={setFilter} options={segOptions} />
      </div>

      {filteredBills.length === 0 ? (
        <div style={{ padding: '0 22px 12px' }}>
          <EmptyState message="Nenhuma conta nesta categoria." />
        </div>
      ) : (
        <>
          {curMonthBills.length > 0 && (
            <div style={{ padding: '0 22px 12px' }}>
              <div className="card" style={{ overflow: 'hidden' }}>
                {curMonthBills.map((bill) => (
                  <AccountRow
                    key={`${bill.debt.id}-${bill.dueDate}`}
                    debt={bill.debt}
                    dueDate={bill.dueDate}
                    status={bill.status}
                    installmentInfo={
                      !bill.debt.isRecurring && bill.installment
                        ? {
                            current: bill.installment.installmentNumber,
                            total: bill.debt.numberOfInstallments,
                          }
                        : undefined
                    }
                    entities={entities}
                    onClick={() => setSelectedBill(bill)}
                  />
                ))}
              </div>
            </div>
          )}
          {Array.from(groupedFuture.entries()).map(([key, items]) => {
            const [yStr, mStr] = key.split('-');
            const y = Number(yStr);
            const m = Number(mStr);
            return (
              <div key={key}>
                <div className="month-marker">{fmtMonthYear(m, y)}</div>
                <div style={{ padding: '0 22px 12px' }}>
                  <div className="card" style={{ overflow: 'hidden', opacity: 0.85 }}>
                    {items.map((bill) => (
                      <AccountRow
                        key={`${bill.debt.id}-${bill.dueDate}`}
                        debt={bill.debt}
                        dueDate={bill.dueDate}
                        status={bill.status}
                        installmentInfo={
                          !bill.debt.isRecurring && bill.installment
                            ? {
                                current: bill.installment.installmentNumber,
                                total: bill.debt.numberOfInstallments,
                              }
                            : undefined
                        }
                        entities={entities}
                        onClick={() => setSelectedBill(bill)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      <BottomSheet
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={selectedBill?.debt.accountName}
      >
        {selectedBill && (
          <>
            <div style={{ marginBottom: 14 }}>
              <DetailRow label="Valor" value={fmtBRL(selectedBill.debt.installmentValue)} />
              <DetailRow label="Vencimento" value={fmtDate(selectedBill.dueDate)} />
              <DetailRow label="Quando" value={getDueDateLabel(selectedBill.dueDate)} />
              {!selectedBill.debt.isRecurring && (
                <DetailRow
                  label="Parcela"
                  value={`${selectedBill.installment?.installmentNumber ?? '—'}/${selectedBill.debt.numberOfInstallments}`}
                />
              )}
              {selectedBill.progress !== undefined && (
                <DetailRow label="Progresso" value={`${selectedBill.progress.toFixed(1)}%`} />
              )}
              {selectedBill.debt.entityNames.length > 0 && (
                <DetailRow label="Categorias" value={selectedBill.debt.entityNames.join(', ')} />
              )}
              <DetailRow label="Status" value={<StatusPill status={selectedBill.status} />} />
            </div>
            {selectedBill.status !== 'pago' && (
              <Button variant="accent" onClick={() => handleMarkPaid(selectedBill)}>
                Marcar como pago
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelectedBill(null)} className="mt-2">
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
