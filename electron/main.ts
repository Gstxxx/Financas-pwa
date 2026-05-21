import { app, BrowserWindow, ipcMain, shell, protocol, net, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { initDb, kvLoadAll, kvSetRaw, kvDelete, kvReset, closeDb } from './db';

const isDev = !app.isPackaged || process.env.ELECTRON_DEV === '1';
const startedHidden = process.argv.includes('--hidden');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;

// Single instance lock — if another instance launches, focus the existing one.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Register custom protocol so the bundled Next.js export loads with absolute
// asset paths. Must be called before app ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function resolveStaticPath(urlPath: string): string {
  const outDir = path.join(__dirname, '..', 'out');
  let p = decodeURIComponent(urlPath);
  if (p.endsWith('/')) p = p + 'index.html';
  if (!path.extname(p)) p = p + '/index.html';
  const resolved = path.join(outDir, p);
  // Stop directory traversal.
  if (!resolved.startsWith(outDir)) return path.join(outDir, 'index.html');
  return resolved;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 880,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#15171b',
    autoHideMenuBar: true,
    title: 'Financas',
    show: !startedHidden,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL('app://./');
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Hide to tray on close instead of quitting, so the app keeps running.
  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  const fallback = nativeImage.createEmpty();
  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) image = fallback;

  tray = new Tray(image);
  tray.setToolTip('Financas');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Abrir',
      click: () => {
        if (!mainWindow) createWindow();
        else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (!mainWindow) {
      createWindow();
      return;
    }
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function ensureAutoStart() {
  if (process.platform !== 'win32' || isDev) return;
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
    args: ['--hidden'],
  });
}

function registerIpc() {
  // Renderer calls these via the preload bridge. KV operations are the
  // backbone of the app's storage layer.
  ipcMain.on('kv:loadAllSync', (e) => {
    e.returnValue = kvLoadAll();
  });

  ipcMain.on('kv:set', (_e, key: string, rawValue: string) => {
    try {
      kvSetRaw(key, rawValue);
    } catch (err) {
      console.error('kv:set failed', key, err);
    }
  });

  ipcMain.on('kv:delete', (_e, key: string) => {
    try {
      kvDelete(key);
    } catch (err) {
      console.error('kv:delete failed', key, err);
    }
  });

  ipcMain.handle('kv:reset', () => {
    kvReset();
    return true;
  });

  ipcMain.handle('app:getAutoStart', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('app:setAutoStart', (_e, enabled: boolean) => {
    if (process.platform === 'win32') {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: app.getPath('exe'),
        args: ['--hidden'],
      });
    }
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('app:quit', () => {
    quitting = true;
    app.quit();
  });

  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url));
}

app.whenReady().then(() => {
  initDb();
  registerIpc();

  protocol.handle('app', async (req) => {
    const url = new URL(req.url);
    const filePath = resolveStaticPath(url.pathname);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();
  createTray();
  ensureAutoStart();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
  // Keep app running in tray on Windows/Linux. Only quit on macOS standard.
  if (process.platform === 'darwin') app.quit();
});

app.on('will-quit', () => {
  closeDb();
});
