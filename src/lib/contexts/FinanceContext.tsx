'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { FinanceState, FinanceAction, User, Debt, Installment } from '@/lib/types';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { generateInstallments } from '@/lib/services/installment';
import { migrateLegacyData } from '@/lib/services/migration';

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
      // Cascade entity name to debts
      const updated = entities.find((e) => e.id === id);
      const debts = updated
        ? state.debts.map((d) => (d.entityId === id ? { ...d, entityName: updated.name } : d))
        : state.debts;
      return { ...state, entities, debts };
    }

    case 'DELETE_ENTITY': {
      const entityId = action.payload;
      return {
        ...state,
        entities: state.entities.filter((e) => e.id !== entityId),
        debts: state.debts.map((d) =>
          d.entityId === entityId ? { ...d, entityId: '', entityName: '' } : d
        ),
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
      return {
        ...state,
        debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
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
      dispatch({
        type: 'HYDRATE',
        payload: {
          ...migrated,
          budgets: [],
          goals: [],
        },
      });
      return;
    }

    // Load from storage
    const user = Storage.get<User>(STORAGE_KEYS.USER) || DEFAULT_USER;
    const entities = Storage.get(STORAGE_KEYS.ENTITIES) || [];
    const debts = Storage.get(STORAGE_KEYS.DEBTS) || [];
    const installments = Storage.get(STORAGE_KEYS.INSTALLMENTS) || [];
    const budgets = Storage.get(STORAGE_KEYS.BUDGETS) || [];
    const goals = Storage.get(STORAGE_KEYS.GOALS) || [];

    dispatch({
      type: 'HYDRATE',
      payload: { user, entities, debts, installments, budgets, goals } as FinanceState,
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

  const getTotalIncome = useCallback(() => {
    return state.user.salary;
  }, [state.user.salary]);

  const getTotalExpenses = useCallback(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let total = 0;

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
  }, [state.debts, state.installments]);

  const getBalance = useCallback(() => {
    return getTotalIncome() - getTotalExpenses();
  }, [getTotalIncome, getTotalExpenses]);

  return {
    ...state,
    dispatch,
    getTotalIncome,
    getTotalExpenses,
    getBalance,
  };
}
