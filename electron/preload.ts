import { contextBridge, ipcRenderer } from 'electron';

// Load every persisted KV entry synchronously at startup. This lets the
// renderer keep using a synchronous Storage API (mirroring localStorage)
// without forcing a full async refactor. Writes flow back to disk via
// fire-and-forget IPC.
const initialKv: Record<string, string> = ipcRenderer.sendSync('kv:loadAllSync') ?? {};
const cache: Map<string, string> = new Map(Object.entries(initialKv));

const storage = {
  get(key: string): string | null {
    return cache.has(key) ? cache.get(key)! : null;
  },
  set(key: string, rawValue: string): void {
    cache.set(key, rawValue);
    ipcRenderer.send('kv:set', key, rawValue);
  },
  delete(key: string): void {
    cache.delete(key);
    ipcRenderer.send('kv:delete', key);
  },
  keys(): string[] {
    return Array.from(cache.keys());
  },
  reset(): Promise<boolean> {
    cache.clear();
    return ipcRenderer.invoke('kv:reset') as Promise<boolean>;
  },
};

const desktop = {
  getAutoStart: () => ipcRenderer.invoke('app:getAutoStart') as Promise<boolean>,
  setAutoStart: (enabled: boolean) =>
    ipcRenderer.invoke('app:setAutoStart', enabled) as Promise<boolean>,
  quit: () => ipcRenderer.invoke('app:quit'),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  notify: (payload: { title: string; body: string; tag?: string }) =>
    ipcRenderer.invoke('notify:show', payload) as Promise<boolean>,
  platform: process.platform,
};

const win = {
  minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize') as Promise<boolean>,
  close: () => ipcRenderer.invoke('window:close') as Promise<void>,
  isMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
  onMaximizedChange: (cb: (maximized: boolean) => void): (() => void) => {
    const handler = (_e: unknown, maximized: boolean) => cb(maximized);
    ipcRenderer.on('window:maximizedChange', handler);
    return () => {
      ipcRenderer.off('window:maximizedChange', handler);
    };
  },
};

type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number; bytesPerSecond: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string };

const updater = {
  check: () => ipcRenderer.invoke('update:check') as Promise<UpdateStatus>,
  install: () => ipcRenderer.invoke('update:install') as Promise<boolean>,
  getStatus: () => ipcRenderer.invoke('update:getStatus') as Promise<UpdateStatus>,
  onStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const handler = (_e: unknown, status: UpdateStatus) => cb(status);
    ipcRenderer.on('update:status', handler);
    return () => {
      ipcRenderer.off('update:status', handler);
    };
  },
};

const api = { storage, desktop, window: win, updater } as const;

contextBridge.exposeInMainWorld('electron', api);

export type ElectronAPI = typeof api;
