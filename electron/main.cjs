'use strict';

const { app, BrowserWindow, ipcMain, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { LocalStore } = require('./local-db.cjs');
const { CloudSync } = require('./cloud-sync.cjs');

const APP_ID = 'com.lotogames.pos';
const APP_ROOT = path.resolve(__dirname, '..');

if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
  app.setPath('userData', path.join(process.env.LOCALAPPDATA, 'Loto Games POS'));
}

app.setAppUserModelId(APP_ID);

let mainWindow = null;
let updateReady = false;
let store = null;
let cloudSync = null;
let syncTimer = null;

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

function dbPath() {
  return path.join(dataDir(), 'loto-games.sqlite3');
}

function backupDir() {
  return path.join(app.getPath('userData'), 'backups');
}

function legacyCachePath() {
  return path.join(dataDir(), 'local-cache-v1.json');
}

async function ensureDirectories() {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.mkdir(backupDir(), { recursive: true });
}

async function importLegacyDiskCache() {
  if (!store?.isEmpty()) return { imported: false, reason: 'database-not-empty' };
  try {
    const raw = await fs.readFile(legacyCachePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.tables || typeof parsed.tables !== 'object') return { imported: false, reason: 'invalid-cache' };
    return store.importLegacy(parsed.tables);
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('No se pudo importar la copia local anterior:', error.message);
    return { imported: false, reason: error.code || error.message };
  }
}

function sendSyncStatus(status = cloudSync?.status()) {
  if (!mainWindow || mainWindow.isDestroyed() || !status) return;
  mainWindow.webContents.send('loto:sync-status', status);
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

function isTrustedSender(event) {
  try {
    const raw = event.senderFrame?.url || event.sender?.getURL?.() || '';
    const url = new URL(raw);
    if (url.protocol !== 'file:') return false;
    const filePath = path.resolve(fileURLToPath(url));
    return filePath === path.join(APP_ROOT, 'index.html') || filePath.startsWith(`${APP_ROOT}${path.sep}`);
  } catch (_) {
    return false;
  }
}

function secureHandle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!isTrustedSender(event)) throw new Error('IPC rechazado: origen no confiable.');
    return handler(...args);
  });
}

function registerIpc() {
  secureHandle('loto:app-info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    packaged: app.isPackaged,
    dataPath: dataDir(),
    databasePath: dbPath(),
    backupPath: backupDir()
  }));

  secureHandle('loto:db-new-id', () => store.newId());
  secureHandle('loto:db-list', entity => store.list(entity));
  secureHandle('loto:db-get', (entity, id) => store.get(entity, id));
  secureHandle('loto:db-insert', (entity, payload) => {
    const result = store.insert(entity, payload);
    queueMicrotask(() => cloudSync.syncNow());
    return result;
  });
  secureHandle('loto:db-update', (entity, id, patch) => {
    const result = store.update(entity, id, patch);
    queueMicrotask(() => cloudSync.syncNow());
    return result;
  });
  secureHandle('loto:db-delete', (entity, id) => {
    const result = store.remove(entity, id);
    queueMicrotask(() => cloudSync.syncNow());
    return result;
  });
  secureHandle('loto:db-batch', operations => {
    const result = store.batch(operations);
    queueMicrotask(() => cloudSync.syncNow());
    return result;
  });
  secureHandle('loto:db-import-legacy', tables => store.importLegacy(tables));
  secureHandle('loto:sync-status', () => cloudSync.status());
  secureHandle('loto:sync-now', () => cloudSync.syncNow());
  secureHandle('loto:backup-now', () => store.createBackup());

  secureHandle('loto:update-check', () => checkForUpdates());
  secureHandle('loto:update-install', () => {
    if (!updateReady) return { ok: false, reason: 'not-ready' };
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  });
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
    icon: path.join(APP_ROOT, 'build', 'icon.ico'),
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
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url === mainWindow.webContents.getURL()) return;
    event.preventDefault();
  });
  mainWindow.webContents.on('did-finish-load', () => sendSyncStatus());
  mainWindow.loadFile(path.join(APP_ROOT, 'index.html'));
}

async function initializeDataLayer() {
  await ensureDirectories();
  store = new LocalStore({ dbPath: dbPath(), backupDir: backupDir() });
  await importLegacyDiskCache();
  cloudSync = new CloudSync(store, { onStatus: sendSyncStatus });
  registerIpc();

  store.maybeDailyBackup().catch(error => console.warn('Respaldo automático:', error.message));
  setTimeout(() => cloudSync.syncNow(), 1500);
  syncTimer = setInterval(() => cloudSync.syncNow(), 60 * 1000);
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  configureUpdater();
  await initializeDataLayer();
  createWindow();

  if (app.isPackaged) {
    setTimeout(() => checkForUpdates(), 12000);
    setInterval(() => checkForUpdates(), 6 * 60 * 60 * 1000);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (syncTimer) clearInterval(syncTimer);
  try { store?.close(); } catch (_) {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
