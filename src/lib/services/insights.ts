import type { Debt, Entity, FinanceState, Installment, Income, User } from '@/lib/types';
import { isRecurringActiveForMonth } from '@/lib/services/installment';

export type InsightSeverity = 'info' | 'warn' | 'danger';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
}

const MONTHS_BACK = 3;

function sumDebtsForMonth(debts: Debt[], installments: Installment[], month: number, year: number): number {
  let total = 0;
  for (const debt of debts) {
    if (debt.isRecurring) {
      if (isRecurringActiveForMonth(debt, month, year)) total += debt.installmentValue;
    } else {
      const matched = installments.filter((i) => {
        if (i.debtId !== debt.id) return false;
        const [iy, im] = i.dueDate.split('-').map(Number);
        return iy === year && im === month;
      });
      total += matched.length * debt.installmentValue;
    }
  }
  return total;
}

function sumPixForMonth(incomes: Income[], month: number, year: number, direction: 'entrada' | 'saida'): number {
  return incomes.reduce((s, inc) => {
    if (inc.direction !== direction) return s;
    const [iy, im] = inc.date.split('-').map(Number);
    return iy === year && im === month ? s + inc.amount : s;
  }, 0);
}

function previousMonths(month: number, year: number, count: number): { month: number; year: number }[] {
  const out: { month: number; year: number }[] = [];
  let m = month - 1;
  let y = year;
  for (let i = 0; i < count; i++) {
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    out.push({ month: m, year: y });
    m -= 1;
  }
  return out;
}

/**
 * Compute up to 4 actionable insights for the current month. Caller can
 * filter dismissed ids before rendering.
 */
