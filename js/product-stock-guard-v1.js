// ============================================
// LOTO GAMES - GUARDA DE STOCK EN PRODUCTOS V1
// El catálogo edita datos/precios; Inventario y Traspasos controlan existencias.
// ============================================

(function () {
  'use strict';

  function removeHint() {
    document.getElementById('productStockGuardHint')?.remove();
  }

  function setInventoryFieldsLocked(locked) {
    const local = document.getElementById('prodLocal');
    const stock = document.getElementById('prodStock');
    if (local) local.disabled = !!locked;
    if (stock) stock.disabled = !!locked;

    removeHint();
    if (locked && stock?.closest('.form-group')) {
      stock.closest('.form-group').insertAdjacentHTML('afterend', `
        <div id="productStockGuardHint" style="grid-column:1/-1;padding:10px 12px;border-radius:10px;background:rgba(31,99,255,.10);border:1px solid rgba(31,99,255,.24);color:var(--text-muted);font-size:12px;">
          📦 Para cambiar existencias usa <strong>Inventario</strong>. Para mover mercancía entre Local 14 y Local 20 usa <strong>Traspasos</strong>.
        </div>`);
    }
  }

  const originalNew = window.mostrarModalProducto;
  if (typeof originalNew === 'function') {
    window.mostrarModalProducto = (...args) => {
      const result = originalNew(...args);
      setInventoryFieldsLocked(false);
      return result;
    };
  }

  const originalEdit = window.editarProducto;
  if (typeof originalEdit === 'function') {
    window.editarProducto = id => {
      const result = originalEdit(id);
      setInventoryFieldsLocked(true);
      return result;
    };
  }

  const originalClose = window.cerrarModalProducto;
  if (typeof originalClose === 'function') {
    window.cerrarModalProducto = (...args) => {
      setInventoryFieldsLocked(false);
      removeHint();
      return originalClose(...args);
    };
  }

  console.log('✅ Productos: stock protegido; ajustes en Inventario y movimientos en Traspasos');
})();
