// ============================================
// LOTO GAMES - VENTAS POR LOCAL V1
// La estación sólo vende existencias físicas de su Local 14 o Local 20.
// ============================================

(function () {
  'use strict';

  const STORES = ['14', '20'];
  const db = window.DB;
  if (!db) return;

  function station() {
    const value = localStorage.getItem('loto_store_id');
    return STORES.includes(value) ? value : null;
  }

  function requireStation() {
    const value = station();
    if (value) return value;
    alert('Configura primero el local de esta PC en Configuración → Local de esta estación.');
    return null;
  }

  function storeStock(product, store = station()) {
    if (!product || !store) return 0;
    if (typeof db.getStocksByStore === 'function') {
      return Number(db.getStocksByStore(product)?.[store] || 0);
    }
    return String(product.local || '') === store ? Number(product.stock || 0) : 0;
  }

  async function decorateProductCards() {
    const store = station();
    const grid = document.getElementById('listaProductosGrid');
    if (!grid) return;

    let banner = document.getElementById('salesStoreBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'salesStoreBanner';
      banner.style.cssText = 'grid-column:1/-1;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-dark);font-size:12px;';
      grid.prepend(banner);
    }

    if (!store) {
      banner.innerHTML = '⚠️ <strong>Estación sin local configurado.</strong> Ve a Configuración antes de vender.';
      banner.style.color = '#fbbf24';
    } else {
      banner.innerHTML = `🏬 Venta desde <strong>Local ${store}</strong>. Las existencias y el cobro se validan contra este local.`;
      banner.style.color = '#a7f3d0';
    }

    const products = await db.getProductos();
    const byId = new Map(products.map(product => [String(product.id), product]));

    grid.querySelectorAll('button[onclick^="window.agregarAlCarrito("]').forEach(button => {
      const match = String(button.getAttribute('onclick') || '').match(/agregarAlCarrito\(([^)]+)\)/);
      if (!match) return;
      const product = byId.get(String(match[1]).replace(/["']/g, '').trim());
      if (!product) return;

      const available = storeStock(product, store);
      let badge = button.querySelector('.loto-store-stock-badge');
      if (!badge) {
        badge = document.createElement('small');
        badge.className = 'loto-store-stock-badge';
        badge.style.cssText = 'display:block;margin-top:4px;font-weight:800;';
        button.appendChild(badge);
      }
      badge.textContent = store ? `Local ${store}: ${available}` : 'Local no configurado';
      badge.style.color = available > 0 ? 'var(--success)' : 'var(--warning)';
      button.disabled = !store || available <= 0;
      button.style.opacity = button.disabled ? '.5' : '1';
      button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
    });
  }

  const originalLoad = window.cargarProductosVenta;
  if (typeof originalLoad === 'function') {
    window.cargarProductosVenta = async (...args) => {
      const result = await originalLoad(...args);
      await decorateProductCards();
      return result;
    };
  }

  const originalFilter = window.filtrarProductosVentaV2;
  if (typeof originalFilter === 'function') {
    window.filtrarProductosVentaV2 = (...args) => {
      const result = originalFilter(...args);
      Promise.resolve().then(decorateProductCards).catch(console.error);
      return result;
    };
  }

  const originalAdd = window.agregarAlCarrito;
  if (typeof originalAdd === 'function') {
    window.agregarAlCarrito = async id => {
      const store = requireStation();
      if (!store) return;
      const product = await db.getProductoById(id);
      if (!product) return alert('Producto no encontrado.');
      const available = storeStock(product, store);
      if (available <= 0) return alert(`Sin existencias de ${product.nombre} en Local ${store}.`);
      return originalAdd(id);
    };
  }

  const originalModify = window.modificarCantidad;
  if (typeof originalModify === 'function') {
    window.modificarCantidad = async (index, delta) => {
      const store = requireStation();
      if (!store) return;

      // Ventas V5 consulta getProductoById para limitar cantidad. Durante esta
      // operación presentamos el stock del local como el stock disponible.
      const originalGet = db.getProductoById.bind(db);
      db.getProductoById = async id => {
        const product = await originalGet(id);
        return product ? { ...product, stock: storeStock(product, store) } : product;
      };
      try {
        return await originalModify(index, delta);
      } finally {
        db.getProductoById = originalGet;
      }
    };
  }

  const originalFinalize = window.finalizarVenta;
  if (typeof originalFinalize === 'function') {
    window.finalizarVenta = async (...args) => {
      if (!requireStation()) return;
      return originalFinalize(...args);
    };
  }

  window.LotoSalesStore = { station, storeStock, decorateProductCards };
  console.log('✅ Ventas por local: stock y caja ligados a Local 14/20');
})();
