import { Installment, Debt } from '@/lib/types';
import { generateId, makeDueDate, getCurrentMonth, getCurrentYear } from '@/lib/utils';

export function generateInstallments(debt: Debt): Installment[] {
  if (debt.isRecurring) return [];

  const installments: Installment[] = [];
  let month = debt.startMonth;
  let year = debt.startYear;
  const curMonth = getCurrentMonth();
  const curYear = getCurrentYear();
  const nowISO = new Date().toISOString();

  for (let i = 1; i <= debt.numberOfInstallments; i++) {
    const dueDate = makeDueDate(year, month, debt.dueDay);
    const isPast = year < curYear || (year === curYear && month < curMonth);
    installments.push({
      id: generateId() + `-${i}`,
      debtId: debt.id,
      installmentNumber: i,
      dueDate,
      isPaid: isPast,
      paidAt: isPast ? nowISO : null,
      createdAt: nowISO,
    });

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return installments;
}

export function getDebtInstallments(installments: Installment[], debtId: string): Installment[] {
  return installments
    .filter((i) => i.debtId === debtId)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);
}

export function getPaidCount(installments: Installment[], debtId: string): number {
  return installments.filter((i) => i.debtId === debtId && i.isPaid).length;
}

export function getNextUnpaidInstallment(installments: Installment[], debtId: string): Installment | undefined {
  return getDebtInstallments(installments, debtId).find((i) => !i.isPaid);
}

export function isDebtFullyPaid(debt: Debt, installments: Installment[]): boolean {
  if (debt.isRecurring) return false;
  const debtInstallments = getDebtInstallments(installments, debt.id);
  return debtInstallments.length > 0 && debtInstallments.every((i) => i.isPaid);
}

export function getDebtProgress(debt: Debt, installments: Installment[]): number {
  if (debt.isRecurring) return 0;
  const total = debt.numberOfInstallments;
  if (total === 0) return 0;
  const paid = getPaidCount(installments, debt.id);
  return (paid / total) * 100;
}

export function getCurrentMonthInstallments(
  installments: Installment[],
  month: number,
  year: number
): Installment[] {
  return installments.filter((i) => {
    const [y, m] = i.dueDate.split('-').map(Number);
    return m === month && y === year;
  });
}

export function isRecurringActiveForMonth(debt: Debt, month: number, year: number): boolean {
  if (!debt.isRecurring) return false;
  const startDate = new Date(debt.startYear, debt.startMonth - 1);
  const checkDate = new Date(year, month - 1);
  return checkDate >= startDate;
}

export function getRecurringPaidInstallment(
  installments: Installment[],
  debtId: string,
  month: number,
  year: number
): Installment | undefined {
  const dueDate = makeDueDate(year, month, 1).slice(0, 7); // YYYY-MM
  return installments.find(
    (i) => i.debtId === debtId && i.dueDate.startsWith(dueDate) && i.isPaid
  );
}

// For recurring debts: returns the next month not yet paid, starting from
// the given month. Advances forward while the current month is already paid.
export function getRecurringNextDue(
  debt: Debt,
  installments: Installment[],
  startMonth: number,
  startYear: number
): { dueDate: string; month: number; year: number } {
  let m = startMonth;
  let y = startYear;
  // Cap the loop so a corrupt state can't hang us.
  for (let i = 0; i < 120; i++) {
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const paid = installments.some(
      (inst) => inst.debtId === debt.id && inst.dueDate.startsWith(prefix) && inst.isPaid
    );
    if (!paid) break;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return { dueDate: makeDueDate(y, m, debt.dueDay), month: m, year: y };
}
