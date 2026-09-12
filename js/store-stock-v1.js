// ============================================
// LOTO GAMES - EXISTENCIAS POR LOCAL V1
// Local 14 y Local 20 son las ubicaciones operativas reales.
// ============================================

(function () {
  'use strict';

  const db = window.DB;
  if (!db) return;

  const STORES = ['14', '20'];
  const toInt = value => Math.max(0, Number.parseInt(value, 10) || 0);
  const getProductsLocal = () => JSON.parse(localStorage.getItem('productos') || '[]');

  function stocksFor(product) {
    const total = toInt(product?.stock);
    const has14 = product && Object.prototype.hasOwnProperty.call(product, 'stock_local_14');
    const has20 = product && Object.prototype.hasOwnProperty.call(product, 'stock_local_20');
    let stock14 = has14 ? toInt(product.stock_local_14) : 0;
    let stock20 = has20 ? toInt(product.stock_local_20) : 0;

    if (!has14 && !has20) {
      const legacy = String(product?.local || '').trim();
      if (legacy === '14') stock14 = total;
      if (legacy === '20') stock20 = total;
    }

    return {
      '14': stock14,
      '20': stock20,
      unassigned: Math.max(0, total - stock14 - stock20),
      total
    };
  }

  function legacyLocal(product, stock14, stock20) {
    if (stock14 > 0 && stock20 === 0) return '14';
    if (stock20 > 0 && stock14 === 0) return '20';
    const current = String(product?.local || '').trim();
    return STORES.includes(current) ? current : (stock14 >= stock20 ? '14' : '20');
  }

  async function patchProduct(id, patch) {
    if (window.supabase) {
      const { data, error } = await window.supabase.from('productos').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const rows = getProductsLocal();
    const index = rows.findIndex(row => String(row.id) === String(id));
    if (index < 0) throw new Error('Producto no encontrado en la base local.');
    rows[index] = { ...rows[index], ...patch };
    localStorage.setItem('productos', JSON.stringify(rows));
    return rows[index];
  }

  db.getStocksByStore = product => stocksFor(product);

  db.setStocksByStore = async function (id, stock14, stock20, options = {}) {
    const product = await db.getProductoById(id);
    if (!product) throw new Error('Producto no encontrado.');

    const before = stocksFor(product);
    const next14 = toInt(stock14);
    const next20 = toInt(stock20);
    const keepUnassigned = options.keepUnassigned !== false;
    const unassigned = keepUnassigned ? before.unassigned : 0;
    const total = next14 + next20 + unassigned;

    return patchProduct(id, {
      stock_local_14: next14,
      stock_local_20: next20,
      stock: total,
      local: legacyLocal(product, next14, next20)
    });
  };

  db.transferBetweenStores = async function ({ productoId, origen, destino, cantidad, motivo, usuario }) {
    const from = String(origen || '');
    const to = String(destino || '');
    const qty = toInt(cantidad);
    if (!STORES.includes(from) || !STORES.includes(to) || from === to) throw new Error('Selecciona dos locales diferentes.');
    if (qty < 1) throw new Error('La cantidad debe ser mayor a cero.');

    const product = await db.getProductoById(productoId);
    if (!product) throw new Error('Producto no encontrado.');
    const before = stocksFor(product);
    if (before[from] < qty) {
      throw new Error(`Stock insuficiente en Local ${from}. Disponible: ${before[from]}.`);
    }

    const next = { '14': before['14'], '20': before['20'] };
    next[from] -= qty;
    next[to] += qty;

    await patchProduct(product.id, {
      stock_local_14: next['14'],
      stock_local_20: next['20'],
      stock: before.total,
      local: legacyLocal(product, next['14'], next['20'])
    });

    try {
      return await db.saveTraspasoV2({
        producto_id: product.id,
        producto_nombre: product.nombre,
        producto_sku: product.sku || '',
        origen: from,
        destino: to,
        cantidad: qty,
        motivo: motivo || `Traspaso Local ${from} → Local ${to}`,
        usuario: usuario || 'Usuario',
        fecha: new Date().toISOString()
      });
    } catch (error) {
      await patchProduct(product.id, {
        stock_local_14: before['14'],
        stock_local_20: before['20'],
        stock: before.total,
        local: product.local || legacyLocal(product, before['14'], before['20'])
      });
      throw error;
    }
  };

  // Inicializar existencias por local al crear productos nuevos.
  const originalSaveProduct = db.saveProducto?.bind(db);
  if (originalSaveProduct) {
    db.saveProducto = async product => {
      const row = await originalSaveProduct(product);
      const local = String(product.local || row.local || '').trim();
      const total = toInt(row.stock ?? product.stock);
      if (local === '14' || local === '20') {
        return patchProduct(row.id, {
          stock_local_14: local === '14' ? total : 0,
          stock_local_20: local === '20' ? total : 0,
          stock: total,
          local
        });
      }
      return row;
    };
  }

  // Venta: además del stock total, descuenta la existencia de la estación.
  const originalSale = db.registrarVenta?.bind(db);
  if (originalSale) {
    db.registrarVenta = async sale => {
      const station = localStorage.getItem('loto_store_id');
      const items = Array.isArray(sale?.items) ? sale.items.filter(item => item.tipo !== 'rapida') : [];
      const snapshots = [];

      for (const item of items) {
        const product = await db.getProductoById(item.id);
        if (!product) continue;
        const stocks = stocksFor(product);
        const preferred = STORES.includes(station) ? station : String(product.local || '').trim();
        if (!STORES.includes(preferred)) continue;
        const qty = toInt(item.cantidad);
        if (stocks[preferred] < qty) {
          throw new Error(`Stock insuficiente de ${product.nombre} en Local ${preferred}. Disponible: ${stocks[preferred]}.`);
        }
        snapshots.push({ product, stocks, store: preferred, qty });
      }

      const result = await originalSale(sale);

      for (const snap of snapshots) {
        const after14 = snap.stocks['14'] - (snap.store === '14' ? snap.qty : 0);
        const after20 = snap.stocks['20'] - (snap.store === '20' ? snap.qty : 0);
        // registrarVenta ya redujo el stock total. Sólo alineamos el desglose por local.
        await patchProduct(snap.product.id, {
          stock_local_14: after14,
          stock_local_20: after20,
          local: legacyLocal(snap.product, after14, after20)
        });
      }

      return result;
    };
  }

  // Inventario: el ajuste se hace por local y recalcula el total.
  const originalOpenAdjustment = window.abrirModalAjusteStock;
  if (typeof originalOpenAdjustment === 'function') {
    window.abrirModalAjusteStock = async id => {
      const result = originalOpenAdjustment(id);
      const product = await db.getProductoById(id);
      if (!product) return result;
      const stocks = stocksFor(product);
      const defaultStore = STORES.includes(localStorage.getItem('loto_store_id'))
        ? localStorage.getItem('loto_store_id')
        : (STORES.includes(String(product.local || '')) ? String(product.local) : '14');

      const info = document.getElementById('infoProductoStock');
      if (info) info.innerHTML += `<br><small>Local 14: <strong>${stocks['14']}</strong> · Local 20: <strong>${stocks['20']}</strong>${stocks.unassigned ? ` · Sin asignar: <strong>${stocks.unassigned}</strong>` : ''}</small>`;

      const current = document.getElementById('stockActual');
      const next = document.getElementById('nuevoStockInv');
      const currentGroup = current?.closest('.form-group');
      if (currentGroup && !document.getElementById('localAjusteInv')) {
        currentGroup.insertAdjacentHTML('beforebegin', `<div class="form-group"><label>Local a ajustar:</label><select id="localAjusteInv" class="form-control"><option value="14">Local 14</option><option value="20">Local 20</option></select></div>`);
      }
      const select = document.getElementById('localAjusteInv');
      if (select) {
        select.value = defaultStore;
        select.onchange = () => {
          const value = stocks[select.value] || 0;
          if (current) current.value = value;
          if (next) next.value = value;
        };
      }
      if (current) current.value = stocks[defaultStore] || 0;
      if (next) next.value = stocks[defaultStore] || 0;
      return result;
    };
  }

  window.guardarAjusteStock = async () => {
    const id = window.__lotoProductoAjusteId;
    const store = document.getElementById('localAjusteInv')?.value;
    const input = document.getElementById('nuevoStockInv');
    const motive = document.getElementById('motivoAjusteInv')?.value || 'inventario';
    if (id === undefined || id === null || !STORES.includes(store) || !input) return;

    try {
      const product = await db.getProductoById(id);
      if (!product) throw new Error('Producto no encontrado.');
      const before = stocksFor(product);
      const previousLocal = before[store];
      const nextLocal = Number.parseInt(input.value, 10);
      if (!Number.isFinite(nextLocal) || nextLocal < 0) return alert('Ingresa un stock válido.');
      if (nextLocal === previousLocal) return alert('El stock de ese local no ha cambiado.');

      const next14 = store === '14' ? nextLocal : before['14'];
      const next20 = store === '20' ? nextLocal : before['20'];
      const updated = await db.setStocksByStore(id, next14, next20, { keepUnassigned: true });
      const actor = window.AuthV2?.getSession?.() || window.usuarioActual || {};
      const delta = nextLocal - previousLocal;

      await db.registrarMovimientoInventario?.({
        producto_id: product.id,
        producto_nombre: product.nombre,
        tipo: delta > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(delta),
        stock_anterior: before.total,
        stock_nuevo: Number(updated.stock || 0),
        motivo: `Local ${store} · ${motive}`,
        usuario: actor.nombre || 'Usuario'
      });

      window.cerrarModalAjusteStock?.();
      window.__lotoProductoAjusteId = null;
      await window.cargarInventario?.();
      alert(`✅ Stock de Local ${store} actualizado: ${product.nombre}\n${previousLocal} → ${nextLocal}`);
    } catch (error) {
      console.error(error);
      alert('❌ No se pudo ajustar el stock por local: ' + (error?.message || error));
    }
  };

  // Configuración de la estación: necesario para descontar ventas del local correcto.
  const originalConfigModule = window.configuracionModule;
  if (typeof originalConfigModule === 'function') {
    window.configuracionModule = () => originalConfigModule() + `
      <section class="table-container" style="margin-top:16px;max-width:680px;">
        <h3 style="margin-top:0;">🏬 Local de esta estación</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Las ventas descontarán existencias del local seleccionado.</p>
        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;">
          <div class="form-group" style="margin:0;"><label>Local</label><select id="cfgStoreId" class="form-control"><option value="14">Local 14</option><option value="20">Local 20</option></select></div>
          <button class="btn btn-primary" onclick="window.guardarLocalEstacion()">Guardar local</button>
        </div>
      </section>`;
  }

  const originalLoadConfig = window.cargarConfiguracion;
  if (typeof originalLoadConfig === 'function') {
    window.cargarConfiguracion = async () => {
      await originalLoadConfig();
      const select = document.getElementById('cfgStoreId');
      if (select) select.value = STORES.includes(localStorage.getItem('loto_store_id')) ? localStorage.getItem('loto_store_id') : '14';
    };
  }

  window.guardarLocalEstacion = () => {
    const value = document.getElementById('cfgStoreId')?.value;
    if (!STORES.includes(value)) return alert('Selecciona Local 14 o Local 20.');
    localStorage.setItem('loto_store_id', value);
    alert(`✅ Esta estación quedó configurada para Local ${value}.`);
  };

  console.log('✅ Existencias por local activas: Local 14 ↔ Local 20');
})();
