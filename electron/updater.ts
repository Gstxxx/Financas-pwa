// GitHub-backed auto-updater. The provider/owner/repo come from the
// `publish` block in package.json — we don't repeat them here.
//
// Flow: app starts → check → (if newer release) auto-download in background
// → on download complete, fire a Windows toast; clicking it (or the
// "Reiniciar agora" button in Settings) quits and runs the installer.

import { app, BrowserWindow, Notification, ipcMain } from 'electron';
import path from 'node:path';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number; bytesPerSecond: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string };

let currentStatus: UpdateStatus = { state: 'idle' };
let pendingDownloadedVersion: string | null = null;
let getWindow: () => BrowserWindow | null = () => null;
let getIconPath: () => string = () => '';

function broadcast(status: UpdateStatus): void {
  currentStatus = status;
  const win = getWindow();
  win?.webContents.send('update:status', status);
}

function notifyDownloaded(version: string) {
  if (!Notification.isSupported()) return;
  const n = new Notification({
    title: 'Atualização pronta',
    body: `Versão ${version} baixada. Clique para reiniciar e instalar.`,
    icon: getIconPath(),
    silent: false,
  });
  n.on('click', () => {
    autoUpdater.quitAndInstall();
  });
  n.show();
}

export function initAutoUpdater(opts: {
  getMainWindow: () => BrowserWindow | null;
  iconPath: string;
}): void {
  getWindow = opts.getMainWindow;
  getIconPath = () => opts.iconPath;

  // electron-updater is a no-op in dev (the app isn't packaged), and
  // hitting GitHub on every dev start just spams logs.
  if (!app.isPackaged) {
    log.info('[updater] skipped — running unpackaged');
    return;
  }

  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }));
  autoUpdater.on('update-available', (info) =>
    broadcast({ state: 'available', version: info.version })
  );
  autoUpdater.on('update-not-available', (info) =>
    broadcast({ state: 'not-available', version: info.version })
  );
  autoUpdater.on('download-progress', (p) =>
    broadcast({
      state: 'downloading',
      percent: Math.round(p.percent ?? 0),
      bytesPerSecond: p.bytesPerSecond ?? 0,
    })
  );
  autoUpdater.on('update-downloaded', (info) => {
    pendingDownloadedVersion = info.version;
    broadcast({ state: 'downloaded', version: info.version });
    notifyDownloaded(info.version);
  });
  autoUpdater.on('error', (err) => {
    log.error('[updater] error', err);
    broadcast({ state: 'error', message: err?.message ?? String(err) });
  });

  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return currentStatus;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      broadcast({ state: 'error', message });
      return currentStatus;
    }
  });

  ipcMain.handle('update:install', () => {
    if (pendingDownloadedVersion) {
      autoUpdater.quitAndInstall();
      return true;
    }
    return false;
  });

  ipcMain.handle('update:getStatus', () => currentStatus);

  // First check shortly after startup so the window has time to settle.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[updater] initial check failed', err);
    });
  }, 8_000);
}

// Re-export the log path so callers can write a one-liner that points the
// user at the file when an update fails.
export function getUpdaterLogPath(): string {
  // electron-log writes to userData/logs/main.log by default
  return path.join(app.getPath('userData'), 'logs', 'main.log');
}
