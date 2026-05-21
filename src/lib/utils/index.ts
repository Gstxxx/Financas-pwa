import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Returns the first code point of a name as a badge glyph, plus whether
// it's an emoji. Uses Array.from so surrogate pairs (📦, 🎯) aren't sliced
// in half — name[0] alone would yield a lone surrogate and render as tofu.
export function getInitialGlyph(name: string | undefined | null): {
  value: string;
  isEmoji: boolean;
} {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return { value: '·', isEmoji: false };
  const first = Array.from(trimmed)[0]!;
  const isEmoji = /\p{Extended_Pictographic}/u.test(first);
  return { value: isEmoji ? first : first.toUpperCase(), isEmoji };
}

// Currency formatting
export function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Parse money inputs that may use comma or dot as decimal separator,
// and may include thousands separators (e.g. "1.234,56" or "1,234.56").
export function parseMoney(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return isFinite(input) ? input : 0;
  const s = String(input).trim().replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized = s;
  if (lastComma > lastDot) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    if (lastComma === -1) {
      // No comma: dot is ambiguous (decimal vs thousands). Treat as
      // thousands when multiple dots, or single dot followed by exactly
      // 3 digits — matches BRL formatting like "10.000".
      const dotCount = (s.match(/\./g) || []).length;
      const tail = s.slice(lastDot + 1);
      if (dotCount > 1 || /^\d{3}$/.test(tail)) {
        normalized = s.replace(/\./g, '');
      }
    } else {
      // Comma before dot — US-style "1,234.56"
      normalized = s.replace(/,/g, '');
    }
  }
  const v = parseFloat(normalized);
  return isNaN(v) ? 0 : v;
}

// Format a raw user-typed string into BRL-style display: thousand dots
// and decimal comma. Use this on every keystroke for live formatting.
export function fmtMoneyInput(input: string): string {
  if (!input) return '';
  const cleaned = input.replace(/[^\d,]/g, '');
  if (!cleaned) return '';
  const firstComma = cleaned.indexOf(',');
  let intPart: string;
  let decPart: string | undefined;
  if (firstComma === -1) {
    intPart = cleaned;
  } else {
    intPart = cleaned.slice(0, firstComma);
    decPart = cleaned.slice(firstComma + 1).replace(/,/g, '').slice(0, 2);
  }
  intPart = intPart.replace(/^0+(?=\d)/, '');
  if (intPart === '' && decPart !== undefined) intPart = '0';
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${formatted},${decPart}` : formatted;
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

// Palette of 8 hues used across category swatches/pills.
// Picked to match the prototype in public/claude.
export const HUE_PALETTE: number[] = [145, 25, 65, 200, 285, 335, 195, 350];

export function hashHue(name: string): number {
  if (!name) return HUE_PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return HUE_PALETTE[h % HUE_PALETTE.length];
}

export function getEntityHue(entity: { name: string; hue?: number | null }): number {
  if (entity.hue !== undefined && entity.hue !== null) return entity.hue;
  return hashHue(entity.name);
}

// Compact due-date label used in row.meta: "10 mai 2026 · em 3d"
export function dueRowLabel(dueDate: string): string {
  if (!dueDate) return '';
  const [y, m, d] = dueDate.split('-').map(Number);
  const base = `${d} ${MONTHS[m - 1]} ${y}`;
  const dd = daysFromNow(dueDate);
  if (dd === null) return base;
  if (dd < 0) return `${base} · há ${-dd}d`;
  if (dd === 0) return `${base} · hoje`;
  return `${base} · em ${dd}d`;
}
