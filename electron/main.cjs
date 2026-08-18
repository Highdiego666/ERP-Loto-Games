const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('node:path');

const APP_ID = 'com.lotogames.pos';
let mainWindow = null;
let updateReady = false;

app.setAppUserModelId(APP_ID);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

function dataDir() {
  return path.join(app.getPath('userData'), 'data');
}

function cachePath() {
  return path.join(dataDir(), 'local-cache-v1.json');
}

async function ensureDataDir() {
  await fs.mkdir(dataDir(), { recursive: true });
}

async function readCache() {
  try {
    const raw = await fs.readFile(cachePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('No se pudo leer la copia local:', error.message);
    return null;
  }
}

async function writeCache(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Formato de copia local inválido.');
  }

  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, 'utf8') > 75 * 1024 * 1024) {
    throw new Error('La copia local excede el límite de 75 MB.');
  }

  await ensureDataDir();
  const target = cachePath();
  const temp = `${target}.tmp`;
  await fs.writeFile(temp, serialized, 'utf8');
  await fs.rename(temp, target);
  return { ok: true, path: target };
}

function sendUpdateStatus(status, extra = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('loto:update-status', { status, ...extra });
}

function configureUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
  autoUpdater.on('update-available', info => sendUpdateStatus('available', { version: info.version }));
  autoUpdater.on('update-not-available', info => sendUpdateStatus('current', { version: info.version }));
  autoUpdater.on('download-progress', progress => sendUpdateStatus('downloading', {
    percent: Math.round(progress.percent || 0)
  }));
  autoUpdater.on('update-downloaded', info => {
    updateReady = true;
    sendUpdateStatus('downloaded', { version: info.version });
  });
  autoUpdater.on('error', error => sendUpdateStatus('error', { message: error.message }));
}

async function checkForUpdates() {
  if (!app.isPackaged) return { ok: false, reason: 'development' };
  try {
    await autoUpdater.checkForUpdatesAndNotify();
    return { ok: true };
  } catch (error) {
    sendUpdateStatus('error', { message: error.message });
    return { ok: false, reason: error.message };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#050914',
    title: 'Loto Games POS',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url === current || url.startsWith('file://')) return;
    event.preventDefault();
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
}

ipcMain.handle('loto:app-info', () => ({
  name: app.getName(),
  version: app.getVersion(),
  platform: process.platform,
  packaged: app.isPackaged,
  dataPath: dataDir(),
  cachePath: cachePath()
}));

ipcMain.handle('loto:cache-read', () => readCache());
ipcMain.handle('loto:cache-write', (_event, payload) => writeCache(payload));
ipcMain.handle('loto:update-check', () => checkForUpdates());
ipcMain.handle('loto:update-install', () => {
  if (!updateReady) return { ok: false, reason: 'not-ready' };
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { ok: true };
});

app.whenReady().then(async () => {
  await ensureDataDir();
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  configureUpdater();
  createWindow();

  if (app.isPackaged) {
    setTimeout(() => checkForUpdates(), 12000);
    setInterval(() => checkForUpdates(), 6 * 60 * 60 * 1000);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
