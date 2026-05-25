const isBrowser = typeof window !== 'undefined';

function getElectronStorage() {
  if (!isBrowser) return null;
  return window.electron?.storage ?? null;
}

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

// Raw string-level storage. Higher layers wrap with JSON.
function readRaw(key: string): string | null {
  const electron = getElectronStorage();
  if (electron) return electron.get(key);
  if (isLocalStorageAvailable()) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  }
  return memoryStore[key] ?? null;
}

function writeRaw(key: string, raw: string): void {
  const electron = getElectronStorage();
  if (electron) {
    electron.set(key, raw);
    return;
  }
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(key, raw);
      return;
    } catch {
      memoryStore[key] = raw;
      return;
    }
  }
  memoryStore[key] = raw;
}

function deleteRaw(key: string): void {
  const electron = getElectronStorage();
  if (electron) {
    electron.delete(key);
    return;
  }
  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(key);
      return;
    } catch {
      delete memoryStore[key];
      return;
    }
  }
  delete memoryStore[key];
}

export const Storage = {
  get<T>(key: string): T | null {
    try {
      const raw = readRaw(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      writeRaw(key, JSON.stringify(value));
    } catch {
      // Best-effort; do not throw to the caller.
    }
  },

  remove(key: string): void {
    deleteRaw(key);
  },

  /**
   * True when persisted state survives a reload — i.e. we have either the
   * Electron-backed SQLite store or a usable browser localStorage.
   */
  get persistent(): boolean {
    return getElectronStorage() !== null || isLocalStorageAvailable();
  },

  /**
   * True specifically when the desktop SQLite bridge is the active backend.
   */
  get isDesktop(): boolean {
    return getElectronStorage() !== null;
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
  INCOMES: 'finance_incomes',
  LEGACY_CONTAS: 'contas',
  INSTALL_DISMISSED: 'install_dismissed',
  DISCORD_WEBHOOK: 'finance_discord_webhook',
  SNOOZES: 'finance_snoozes',
  ANALYSIS_FILTERS: 'finance_analysis_filters',
  ACCOUNTS: 'finance_accounts',
  RECURRING_INCOMES: 'finance_recurring_incomes',
  TRANSFERS: 'finance_transfers',
  PIN_HASH: 'finance_pin_hash',
  BACKUP_FOLDER: 'finance_backup_folder',
  INSIGHTS_DISMISSED: 'finance_insights_dismissed',
  OLLAMA_SETTINGS: 'finance_ollama',
  CHAT_HISTORY: 'finance_chat_history',
  BANK_CONNECTIONS: 'finance_bank_connections',
  PLUGGY_CREDENTIALS: 'finance_pluggy_credentials',
} as const;
