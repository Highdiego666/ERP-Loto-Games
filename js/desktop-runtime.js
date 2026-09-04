// ============================================
// LOTO GAMES POS - DESKTOP RUNTIME V2
// SQLite local primero + sincronización diferida con Supabase
// ============================================

(function () {
  'use strict';

  if (!window.lotoDesktop?.isDesktop || !window.DB) return;

  const api = window.lotoDesktop;
  const db = window.DB;
  const round2 = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const numberOr = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const localKeys = {
    productos: 'productos',
    ventas: 'ventas',
    clientes: 'clientes',
    servicios: 'servicios',
    traspasos: 'traspasos',
    cuentas_plaza_movimientos: 'cuentas_plaza_movimientos',
    usuarios: 'usuarios'
  };

  const state = {
    appInfo: null,
    sync: { cloud: 'offline', syncing: false, pending: 0, errors: 0, records: 0 },
    update: 'idle',
    updateVersion: null
  };

  let firstUserCloudCheck = false;

  function readLegacyTables() {
    const tables = {};
    for (const [entity, key] of Object.entries(localKeys)) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(value)) tables[entity] = value;
      } catch (_) {
        tables[entity] = [];
      }
    }
    return tables;
  }

  function mirrorLegacy(entity, rows) {
    const key = localKeys[entity];
    if (!key || !Array.isArray(rows)) return;
    try { localStorage.setItem(key, JSON.stringify(rows)); } catch (_) {}
  }

  function sortByDate(rows, field = 'fecha') {
    return [...(rows || [])].sort((a, b) => {
      const aDate = Date.parse(a?.[field] || a?.created_at || 0) || 0;
      const bDate = Date.parse(b?.[field] || b?.created_at || 0) || 0;
      return bDate - aDate;
    });
  }

  function syncLabel() {
    const pending = Number(state.sync.pending || 0);
    if (state.sync.syncing) return pending ? `Local · sincronizando ${pending}` : 'Local · sincronizando…';
    if (state.sync.cloud === 'online' && pending === 0) return 'Local + Supabase ✓';
    if (state.sync.cloud === 'online' && pending > 0) return `Local · ${pending} pendiente${pending === 1 ? '' : 's'}`;
    if (pending > 0) return `Sin Internet · ${pending} pendiente${pending === 1 ? '' : 's'}`;
    return 'Modo local · sin Internet';
  }

  function paintStatus() {
    const label = syncLabel();
    const className = state.sync.syncing
      ? 'db-status-checking'
      : state.sync.cloud === 'online' && Number(state.sync.pending || 0) === 0
        ? 'db-status-ok'
        : 'db-status-demo';

    document.querySelectorAll('#dbStatusSidebar, #dbStatusTop').forEach(el => {
      if (!el) return;
      el.className = `db-status ${className}`;
      el.innerHTML = `<span class="db-dot"></span><span>${label}</span>`;
      const detail = [
        state.sync.lastSyncAt ? `Última sincronización: ${new Date(state.sync.lastSyncAt).toLocaleString('es-MX')}` : null,
        state.sync.lastError ? `Nube: ${state.sync.lastError}` : null
      ].filter(Boolean).join('\n');
      if (detail) el.title = detail;
    });

    const version = document.getElementById('desktopVersionBadge');
    if (version && state.appInfo) version.textContent = `Windows · v${state.appInfo.version}`;
    const syncButton = document.getElementById('desktopSyncButton');
    if (syncButton) syncButton.textContent = state.sync.syncing ? 'Sincronizando…' : syncLabel();
  }

  async function refreshStatus() {
    try {
      state.sync = { ...state.sync, ...(await api.getSyncStatus()) };
    } catch (_) {}
    paintStatus();
    return state.sync;
  }

  async function syncNow() {
    try {
      state.sync.syncing = true;
      paintStatus();
      const result = await api.syncNow();
      state.sync = { ...state.sync, ...result };
      return result;
    } catch (error) {
      state.sync = { ...state.sync, cloud: 'offline', syncing: false, lastError: error.message };
      return { ok: false, error: error.message };
    } finally {
      await refreshStatus();
    }
  }

  const ready = (async () => {
    try {
      state.appInfo = await api.getAppInfo();
      await api.db.importLegacy(readLegacyTables());
      await refreshStatus();
    } catch (error) {
      console.error('No se pudo inicializar el almacenamiento local de escritorio:', error);
    }
  })();

  function afterWrite() {
    refreshStatus();
  }

  async function list(entity) {
    await ready;
    const rows = await api.db.list(entity);
    mirrorLegacy(entity, rows);
    return rows;
  }

  async function get(entity, id) {
    await ready;
    return api.db.get(entity, id);
  }

  async function insert(entity, payload) {
    await ready;
    const row = await api.db.insert(entity, payload);
    afterWrite();
    return row;
  }

  async function update(entity, id, patch) {
    await ready;
    const row = await api.db.update(entity, id, patch);
    afterWrite();
    return row;
  }

  async function remove(entity, id) {
    await ready;
    const ok = await api.db.remove(entity, id);
    afterWrite();
    return ok;
  }

  db.getProductos = async function () {
    const rows = await list('productos');
    return [...rows].sort((a, b) => numberOr(b.id) - numberOr(a.id));
  };

  db.getProductoById = async function (id) {
    return get('productos', id);
  };

  db.saveProducto = async function (producto) {
    const baseCliente = round2(producto.precio_base_cliente ?? producto.precio_cliente ?? producto.precioCliente ?? producto.precio);
    const baseMayorista = round2(producto.precio_base_mayorista ?? producto.precio_mayorista ?? producto.precioMayorista ?? baseCliente);
    const basePlaza = round2(producto.precio_base_plaza ?? producto.precio_plaza ?? producto.precioPlaza ?? baseCliente);
    const publicPrice = base => typeof db.getPrecioPublicoDesdeBase === 'function' ? db.getPrecioPublicoDesdeBase(base) : round2(base * 1.05);

    return insert('productos', {
      nombre: producto.nombre,
      sku: producto.sku || '',
      codigo_barras: producto.codigo_barras ?? producto.codigoBarras ?? '',
      categoria: producto.categoria || '',
      tipo: producto.tipo || '',
      local: producto.local || '',
      stock: parseInt(producto.stock, 10) || 0,
      precio: publicPrice(baseCliente),
      precio_cliente: publicPrice(baseCliente),
      precio_mayorista: publicPrice(baseMayorista),
      precio_plaza: publicPrice(basePlaza),
      precio_base_cliente: baseCliente,
      precio_base_mayorista: baseMayorista,
      precio_base_plaza: basePlaza,
      precio_markup_5_aplicado: true,
      created_at: new Date().toISOString()
    });
  };

  db.updateProducto = async function (id, data) {
    const current = await db.getProductoById(id);
    if (!current) throw new Error('Producto no encontrado.');

    const patch = {};
    ['nombre','categoria','tipo','local','sku','codigo_barras'].forEach(key => {
      if (data[key] !== undefined) patch[key] = data[key];
    });
    if (data.codigoBarras !== undefined) patch.codigo_barras = data.codigoBarras;
    if (data.stock !== undefined) {
      const stock = parseInt(data.stock, 10);
      if (!Number.isFinite(stock) || stock < 0) throw new Error('Stock inválido.');
      patch.stock = stock;
    }

    const hasAnyPrice = [
      'precio_base_cliente','precio_base_mayorista','precio_base_plaza',
      'precio_cliente','precio_mayorista','precio_plaza',
      'precioCliente','precioMayorista','precioPlaza','precio'
    ].some(key => Object.prototype.hasOwnProperty.call(data, key));

    if (hasAnyPrice) {
      const getBase = tipo => typeof db.getPrecioBaseProducto === 'function'
        ? db.getPrecioBaseProducto(current, tipo)
        : numberOr(current[`precio_base_${tipo}`], numberOr(current[`precio_${tipo}`], current.precio));
      const publicPrice = base => typeof db.getPrecioPublicoDesdeBase === 'function' ? db.getPrecioPublicoDesdeBase(base) : round2(base * 1.05);

      const baseCliente = round2(data.precio_base_cliente ?? data.precio_cliente ?? data.precioCliente ?? data.precio ?? getBase('cliente'));
      const baseMayorista = round2(data.precio_base_mayorista ?? data.precio_mayorista ?? data.precioMayorista ?? getBase('mayorista'));
      const basePlaza = round2(data.precio_base_plaza ?? data.precio_plaza ?? data.precioPlaza ?? getBase('plaza'));
      patch.precio_base_cliente = baseCliente;
      patch.precio_base_mayorista = baseMayorista;
      patch.precio_base_plaza = basePlaza;
      patch.precio_cliente = publicPrice(baseCliente);
      patch.precio_mayorista = publicPrice(baseMayorista);
      patch.precio_plaza = publicPrice(basePlaza);
      patch.precio = patch.precio_cliente;
      patch.precio_markup_5_aplicado = true;
    }

    await update('productos', id, patch);
    return true;
  };

  db.actualizarProductoLocal = db.updateProducto;
  db.deleteProducto = id => remove('productos', id);

  db.getClientes = async function () {
    const rows = await list('clientes');
    return [...rows].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  };

  db.saveCliente = cliente => insert('clientes', {
    nombre: cliente.nombre,
    email: cliente.email || '',
    telefono: cliente.telefono || '',
    direccion: cliente.direccion || '',
    tipo_cliente: cliente.tipo_cliente || 'cliente',
    credito_habilitado: !!cliente.credito_habilitado,
    notas: cliente.notas || '',
    created_at: new Date().toISOString()
  });

  db.updateCliente = async function (id, data) {
    const allowed = ['nombre','email','telefono','direccion','tipo_cliente','credito_habilitado','notas'];
    const patch = {};
    allowed.forEach(key => { if (data[key] !== undefined) patch[key] = data[key]; });
    await update('clientes', id, patch);
    return true;
  };

  db.deleteCliente = id => remove('clientes', id);

  db.getUsuarios = async function () {
    let rows = await list('usuarios');
    if (rows.length === 0 && !firstUserCloudCheck) {
      firstUserCloudCheck = true;
      await syncNow();
      rows = await list('usuarios');
    }
    return [...rows].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  };

  db.saveUsuario = usuario => insert('usuarios', {
    nombre: usuario.nombre,
    email: (usuario.email || '').trim().toLowerCase(),
    rol: usuario.rol || 'vendedor',
    estado: usuario.estado || 'activo',
    privilegios: Array.isArray(usuario.privilegios) ? usuario.privilegios : [],
    password_hash: usuario.password_hash || null,
    password_salt: usuario.password_salt || null,
    pin_hash: usuario.pin_hash || null,
    pin_salt: usuario.pin_salt || null,
    created_at: new Date().toISOString()
  });

  db.updateUsuario = async function (id, data) {
    const allowed = ['nombre','email','rol','estado','privilegios','password_hash','password_salt','pin_hash','pin_salt'];
    const patch = {};
    allowed.forEach(key => { if (data[key] !== undefined) patch[key] = data[key]; });
    if (patch.email) patch.email = patch.email.trim().toLowerCase();
    await update('usuarios', id, patch);
    return true;
  };

  db.deleteUsuario = id => remove('usuarios', id);

  db.getServicios = async function () {
    return sortByDate(await list('servicios'), 'created_at');
  };

  db.saveServicio = servicio => insert('servicios', {
    cliente_id: servicio.cliente_id ?? null,
    cliente_nombre: servicio.cliente_nombre || '',
    equipo: servicio.equipo || '',
    problema: servicio.problema || '',
    diagnostico: servicio.diagnostico || '',
    estado: servicio.estado || 'pendiente',
    precio: numberOr(servicio.precio, 0),
    garantia_dias: parseInt(servicio.garantia_dias, 10) || 30,
    tecnico_asignado: servicio.tecnico_asignado || '',
    entregado_por: servicio.entregado_por || '',
    created_at: new Date().toISOString()
  });

  db.updateServicio = async function (id, data) {
    const allowed = ['cliente_id','cliente_nombre','equipo','problema','diagnostico','estado','precio','garantia_dias','tecnico_asignado','entregado_por'];
    const patch = {};
    allowed.forEach(key => { if (data[key] !== undefined) patch[key] = data[key]; });
    if (patch.precio !== undefined) patch.precio = numberOr(patch.precio, 0);
    if (patch.garantia_dias !== undefined) patch.garantia_dias = parseInt(patch.garantia_dias, 10) || 30;
    await update('servicios', id, patch);
    return true;
  };

  db.deleteServicio = id => remove('servicios', id);

  db.getVentas = async function () {
    return sortByDate(await list('ventas'), 'fecha');
  };

  db.registrarVenta = async function (venta) {
    await ready;
    const total = round2(venta.total);
    const subtotal = round2(venta.subtotal ?? total);
    const descuentoMonto = round2(venta.descuentoMonto ?? Math.max(0, subtotal - total));
    const descuentoPorcentaje = numberOr(venta.descuentoPorcentaje, venta.descuentoAplicado ? 5 : 0);
    const saleId = await api.db.newId();
    const fecha = venta.fecha || new Date().toISOString();

    const sale = {
      id: saleId,
      items: venta.items || [],
      subtotal,
      descuento_porcentaje: descuentoPorcentaje,
      descuento_monto: descuentoMonto,
      total,
      metodo_pago: venta.metodoPago || 'Efectivo',
      comentario: venta.comentario || '',
      descuento_aplicado: !!venta.descuentoAplicado,
      usuario: venta.usuario || 'Admin',
      cliente_id: venta.clienteId || null,
      cliente_nombre: venta.clienteNombre || null,
      tipo_precio: venta.tipoPrecio || 'cliente',
      es_credito_plaza: !!venta.esCreditoPlaza,
      fecha
    };

    const operations = [{ type: 'insert', entity: 'ventas', payload: sale }];
    const quantities = new Map();
    for (const item of sale.items) {
      if (item?.tipo === 'rapida' || item?.id === undefined || item?.id === null) continue;
      const key = String(item.id);
      quantities.set(key, numberOr(quantities.get(key), 0) + numberOr(item.cantidad, 0));
    }

    for (const [productId, quantity] of quantities.entries()) {
      const product = await api.db.get('productos', productId);
      if (!product) throw new Error(`Producto ${productId} no encontrado.`);
      const stock = numberOr(product.stock, 0);
      if (quantity > stock) throw new Error(`Stock insuficiente para ${product.nombre || productId}. Disponible: ${stock}.`);
      operations.push({ type: 'update', entity: 'productos', id: productId, patch: { stock: stock - quantity } });
    }

    if (sale.es_credito_plaza && sale.cliente_id) {
      operations.push({
        type: 'insert',
        entity: 'cuentas_plaza_movimientos',
        payload: {
          id: await api.db.newId(),
          cliente_id: sale.cliente_id,
          cliente_nombre: sale.cliente_nombre || 'Locatario',
          tipo: 'cargo',
          monto: sale.total,
          items: sale.items,
          venta_id: sale.id,
          nota: sale.comentario || 'Venta a cuenta de plaza',
          usuario: sale.usuario,
          fecha,
          created_at: new Date().toISOString()
        }
      });
    }

    await api.db.batch(operations);
    afterWrite();
    return sale;
  };

  db.getMovimientosPlaza = async function (clienteId) {
    let rows = sortByDate(await list('cuentas_plaza_movimientos'), 'fecha');
    if (clienteId !== undefined && clienteId !== null) {
      rows = rows.filter(row => String(row.cliente_id) === String(clienteId));
    }
    return rows;
  };

  db.registrarMovimientoPlaza = mov => insert('cuentas_plaza_movimientos', {
    cliente_id: mov.cliente_id,
    cliente_nombre: mov.cliente_nombre || 'Cliente',
    tipo: mov.tipo,
    monto: numberOr(mov.monto, 0),
    items: mov.items || [],
    venta_id: mov.venta_id || null,
    nota: mov.nota || '',
    usuario: mov.usuario || 'Sistema',
    fecha: mov.fecha || new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  db.getTraspasos = async function () {
    return sortByDate(await list('traspasos'), 'fecha');
  };

  db.saveTraspasoV2 = traspaso => insert('traspasos', {
    producto_id: traspaso.producto_id,
    producto_nombre: traspaso.producto_nombre,
    producto_sku: traspaso.producto_sku || '',
    tipo: 'traspaso',
    origen: traspaso.origen,
    destino: traspaso.destino,
    local_origen: traspaso.origen,
    local_destino: traspaso.destino,
    cantidad: parseInt(traspaso.cantidad, 10),
    motivo: traspaso.motivo || 'Transferencia entre almacenes',
    usuario: traspaso.usuario || 'Admin',
    estado: 'completado',
    fecha: traspaso.fecha || new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  db.saveTraspaso = traspaso => insert('traspasos', {
    ...traspaso,
    cantidad: parseInt(traspaso.cantidad, 10) || 0,
    monto: numberOr(traspaso.monto, 0),
    fecha: traspaso.fecha || new Date().toISOString(),
    created_at: traspaso.created_at || new Date().toISOString()
  });

  db.updateTraspaso = async function (id, data) {
    await update('traspasos', id, data);
    return true;
  };

  db.deleteTraspaso = id => remove('traspasos', id);

  db.verificarConexionFinal = async function () {
    await ready;
    const status = await refreshStatus();
    return {
      ok: true,
      modo: 'desktop-local-first',
      local: true,
      nube: status.cloud,
      pendientes: Number(status.pending || 0),
      mensaje: syncLabel()
    };
  };

  function installDesktopBadge() {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer || document.getElementById('desktopVersionBadge')) return;
    const block = document.createElement('div');
    block.style.cssText = 'margin:10px 0 12px;padding:9px 10px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.02);font-size:11px;color:var(--text-muted);';
    block.innerHTML = `
      <div id="desktopVersionBadge">Windows</div>
      <button id="desktopSyncButton" type="button" style="margin-top:7px;width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--bg-dark);color:var(--text);cursor:pointer;">Sincronizar</button>
      <button id="desktopBackupButton" type="button" style="margin-top:6px;width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--bg-dark);color:var(--text);cursor:pointer;">Crear respaldo local</button>
      <button id="desktopUpdateButton" type="button" style="margin-top:6px;width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--bg-dark);color:var(--text);cursor:pointer;">Buscar actualización</button>
    `;
    footer.prepend(block);

    document.getElementById('desktopSyncButton')?.addEventListener('click', syncNow);
    document.getElementById('desktopBackupButton')?.addEventListener('click', async () => {
      const btn = document.getElementById('desktopBackupButton');
      btn.disabled = true;
      btn.textContent = 'Respaldando…';
      try {
        const result = await api.backupNow();
        alert(`✅ Respaldo creado correctamente.\n${result.path}`);
      } catch (error) {
        alert('❌ No se pudo crear el respaldo: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Crear respaldo local';
      }
    });

    document.getElementById('desktopUpdateButton')?.addEventListener('click', async () => {
      const btn = document.getElementById('desktopUpdateButton');
      btn.disabled = true;
      btn.textContent = 'Buscando…';
      await api.checkForUpdates();
      setTimeout(() => {
        btn.disabled = false;
        if (state.update !== 'downloaded') btn.textContent = 'Buscar actualización';
      }, 2500);
    });
  }

  api.onSyncStatus(payload => {
    state.sync = { ...state.sync, ...(payload || {}) };
    paintStatus();
  });

  api.onUpdateStatus(payload => {
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
      btn.onclick = () => api.installUpdate();
    } else if (state.update === 'error') {
      btn.disabled = false;
      btn.textContent = 'Reintentar actualización';
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    await ready;
    installDesktopBadge();
    paintStatus();
    syncNow();
  });

  window.addEventListener('online', () => syncNow());
  window.addEventListener('offline', () => {
    state.sync = { ...state.sync, cloud: 'offline', syncing: false };
    paintStatus();
  });

  window.LotoDesktopRuntime = Object.freeze({
    syncNow,
    getStatus: () => ({ ...state.sync }),
    getAppInfo: () => state.appInfo
  });

  console.log('✅ Desktop Runtime V2: SQLite local-first + cola de sincronización + respaldos');
})();
