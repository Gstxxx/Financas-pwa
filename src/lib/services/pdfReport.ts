import jsPDF from 'jspdf';
import type { FinanceState } from '@/lib/types';
import { isRecurringActiveForMonth } from '@/lib/services/installment';
import { fmtBRL, fmtMonthYear } from '@/lib/utils';

interface MonthlyReportInput {
  state: Pick<FinanceState, 'user' | 'accounts' | 'debts' | 'installments' | 'incomes' | 'entities' | 'recurringIncomes'>;
  month: number;
  year: number;
}

function sumExpenses(input: MonthlyReportInput): number {
  const { state, month, year } = input;
  let total = 0;
  for (const debt of state.debts) {
    if (debt.isRecurring) {
      if (isRecurringActiveForMonth(debt, month, year)) total += debt.installmentValue;
    } else {
      const insts = state.installments.filter((i) => {
        if (i.debtId !== debt.id) return false;
        const [iy, im] = i.dueDate.split('-').map(Number);
        return iy === year && im === month;
      });
      total += insts.length * debt.installmentValue;
    }
  }
  for (const inc of state.incomes) {
    if (inc.direction !== 'saida') continue;
    const [iy, im] = inc.date.split('-').map(Number);
    if (iy === year && im === month) total += inc.amount;
  }
  return total;
}

function sumIncomes(input: MonthlyReportInput): number {
  const { state, month, year } = input;
  let total = state.user.salary;
  for (const inc of state.incomes) {
    if (inc.direction !== 'entrada') continue;
    const [iy, im] = inc.date.split('-').map(Number);
    if (iy === year && im === month) total += inc.amount;
  }
  return total;
}

function topCategories(input: MonthlyReportInput): { name: string; value: number; pct: number }[] {
  const { state, month, year } = input;
  const totals = new Map<string, number>();
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
    if (monthly <= 0 || debt.entityIds.length === 0) continue;
    const share = monthly / debt.entityIds.length;
    for (const eid of debt.entityIds) {
      totals.set(eid, (totals.get(eid) ?? 0) + share);
    }
  }
  const grand = Array.from(totals.values()).reduce((s, v) => s + v, 0) || 1;
  return Array.from(totals.entries())
    .map(([id, value]) => {
      const ent = state.entities.find((e) => e.id === id);
      return { name: ent?.name ?? 'Sem categoria', value, pct: (value / grand) * 100 };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/**
 * Builds and triggers download of a single-page monthly report. Pure
 * client-side, no canvas / chart screenshots — keeps the PDF tiny and
 * accessible (selectable text).
 */
export function downloadMonthlyReport(input: MonthlyReportInput): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Relatório financeiro', margin, y);
  y += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(fmtMonthYear(input.month, input.year), margin, y);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, y, {
    align: 'right',
  });
  y += 24;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Summary
  const income = sumIncomes(input);
  const expenses = sumExpenses(input);
  const balance = income - expenses;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Resumo do mês', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  for (const [label, val] of [
    ['Receita', fmtBRL(income)],
    ['Despesas', fmtBRL(expenses)],
    ['Saldo do ciclo', fmtBRL(balance)],
  ] as const) {
    doc.text(label, margin, y);
    doc.text(val, pageWidth - margin, y, { align: 'right' });
    y += 16;
  }
  y += 12;

  // Accounts snapshot
  if (input.state.accounts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text('Carteiras', margin, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    for (const acc of input.state.accounts) {
      if (acc.archived) continue;
      const v = acc.type === 'credit_card' ? -(acc.currentBalance || 0) : acc.currentBalance || 0;
      doc.text(`${acc.name} (${labelType(acc.type)})`, margin, y);
      doc.text(fmtBRL(v), pageWidth - margin, y, { align: 'right' });
      y += 14;
      if (y > 740) {
        doc.addPage();
        y = margin;
      }
    }
    y += 10;
  }

  // Top categories
  const top = topCategories(input);
  if (top.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text('Top categorias', margin, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    for (const cat of top) {
      doc.text(cat.name, margin, y);
      doc.text(`${fmtBRL(cat.value)}  ·  ${cat.pct.toFixed(1)}%`, pageWidth - margin, y, {
        align: 'right',
      });
      y += 14;
      if (y > 740) {
        doc.addPage();
        y = margin;
      }
    }
    y += 10;
  }

  // Bills paid / pending list
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('Contas do mês', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  const monthRows: { date: string; name: string; value: number; paid: boolean }[] = [];
  for (const debt of input.state.debts) {
    if (debt.isRecurring) {
      if (!isRecurringActiveForMonth(debt, input.month, input.year)) continue;
      const dueDate = `${input.year}-${String(input.month).padStart(2, '0')}-${String(debt.dueDay).padStart(2, '0')}`;
      const paid = input.state.installments.some(
        (i) =>
          i.debtId === debt.id &&
          i.dueDate.startsWith(`${input.year}-${String(input.month).padStart(2, '0')}`) &&
          i.isPaid
      );
      monthRows.push({ date: dueDate, name: debt.accountName, value: debt.installmentValue, paid });
    } else {
      const insts = input.state.installments.filter((i) => {
        if (i.debtId !== debt.id) return false;
        const [iy, im] = i.dueDate.split('-').map(Number);
        return iy === input.year && im === input.month;
      });
      for (const inst of insts) {
        monthRows.push({
          date: inst.dueDate,
          name: `${debt.accountName} ${inst.installmentNumber}/${debt.numberOfInstallments}`,
          value: debt.installmentValue,
          paid: inst.isPaid,
        });
      }
    }
  }
  monthRows.sort((a, b) => a.date.localeCompare(b.date));

  if (monthRows.length === 0) {
    doc.setTextColor(150, 150, 150);
    doc.text('Nenhuma conta neste mês.', margin, y);
    y += 14;
  } else {
    for (const row of monthRows) {
      doc.setTextColor(row.paid ? 140 : 60, row.paid ? 180 : 60, row.paid ? 140 : 60);
      doc.text(row.paid ? '✓' : '○', margin, y);
      doc.setTextColor(60, 60, 60);
      doc.text(row.date.slice(8) + '/' + row.date.slice(5, 7), margin + 14, y);
      doc.text(row.name, margin + 56, y, { maxWidth: pageWidth - margin * 2 - 130 });
      doc.text(fmtBRL(row.value), pageWidth - margin, y, { align: 'right' });
      y += 13;
      if (y > 770) {
        doc.addPage();
        y = margin;
      }
    }
  }

  doc.save(`financas-${input.year}-${String(input.month).padStart(2, '0')}.pdf`);
}

function labelType(t: string): string {
  switch (t) {
    case 'checking':
      return 'Conta corrente';
    case 'savings':
      return 'Poupança';
    case 'cash':
      return 'Dinheiro';
    case 'credit_card':
      return 'Cartão';
    case 'investment':
      return 'Investimento';
    default:
      return t;
  }
}
