const isBrowser = typeof window !== 'undefined';

function canUseLocalStorage(): boolean {
  if (!isBrowser) return false;
  try {
    localStorage.setItem('__t__', '1');
    localStorage.removeItem('__t__');
    return true;
  } catch {
    return false;
  }
}

const memoryStore: Record<string, string> = {};
let useLocal: boolean | null = null;

function isLocalStorageAvailable(): boolean {
  if (useLocal === null) {
    useLocal = canUseLocalStorage();
  }
  return useLocal;
}

export const Storage = {
  get<T>(key: string): T | null {
    try {
      const raw = isLocalStorageAvailable()
        ? localStorage.getItem(key)
        : (memoryStore[key] ?? null);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    const raw = JSON.stringify(value);
    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, raw);
      } catch {
        memoryStore[key] = raw;
      }
    } else {
      memoryStore[key] = raw;
    }
  },

  remove(key: string): void {
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(key);
      } catch {
        delete memoryStore[key];
      }
    } else {
      delete memoryStore[key];
    }
  },

  get persistent(): boolean {
    return isLocalStorageAvailable();
  },
};

// Storage keys
export const STORAGE_KEYS = {
  USER: 'finance_user',
  ENTITIES: 'finance_entities',
  DEBTS: 'finance_debts',
  INSTALLMENTS: 'finance_installments',
  BUDGETS: 'finance_budgets',
  GOALS: 'finance_goals',
  LEGACY_CONTAS: 'contas',
  INSTALL_DISMISSED: 'install_dismissed',
} as const;
