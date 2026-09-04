// ============================================
// LOTO GAMES - PERSISTENCIA LOCAL DE ESCRITORIO
// localStorage conserva compatibilidad con el frontend existente,
// mientras SQLite es la copia durable y la cola registra cambios para nube.
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  if (!desktop?.isDesktop) return;

  const MANAGED_COLLECTIONS = new Set([
    'productos',
    'ventas',
    'clientes',
    'usuarios',
    'servicios',
    'traspasos',
    'cuentas_plaza_movimientos',
    'movimientos_inventario'
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

  function persistClearSync() {
    if (typeof desktop.storage.clearSync === 'function') {
      desktop.storage.clearSync();
      return;
    }
    desktop.storage.clear().catch(error => console.error('SQLite clear falló:', error));
  }

  function enqueueSync(job) {
    try {
      if (typeof desktop.sync.enqueueSync === 'function') {
        desktop.sync.enqueueSync(job);
      } else {
        desktop.sync.enqueue(job).catch(error => console.warn('No se pudo encolar sincronización:', error));
      }
    } catch (error) {
      // El dato ya quedó guardado localmente; una falla de cola no debe perder la operación.
      console.warn('Dato local guardado, pero no se pudo encolar para nube:', error);
    }
  }

  function queueCollectionDiff(entity, previousRaw, nextRaw) {
    if (!MANAGED_COLLECTIONS.has(entity)) return;
    const before = byId(parseArray(previousRaw));
    const after = byId(parseArray(nextRaw));

    for (const [id, record] of after) {
      const previous = before.get(id);
      if (!previous || JSON.stringify(previous) !== JSON.stringify(record)) {
        enqueueSync({ entity, recordId: id, operation: 'upsert', payload: record });
      }
    }

    for (const id of before.keys()) {
      if (!after.has(id)) {
        enqueueSync({ entity, recordId: id, operation: 'delete' });
      }
    }
  }

  // SQLite es la referencia persistente al iniciar la aplicación.
  // En una primera ejecución sin SQLite, importamos cualquier perfil local existente.
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
      if (key !== null && value !== null) persistSetSync(key, value);
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
      persistSetSync(k, v);
    } catch (error) {
      // Si SQLite falla, restauramos localStorage para no reportar un guardado que no fue durable.
      if (previous === null) nativeRemove.call(this, k);
      else nativeSet.call(this, k, previous);
      throw error;
    }

    queueCollectionDiff(k, previous, v);
  };

  storageProto.removeItem = function (key) {
    if (this !== window.localStorage) return nativeRemove.call(this, key);

    const k = String(key);
    const previous = nativeGet.call(this, k);
    nativeRemove.call(this, k);

    try {
      persistRemoveSync(k);
    } catch (error) {
      if (previous !== null) nativeSet.call(this, k, previous);
      throw error;
    }

    if (MANAGED_COLLECTIONS.has(k)) queueCollectionDiff(k, previous, '[]');
  };

  storageProto.clear = function () {
    if (this !== window.localStorage) return nativeClear.call(this);

    const snapshot = {};
    for (let i = 0; i < this.length; i += 1) {
      const key = this.key(i);
      if (key !== null) snapshot[key] = nativeGet.call(this, key);
    }

    nativeClear.call(this);
    try {
      persistClearSync();
    } catch (error) {
      for (const [key, value] of Object.entries(snapshot)) {
        if (value !== null) nativeSet.call(this, key, value);
      }
      throw error;
    }

    for (const key of MANAGED_COLLECTIONS) {
      queueCollectionDiff(key, snapshot[key], '[]');
    }
  };

  function applyRemoteCollection(entity, records) {
    if (!MANAGED_COLLECTIONS.has(entity)) {
      throw new Error(`Colección remota no permitida: ${entity}`);
    }

    const normalized = Array.isArray(records) ? records : [];
    const nextRaw = JSON.stringify(normalized);
    const previous = nativeGet.call(window.localStorage, entity);
    if (previous === nextRaw) return false;

    // Importante: esta ruta NO usa localStorage.setItem(), para no reencolar como cambios locales.
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

  console.log('✅ SQLite local activo como persistencia durable de escritorio');
})();