export function computeInsights(state: Pick<FinanceState, 'debts' | 'installments' | 'incomes' | 'entities' | 'user'>): Insight[] {
  const out: Insight[] = [];
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  const userMonthlyBudget = (state.user as User).monthlyBudget || 0;

  // --- 1) Mês atual vs média dos N anteriores ------------------------------
  const thisExpenses =
    sumDebtsForMonth(state.debts, state.installments, month, year) +
    sumPixForMonth(state.incomes, month, year, 'saida');
  const prevExpenses = previousMonths(month, year, MONTHS_BACK).map(({ month: m, year: y }) =>
    sumDebtsForMonth(state.debts, state.installments, m, y) +
    sumPixForMonth(state.incomes, m, y, 'saida')
  );
  const avgPrev = prevExpenses.length > 0 ? prevExpenses.reduce((s, v) => s + v, 0) / prevExpenses.length : 0;

  if (avgPrev > 0) {
    const delta = (thisExpenses - avgPrev) / avgPrev;
    if (delta >= 0.3) {
      out.push({
        id: `vs-avg-${year}-${month}`,
        severity: 'warn',
        title: `Gasto ${Math.round(delta * 100)}% acima da média`,
        body: `Você gastou R$ ${thisExpenses.toFixed(0)} este mês até agora, contra média de R$ ${avgPrev.toFixed(0)} nos últimos ${MONTHS_BACK} meses.`,
      });
    } else if (delta <= -0.2) {
      out.push({
        id: `vs-avg-down-${year}-${month}`,
        severity: 'info',
        title: `${Math.round(Math.abs(delta) * 100)}% abaixo da média`,
        body: `Bom mês: R$ ${thisExpenses.toFixed(0)} contra média de R$ ${avgPrev.toFixed(0)}.`,
      });
    }
  }

  // --- 2) Previsão de fim de mês -------------------------------------------
  if (monthProgress > 0.2 && monthProgress < 0.95 && thisExpenses > 0) {
    const projected = thisExpenses / monthProgress;
    if (projected > userMonthlyBudget && userMonthlyBudget > 0) {
      const over = projected - userMonthlyBudget;
      out.push({
        id: `forecast-${year}-${month}`,
        severity: projected / userMonthlyBudget > 1.2 ? 'danger' : 'warn',
        title: 'Previsão acima do orçamento',
        body: `No ritmo atual, fim do mês fecha em ~R$ ${projected.toFixed(0)} (R$ ${over.toFixed(0)} acima do orçamento).`,
      });
    }
  }

  // --- 3) Orçamento >80% ---------------------------------------------------
  if (userMonthlyBudget > 0) {
    const ratio = thisExpenses / userMonthlyBudget;
    if (ratio >= 0.8 && ratio < 1) {
      out.push({
        id: `budget-${year}-${month}`,
        severity: 'warn',
        title: `${Math.round(ratio * 100)}% do orçamento usado`,
        body: `Restam R$ ${(userMonthlyBudget - thisExpenses).toFixed(0)} do orçamento de R$ ${userMonthlyBudget.toFixed(0)}.`,
      });
    } else if (ratio >= 1) {
      out.push({
        id: `over-${year}-${month}`,
        severity: 'danger',
        title: 'Orçamento estourado',
        body: `Você passou em R$ ${(thisExpenses - userMonthlyBudget).toFixed(0)} do orçamento mensal.`,
      });
    }
  }

  // --- 4) Categoria com maior aumento --------------------------------------
  const byEntityThis = new Map<string, number>();
  const byEntityPrev = new Map<string, number>();
  for (const debt of state.debts) {
    const monthly = debt.isRecurring
      ? isRecurringActiveForMonth(debt, month, year)
        ? debt.installmentValue
        : 0
      : state.installments.filter((i) => {
          if (i.debtId !== debt.id) return false;
          const [iy, im] = i.dueDate.split('-').map(Number);
          return iy === year && im === month;
        }).length * debt.installmentValue;
    if (monthly > 0 && debt.entityIds.length > 0) {
      const share = monthly / debt.entityIds.length;
      for (const eid of debt.entityIds) {
        byEntityThis.set(eid, (byEntityThis.get(eid) ?? 0) + share);
      }
    }
    // Average per-entity for the previous months window.
    let prevSum = 0;
    for (const { month: m, year: y } of previousMonths(month, year, MONTHS_BACK)) {
      const monthlyP = debt.isRecurring
        ? isRecurringActiveForMonth(debt, m, y)
          ? debt.installmentValue
          : 0
        : state.installments.filter((i) => {
            if (i.debtId !== debt.id) return false;
            const [iy, im] = i.dueDate.split('-').map(Number);
            return iy === y && im === m;
          }).length * debt.installmentValue;
      prevSum += monthlyP;
    }
    const avg = prevSum / Math.max(1, MONTHS_BACK);
    if (avg > 0 && debt.entityIds.length > 0) {
      const share = avg / debt.entityIds.length;
      for (const eid of debt.entityIds) {
        byEntityPrev.set(eid, (byEntityPrev.get(eid) ?? 0) + share);
      }
    }
  }

  let topGrowth: { entityId: string; delta: number; thisVal: number; prevVal: number } | null = null;
  for (const [eid, thisVal] of byEntityThis.entries()) {
    const prevVal = byEntityPrev.get(eid) ?? 0;
    if (prevVal < 50) continue; // Skip tiny baselines.
    const delta = (thisVal - prevVal) / prevVal;
    if (delta >= 0.4 && (!topGrowth || delta > topGrowth.delta)) {
      topGrowth = { entityId: eid, delta, thisVal, prevVal };
    }
  }
  if (topGrowth) {
    const ent = (state.entities as Entity[]).find((e) => e.id === topGrowth!.entityId);
    out.push({
      id: `cat-${topGrowth.entityId}-${year}-${month}`,
      severity: 'warn',
      title: `${ent?.name ?? 'Categoria'} subiu ${Math.round(topGrowth.delta * 100)}%`,
      body: `R$ ${topGrowth.thisVal.toFixed(0)} este mês contra média de R$ ${topGrowth.prevVal.toFixed(0)}.`,
    });
  }

  return out.slice(0, 4);
}
