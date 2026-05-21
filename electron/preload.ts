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
  platform: process.platform,
};

const api = { storage, desktop } as const;

contextBridge.exposeInMainWorld('electron', api);

export type ElectronAPI = typeof api;
