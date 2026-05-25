'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { FinanceState, FinanceAction, User, Debt, Installment, Entity, Income, Goal, Account, RecurringIncome, Transfer } from '@/lib/types';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { generateId, hashHue } from '@/lib/utils';
import { generateInstallments, isRecurringActiveForMonth } from '@/lib/services/installment';
import { migrateLegacyData } from '@/lib/services/migration';

function ensureHue<T extends { name: string; hue?: number }>(item: T): T {
  if (item.hue !== undefined && item.hue !== null) return item;
  return { ...item, hue: hashHue(item.name) };
}

type LegacyDebt = Debt & { entityId?: string; entityName?: string };

function normalizeDebt(d: LegacyDebt, entities: Entity[]): Debt {
  if (Array.isArray(d.entityIds) && Array.isArray(d.entityNames)) {
    return {
      ...d,
      entityIds: d.entityIds.filter(Boolean),
      entityNames: d.entityNames.filter(Boolean),
    };
  }
  const ids = d.entityId ? [d.entityId] : [];
  const names = ids.map((id) => {
    const ent = entities.find((e) => e.id === id);
    return ent?.name || d.entityName || '';
  }).filter(Boolean);
  const { entityId: _eid, entityName: _en, ...rest } = d;
  return { ...rest, entityIds: ids, entityNames: names };
}

const DEFAULT_USER: User = {
  salary: 4500,
  currentBalance: 0,
  monthlyBudget: 4500,
};

const INITIAL_STATE: FinanceState = {
  user: DEFAULT_USER,
  entities: [],
  debts: [],
  installments: [],
  budgets: [],
  goals: [],
  incomes: [],
  snoozes: {},
  accounts: [],
  recurringIncomes: [],
  transfers: [],
  isHydrated: false,
};

