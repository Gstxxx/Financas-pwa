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
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electron?: {
      storage: ElectronStorageAPI;
      desktop: ElectronDesktopAPI;
    };
  }
}
