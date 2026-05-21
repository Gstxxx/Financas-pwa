import type { Debt, Installment, FinanceState } from '@/lib/types';
import {
  getCurrentMonth,
  getCurrentYear,
  fmtBRL,
  fmtDate,
  getDueDateLabel,
} from '@/lib/utils';
import {
  isRecurringActiveForMonth,
  getRecurringPaidInstallment,
} from '@/lib/services/installment';

export interface DueBill {
  /** Stable id used for de-duping notifications. */
  key: string;
  debt: Debt;
  installment?: Installment;
  dueDate: string; // YYYY-MM-DD
  daysAway: number; // 0 = today, 1 = tomorrow, negative = overdue
}

function diffDaysFromToday(dueISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dueISO.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Returns the bills that are unpaid and either overdue or due within the
 * next `daysAhead` days. Includes both recurring and parcelado debts.
 */
export function getBillsDueSoon(
  state: Pick<FinanceState, 'debts' | 'installments'>,
  daysAhead = 1
): DueBill[] {
  const out: DueBill[] = [];
  const month = getCurrentMonth();
  const year = getCurrentYear();

  for (const debt of state.debts) {
    if (debt.isRecurring) {
      if (!isRecurringActiveForMonth(debt, month, year)) continue;
      const paid = getRecurringPaidInstallment(state.installments, debt.id, month, year);
      if (paid) continue;
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(debt.dueDay).padStart(2, '0')}`;
      const daysAway = diffDaysFromToday(dueDate);
      if (daysAway >= -7 && daysAway <= daysAhead) {
        out.push({
          key: `${debt.id}@${dueDate}`,
          debt,
          dueDate,
          daysAway,
        });
      }
    } else {
      const next = state.installments
        .filter((i) => i.debtId === debt.id && !i.isPaid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (!next) continue;
      const daysAway = diffDaysFromToday(next.dueDate);
      if (daysAway >= -7 && daysAway <= daysAhead) {
        out.push({
          key: `${debt.id}@${next.dueDate}`,
          debt,
          installment: next,
          dueDate: next.dueDate,
          daysAway,
        });
      }
    }
  }

  return out.sort((a, b) => a.daysAway - b.daysAway);
}

function statusLabel(daysAway: number): string {
  if (daysAway < 0) return `Atrasado ${Math.abs(daysAway)} dia${daysAway === -1 ? '' : 's'}`;
  if (daysAway === 0) return 'Vence hoje';
  if (daysAway === 1) return 'Vence amanhã';
  return getDueDateLabel(new Date(Date.now() + daysAway * 86_400_000).toISOString().slice(0, 10));
}

/**
 * Sends a single Discord embed listing the due bills. The webhook URL must
 * already be validated by the caller.
 */
export async function sendDueWebhook(webhookUrl: string, bills: DueBill[]): Promise<boolean> {
  if (bills.length === 0) return false;

  const overdue = bills.filter((b) => b.daysAway < 0).length;
  const today = bills.filter((b) => b.daysAway === 0).length;
  const soon = bills.filter((b) => b.daysAway > 0).length;
  const total = bills.reduce((sum, b) => sum + b.debt.installmentValue, 0);

  const summary = [
    overdue > 0 ? `${overdue} atrasada${overdue === 1 ? '' : 's'}` : null,
    today > 0 ? `${today} hoje` : null,
    soon > 0 ? `${soon} próxima${soon === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const embed = {
    title: 'Contas vencendo',
    description: `${summary} — total **${fmtBRL(total)}**`,
    color: overdue > 0 ? 0xd14a3d : 0x10b981,
    fields: bills.slice(0, 24).map((b) => ({
      name: b.debt.accountName,
      value: `${fmtBRL(b.debt.installmentValue)} · ${statusLabel(b.daysAway)} (${fmtDate(b.dueDate)})`,
      inline: false,
    })),
    footer: { text: 'Financas · dashboard' },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
