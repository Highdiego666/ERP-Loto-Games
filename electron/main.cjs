const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

let db;
let dataDir;
let dbPath;

const ALLOWED_SYNC_ENTITIES = new Set([
  'productos',
  'ventas',
  'clientes',
  'usuarios',
  'servicios',
  'traspasos',
  'cuentas_plaza_movimientos',
  'movimientos_inventario'
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

function replySync(event, fn) {
  try {
    fn();
    event.returnValue = { ok: true };
  } catch (error) {
    event.returnValue = { ok: false, error: error?.message || String(error) };
  }
}

function createBackupIfNeeded() {
  if (!db || !dbPath || !fs.existsSync(dbPath)) return;
  const backupDir = path.join(app.getPath('userData'), 'backups');
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

  ipcMain.handle('backup:create', () => {
    createBackupIfNeeded();
    return true;
  });

  ipcMain.handle('app:paths', () => ({
    userData: app.getPath('userData'),
    database: dbPath,
    backups: path.join(app.getPath('userData'), 'backups')
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try {
    createBackupIfNeeded();
    db?.close();
  } catch (error) {
    console.error('Error al cerrar SQLite:', error);
  }
});
