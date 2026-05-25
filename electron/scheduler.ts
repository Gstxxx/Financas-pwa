import { Notification, app, powerMonitor } from 'electron';
import path from 'node:path';
import { kvGetRaw, kvSetRaw } from './db';

// Storage keys mirror src/lib/storage.ts. Don't reuse the renderer module
// here — its `Storage` wrapper assumes a browser context.
const KEY_DEBTS = 'finance_debts';
const KEY_INSTALLMENTS = 'finance_installments';
const KEY_SNOOZES = 'finance_snoozes';
const KEY_SENT_TOAST = 'finance_notified_bills_toast';

// Re-checked every hour while the app stays alive. powerMonitor 'resume'
// adds an extra trigger right after the OS wakes from sleep so a multi-day
// sleep doesn't make the user miss bills.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// ---------- Types (duplicated from src/lib/types to keep main self-contained) ----------

interface Debt {
  id: string;
  accountName: string;
  installmentValue: number;
  numberOfInstallments: number;
  dueDay: number;
  startMonth: number;
  startYear: number;
  isRecurring: boolean;
}

interface Installment {
  id: string;
  debtId: string;
  installmentNumber: number;
  dueDate: string;
  isPaid: boolean;
}

interface DueBill {
  key: string;
  debt: Debt;
  installment?: Installment;
  dueDate: string;
  daysAway: number;
}

// ---------- Date helpers ----------

function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function diffDaysFromToday(dueISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dueISO.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function isRecurringActiveForMonth(debt: Debt, month: number, year: number): boolean {
  if (!debt.isRecurring) return false;
  const startDate = new Date(debt.startYear, debt.startMonth - 1);
  const checkDate = new Date(year, month - 1);
  return checkDate >= startDate;
}

function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

// ---------- Data layer ----------

function readJson<T>(key: string): T | null {
  const raw = kvGetRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  kvSetRaw(key, JSON.stringify(value));
}

function pruneSent(map: Record<string, string>): Record<string, string> {
  const cutoff = Date.now() - 30 * 86_400_000;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (new Date(v).getTime() >= cutoff) out[k] = v;
  }
  return out;
}

function isSnoozed(snoozes: Record<string, string>, key: string): boolean {
  const iso = snoozes[key];
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && t > Date.now();
}

function getBillsDueSoon(
  debts: Debt[],
  installments: Installment[],
  snoozes: Record<string, string>,
  daysAhead = 1
): DueBill[] {
  const out: DueBill[] = [];
  const month = getCurrentMonth();
  const year = getCurrentYear();

  for (const debt of debts) {
    if (debt.isRecurring) {
      if (!isRecurringActiveForMonth(debt, month, year)) continue;
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const paid = installments.some(
        (i) => i.debtId === debt.id && i.dueDate.startsWith(prefix) && i.isPaid
      );
      if (paid) continue;
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(debt.dueDay).padStart(2, '0')}`;
      const daysAway = diffDaysFromToday(dueDate);
      const key = `${debt.id}@${dueDate}`;
      if (isSnoozed(snoozes, key)) continue;
      if (daysAway >= -7 && daysAway <= daysAhead) {
        out.push({ key, debt, dueDate, daysAway });
      }
    } else {
      const next = installments
        .filter((i) => i.debtId === debt.id && !i.isPaid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (!next) continue;
      const daysAway = diffDaysFromToday(next.dueDate);
      const key = `${debt.id}@${next.dueDate}`;
      if (isSnoozed(snoozes, key)) continue;
      if (daysAway >= -7 && daysAway <= daysAhead) {
        out.push({ key, debt, installment: next, dueDate: next.dueDate, daysAway });
      }
    }
  }

  return out.sort((a, b) => a.daysAway - b.daysAway);
}

function formatToast(bills: DueBill[]): { title: string; body: string; tag: string } {
  if (bills.length === 1) {
    const b = bills[0]!;
    const title =
      b.daysAway < 0 ? 'Conta atrasada' : b.daysAway === 0 ? 'Conta vence hoje' : 'Conta vence amanhã';
    return {
      title,
      body: `${b.debt.accountName} · ${fmtBRL(b.debt.installmentValue)} (${fmtDate(b.dueDate)})`,
      tag: b.key,
    };
  }

  const overdue = bills.filter((b) => b.daysAway < 0).length;
  const today = bills.filter((b) => b.daysAway === 0).length;
  const soon = bills.filter((b) => b.daysAway > 0).length;
  const total = bills.reduce((sum, b) => sum + b.debt.installmentValue, 0);
  const summary = [
    overdue > 0 ? `${overdue} atrasada${overdue === 1 ? '' : 's'}` : null,
    today > 0 ? `${today} hoje` : null,
    soon > 0 ? `${soon} amanhã` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const names = bills.slice(0, 3).map((b) => b.debt.accountName);
  const tail = bills.length > 3 ? ` +${bills.length - 3}` : '';

  return {
    title: `${bills.length} contas vencendo · ${fmtBRL(total)}`,
    body: `${summary} — ${names.join(', ')}${tail}`,
    tag: bills.map((b) => b.key).join('|'),
  };
}

// ---------- Notification target URL ----------

function pickTargetUrl(bills: DueBill[]): string {
  if (bills.length === 1) {
    // /debts highlight a specific debt — the page reads ?focus= and opens
    // the BottomSheet for that bill.
    return `/debts?focus=${encodeURIComponent(bills[0]!.debt.id)}`;
  }
  return '/debts';
}

// ---------- Scheduler ----------

interface SchedulerDeps {
  iconPath: string;
  onActivate: (targetUrl: string) => void;
}

let timer: NodeJS.Timeout | null = null;
let running = false;

async function runOnce(deps: SchedulerDeps): Promise<void> {
  if (running) return;
  running = true;
  try {
    if (!Notification.isSupported()) return;
    const debts = readJson<Debt[]>(KEY_DEBTS) ?? [];
    const installments = readJson<Installment[]>(KEY_INSTALLMENTS) ?? [];
    const snoozes = readJson<Record<string, string>>(KEY_SNOOZES) ?? {};

    const bills = getBillsDueSoon(debts, installments, snoozes, 1);
    if (bills.length === 0) return;

    const sent = pruneSent(readJson<Record<string, string>>(KEY_SENT_TOAST) ?? {});
    const fresh = bills.filter((b) => !sent[b.key]);
    if (fresh.length === 0) return;

    const payload = formatToast(fresh);
    const targetUrl = pickTargetUrl(fresh);
    const n = new Notification({
      title: payload.title,
      body: payload.body,
      icon: deps.iconPath,
      silent: false,
    });
    n.on('click', () => deps.onActivate(targetUrl));
    n.show();

    const stamp = new Date().toISOString();
    for (const b of fresh) sent[b.key] = stamp;
    writeJson(KEY_SENT_TOAST, sent);
  } catch (err) {
    console.error('scheduler runOnce failed', err);
  } finally {
    running = false;
  }
}

export function initNotificationScheduler(deps: SchedulerDeps): void {
  // Kick off shortly after boot — give the renderer a chance to write any
  // pending state and avoid racing with hydration on first launch.
  setTimeout(() => void runOnce(deps), 15_000);

  timer = setInterval(() => void runOnce(deps), CHECK_INTERVAL_MS);

  powerMonitor.on('resume', () => void runOnce(deps));

  app.on('before-quit', () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}

// Exposed for tests/debug. Not currently called anywhere else.
export const __test__ = {
  diffDaysFromToday,
  getBillsDueSoon,
  formatToast,
  pickTargetUrl,
};

// Keep path import alive even if we drop the icon arg later.
void path;
