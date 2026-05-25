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

// Pluggy / Open Finance types removed in v1.8.0.

declare global {
  interface Window {
    electron?: {
      storage: ElectronStorageAPI;
      desktop: ElectronDesktopAPI;
      window: ElectronWindowAPI;
      updater: ElectronUpdaterAPI;
    };
  }
}