function monthKey(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Materialize Income rows for each active RecurringIncome up to the current
 * month. Idempotent — skips months already covered (sourceRecurringId match
 * or lastGeneratedMonth >= target).
 */
function generateMissingRecurringIncomes(
  recurring: RecurringIncome[],
  incomes: Income[]
): { incomes: Income[]; recurring: RecurringIncome[]; created: number } {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const nowISO = now.toISOString();

  const newIncomes: Income[] = [];
  let created = 0;

  const updatedRecurring = recurring.map((r) => {
    if (!r.isActive) return r;

    // Walk month-by-month from startMonth/startYear to current.
    let m = r.startMonth;
    let y = r.startYear;
    let lastGenerated = r.lastGeneratedMonth ?? '';
    const guard = 12 * 5; // 5 years of catch-up max
    let steps = 0;

    while ((y < curYear || (y === curYear && m <= curMonth)) && steps < guard) {
      const key = monthKey(m, y);
      const alreadyPresent =
        incomes.some(
          (inc) => inc.sourceRecurringId === r.id && inc.date.startsWith(key)
        ) ||
        newIncomes.some(
          (inc) => inc.sourceRecurringId === r.id && inc.date.startsWith(key)
        );
      if (!alreadyPresent && key > lastGenerated) {
        // Use min(dueDay, daysInMonth) for safety.
        const daysInMonth = new Date(y, m, 0).getDate();
        const day = Math.min(r.dueDay, daysInMonth);
        newIncomes.push({
          id: `${r.id}-${key}`,
          description: r.name,
          amount: r.amount,
          date: `${key}-${String(day).padStart(2, '0')}`,
          direction: 'entrada',
          sourceRecurringId: r.id,
          createdAt: nowISO,
        });
        created++;
        lastGenerated = key;
      }
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
      steps++;
    }

    return lastGenerated !== r.lastGeneratedMonth
      ? { ...r, lastGeneratedMonth: lastGenerated }
      : r;
  });

  return {
    incomes: newIncomes.length > 0 ? [...incomes, ...newIncomes] : incomes,
    recurring: updatedRecurring,
    created,
  };
}

/**
 * v1→v2 migration: if there are no accounts yet, create a "Conta principal"
 * holding the existing user.currentBalance (any value, including 0). After
 * this runs, SET_USER on currentBalance keeps mirroring to that primary
 * account so SettingsForm doesn't have to know about accounts.
 */
function ensureAccountsMigration(accounts: Account[], user: User): Account[] {
  if (accounts.length > 0) return accounts;
  const now = new Date().toISOString();
  return [
    {
      id: 'account-primary',
      name: 'Conta principal',
      type: 'checking',
      currentBalance: user.currentBalance || 0,
      hue: hashHue('Conta principal'),
      isPrimary: true,
      createdAt: now,
    },
  ];
}

function pruneSnoozes(snoozes: Record<string, string>): Record<string, string> {
  const now = Date.now();
  const out: Record<string, string> = {};
  for (const [k, iso] of Object.entries(snoozes)) {
    const until = new Date(iso).getTime();
    if (!isNaN(until) && until > now) out[k] = iso;
  }
  return out;
}

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.payload, isHydrated: true };

    case 'SET_USER': {
      const nextUser = { ...state.user, ...action.payload };
      // Mirror currentBalance into the primary account so /accounts and
      // SettingsForm stay in sync without the user toggling between them.
      let nextAccounts = state.accounts;
      if (action.payload.currentBalance !== undefined) {
        nextAccounts = state.accounts.map((a) =>
          a.isPrimary ? { ...a, currentBalance: action.payload.currentBalance! } : a
        );
      }
      return { ...state, user: nextUser, accounts: nextAccounts };
    }

    case 'ADD_ENTITY': {
      const entity: Entity = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return { ...state, entities: [...state.entities, ensureHue(entity)] };
    }

    case 'UPDATE_ENTITY': {
      const { id, ...updates } = action.payload;
      const entities = state.entities.map((e) => (e.id === id ? { ...e, ...updates } : e));
      const updated = entities.find((e) => e.id === id);
      const debts = updated
        ? state.debts.map((d) => {
            if (!d.entityIds.includes(id)) return d;
            const entityNames = d.entityIds.map(
              (eid) => entities.find((e) => e.id === eid)?.name || ''
            ).filter(Boolean);
            return { ...d, entityNames };
          })
        : state.debts;
      return { ...state, entities, debts };
    }

    case 'DELETE_ENTITY': {
      const entityId = action.payload;
      return {
        ...state,
        entities: state.entities.filter((e) => e.id !== entityId),
        debts: state.debts.map((d) => {
          if (!d.entityIds.includes(entityId)) return d;
          const idx = d.entityIds.indexOf(entityId);
          const entityIds = d.entityIds.filter((_, i) => i !== idx);
          const entityNames = d.entityNames.filter((_, i) => i !== idx);
          return { ...d, entityIds, entityNames };
        }),
      };
    }

    case 'ADD_DEBT': {
      const isRecurring = action.payload.numberOfInstallments === 0;
      const newDebt: Debt = {
        ...action.payload,
        id: generateId(),
        isRecurring,
        createdAt: new Date().toISOString(),
      };
      const newInstallments = generateInstallments(newDebt);
      return {
        ...state,
        debts: [...state.debts, newDebt],
        installments: [...state.installments, ...newInstallments],
      };
    }

    case 'UPDATE_DEBT': {
      const { id, ...updates } = action.payload;
      const oldDebt = state.debts.find((d) => d.id === id);
      if (!oldDebt) return state;

      const merged: Debt = { ...oldDebt, ...updates };
      const numInst = merged.numberOfInstallments;
      merged.isRecurring = numInst === 0;

      const structuralChanged =
        (updates.numberOfInstallments !== undefined && updates.numberOfInstallments !== oldDebt.numberOfInstallments) ||
        (updates.startMonth !== undefined && updates.startMonth !== oldDebt.startMonth) ||
        (updates.startYear !== undefined && updates.startYear !== oldDebt.startYear) ||
        (updates.dueDay !== undefined && updates.dueDay !== oldDebt.dueDay) ||
        merged.isRecurring !== oldDebt.isRecurring;

      if (!structuralChanged) {
        return {
          ...state,
          debts: state.debts.map((d) => (d.id === id ? merged : d)),
        };
      }

      if (merged.isRecurring) {
        return {
          ...state,
          debts: state.debts.map((d) => (d.id === id ? merged : d)),
          installments: state.installments.filter((i) => i.debtId !== id || i.installmentNumber === 0),
        };
      }

      // Regenerate installments preserving paid state by installmentNumber
      const oldPaidByNumber = new Map<number, Installment>();
      state.installments
        .filter((i) => i.debtId === id && i.isPaid)
        .forEach((i) => oldPaidByNumber.set(i.installmentNumber, i));

      const newInstallments = generateInstallments(merged).map((inst) => {
        const oldPaid = oldPaidByNumber.get(inst.installmentNumber);
        if (oldPaid) return { ...inst, isPaid: true, paidAt: oldPaid.paidAt };
        return inst;
      });

      return {
        ...state,
        debts: state.debts.map((d) => (d.id === id ? merged : d)),
        installments: [
          ...state.installments.filter((i) => i.debtId !== id),
          ...newInstallments,
        ],
      };
    }

    case 'DELETE_DEBT': {
      const debtId = action.payload;
      return {
        ...state,
        debts: state.debts.filter((d) => d.id !== debtId),
        installments: state.installments.filter((i) => i.debtId !== debtId),
      };
    }

    case 'MARK_PAID': {
      const { debtId, installmentId, dueDate } = action.payload;
      if (installmentId) {
        // Mark specific installment
        return {
          ...state,
          installments: state.installments.map((i) =>
            i.id === installmentId
              ? { ...i, isPaid: true, paidAt: new Date().toISOString() }
              : i
          ),
        };
      }
      // For recurring: create a one-off installment record
      if (dueDate) {
        const newInst: Installment = {
          id: generateId(),
          debtId,
          installmentNumber: 0,
          dueDate,
          isPaid: true,
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        return {
          ...state,
          installments: [...state.installments, newInst],
        };
      }
      return state;
    }

    case 'UNMARK_PAID':
      return {
        ...state,
        installments: state.installments.map((i) =>
          i.id === action.payload.installmentId
            ? { ...i, isPaid: false, paidAt: null }
            : i
        ),
      };

    case 'ADD_GOAL': {
      const goal: Goal = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return { ...state, goals: [...state.goals, ensureHue(goal)] };
    }

    case 'UPDATE_GOAL': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      };
    }

    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.payload),
      };

    case 'ADD_INCOME':
      return {
        ...state,
        incomes: [
          ...state.incomes,
          { ...action.payload, id: generateId(), createdAt: new Date().toISOString() },
        ],
      };

    case 'UPDATE_INCOME': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        incomes: state.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      };
    }

    case 'DELETE_INCOME':
      return {
        ...state,
        incomes: state.incomes.filter((i) => i.id !== action.payload),
      };

    case 'SNOOZE_BILL': {
      return {
        ...state,
        snoozes: { ...state.snoozes, [action.payload.billKey]: action.payload.until },
      };
    }

    case 'UNSNOOZE_BILL': {
      const { [action.payload.billKey]: _removed, ...rest } = state.snoozes;
      return { ...state, snoozes: rest };
    }

    case 'ADD_ACCOUNT': {
      const account: Account = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return { ...state, accounts: [...state.accounts, ensureHue(account)] };
    }

    case 'UPDATE_ACCOUNT': {
      const { id, ...updates } = action.payload;
      const nextAccounts = state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
      // Keep User.currentBalance in sync when the primary account's balance
      // changes, so the rest of the app reading User still sees fresh data.
      const updated = nextAccounts.find((a) => a.id === id);
      const nextUser =
        updated?.isPrimary && updates.currentBalance !== undefined
          ? { ...state.user, currentBalance: updates.currentBalance }
          : state.user;
      return { ...state, accounts: nextAccounts, user: nextUser };
    }

    case 'DELETE_ACCOUNT': {
      // Refuse to delete the primary account — it's the legacy anchor for
      // user.currentBalance. Archive is the right action there.
      const target = state.accounts.find((a) => a.id === action.payload);
      if (target?.isPrimary) return state;
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.payload) };
    }

    case 'ADD_RECURRING_INCOME': {
      const r: RecurringIncome = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const next = generateMissingRecurringIncomes(
        [...state.recurringIncomes, r],
        state.incomes
      );
      return {
        ...state,
        recurringIncomes: next.recurring,
        incomes: next.incomes,
      };
    }

    case 'UPDATE_RECURRING_INCOME': {
      const { id, ...updates } = action.payload;
      const recurringIncomes = state.recurringIncomes.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      );
      return { ...state, recurringIncomes };
    }

    case 'DELETE_RECURRING_INCOME': {
      const id = action.payload;
      // Keep already-materialized Incomes — only nuke the template.
      return {
        ...state,
        recurringIncomes: state.recurringIncomes.filter((r) => r.id !== id),
      };
    }

    case 'GENERATE_RECURRING_INCOMES': {
      const next = generateMissingRecurringIncomes(state.recurringIncomes, state.incomes);
      if (next.created === 0) return state;
      return { ...state, incomes: next.incomes, recurringIncomes: next.recurring };
    }

    case 'ADD_TRANSFER': {
      const transfer: Transfer = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      // Update both account balances atomically.
      const accounts = state.accounts.map((a) => {
        if (a.id === transfer.fromAccountId)
          return { ...a, currentBalance: (a.currentBalance || 0) - transfer.amount };
        if (a.id === transfer.toAccountId)
          return { ...a, currentBalance: (a.currentBalance || 0) + transfer.amount };
        return a;
      });
      // Mirror to user.currentBalance if the primary was touched.
      const primary = accounts.find((a) => a.isPrimary);
      const user =
        primary && primary.currentBalance !== state.user.currentBalance
          ? { ...state.user, currentBalance: primary.currentBalance }
          : state.user;
      return {
        ...state,
        transfers: [...state.transfers, transfer],
        accounts,
        user,
      };
    }

    case 'DELETE_TRANSFER': {
      const tr = state.transfers.find((t) => t.id === action.payload);
      if (!tr) return state;
      // Reverse the balance impact.
      const accounts = state.accounts.map((a) => {
        if (a.id === tr.fromAccountId)
          return { ...a, currentBalance: (a.currentBalance || 0) + tr.amount };
        if (a.id === tr.toAccountId)
          return { ...a, currentBalance: (a.currentBalance || 0) - tr.amount };
        return a;
      });
      const primary = accounts.find((a) => a.isPrimary);
      const user =
        primary && primary.currentBalance !== state.user.currentBalance
          ? { ...state.user, currentBalance: primary.currentBalance }
          : state.user;
      return {
        ...state,
        transfers: state.transfers.filter((t) => t.id !== action.payload),
        accounts,
        user,
      };
    }

    case 'RESET_ALL':
      return { ...INITIAL_STATE, isHydrated: true };

    case 'IMPORT_DATA': {
      const importedAccounts = action.payload.accounts ?? [];
      return {
        ...action.payload,
        snoozes: action.payload.snoozes ?? {},
        accounts: ensureAccountsMigration(importedAccounts, action.payload.user),
        recurringIncomes: action.payload.recurringIncomes ?? [],
        transfers: action.payload.transfers ?? [],
        isHydrated: true,
      };
    }

    default:
      return state;
  }
}

