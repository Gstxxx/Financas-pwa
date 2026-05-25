import { FinanceState } from '@/lib/types';

export function exportToJSON(state: Omit<FinanceState, 'isHydrated'>): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Build a CSV row-per-transaction snapshot. Includes paid installments,
 * pending installments (with `paid=no`), recurring debt expectations for
 * past months, manual incomes, and transfers (marked as type=transfer).
 */
export function exportTransactionsToCSV(state: Omit<FinanceState, 'isHydrated'>): string {
  const rows: string[][] = [['date', 'type', 'account', 'category', 'description', 'amount', 'paid']];

  const accountName = (id?: string) => state.accounts.find((a) => a.id === id)?.name ?? '';

  // Debts → installments + recurring projections
  for (const debt of state.debts) {
    const categories = debt.entityNames.filter(Boolean).join('|');
    if (debt.isRecurring) {
      // Emit one row per month from startMonth/startYear to current month.
      const now = new Date();
      let m = debt.startMonth;
      let y = debt.startYear;
      const limit = 5 * 12; // 5y guard
      let steps = 0;
      while ((y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) && steps < limit) {
        const date = `${y}-${String(m).padStart(2, '0')}-${String(debt.dueDay).padStart(2, '0')}`;
        const paid = state.installments.some(
          (i) => i.debtId === debt.id && i.dueDate.startsWith(`${y}-${String(m).padStart(2, '0')}`) && i.isPaid
        );
        rows.push([date, 'recurring', '', categories, debt.accountName, debt.installmentValue.toFixed(2), paid ? 'yes' : 'no']);
        m++;
        if (m > 12) { m = 1; y++; }
        steps++;
      }
    } else {
      const debtInsts = state.installments.filter((i) => i.debtId === debt.id);
      for (const inst of debtInsts) {
        rows.push([
          inst.dueDate,
          'installment',
          '',
          categories,
          `${debt.accountName} ${inst.installmentNumber}/${debt.numberOfInstallments}`,
          debt.installmentValue.toFixed(2),
          inst.isPaid ? 'yes' : 'no',
        ]);
      }
    }
  }

  // Manual incomes (entrada/saida).
  for (const inc of state.incomes) {
    rows.push([
      inc.date,
      inc.direction === 'entrada' ? 'income' : 'manual_expense',
      '',
      '',
      inc.description,
      inc.amount.toFixed(2),
      'yes',
    ]);
  }

  // Transfers.
  for (const tr of state.transfers ?? []) {
    rows.push([
      tr.date,
      'transfer',
      `${accountName(tr.fromAccountId)} → ${accountName(tr.toAccountId)}`,
      '',
      tr.note ?? '',
      tr.amount.toFixed(2),
      'yes',
    ]);
  }

  return rows.map(escapeRow).join('\r\n');
}

function escapeRow(row: string[]): string {
  return row.map(escapeCell).join(',');
}

function escapeCell(s: string): string {
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCSV(state: Omit<FinanceState, 'isHydrated'>, filename?: string) {
  const csv = exportTransactionsToCSV(state);
  // Prepend UTF-8 BOM so Excel opens with accentuation intact.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `financas-transacoes-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON(state: Omit<FinanceState, 'isHydrated'>, filename?: string) {
  const json = exportToJSON(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `financas-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromJSON(jsonString: string): Omit<FinanceState, 'isHydrated'> | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.user || !Array.isArray(data.entities) || !Array.isArray(data.debts)) {
      return null;
    }
    return {
      user: data.user,
      entities: data.entities || [],
      debts: data.debts || [],
      installments: data.installments || [],
      budgets: data.budgets || [],
      goals: data.goals || [],
      incomes: data.incomes || [],
      snoozes: data.snoozes || {},
      accounts: data.accounts || [],
      recurringIncomes: data.recurringIncomes || [],
      transfers: data.transfers || [],
      bankConnections: data.bankConnections || [],
    };
  } catch {
    return null;
  }
}

export async function exportToDiscord(
  webhookUrl: string,
  state: Omit<FinanceState, 'isHydrated'>
): Promise<boolean> {
  try {
    const totalDebts = state.debts.length;
    const totalEntities = state.entities.length;
    const totalGoals = state.goals.length;
    const paidInstallments = state.installments.filter((i) => i.isPaid).length;
    const totalInstallments = state.installments.length;

    const embed = {
      title: 'Dashboard Financeiro - Backup',
      color: 0xa78bfa,
      fields: [
        { name: 'Salario', value: `R$ ${state.user.salary.toFixed(2)}`, inline: true },
        { name: 'Saldo', value: `R$ ${state.user.currentBalance.toFixed(2)}`, inline: true },
        { name: 'Contas', value: `${totalDebts}`, inline: true },
        { name: 'Categorias', value: `${totalEntities}`, inline: true },
        { name: 'Parcelas', value: `${paidInstallments}/${totalInstallments} pagas`, inline: true },
        { name: 'Metas', value: `${totalGoals}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    const json = exportToJSON(state);
    const blob = new Blob([json], { type: 'application/json' });

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({ embeds: [embed] }));
    formData.append('files[0]', blob, `financas-${new Date().toISOString().split('T')[0]}.json`);

    const response = await fetch(webhookUrl, { method: 'POST', body: formData });
    return response.ok;
  } catch {
    return false;
  }
}
