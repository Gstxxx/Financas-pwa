import { Budget, Debt, Income, Installment, User } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { getCurrentMonthInstallments, isRecurringActiveForMonth } from './installment';

export type ForecastStatus = 'ok' | 'tight' | 'over';

export interface BillForecast {
  month: number;
  year: number;
  income: number;
  expenses: number;
  hypotheticalAmount: number;
  remainingBefore: number;
  remainingAfter: number;
  marginPct: number;
  status: ForecastStatus;
}

// Projeta o impacto de uma conta hipotetica no orcamento do proximo mes.
// Considera salario, entradas/saidas avulsas e contas recorrentes/parceladas
// ja cadastradas para aquele mes.
export function forecastBillNextMonth(
  user: User,
  debts: Debt[],
  installments: Installment[],
  incomes: Income[],
  hypotheticalAmount: number,
  baseMonth?: number,
  baseYear?: number
): BillForecast {
  const now = new Date();
  let m = baseMonth ?? now.getMonth() + 2;
  let y = baseYear ?? now.getFullYear();
  while (m > 12) {
    m -= 12;
    y += 1;
  }

  const extras = incomes.reduce((sum, inc) => {
    if ((inc.direction ?? 'entrada') !== 'entrada') return sum;
    const [iy, im] = inc.date.split('-').map(Number);
    return im === m && iy === y ? sum + inc.amount : sum;
  }, 0);
  const income = user.salary + extras;

  const monthInst = getCurrentMonthInstallments(installments, m, y);
  let expenses = monthInst.reduce((sum, inst) => {
    const debt = debts.find((d) => d.id === inst.debtId);
    return sum + (debt?.installmentValue ?? 0);
  }, 0);
  debts.forEach((debt) => {
    if (isRecurringActiveForMonth(debt, m, y)) {
      expenses += debt.installmentValue;
    }
  });
  expenses += incomes.reduce((sum, inc) => {
    if (inc.direction !== 'saida') return sum;
    const [iy, im] = inc.date.split('-').map(Number);
    return im === m && iy === y ? sum + inc.amount : sum;
  }, 0);

  const remainingBefore = income - expenses;
  const remainingAfter = remainingBefore - hypotheticalAmount;
  const marginPct = income > 0 ? (remainingAfter / income) * 100 : 0;

  let status: ForecastStatus = 'ok';
  if (remainingAfter < 0) status = 'over';
  else if (marginPct < 10) status = 'tight';

  return {
    month: m,
    year: y,
    income,
    expenses,
    hypotheticalAmount,
    remainingBefore,
    remainingAfter,
    marginPct,
    status,
  };
}

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
