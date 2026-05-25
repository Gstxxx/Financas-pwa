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
  /** Stable key shared with snoozes/dedup: `${debtId}@${dueDate}`. */
  key: string;
  debt: Debt;
  installment?: Installment;
  dueDate: string;
  status: DebtStatusType;
  progress?: number;
  snoozedUntil?: string;
}

function snoozeIsoIn(days: number): string {
  // Snooze ends at the end of the day +N days from today, so a 1-day snooze
  // suppresses notifications throughout tomorrow as well.
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

export function UpcomingBills() {
  const { isHydrated, debts, installments, entities, snoozes, dispatch } = useFinanceData();
  const [filter, setFilter] = useState<Filter>('todas');
  const [selectedBill, setSelectedBill] = useState<BillItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bills = useMemo<BillItem[]>(() => {
    if (!isHydrated) return [];
    const month = getCurrentMonth();
    const year = getCurrentYear();
    const items: BillItem[] = [];
    debts.forEach((debt) => {
      if (debt.isRecurring) {
        if (isRecurringActiveForMonth(debt, month, year)) {
          const next = getRecurringNextDue(debt, installments, month, year);
          const key = `${debt.id}@${next.dueDate}`;
          items.push({
            key,
            debt,
            dueDate: next.dueDate,
            status: getInstallmentStatus(next.dueDate, false),
            snoozedUntil: snoozes[key],
          });
        }
      } else {
        const next = getNextUnpaidInstallment(installments, debt.id);
        if (next) {
          const key = `${debt.id}@${next.dueDate}`;
          items.push({
            key,
            debt,
            installment: next,
            dueDate: next.dueDate,
            status: getInstallmentStatus(next.dueDate, next.isPaid),
            progress: getDebtProgress(debt, installments),
            snoozedUntil: snoozes[key],
          });
        }
      }
    });
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [isHydrated, debts, installments, snoozes]);

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

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const toggleSelected = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const markPaid = (bill: BillItem) => {
    if (bill.installment) {
      dispatch({
        type: 'MARK_PAID',
        payload: { debtId: bill.debt.id, installmentId: bill.installment.id },
      });
    } else {
      dispatch({ type: 'MARK_PAID', payload: { debtId: bill.debt.id, dueDate: bill.dueDate } });
    }
  };

  const handleMarkPaid = (bill: BillItem) => {
    markPaid(bill);
    setSelectedBill(null);
  };

  const handleBulkMarkPaid = () => {
    const toMark = bills.filter((b) => selected.has(b.key));
    toMark.forEach(markPaid);
    exitSelection();
  };

  const handleSnooze = (bill: BillItem, days: number) => {
    dispatch({
      type: 'SNOOZE_BILL',
      payload: { billKey: bill.key, until: snoozeIsoIn(days) },
    });
    setSelectedBill(null);
  };

  const handleUnsnooze = (bill: BillItem) => {
    dispatch({ type: 'UNSNOOZE_BILL', payload: { billKey: bill.key } });
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

  const renderBillCard = (items: BillItem[], opacity = 1) => (
    <div className="card" style={{ overflow: 'hidden', opacity }}>
      {items.map((bill) => (
        <BillRowWrapper
          key={bill.key}
          bill={bill}
          entities={entities}
          selectionMode={selectionMode}
          isSelected={selected.has(bill.key)}
          onToggleSelect={() => toggleSelected(bill.key)}
          onClick={() => setSelectedBill(bill)}
        />
      ))}
    </div>
  );

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
        {bills.length > 0 && (
          <button
            type="button"
            onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
            style={{
              marginLeft: 8,
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              color: selectionMode ? 'var(--accent)' : 'var(--ink-mute)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              textTransform: 'uppercase',
            }}
          >
            {selectionMode ? 'Cancelar' : 'Selecionar'}
          </button>
        )}
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
            <div style={{ padding: '0 22px 12px' }}>{renderBillCard(curMonthBills)}</div>
          )}
          {Array.from(groupedFuture.entries()).map(([key, items]) => {
            const [yStr, mStr] = key.split('-');
            const y = Number(yStr);
            const m = Number(mStr);
            return (
              <div key={key}>
                <div className="month-marker">{fmtMonthYear(m, y)}</div>
                <div style={{ padding: '0 22px 12px' }}>{renderBillCard(items, 0.85)}</div>
              </div>
            );
          })}
        </>
      )}

      {selectionMode && selected.size > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 86,
            zIndex: 80,
            display: 'flex',
            gap: 8,
            padding: '10px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--hair)',
            borderRadius: 16,
            boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 12,
              color: 'var(--ink)',
              flex: 1,
            }}
          >
            {selected.size} selecionada{selected.size === 1 ? '' : 's'}
          </span>
          <Button variant="accent" onClick={handleBulkMarkPaid}>
            Marcar pagas
          </Button>
          <Button variant="ghost" onClick={exitSelection}>
            Cancelar
          </Button>
        </div>
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
              {selectedBill.snoozedUntil && (
                <DetailRow
                  label="Adiado até"
                  value={fmtDate(selectedBill.snoozedUntil.slice(0, 10))}
                />
              )}
            </div>

            {selectedBill.status !== 'pago' && (
              <>
                <Button variant="accent" onClick={() => handleMarkPaid(selectedBill)}>
                  Marcar como pago
                </Button>

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: 'var(--ink-mute)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Adiar notificação
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <SnoozeButton onClick={() => handleSnooze(selectedBill, 1)}>1 dia</SnoozeButton>
                  <SnoozeButton onClick={() => handleSnooze(selectedBill, 3)}>3 dias</SnoozeButton>
                  <SnoozeButton onClick={() => handleSnooze(selectedBill, 7)}>1 semana</SnoozeButton>
                  {selectedBill.snoozedUntil && (
                    <SnoozeButton onClick={() => handleUnsnooze(selectedBill)}>
                      Cancelar
                    </SnoozeButton>
                  )}
                </div>
              </>
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

function SnoozeButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 6px',
        fontSize: 12,
        fontFamily: 'var(--f-mono)',
        color: 'var(--ink-mid)',
        background: 'var(--surface)',
        border: '1px solid var(--hair)',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'background-color 0.18s',
      }}
    >
      {children}
    </button>
  );
}

function BillRowWrapper({
  bill,
  entities,
  selectionMode,
  isSelected,
  onToggleSelect,
  onClick,
}: {
  bill: BillItem;
  entities: import('@/lib/types').Entity[];
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}) {
  if (!selectionMode) {
    return (
      <AccountRow
        debt={bill.debt}
        dueDate={bill.dueDate}
        status={bill.status}
        installmentInfo={
          !bill.debt.isRecurring && bill.installment
            ? { current: bill.installment.installmentNumber, total: bill.debt.numberOfInstallments }
            : undefined
        }
        entities={entities}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr',
        alignItems: 'stretch',
      }}
      onClick={onToggleSelect}
      role="button"
      tabIndex={0}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 14,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            border: '1.5px solid var(--hair)',
            background: isSelected ? 'var(--accent)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--surface)',
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          {isSelected && '✓'}
        </div>
      </div>
      <div style={{ pointerEvents: 'none' }}>
        <AccountRow
          debt={bill.debt}
          dueDate={bill.dueDate}
          status={bill.status}
          installmentInfo={
            !bill.debt.isRecurring && bill.installment
              ? { current: bill.installment.installmentNumber, total: bill.debt.numberOfInstallments }
              : undefined
          }
          entities={entities}
        />
      </div>
    </div>
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
