'use strict';

const { DatabaseSync, backup } = require('node:sqlite');
const fs = require('node:fs/promises');
const path = require('node:path');

const ENTITIES = new Set([
  'productos',
  'ventas',
  'clientes',
  'servicios',
  'traspasos',
  'cuentas_plaza_movimientos',
  'usuarios'
]);

const MAX_RECORD_BYTES = 5 * 1024 * 1024;
let lastGeneratedId = 0;

function assertEntity(entity) {
  if (!ENTITIES.has(entity)) throw new Error(`Entidad local no permitida: ${entity}`);
  return entity;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function generateNumericId() {
  const candidate = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  lastGeneratedId = Math.max(candidate, lastGeneratedId + 1);
  if (!Number.isSafeInteger(lastGeneratedId)) {
    throw new Error('No se pudo generar un identificador local seguro.');
  }
  return lastGeneratedId;
}

function safeJson(payload) {
  const text = JSON.stringify(payload ?? {});
  if (Buffer.byteLength(text, 'utf8') > MAX_RECORD_BYTES) {
    throw new Error('El registro excede el límite local de 5 MB.');
  }
  return text;
}

class LocalStore {
  constructor({ dbPath, backupDir }) {
    this.dbPath = dbPath;
    this.backupDir = backupDir;
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS records (
        entity TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        sync_state TEXT NOT NULL DEFAULT 'synced' CHECK(sync_state IN ('synced','pending','error')),
        last_error TEXT,
        PRIMARY KEY (entity, record_id)
      );

      CREATE INDEX IF NOT EXISTS idx_records_entity_active
        ON records(entity, deleted, updated_at);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
        payload TEXT,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_record
        ON sync_queue(entity, record_id);

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  newId() {
    return generateNumericId();
  }

  isEmpty() {
    const row = this.db.prepare('SELECT COUNT(*) AS total FROM records').get();
    return Number(row?.total || 0) === 0;
  }

  list(entity, { includeDeleted = false } = {}) {
    assertEntity(entity);
    const rows = this.db.prepare(
      `SELECT payload FROM records WHERE entity = ? ${includeDeleted ? '' : 'AND deleted = 0'} ORDER BY updated_at DESC`
    ).all(entity);
    return rows.map(row => JSON.parse(row.payload));
  }

  get(entity, id, { includeDeleted = false } = {}) {
    assertEntity(entity);
    const recordId = normalizeId(id);
    if (!recordId) return null;
    const row = this.db.prepare(
      `SELECT payload, deleted FROM records WHERE entity = ? AND record_id = ?`
    ).get(entity, recordId);
    if (!row || (!includeDeleted && Number(row.deleted) === 1)) return null;
    return JSON.parse(row.payload);
  }

  _enqueue(entity, recordId, operation, payload) {
    const now = new Date().toISOString();
    this.db.prepare('DELETE FROM sync_queue WHERE entity = ? AND record_id = ?').run(entity, recordId);
    this.db.prepare(`
      INSERT INTO sync_queue(entity, record_id, operation, payload, created_at, attempts, last_error)
      VALUES(?, ?, ?, ?, ?, 0, NULL)
    `).run(entity, recordId, operation, payload == null ? null : safeJson(payload), now);
    this.db.prepare(`
      UPDATE records SET sync_state = 'pending', last_error = NULL WHERE entity = ? AND record_id = ?
    `).run(entity, recordId);
  }

  _put(entity, payload, { queue = true, syncState = 'synced' } = {}) {
    assertEntity(entity);
    const row = clone(payload) || {};
    if (row.id === null || row.id === undefined || row.id === '') row.id = this.newId();
    const recordId = normalizeId(row.id);
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO records(entity, record_id, payload, updated_at, deleted, sync_state, last_error)
      VALUES(?, ?, ?, ?, 0, ?, NULL)
      ON CONFLICT(entity, record_id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at,
        deleted = 0,
        sync_state = excluded.sync_state,
        last_error = NULL
    `).run(entity, recordId, safeJson(row), now, queue ? 'pending' : syncState);
    if (queue) this._enqueue(entity, recordId, 'upsert', row);
    return row;
  }

  insert(entity, payload) {
    return this._put(entity, payload, { queue: true });
  }

  update(entity, id, patch) {
    assertEntity(entity);
    const current = this.get(entity, id, { includeDeleted: true });
    if (!current) throw new Error(`No existe ${entity}:${id}`);
    const row = { ...current, ...clone(patch), id: current.id };
    return this._put(entity, row, { queue: true });
  }

  remove(entity, id) {
    assertEntity(entity);
    const current = this.get(entity, id, { includeDeleted: true });
    if (!current) return false;
    const recordId = normalizeId(current.id);
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE records
      SET deleted = 1, updated_at = ?, sync_state = 'pending', last_error = NULL
      WHERE entity = ? AND record_id = ?
    `).run(now, entity, recordId);
    this._enqueue(entity, recordId, 'delete', null);
    return true;
  }

  batch(operations) {
    if (!Array.isArray(operations) || operations.length === 0) return [];
    if (operations.length > 200) throw new Error('La transacción excede 200 operaciones.');
    const results = [];
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const operation of operations) {
        const { type, entity } = operation || {};
        assertEntity(entity);
        if (type === 'insert') results.push(this.insert(entity, operation.payload || {}));
        else if (type === 'update') results.push(this.update(entity, operation.id, operation.patch || {}));
        else if (type === 'delete') results.push(this.remove(entity, operation.id));
        else throw new Error(`Operación local no permitida: ${type}`);
      }
      this.db.exec('COMMIT');
      return results;
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }

  importLegacy(tables) {
    if (!this.isEmpty() || !tables || typeof tables !== 'object') {
      return { imported: false, rows: 0 };
    }
    let count = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const entity of ENTITIES) {
        const rows = Array.isArray(tables[entity]) ? tables[entity] : [];
        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;
          this._put(entity, row, { queue: false, syncState: 'synced' });
          count += 1;
        }
      }
      this.db.exec('COMMIT');
      return { imported: count > 0, rows: count };
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }

  pending(limit = 100) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
    return this.db.prepare(`
      SELECT id, entity, record_id, operation, payload, created_at, attempts, last_error
      FROM sync_queue ORDER BY id ASC LIMIT ?
    `).all(safeLimit).map(row => ({
      ...row,
      payload: row.payload ? JSON.parse(row.payload) : null
    }));
  }

  markSyncSuccess(queueId) {
    const item = this.db.prepare('SELECT * FROM sync_queue WHERE id = ?').get(queueId);
    if (!item) return false;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (item.operation === 'delete') {
        this.db.prepare('DELETE FROM records WHERE entity = ? AND record_id = ?').run(item.entity, item.record_id);
      } else {
        this.db.prepare(`
          UPDATE records SET sync_state = 'synced', last_error = NULL
          WHERE entity = ? AND record_id = ?
        `).run(item.entity, item.record_id);
      }
      this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(queueId);
      this.db.exec('COMMIT');
      return true;
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }

  markSyncError(queueId, message) {
    const safeMessage = String(message || 'Error de sincronización').slice(0, 1000);
    const item = this.db.prepare('SELECT entity, record_id FROM sync_queue WHERE id = ?').get(queueId);
    if (!item) return false;
    this.db.prepare(`
      UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?
    `).run(safeMessage, queueId);
    this.db.prepare(`
      UPDATE records SET sync_state = 'error', last_error = ? WHERE entity = ? AND record_id = ?
    `).run(safeMessage, item.entity, item.record_id);
    return true;
  }

  mergeCloud(entity, rows) {
    assertEntity(entity);
    const cloudRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    const cloudIds = new Set(cloudRows.map(row => normalizeId(row.id)).filter(Boolean));
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const row of cloudRows) {
        const recordId = normalizeId(row.id);
        if (!recordId) continue;
        const pending = this.db.prepare(
          'SELECT id FROM sync_queue WHERE entity = ? AND record_id = ? LIMIT 1'
        ).get(entity, recordId);
        if (pending) continue;
        this._put(entity, row, { queue: false, syncState: 'synced' });
      }

      const synced = this.db.prepare(`
        SELECT record_id FROM records WHERE entity = ? AND sync_state = 'synced'
      `).all(entity);
      for (const local of synced) {
        if (!cloudIds.has(local.record_id)) {
          this.db.prepare('DELETE FROM records WHERE entity = ? AND record_id = ?').run(entity, local.record_id);
        }
      }
      this.db.exec('COMMIT');
      return { merged: cloudRows.length };
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }

  setMeta(key, value) {
    this.db.prepare(`
      INSERT INTO meta(key, value) VALUES(?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(key), value == null ? null : String(value));
  }

  getMeta(key) {
    return this.db.prepare('SELECT value FROM meta WHERE key = ?').get(String(key))?.value ?? null;
  }

  status() {
    const pending = Number(this.db.prepare('SELECT COUNT(*) AS total FROM sync_queue').get()?.total || 0);
    const errors = Number(this.db.prepare("SELECT COUNT(*) AS total FROM sync_queue WHERE last_error IS NOT NULL").get()?.total || 0);
    const records = Number(this.db.prepare('SELECT COUNT(*) AS total FROM records WHERE deleted = 0').get()?.total || 0);
    return {
      pending,
      errors,
      records,
      lastSyncAt: this.getMeta('last_sync_at'),
      lastBackupAt: this.getMeta('last_backup_at')
    };
  }

  async createBackup() {
    await fs.mkdir(this.backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(this.backupDir, `loto-games-${stamp}.sqlite3`);
    await backup(this.db, target);
    this.setMeta('last_backup_at', new Date().toISOString());
    await this.pruneBackups(30);
    return { ok: true, path: target };
  }

  async maybeDailyBackup() {
    const previous = Date.parse(this.getMeta('last_backup_at') || '');
    if (Number.isFinite(previous) && Date.now() - previous < 24 * 60 * 60 * 1000) {
      return { ok: true, skipped: true };
    }
    return this.createBackup();
  }

  async pruneBackups(keep = 30) {
    try {
      const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
      const files = [];
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.sqlite3')) continue;
        const fullPath = path.join(this.backupDir, entry.name);
        const stat = await fs.stat(fullPath);
        files.push({ path: fullPath, mtimeMs: stat.mtimeMs });
      }
      files.sort((a, b) => b.mtimeMs - a.mtimeMs);
      await Promise.all(files.slice(keep).map(file => fs.unlink(file.path).catch(() => {})));
    } catch (_) {}
  }

  close() {
    this.db.close();
  }
}

module.exports = { LocalStore, ENTITIES: [...ENTITIES] };
