// ============================================
// LOTO GAMES POS - DESKTOP RUNTIME
// Espejo local persistente + modo seguro sin conexión + actualizaciones
// ============================================

(function () {
  'use strict';

  if (!window.lotoDesktop?.isDesktop || !window.DB) return;

  const db = window.DB;
  const localKeys = {
    productos: 'productos',
    ventas: 'ventas',
    clientes: 'clientes',
    servicios: 'servicios',
    traspasos: 'traspasos',
    cuentas_plaza_movimientos: 'cuentas_plaza_movimientos',
    usuarios: 'usuarios'
  };

  const readMethods = {
    getProductos: 'productos',
    getVentas: 'ventas',
    getClientes: 'clientes',
    getServicios: 'servicios',
    getTraspasos: 'traspasos',
    getMovimientosPlaza: 'cuentas_plaza_movimientos',
    getUsuarios: 'usuarios'
  };

  const mutationEffects = {
    saveProducto: ['productos'],
    updateProducto: ['productos'],
    deleteProducto: ['productos'],
    saveCliente: ['clientes'],
    updateCliente: ['clientes'],
    deleteCliente: ['clientes'],
    saveServicio: ['servicios'],
    updateServicio: ['servicios'],
    deleteServicio: ['servicios'],
    saveUsuario: ['usuarios'],
    updateUsuario: ['usuarios'],
    deleteUsuario: ['usuarios'],
    registrarVenta: ['ventas', 'productos', 'cuentas_plaza_movimientos'],
    registrarMovimientoPlaza: ['cuentas_plaza_movimientos'],
    saveTraspasoV2: ['traspasos']
  };

  const state = {
    cloud: 'checking',
    cache: { version: 1, updatedAt: null, tables: {} },
    appInfo: null,
    update: 'idle',
    updateVersion: null
  };

  let persistTimer = null;

  function sanitizeUsers(rows) {
    return (rows || []).map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      estado: u.estado,
      privilegios: Array.isArray(u.privilegios) ? u.privilegios : []
    }));
  }

  function sanitizeTable(table, rows) {
    return table === 'usuarios' ? sanitizeUsers(rows) : rows;
  }

  function cacheRows(table) {
    const rows = state.cache?.tables?.[table];
    return Array.isArray(rows) ? rows : null;
  }

  function hydrateLocalStorage() {
    Object.entries(localKeys).forEach(([table, key]) => {
      const rows = cacheRows(table);
      if (rows) localStorage.setItem(key, JSON.stringify(rows));
    });
  }

  function persistSoon() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
      try {
        state.cache.updatedAt = new Date().toISOString();
        await window.lotoDesktop.writeLocalCache(state.cache);
      } catch (error) {
        console.warn('No se pudo escribir la copia local:', error.message);
      }
    }, 180);
  }

  function mirror(table, rows) {
    if (!Array.isArray(rows)) return;
    const safeRows = sanitizeTable(table, rows);
    state.cache.tables[table] = safeRows;
    if (localKeys[table]) localStorage.setItem(localKeys[table], JSON.stringify(safeRows));
    persistSoon();
  }

  function paintStatus() {
    const online = state.cloud === 'online';
    const checking = state.cloud === 'checking';
    const label = checking
      ? 'Verificando nube…'
      : online
        ? 'Nube + copia local'
        : 'Sin conexión · solo consulta';

    document.querySelectorAll('#dbStatusSidebar, #dbStatusTop').forEach(el => {
      if (!el) return;
      el.classList.remove('db-status-online', 'db-status-offline', 'db-status-checking');
      el.classList.add(checking ? 'db-status-checking' : online ? 'db-status-online' : 'db-status-offline');
      const span = el.querySelector('span:last-child');
      if (span) span.textContent = label;
      else el.textContent = label;
    });

    const version = document.getElementById('desktopVersionBadge');
    if (version && state.appInfo) version.textContent = `Windows · v${state.appInfo.version}`;
  }

  async function probeCloud() {
    if (!window.supabase || !navigator.onLine) {
      state.cloud = 'offline';
      paintStatus();
      return false;
    }

    state.cloud = 'checking';
    paintStatus();
    try {
      const { error } = await window.supabase.from('productos').select('id').limit(1);
      if (error) throw error;
      state.cloud = 'online';
      paintStatus();
      return true;
    } catch (error) {
      console.warn('Supabase no disponible:', error.message);
      state.cloud = 'offline';
      paintStatus();
      return false;
    }
  }

  async function ensureCloudForWrite() {
    if (state.cloud === 'online') return true;
    if (await probeCloud()) return true;
    throw new Error('Sin conexión con Supabase. Por seguridad, el escritorio conserva la última copia local en modo consulta y no permite crear o modificar datos hasta recuperar conexión.');
  }

  function wrapReads() {
    Object.entries(readMethods).forEach(([method, table]) => {
      const original = db[method];
      if (typeof original !== 'function' || original.__desktopWrapped) return;

      const wrapped = async function (...args) {
        try {
          const result = await original.apply(db, args);
          if (Array.isArray(result) && state.cloud === 'online') mirror(table, result);
          return result;
        } catch (error) {
          const cached = cacheRows(table);
          if (cached) {
            state.cloud = 'offline';
            paintStatus();
            console.warn(`Usando copia local de ${table}:`, error.message);
            if (table === 'cuentas_plaza_movimientos' && args[0] !== undefined && args[0] !== null) {
              return cached.filter(r => String(r.cliente_id) === String(args[0]));
            }
            return cached;
          }
          throw error;
        }
      };
      wrapped.__desktopWrapped = true;
      db[method] = wrapped;
    });
  }

  const tableToRead = {
    productos: 'getProductos',
    ventas: 'getVentas',
    clientes: 'getClientes',
    servicios: 'getServicios',
    traspasos: 'getTraspasos',
    cuentas_plaza_movimientos: 'getMovimientosPlaza',
    usuarios: 'getUsuarios'
  };

  async function refreshTables(tables) {
    for (const table of tables) {
      const method = tableToRead[table];
      if (typeof db[method] !== 'function') continue;
      try {
        const rows = await db[method]();
        if (Array.isArray(rows)) mirror(table, rows);
      } catch (error) {
        console.warn(`No se pudo refrescar ${table}:`, error.message);
      }
    }
  }

  function wrapMutations() {
    Object.entries(mutationEffects).forEach(([method, effects]) => {
      const original = db[method];
      if (typeof original !== 'function' || original.__desktopWrapped) return;

      const wrapped = async function (...args) {
        await ensureCloudForWrite();
        const result = await original.apply(db, args);
        await refreshTables(effects);
        return result;
      };
      wrapped.__desktopWrapped = true;
      db[method] = wrapped;
    });
  }

  async function refreshAll() {
    if (!await probeCloud()) return false;
    await refreshTables(['productos', 'ventas', 'clientes', 'servicios', 'traspasos', 'cuentas_plaza_movimientos', 'usuarios']);
    return true;
  }

  function installDesktopBadge() {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer || document.getElementById('desktopVersionBadge')) return;
    const block = document.createElement('div');
    block.style.cssText = 'margin:10px 0 12px;padding:9px 10px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.02);font-size:11px;color:var(--text-muted);';
    block.innerHTML = '<div id="desktopVersionBadge">Windows</div><button id="desktopUpdateButton" type="button" style="margin-top:7px;width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--bg-dark);color:var(--text);cursor:pointer;">Buscar actualización</button>';
    footer.prepend(block);

    document.getElementById('desktopUpdateButton')?.addEventListener('click', async () => {
      const btn = document.getElementById('desktopUpdateButton');
      btn.disabled = true;
      btn.textContent = 'Buscando…';
      await window.lotoDesktop.checkForUpdates();
      setTimeout(() => {
        btn.disabled = false;
        if (state.update !== 'downloaded') btn.textContent = 'Buscar actualización';
      }, 2500);
    });
  }

  function bindUpdater() {
    window.lotoDesktop.onUpdateStatus(payload => {
      state.update = payload?.status || 'idle';
      state.updateVersion = payload?.version || null;
      const btn = document.getElementById('desktopUpdateButton');
      if (!btn) return;

      if (state.update === 'available') btn.textContent = `Descargando v${state.updateVersion}…`;
      else if (state.update === 'downloading') btn.textContent = `Descargando ${payload.percent || 0}%`;
      else if (state.update === 'current') btn.textContent = 'Aplicación actualizada';
      else if (state.update === 'downloaded') {
        btn.disabled = false;
        btn.textContent = `Instalar v${state.updateVersion}`;
        btn.onclick = () => window.lotoDesktop.installUpdate();
      } else if (state.update === 'error') {
        btn.disabled = false;
        btn.textContent = 'Reintentar actualización';
      }
    });
  }

  async function init() {
    try {
      state.appInfo = await window.lotoDesktop.getAppInfo();
      const saved = await window.lotoDesktop.readLocalCache();
      if (saved?.tables && typeof saved.tables === 'object') state.cache = saved;
    } catch (error) {
      console.warn('No se pudo inicializar el almacenamiento local:', error.message);
    }

    hydrateLocalStorage();
    wrapReads();
    wrapMutations();

    document.addEventListener('DOMContentLoaded', () => {
      installDesktopBadge();
      paintStatus();
      bindUpdater();
      setTimeout(refreshAll, 700);
    });

    window.addEventListener('online', () => refreshAll());
    window.addEventListener('offline', () => {
      state.cloud = 'offline';
      paintStatus();
    });

    setInterval(probeCloud, 60000);
    console.log('✅ Desktop Runtime activo: copia local persistente + Supabase + actualizaciones');
  }

  init();
})();
