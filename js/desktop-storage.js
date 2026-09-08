// ============================================
// LOTO GAMES - PERSISTENCIA LOCAL DE ESCRITORIO
// localStorage conserva compatibilidad con el frontend existente,
// mientras SQLite es la copia durable y la cola registra cambios para nube.
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  if (!desktop?.isDesktop) return;

  const AUDIT_ENTITY = 'auditoria_modificaciones';
  const MANAGED_COLLECTIONS = new Set([
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
  const AUDITED_COLLECTIONS = new Set([...MANAGED_COLLECTIONS].filter(key => key !== AUDIT_ENTITY));
  const SENSITIVE_AUDIT_FIELDS = new Set([
    'password', 'pin', 'password_hash', 'password_salt', 'pin_hash', 'pin_salt'
  ]);

  const storageProto = Storage.prototype;
  const nativeGet = storageProto.getItem;
  const nativeSet = storageProto.setItem;
  const nativeRemove = storageProto.removeItem;
  const nativeClear = storageProto.clear;

  function parseArray(raw) {
    if (!raw) return [];
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function byId(items) {
    const map = new Map();
    for (const item of items) {
      if (!item || item.id === undefined || item.id === null) continue;
      map.set(String(item.id), item);
    }
    return map;
  }

  function persistSetSync(key, value) {
    if (typeof desktop.storage.setSync === 'function') {
      desktop.storage.setSync(key, value);
      return;
    }
    desktop.storage.set(key, value).catch(error => console.error('SQLite set falló:', error));
  }

  function persistRemoveSync(key) {
    if (typeof desktop.storage.removeSync === 'function') {
      desktop.storage.removeSync(key);
      return;
    }
    desktop.storage.remove(key).catch(error => console.error('SQLite remove falló:', error));
  }

  function enqueueSync(job) {
    try {
      if (typeof desktop.sync.enqueueSync === 'function') {
        desktop.sync.enqueueSync(job);
      } else {
        desktop.sync.enqueue(job).catch(error => console.warn('No se pudo encolar sincronización:', error));
      }
    } catch (error) {
      console.warn('Dato local guardado, pero no se pudo encolar para nube:', error);
    }
  }

  function buildCollectionDiff(entity, previousRaw, nextRaw) {
    if (!MANAGED_COLLECTIONS.has(entity)) return [];
    const before = byId(parseArray(previousRaw));
    const after = byId(parseArray(nextRaw));
    const jobs = [];

    for (const [id, record] of after) {
      const previous = before.get(id);
      if (!previous || JSON.stringify(previous) !== JSON.stringify(record)) {
        jobs.push({ entity, recordId: id, operation: 'upsert', payload: record });
      }
    }

    for (const id of before.keys()) {
      if (!after.has(id)) {
        jobs.push({ entity, recordId: id, operation: 'delete' });
      }
    }

    return jobs;
  }

  function queueCollectionDiff(entity, previousRaw, nextRaw) {
    for (const job of buildCollectionDiff(entity, previousRaw, nextRaw)) {
      enqueueSync(job);
    }
  }

  function currentActor() {
    const user = window.getUsuarioActual?.() || window.usuarioActual || window.AuthV2?.getSession?.();
    if (!user?.id) return null;
    return {
      id: String(user.id),
      nombre: String(user.nombre || 'Usuario'),
      email: String(user.email || '').trim().toLowerCase(),
      rol: String(user.rol || '')
    };
  }

  function safeAuditValue(key, value, mode = 'snapshot') {
    if (!SENSITIVE_AUDIT_FIELDS.has(key)) return value;
    if (value === null || value === undefined || value === '') return null;
    return mode === 'after' ? '[actualizada]' : '[protegida]';
  }

  function sanitizeRecord(record, mode = 'snapshot') {
    if (!record || typeof record !== 'object') return {};
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, safeAuditValue(key, value, mode)])
    );
  }

  function buildChangedSnapshot(previous, next) {
    const keys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);
    const campos = [];
    const antes = {};
    const despues = {};

    for (const key of keys) {
      const oldValue = previous?.[key];
      const newValue = next?.[key];
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
      campos.push(key);
      antes[key] = safeAuditValue(key, oldValue, 'before');
      despues[key] = safeAuditValue(key, newValue, 'after');
    }

    return { campos, antes, despues };
  }

  let fallbackAuditSequence = 0;
  function auditId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    fallbackAuditSequence = (fallbackAuditSequence + 1) % 100000;
    return `audit-${Date.now()}-${fallbackAuditSequence}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function buildAuditEntries(entity, previousRaw, nextRaw) {
    if (!AUDITED_COLLECTIONS.has(entity)) return [];
    const actor = currentActor();
    if (!actor) return [];

    const before = byId(parseArray(previousRaw));
    const after = byId(parseArray(nextRaw));
    const fecha = new Date().toISOString();
    const entries = [];

    for (const [id, record] of after) {
      const previous = before.get(id);
      if (!previous) {
        const despues = sanitizeRecord(record, 'after');
        entries.push({
          id: auditId(), entidad: entity, registro_id: id, accion: 'crear',
          usuario_id: actor.id, usuario_nombre: actor.nombre, usuario_email: actor.email,
          usuario_rol: actor.rol, fecha,
          cambios: { campos: Object.keys(despues), antes: {}, despues },
          created_at: fecha
        });
        continue;
      }

      if (JSON.stringify(previous) !== JSON.stringify(record)) {
        const cambios = buildChangedSnapshot(previous, record);
        entries.push({
          id: auditId(), entidad: entity, registro_id: id, accion: 'editar',
          usuario_id: actor.id, usuario_nombre: actor.nombre, usuario_email: actor.email,
          usuario_rol: actor.rol, fecha, cambios, created_at: fecha
        });
      }
    }

    for (const [id, previous] of before) {
      if (after.has(id)) continue;
      const antes = sanitizeRecord(previous, 'before');
      entries.push({
        id: auditId(), entidad: entity, registro_id: id, accion: 'eliminar',
        usuario_id: actor.id, usuario_nombre: actor.nombre, usuario_email: actor.email,
        usuario_rol: actor.rol, fecha,
        cambios: { campos: Object.keys(antes), antes, despues: {} },
        created_at: fecha
      });
    }

    return entries;
  }

  function commitManagedCollectionSync(entity, value, previousRaw) {
    if (typeof desktop.storage.commitCollectionSync !== 'function') {
      throw new Error('Preload incompatible: falta el commit transaccional de Loto Games');
    }

    const jobs = buildCollectionDiff(entity, previousRaw, value);
    const auditEntries = buildAuditEntries(entity, previousRaw, value);
    let auditValue = null;
    let auditJobs = [];

    if (auditEntries.length) {
      const previousAuditRaw = nativeGet.call(window.localStorage, AUDIT_ENTITY);
      const auditRows = parseArray(previousAuditRaw);
      auditRows.push(...auditEntries);
      auditValue = JSON.stringify(auditRows);
      auditJobs = buildCollectionDiff(AUDIT_ENTITY, previousAuditRaw, auditValue);
    }

    desktop.storage.commitCollectionSync(entity, value, jobs, auditValue, auditJobs);
    if (auditValue !== null) nativeSet.call(window.localStorage, AUDIT_ENTITY, auditValue);
  }

  const sqliteSnapshot = desktop.storage.loadAll() || {};
  const sqliteKeys = Object.keys(sqliteSnapshot);

  if (sqliteKeys.length > 0) {
    for (const [key, value] of Object.entries(sqliteSnapshot)) {
      nativeSet.call(window.localStorage, key, value);
    }
    console.log(`✅ Persistencia local: restauradas ${sqliteKeys.length} claves desde SQLite`);
  } else {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      const value = nativeGet.call(window.localStorage, key);
      if (key === null || value === null) continue;

      if (MANAGED_COLLECTIONS.has(key)) {
        commitManagedCollectionSync(key, value, null);
      } else {
        persistSetSync(key, value);
      }
    }
    console.log('✅ Persistencia local: SQLite inicializado desde el perfil actual');
  }

  storageProto.setItem = function (key, value) {
    if (this !== window.localStorage) return nativeSet.call(this, key, value);

    const k = String(key);
    const v = String(value);
    const previous = nativeGet.call(this, k);

    nativeSet.call(this, k, v);
    try {
      if (MANAGED_COLLECTIONS.has(k)) commitManagedCollectionSync(k, v, previous);
      else persistSetSync(k, v);
    } catch (error) {
      if (previous === null) nativeRemove.call(this, k);
      else nativeSet.call(this, k, previous);
      throw error;
    }
  };

  storageProto.removeItem = function (key) {
    if (this !== window.localStorage) return nativeRemove.call(this, key);

    const k = String(key);
    if (k === AUDIT_ENTITY) {
      throw new Error('El historial de auditoría no se puede eliminar desde la aplicación');
    }

    const previous = nativeGet.call(this, k);
    nativeRemove.call(this, k);

    try {
      if (MANAGED_COLLECTIONS.has(k)) commitManagedCollectionSync(k, '[]', previous);
      else persistRemoveSync(k);
    } catch (error) {
      if (previous !== null) nativeSet.call(this, k, previous);
      throw error;
    }
  };

  storageProto.clear = function () {
    if (this !== window.localStorage) return nativeClear.call(this);
    throw new Error('El borrado global del almacenamiento está bloqueado para proteger datos y auditoría');
  };

  function applyRemoteCollection(entity, records) {
    if (!MANAGED_COLLECTIONS.has(entity)) {
      throw new Error(`Colección remota no permitida: ${entity}`);
    }

    const normalized = Array.isArray(records) ? records : [];
    const nextRaw = JSON.stringify(normalized);
    const previous = nativeGet.call(window.localStorage, entity);
    if (previous === nextRaw) return false;

    nativeSet.call(window.localStorage, entity, nextRaw);
    try {
      persistSetSync(entity, nextRaw);
    } catch (error) {
      if (previous === null) nativeRemove.call(window.localStorage, entity);
      else nativeSet.call(window.localStorage, entity, previous);
      throw error;
    }

    return true;
  }

  window.LotoDesktopStorage = {
    managedCollections: [...MANAGED_COLLECTIONS],
    getCollection(entity) {
      if (!MANAGED_COLLECTIONS.has(entity)) return [];
      return parseArray(nativeGet.call(window.localStorage, entity));
    },
    applyRemoteCollection,
    async createBackup() {
      return desktop.backup.create();
    }
  };

  console.log('✅ SQLite local + cola transaccional + auditoría de usuario activos');
})();
