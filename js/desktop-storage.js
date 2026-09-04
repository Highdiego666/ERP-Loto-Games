// ============================================
// LOTO GAMES - PERSISTENCIA LOCAL DE ESCRITORIO
// localStorage sigue siendo la API de compatibilidad del frontend,
// pero cada cambio se replica en SQLite mediante el preload seguro.
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

  function queueCollectionDiff(entity, previousRaw, nextRaw) {
    if (!MANAGED_COLLECTIONS.has(entity)) return;
    const before = byId(parseArray(previousRaw));
    const after = byId(parseArray(nextRaw));

    for (const [id, record] of after) {
      const previous = before.get(id);
      if (!previous || JSON.stringify(previous) !== JSON.stringify(record)) {
        desktop.sync.enqueue({ entity, recordId: id, operation: 'upsert', payload: record })
          .catch(error => console.warn('No se pudo encolar sincronización:', error));
      }
    }

    for (const id of before.keys()) {
      if (!after.has(id)) {
        desktop.sync.enqueue({ entity, recordId: id, operation: 'delete' })
          .catch(error => console.warn('No se pudo encolar eliminación:', error));
      }
    }
  }

  // SQLite es la copia persistente de referencia del cliente de escritorio.
  // En primera ejecución, si SQLite está vacío, importamos el perfil local existente.
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
      if (key !== null && value !== null) desktop.storage.set(key, value).catch(() => {});
    }
    console.log('✅ Persistencia local: SQLite inicializado desde el perfil actual');
  }

  storageProto.setItem = function (key, value) {
    if (this !== window.localStorage) return nativeSet.call(this, key, value);
    const k = String(key);
    const v = String(value);
    const previous = nativeGet.call(this, k);
    nativeSet.call(this, k, v);
    desktop.storage.set(k, v).catch(error => console.warn('SQLite set falló:', error));
    queueCollectionDiff(k, previous, v);
  };

  storageProto.removeItem = function (key) {
    if (this !== window.localStorage) return nativeRemove.call(this, key);
    const k = String(key);
    const previous = nativeGet.call(this, k);
    nativeRemove.call(this, k);
    desktop.storage.remove(k).catch(error => console.warn('SQLite remove falló:', error));
    if (MANAGED_COLLECTIONS.has(k)) queueCollectionDiff(k, previous, '[]');
  };

  storageProto.clear = function () {
    if (this !== window.localStorage) return nativeClear.call(this);
    const previous = {};
    for (const key of MANAGED_COLLECTIONS) previous[key] = nativeGet.call(this, key);
    nativeClear.call(this);
    desktop.storage.clear().catch(error => console.warn('SQLite clear falló:', error));
    for (const [key, raw] of Object.entries(previous)) queueCollectionDiff(key, raw, '[]');
  };

  window.LotoDesktopStorage = {
    managedCollections: [...MANAGED_COLLECTIONS],
    async createBackup() {
      return desktop.backup.create();
    }
  };

  console.log('✅ SQLite local activo como persistencia de escritorio');
})();
