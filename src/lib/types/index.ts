export interface User {
  salary: number;
  currentBalance: number;
  monthlyBudget: number;
}

export interface Entity {
  id: string;
  name: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  accountName: string;
  installmentValue: number;
  numberOfInstallments: number; // 0 = recurring
  dueDay: number;
  startMonth: number;
  startYear: number;
  entityIds: string[];
  entityNames: string[];
  isRecurring: boolean;
  createdAt: string;
}

export interface Installment {
  id: string;
  debtId: string;
  installmentNumber: number;
  dueDate: string;
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
}

export interface Budget {
  id: string;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  remaining: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  type: 'savings' | 'emergency' | 'debt-free' | 'custom';
  name: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  createdAt: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export type DebtStatus = 'atrasado' | 'breve' | 'ok' | 'pago';

export interface FinanceState {
  user: User;
  entities: Entity[];
  debts: Debt[];
  installments: Installment[];
  budgets: Budget[];
  goals: Goal[];
  incomes: Income[];
  isHydrated: boolean;
}

export type FinanceAction =
  | { type: 'HYDRATE'; payload: Omit<FinanceState, 'isHydrated'> }
  | { type: 'SET_USER'; payload: Partial<User> }
  | { type: 'ADD_ENTITY'; payload: Omit<Entity, 'id' | 'createdAt'> }
  | { type: 'UPDATE_ENTITY'; payload: { id: string } & Partial<Entity> }
  | { type: 'DELETE_ENTITY'; payload: string }
  | { type: 'ADD_DEBT'; payload: Omit<Debt, 'id' | 'createdAt' | 'isRecurring'> }
  | { type: 'UPDATE_DEBT'; payload: { id: string } & Partial<Debt> }
  | { type: 'DELETE_DEBT'; payload: string }
  | { type: 'MARK_PAID'; payload: { debtId: string; installmentId?: string; dueDate?: string } }
  | { type: 'UNMARK_PAID'; payload: { installmentId: string } }
  | { type: 'ADD_GOAL'; payload: Omit<Goal, 'id' | 'createdAt'> }
  | { type: 'UPDATE_GOAL'; payload: { id: string } & Partial<Goal> }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'ADD_INCOME'; payload: Omit<Income, 'id' | 'createdAt'> }
  | { type: 'UPDATE_INCOME'; payload: { id: string } & Partial<Income> }
  | { type: 'DELETE_INCOME'; payload: string }
  | { type: 'RESET_ALL' }
  | { type: 'IMPORT_DATA'; payload: Omit<FinanceState, 'isHydrated'> };

// Legacy data shape from vanilla JS version
export interface LegacyTransaction {
  id: string;
  name: string;
  tags: string[];
  direction: 'entrada' | 'saida';
  amount: number;
  dueDate: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
}
