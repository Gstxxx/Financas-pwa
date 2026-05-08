import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Currency formatting
export function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtBRLParts(value: number): { sign: string; integer: string; cents: string } {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  const integer = Math.floor(abs).toLocaleString('pt-BR');
  const cents = abs.toFixed(2).split('.')[1];
  return { sign, integer, cents };
}

// Date formatting
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function fmtMonthYear(month: number, year: number): string {
  return `${MONTHS_FULL[month - 1]} ${year}`;
}

export function getToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function daysFromNow(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - getToday().getTime()) / 86400000);
}

export function makeDueDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, daysInMonth(year, month))).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Greeting based on time of day
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Status helpers
export type DebtStatusType = 'atrasado' | 'breve' | 'ok' | 'pago';

export const STATUS_LABELS: Record<DebtStatusType, string> = {
  atrasado: 'Atrasado',
  breve: 'Vence em breve',
  ok: 'Em dia',
  pago: 'Pago',
};

export function getInstallmentStatus(dueDate: string, isPaid: boolean): DebtStatusType {
  if (isPaid) return 'pago';
  const days = daysFromNow(dueDate);
  if (days === null) return 'ok';
  if (days < 0) return 'atrasado';
  if (days <= 7) return 'breve';
  return 'ok';
}

export function getDueDateLabel(dueDate: string): string {
  const days = daysFromNow(dueDate);
  if (days === null) return '';
  if (days < 0) {
    const abs = Math.abs(days);
    return `${abs} ${abs === 1 ? 'dia em atraso' : 'dias em atraso'}`;
  }
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanha';
  return `em ${days} dias`;
}

// Tag system
export const TAG_LABELS: Record<string, string> = {
  outros: 'Outros',
  servicos: 'Servicos',
  pai: 'Pai',
  amor: 'Amor',
  fixo: 'Fixo',
  parcelado: 'Parcelado',
};

export const TAG_KEYS = Object.keys(TAG_LABELS);
