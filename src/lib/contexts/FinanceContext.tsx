'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { FinanceState, FinanceAction, User, Debt, Installment, Entity, Income } from '@/lib/types';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { generateInstallments } from '@/lib/services/installment';
import { migrateLegacyData } from '@/lib/services/migration';

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
  isHydrated: false,
};

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.payload, isHydrated: true };

    case 'SET_USER':
      return { ...state, user: { ...state.user, ...action.payload } };

    case 'ADD_ENTITY':
      return {
        ...state,
        entities: [
          ...state.entities,
          { ...action.payload, id: generateId(), createdAt: new Date().toISOString() },
        ],
      };

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

    case 'ADD_GOAL':
      return {
        ...state,
        goals: [
          ...state.goals,
          { ...action.payload, id: generateId(), createdAt: new Date().toISOString() },
        ],
      };

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

    case 'RESET_ALL':
      return { ...INITIAL_STATE, isHydrated: true };

    case 'IMPORT_DATA':
      return { ...action.payload, isHydrated: true };

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
      const normalizedDebts = migrated.debts.map((d) =>
        normalizeDebt(d as LegacyDebt, migrated.entities)
      );
      dispatch({
        type: 'HYDRATE',
        payload: {
          ...migrated,
          debts: normalizedDebts,
          budgets: [],
          goals: [],
          incomes: [],
        },
      });
      return;
    }

    // Load from storage
    const user = Storage.get<User>(STORAGE_KEYS.USER) || DEFAULT_USER;
    const entities = (Storage.get<Entity[]>(STORAGE_KEYS.ENTITIES) || []);
    const rawDebts = (Storage.get<LegacyDebt[]>(STORAGE_KEYS.DEBTS) || []);
    const debts = rawDebts.map((d) => normalizeDebt(d, entities));
    const installments = Storage.get(STORAGE_KEYS.INSTALLMENTS) || [];
    const budgets = Storage.get(STORAGE_KEYS.BUDGETS) || [];
    const goals = Storage.get(STORAGE_KEYS.GOALS) || [];
    const incomes = (Storage.get<Income[]>(STORAGE_KEYS.INCOMES) || []).map((i) =>
      i.direction ? i : { ...i, direction: 'entrada' as const }
    );

    dispatch({
      type: 'HYDRATE',
      payload: { user, entities, debts, installments, budgets, goals, incomes } as FinanceState,
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

  return {
    ...state,
    dispatch,
    getTotalIncome,
    getExtraIncomeForMonth,
    getPixOutForMonth,
    getTotalExpenses,
    getPaidExpenses,
    getBalance,
  };
}
