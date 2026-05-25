// Bridge exposed by electron/preload.ts via contextBridge.
// Renderer code reads window.electron when running inside the desktop app.
export {};

interface ElectronStorageAPI {
  get(key: string): string | null;
  set(key: string, rawValue: string): void;
  delete(key: string): void;
  keys(): string[];
  reset(): Promise<boolean>;
}

interface ElectronDesktopAPI {
  getAutoStart(): Promise<boolean>;
  setAutoStart(enabled: boolean): Promise<boolean>;
  quit(): Promise<void>;
  openExternal(url: string): Promise<void>;
  notify(payload: {
    title: string;
    body: string;
    tag?: string;
    targetUrl?: string;
  }): Promise<boolean>;
  /** True when the main process has its own due-bill scheduler. The
   * renderer hook reads this to avoid double-notifying. */
  hasBackgroundScheduler: boolean;
  onNavTo(cb: (url: string) => void): () => void;
  chooseBackupFolder(): Promise<string | null>;
  writeBackup(payload: { folder: string; json: string }): Promise<string | null>;
  platform: NodeJS.Platform;
}

interface ElectronWindowAPI {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<boolean>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizedChange(cb: (maximized: boolean) => void): () => void;
}

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number; bytesPerSecond: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string };

interface ElectronUpdaterAPI {
  check(): Promise<UpdateStatus>;
  install(): Promise<boolean>;
  getStatus(): Promise<UpdateStatus>;
  onStatus(cb: (status: UpdateStatus) => void): () => void;
}

export interface PluggyItemInfo {
  id: string;
  status: string;
  statusDetail?: string;
  connector: {
    id: number;
    name: string;
    institutionUrl?: string;
    imageUrl?: string;
    primaryColor?: string;
    type?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PluggyAccountInfo {
  id: string;
  type: string;
  subtype?: string;
  name: string;
  marketingName?: string;
  balance: number;
  currencyCode?: string;
  itemId: string;
}

export interface PluggyTransactionInfo {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number;
  date: string;
  category?: string;
  categoryId?: string;
  type?: 'DEBIT' | 'CREDIT';
  accountId: string;
}

/** A single holding returned by /investments?itemId=. Each row is one
 * Tesouro/CDB/FII/ação — its `balance` is the current market value in BRL
 * which is what we surface as the in-app account balance. */
export interface PluggyInvestmentInfo {
  id: string;
  itemId: string;
  type?: string;
  subtype?: string;
  name?: string;
  issuer?: string;
  balance?: number;
  amount?: number;
  amountProfit?: number;
  quantity?: number;
  value?: number;
  currencyCode?: string;
  rate?: number;
  rateType?: string;
  dueDate?: string;
  issueDate?: string;
  date?: string;
}

export interface PluggyAppSessionInfo {
  hasSession: boolean;
  email?: string;
  expiresAt?: string;
  expired?: boolean;
  subject?: string;
}

interface ElectronPluggyAPI {
  hasCredentials(): Promise<boolean>;
  setCredentials(creds: { clientId: string; clientSecret: string }): Promise<boolean>;
  clearCredentials(): Promise<boolean>;
  testCredentials(): Promise<{ ok: boolean; message?: string }>;
  connectToken(itemId?: string): Promise<string>;
  getItem(itemId: string): Promise<PluggyItemInfo>;
  refreshItem(itemId: string): Promise<PluggyItemInfo>;
  deleteItem(itemId: string): Promise<boolean>;
  listAccounts(itemId: string): Promise<PluggyAccountInfo[]>;
  listTransactions(
    accountId: string,
    options?: { from?: string; to?: string }
  ): Promise<PluggyTransactionInfo[]>;
  listInvestments(itemId: string): Promise<PluggyInvestmentInfo[]>;
  // App-session (dashboard JWT) mode
  setAppSession(token: string): Promise<boolean>;
  clearAppSession(): Promise<boolean>;
  getAppSessionInfo(): Promise<PluggyAppSessionInfo>;
  testAppSession(): Promise<{ ok: boolean; message?: string }>;
  listItems(): Promise<PluggyItemInfo[]>;
  /** Same as listItems() but returns the trace of which endpoints were
   * tried, used to diagnose "Nenhum banco pra importar" when the user
   * actually has connected banks. */
  debugListItems(): Promise<{
    mode: 'session' | 'dev';
    baseUrl: string;
    attempts: { path: string; ok: boolean; count: number; error?: string }[];
    items: PluggyItemInfo[];
  }>;
  /** Opens meu.pluggy.ai in a child window, intercepts the first
   * Bearer token the dashboard sends to my-api.pluggy.ai, and saves
   * it as the app session. Resolves once the window closes. */
  loginFlow(): Promise<{ ok: boolean; message?: string }>;
}

declare global {
  interface Window {
    electron?: {
      storage: ElectronStorageAPI;
      desktop: ElectronDesktopAPI;
      window: ElectronWindowAPI;
      updater: ElectronUpdaterAPI;
      pluggy: ElectronPluggyAPI;
    };
  }
}
