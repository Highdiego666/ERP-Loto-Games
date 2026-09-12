const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const {
  setupUpdater,
  stopUpdater,
  checkForUpdates,
  installUpdate,
  getUpdateState
} = require('./updater.cjs');

let db;
let dataDir;
let dbPath;

const AUDIT_ENTITY = 'auditoria_modificaciones';
const ALLOWED_SYNC_ENTITIES = new Set([
  'productos',
  'ventas',
  'clientes',
  'usuarios',
  'servicios',
  'traspasos',
  'cuentas_plaza_movimientos',
  'movimientos_inventario',
  AUDIT_ENTITY
]);

function ensureDatabase() {
  dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'loto-games.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      UNIQUE(entity, record_id)
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function setKv(key, value) {
  db.prepare(`
    INSERT INTO kv_store(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
  `).run(String(key), String(value));
  return true;
}

function removeKv(key) {
  db.prepare('DELETE FROM kv_store WHERE key=?').run(String(key));
  return true;
}

function clearKv() {
  db.prepare('DELETE FROM kv_store').run();
  return true;
}

function enqueueJob(job) {
  const entity = String(job?.entity || '');
  const recordId = String(job?.recordId || '');
  const operation = job?.operation === 'delete' ? 'delete' : 'upsert';

  if (!ALLOWED_SYNC_ENTITIES.has(entity)) {
    throw new Error(`Entidad de sincronización no permitida: ${entity || '(vacía)'}`);
  }
  if (!recordId) throw new Error('recordId de sincronización vacío');
  if (entity === AUDIT_ENTITY && operation === 'delete') {
    throw new Error('La auditoría de Loto Games es append-only y no admite eliminaciones');
  }

  const payload = operation === 'delete' ? null : JSON.stringify(job?.payload ?? {});
  db.prepare(`
    INSERT INTO sync_queue(entity, record_id, operation, payload, created_at, attempts, last_error)
    VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP, 0, NULL)
    ON CONFLICT(entity, record_id) DO UPDATE SET
      operation=excluded.operation,
      payload=excluded.payload,
      created_at=CURRENT_TIMESTAMP,
      attempts=0,
      last_error=NULL
  `).run(entity, recordId, operation, payload);
  return true;
}

function commitCollection(key, value, jobs, auditValue = null, auditJobs = []) {
  const entity = String(key || '');
  if (!ALLOWED_SYNC_ENTITIES.has(entity)) {
    throw new Error(`Colección administrada no permitida: ${entity || '(vacía)'}`);
  }
  if (!Array.isArray(jobs)) throw new Error('Lista de sincronización inválida');
  if (!Array.isArray(auditJobs)) throw new Error('Lista de auditoría inválida');

  const commit = db.transaction(() => {
    setKv(entity, value);
    for (const job of jobs) {
      if (String(job?.entity || '') !== entity) {
        throw new Error(`Trabajo de sincronización no corresponde a ${entity}`);
      }
      enqueueJob(job);
    }

    if (auditValue !== null) {
      if (entity === AUDIT_ENTITY) {
        throw new Error('La auditoría no puede auditarse a sí misma');
      }
      setKv(AUDIT_ENTITY, auditValue);
      for (const job of auditJobs) {
        if (String(job?.entity || '') !== AUDIT_ENTITY) {
          throw new Error('Trabajo de auditoría con entidad inválida');
        }
        enqueueJob(job);
      }
    }
  });

  commit();
  return true;
}

function replySync(event, fn) {
  try {
    fn();
    event.returnValue = { ok: true };
  } catch (error) {
    event.returnValue = { ok: false, error: error?.message || String(error) };
  }
}

function backupDirPath() {
  return path.join(app.getPath('userData'), 'backups');
}

function createBackupIfNeeded() {
  if (!db || !dbPath || !fs.existsSync(dbPath)) return false;
  const backupDir = backupDirPath();
  fs.mkdirSync(backupDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const target = path.join(backupDir, `loto-games-${day}.db`);
  if (!fs.existsSync(target)) {
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(dbPath, target);
  }
  const files = fs.readdirSync(backupDir)
    .filter(name => /^loto-games-\d{4}-\d{2}-\d{2}\.db$/.test(name))
    .sort()
    .reverse();
  for (const old of files.slice(30)) {
    fs.rmSync(path.join(backupDir, old), { force: true });
  }
  return target;
}

function createPreUpdateBackup(version = 'desconocida') {
  if (!db || !dbPath || !fs.existsSync(dbPath)) return false;
  const backupDir = backupDirPath();
  fs.mkdirSync(backupDir, { recursive: true });
  const safeVersion = String(version || 'desconocida').replace(/[^0-9A-Za-z._-]/g, '_');
  const target = path.join(backupDir, `loto-games-pre-update-${safeVersion}.db`);

  if (!fs.existsSync(target)) {
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(dbPath, target);
  }

  const files = fs.readdirSync(backupDir)
    .filter(name => /^loto-games-pre-update-.*\.db$/.test(name))
    .map(name => ({ name, mtime: fs.statSync(path.join(backupDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const old of files.slice(10)) {
    fs.rmSync(path.join(backupDir, old.name), { force: true });
  }
  return target;
}

async function listPrinters(webContents) {
  const printers = await webContents.getPrintersAsync();
  return printers.map(printer => ({
    name: String(printer.name || ''),
    displayName: String(printer.displayName || printer.name || ''),
    description: String(printer.description || ''),
    status: Number(printer.status || 0),
    isDefault: !!printer.isDefault
  }));
}

async function printHtml(sender, request = {}) {
  const html = String(request?.html || '');
  if (!html || html.length > 1_000_000) {
    throw new Error('Documento de impresión vacío o demasiado grande');
  }

  const deviceName = String(request?.deviceName || '').trim();
  const silent = !!request?.silent;
  const copies = Math.max(1, Math.min(Number(request?.copies) || 1, 20));
  const printers = await sender.getPrintersAsync();
  if (deviceName && !printers.some(printer => printer.name === deviceName)) {
    throw new Error(`La impresora configurada ya no está disponible: ${deviceName}`);
  }

  const printWindow = new BrowserWindow({
    show: false,
    width: 420,
    height: 800,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      javascript: false
    }
  });

  printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await printWindow.loadURL(dataUrl);

    const options = {
      silent,
      printBackground: true,
      color: false,
      copies,
      margins: { marginType: 'none' },
      landscape: false
    };
    if (deviceName) options.deviceName = deviceName;

    const pageSize = request?.pageSize;
    if (pageSize && Number(pageSize.width) >= 353 && Number(pageSize.height) >= 353) {
      options.pageSize = {
        width: Math.round(Number(pageSize.width)),
        height: Math.round(Number(pageSize.height))
      };
    } else {
      options.usePrinterDefaultPageSize = true;
    }

    return await new Promise(resolve => {
      printWindow.webContents.print(options, (success, failureReason) => {
        resolve({ success: !!success, failureReason: failureReason || null });
      });
    });
  } finally {
    if (!printWindow.isDestroyed()) printWindow.destroy();
  }
}

function registerIpc() {
  ipcMain.on('storage:load-all-sync', event => {
    try {
      const rows = db.prepare('SELECT key, value FROM kv_store').all();
      event.returnValue = { ok: true, data: Object.fromEntries(rows.map(row => [row.key, row.value])) };
    } catch (error) {
      event.returnValue = { ok: false, error: error?.message || String(error), data: {} };
    }
  });

  ipcMain.on('storage:set-sync', (event, key, value) => replySync(event, () => setKv(key, value)));
  ipcMain.on('storage:remove-sync', (event, key) => replySync(event, () => removeKv(key)));
  ipcMain.on('storage:clear-sync', event => replySync(event, clearKv));
  ipcMain.on('storage:commit-collection-sync', (event, key, value, jobs, auditValue, auditJobs) => {
    replySync(event, () => commitCollection(key, value, jobs, auditValue, auditJobs));
  });

  ipcMain.handle('storage:set', (_event, key, value) => setKv(key, value));
  ipcMain.handle('storage:remove', (_event, key) => removeKv(key));
  ipcMain.handle('storage:clear', clearKv);

  ipcMain.on('sync:enqueue-sync', (event, job) => replySync(event, () => enqueueJob(job)));
  ipcMain.handle('sync:enqueue', (_event, job) => enqueueJob(job));

  ipcMain.handle('sync:pending', (_event, limit = 100) => {
    return db.prepare(`
      SELECT id, entity, record_id, operation, payload, attempts, created_at, last_error
      FROM sync_queue ORDER BY id ASC LIMIT ?
    `).all(Math.max(1, Math.min(Number(limit) || 100, 500)));
  });

  ipcMain.handle('sync:complete', (_event, id) => {
    db.prepare('DELETE FROM sync_queue WHERE id=?').run(Number(id));
    return true;
  });

  ipcMain.handle('sync:fail', (_event, id, message) => {
    db.prepare('UPDATE sync_queue SET attempts=attempts+1, last_error=? WHERE id=?')
      .run(String(message || '').slice(0, 2000), Number(id));
    return true;
  });

  ipcMain.handle('printer:list', event => listPrinters(event.sender));
  ipcMain.handle('printer:print-html', (event, request) => printHtml(event.sender, request));

  ipcMain.handle('update:status', () => getUpdateState());
  ipcMain.handle('update:check', () => checkForUpdates());
  ipcMain.handle('update:install', async () => {
    createBackupIfNeeded();
    return installUpdate();
  });

  ipcMain.handle('backup:create', () => {
    createBackupIfNeeded();
    return true;
  });

  ipcMain.handle('app:paths', () => ({
    userData: app.getPath('userData'),
    database: dbPath,
    backups: backupDirPath(),
    version: app.getVersion()
  }));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#050914',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  app.setName('Loto Games');
  ensureDatabase();
  createBackupIfNeeded();
  registerIpc();
  createWindow();
  setupUpdater({ backupBeforeInstall: createPreUpdateBackup });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try {
    stopUpdater();
    createBackupIfNeeded();
    db?.close();
  } catch (error) {
    console.error('Error al cerrar SQLite:', error);
  }
});