import { Budget, Debt, Installment, User } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { getCurrentMonthInstallments, isRecurringActiveForMonth } from './installment';

export function calculateBudget(
  user: User,
  debts: Debt[],
  installments: Installment[],
  month: number,
  year: number
): Budget {
  const totalIncome = user.salary;

  // Sum installments for this month
  const monthInstallments = getCurrentMonthInstallments(installments, month, year);
  let totalExpenses = monthInstallments.reduce((sum, inst) => {
    const debt = debts.find((d) => d.id === inst.debtId);
    return sum + (debt?.installmentValue ?? 0);
  }, 0);

  // Add recurring debts active this month
  debts.forEach((debt) => {
    if (isRecurringActiveForMonth(debt, month, year)) {
      totalExpenses += debt.installmentValue;
    }
  });

  return {
    id: generateId(),
    month,
    year,
    totalIncome,
    totalExpenses,
    remaining: totalIncome - totalExpenses,
    createdAt: new Date().toISOString(),
  };
}

export function findOrCreateBudget(
  budgets: Budget[],
  user: User,
  debts: Debt[],
  installments: Installment[],
  month: number,
  year: number
): Budget {
  const existing = budgets.find((b) => b.month === month && b.year === year);
  if (existing) return existing;
  return calculateBudget(user, debts, installments, month, year);
}

export function recalculateBudgets(
  budgets: Budget[],
  user: User,
  debts: Debt[],
  installments: Installment[]
): Budget[] {
  return budgets.map((budget) =>
    calculateBudget(user, debts, installments, budget.month, budget.year)
  );
}