interface FinanceContextValue {
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, INITIAL_STATE);

  // Hydrate from localStorage on mount
  useEffect(() => {
    // Try migration first
    const migrated = migrateLegacyData();
    if (migrated) {
      const migratedEntities = migrated.entities.map(ensureHue);
      const normalizedDebts = migrated.debts.map((d) =>
        normalizeDebt(d as LegacyDebt, migratedEntities)
      );
      dispatch({
        type: 'HYDRATE',
        payload: {
          ...migrated,
          entities: migratedEntities,
          debts: normalizedDebts,
          budgets: [],
          goals: [],
          incomes: [],
          snoozes: {},
          accounts: ensureAccountsMigration([], migrated.user),
          recurringIncomes: [],
          transfers: [],
        },
      });
      return;
    }

    // Load from storage
    const user = Storage.get<User>(STORAGE_KEYS.USER) || DEFAULT_USER;
    const entities = (Storage.get<Entity[]>(STORAGE_KEYS.ENTITIES) || []).map(ensureHue);
    const rawDebts = (Storage.get<LegacyDebt[]>(STORAGE_KEYS.DEBTS) || []);
    const debts = rawDebts.map((d) => normalizeDebt(d, entities));
    const installments = Storage.get<Installment[]>(STORAGE_KEYS.INSTALLMENTS) || [];
    const budgets = Storage.get(STORAGE_KEYS.BUDGETS) || [];
    const goals = ((Storage.get<Goal[]>(STORAGE_KEYS.GOALS) || []) as Goal[]).map(ensureHue);
    const incomes = (Storage.get<Income[]>(STORAGE_KEYS.INCOMES) || []).map((i) =>
      i.direction ? i : { ...i, direction: 'entrada' as const }
    );
    const snoozes = pruneSnoozes(Storage.get<Record<string, string>>(STORAGE_KEYS.SNOOZES) || {});
    const accounts = ensureAccountsMigration(
      (Storage.get<Account[]>(STORAGE_KEYS.ACCOUNTS) || []).map(ensureHue),
      user
    );
    const recurringIncomes = Storage.get<RecurringIncome[]>(STORAGE_KEYS.RECURRING_INCOMES) || [];
    const transfers = Storage.get<Transfer[]>(STORAGE_KEYS.TRANSFERS) || [];

    // Auto-fill any missing Income rows that the recurring templates should
    // have generated while the app was closed.
    const gen = generateMissingRecurringIncomes(recurringIncomes, incomes);

    dispatch({
      type: 'HYDRATE',
      payload: {
        user,
        entities,
        debts,
        installments,
        budgets,
        goals,
        incomes: gen.incomes,
        snoozes,
        accounts,
        recurringIncomes: gen.recurring,
        transfers,
      } as FinanceState,
    });
  }, []);

  // Persist to localStorage on state change
  useEffect(() => {
    if (!state.isHydrated) return;
    Storage.set(STORAGE_KEYS.USER, state.user);
    Storage.set(STORAGE_KEYS.ENTITIES, state.entities);
    Storage.set(STORAGE_KEYS.DEBTS, state.debts);
    Storage.set(STORAGE_KEYS.INSTALLMENTS, state.installments);
    Storage.set(STORAGE_KEYS.BUDGETS, state.budgets);
    Storage.set(STORAGE_KEYS.GOALS, state.goals);
    Storage.set(STORAGE_KEYS.INCOMES, state.incomes);
    Storage.set(STORAGE_KEYS.SNOOZES, state.snoozes);
    Storage.set(STORAGE_KEYS.ACCOUNTS, state.accounts);
    Storage.set(STORAGE_KEYS.RECURRING_INCOMES, state.recurringIncomes);
    Storage.set(STORAGE_KEYS.TRANSFERS, state.transfers);
  }, [state]);

  return (
    <FinanceContext.Provider value={{ state, dispatch }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}

export function useFinanceData() {
  const { state, dispatch } = useFinance();

  const getExtraIncomeForMonth = useCallback(
    (month: number, year: number) => {
      return state.incomes.reduce((sum, inc) => {
        if (inc.direction === 'saida') return sum;
        const [iy, im] = inc.date.split('-').map(Number);
        return im === month && iy === year ? sum + inc.amount : sum;
      }, 0);
    },
    [state.incomes]
  );

  // PIX e movimentos de saida lancados pelo usuario: dinheiro que ja saiu
  // da conta e nao esta associado a uma debt parcelada/recorrente.
  const getPixOutForMonth = useCallback(
    (month: number, year: number) => {
      return state.incomes.reduce((sum, inc) => {
        if (inc.direction !== 'saida') return sum;
        const [iy, im] = inc.date.split('-').map(Number);
        return im === month && iy === year ? sum + inc.amount : sum;
      }, 0);
    },
    [state.incomes]
  );

  const getTotalIncome = useCallback(() => {
    const now = new Date();
    return state.user.salary + getExtraIncomeForMonth(now.getMonth() + 1, now.getFullYear());
  }, [state.user.salary, getExtraIncomeForMonth]);

  const getTotalExpenses = useCallback(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let total = getPixOutForMonth(month, year);

    state.debts.forEach((debt) => {
      if (debt.isRecurring) {
        const startDate = new Date(debt.startYear, debt.startMonth - 1);
        const checkDate = new Date(year, month - 1);
        if (checkDate >= startDate) {
          total += debt.installmentValue;
        }
      } else {
        const monthInstallments = state.installments.filter((i) => {
          if (i.debtId !== debt.id) return false;
          const [iy, im] = i.dueDate.split('-').map(Number);
          return im === month && iy === year;
        });
        total += monthInstallments.length * debt.installmentValue;
      }
    });

    return total;
  }, [state.debts, state.installments, getPixOutForMonth]);

  const getPaidExpenses = useCallback(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let total = 0;
    state.debts.forEach((debt) => {
      state.installments.forEach((i) => {
        if (i.debtId !== debt.id) return;
        if (!i.isPaid || !i.paidAt) return;

        // Exclude installments auto-marked as paid because they belong
        // to months that already passed when the debt was created.
        const [dy, dm] = i.dueDate.split('-').map(Number);
        if (dy < year || (dy === year && dm < month)) return;

        // Only count installments whose payment was registered in the
        // current month. This way the balance drops as bills are paid
        // and prepaid (current-month payment for a future-month bill)
        // also reduces the saldo.
        const paid = new Date(i.paidAt);
        if (paid.getFullYear() !== year || paid.getMonth() + 1 !== month) return;

        total += debt.installmentValue;
      });
    });
    return total;
  }, [state.debts, state.installments]);

  // Saldo disponivel: vai abatendo conforme as contas sao pagas no mes
  // e tambem conforme PIX/saidas avulsas sao lancadas, refletindo o
  // dinheiro real que ainda esta em maos.
  const getBalance = useCallback(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return getTotalIncome() - getPaidExpenses() - getPixOutForMonth(month, year);
  }, [getTotalIncome, getPaidExpenses, getPixOutForMonth]);

  // Saldo "ao fim do ciclo" de um mês específico: receita do mês − todas
  // as despesas (pagas e a pagar) − PIX. Útil para sparkline histórico.
  const getProjectedBalanceForMonth = useCallback(
    (month: number, year: number) => {
      const income = state.user.salary + getExtraIncomeForMonth(month, year);
      let expenses = getPixOutForMonth(month, year);
      state.debts.forEach((debt) => {
        if (debt.isRecurring) {
          if (isRecurringActiveForMonth(debt, month, year)) {
            expenses += debt.installmentValue;
          }
        } else {
          const monthInsts = state.installments.filter((i) => {
            if (i.debtId !== debt.id) return false;
            const [iy, im] = i.dueDate.split('-').map(Number);
            return im === month && iy === year;
          });
          expenses += monthInsts.length * debt.installmentValue;
        }
      });
      return income - expenses;
    },
    [state.user.salary, state.debts, state.installments, getPixOutForMonth, getExtraIncomeForMonth]
  );

  const getRecentBalances = useCallback(
    (count = 5) => {
      const out: number[] = [];
      const now = new Date();
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push(getProjectedBalanceForMonth(d.getMonth() + 1, d.getFullYear()));
      }
      return out;
    },
    [getProjectedBalanceForMonth]
  );

  const getMonthlyExpenses = useCallback(
    (year: number): number[] => {
      const out = Array(12).fill(0);
      for (let m = 1; m <= 12; m++) {
        let total = getPixOutForMonth(m, year);
        state.debts.forEach((debt) => {
          if (debt.isRecurring) {
            if (isRecurringActiveForMonth(debt, m, year)) total += debt.installmentValue;
          } else {
            const monthInsts = state.installments.filter((i) => {
              if (i.debtId !== debt.id) return false;
              const [iy, im] = i.dueDate.split('-').map(Number);
              return im === m && iy === year;
            });
            total += monthInsts.length * debt.installmentValue;
          }
        });
        out[m - 1] = total;
      }
      return out;
    },
    [state.debts, state.installments, getPixOutForMonth]
  );

  const getDueByDay = useCallback(
    (month: number, year: number): Record<number, number> => {
      const map: Record<number, number> = {};
      state.debts.forEach((debt) => {
        if (debt.isRecurring) {
          if (isRecurringActiveForMonth(debt, month, year)) {
            map[debt.dueDay] = (map[debt.dueDay] || 0) + 1;
          }
        } else {
          const has = state.installments.some((i) => {
            if (i.debtId !== debt.id) return false;
            const [iy, im] = i.dueDate.split('-').map(Number);
            return iy === year && im === month;
          });
          if (has) {
            map[debt.dueDay] = (map[debt.dueDay] || 0) + 1;
          }
        }
      });
      return map;
    },
    [state.debts, state.installments]
  );

  const getBreakdown = useCallback(
    (month: number, year: number) => {
      const totals: Record<string, number> = {};
      state.debts.forEach((debt) => {
        let monthlyValue = 0;
        if (debt.isRecurring) {
          if (isRecurringActiveForMonth(debt, month, year)) {
            monthlyValue = debt.installmentValue;
          }
        } else {
          const monthInsts = state.installments.filter((i) => {
            if (i.debtId !== debt.id) return false;
            const [iy, im] = i.dueDate.split('-').map(Number);
            return im === month && iy === year;
          });
          monthlyValue = monthInsts.length * debt.installmentValue;
        }
        if (!monthlyValue || debt.entityIds.length === 0) return;
        const share = monthlyValue / debt.entityIds.length;
        debt.entityIds.forEach((eid) => {
          totals[eid] = (totals[eid] || 0) + share;
        });
      });
      const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
      const rows = Object.entries(totals)
        .map(([entityId, value]) => {
          const ent = state.entities.find((e) => e.id === entityId);
          return {
            entityId,
            name: ent?.name || 'Outros',
            hue: ent?.hue ?? hashHue(ent?.name || 'Outros'),
            value,
            pct: (value / grandTotal) * 100,
          };
        })
        .sort((a, b) => b.value - a.value);
      return rows;
    },
    [state.debts, state.installments, state.entities]
  );

  const getFixos = useCallback(
    (month: number, year: number) => {
      const fixos = state.debts.filter(
        (d) => d.isRecurring && isRecurringActiveForMonth(d, month, year)
      );
      const value = fixos.reduce((s, d) => s + d.installmentValue, 0);
      return { value, count: fixos.length };
    },
    [state.debts]
  );

  return {
    ...state,
    dispatch,
    getTotalIncome,
    getExtraIncomeForMonth,
    getPixOutForMonth,
    getTotalExpenses,
    getPaidExpenses,
    getBalance,
    getProjectedBalanceForMonth,
    getRecentBalances,
    getMonthlyExpenses,
    getDueByDay,
    getBreakdown,
    getFixos,
  };
}
