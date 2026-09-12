// ============================================
// LOTO GAMES - GUARDA DE STOCK EN PRODUCTOS V2
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

  const originalDelete = window.eliminarProducto;
  if (typeof originalDelete === 'function') {
    window.eliminarProducto = async id => {
      try {
        const product = await window.DB.getProductoById(id);
        if (!product) return alert('Producto no encontrado. Recarga el catálogo.');

        const split = typeof window.DB.getStocksByStore === 'function'
          ? window.DB.getStocksByStore(product)
          : { '14': String(product.local || '') === '14' ? Number(product.stock || 0) : 0, '20': String(product.local || '') === '20' ? Number(product.stock || 0) : 0, unassigned: 0, total: Number(product.stock || 0) };
        const total = Number(split?.total ?? product.stock ?? 0);
        const unassigned = Number(split?.unassigned || 0);

        if (total > 0 || unassigned > 0) {
          return alert(`No se puede eliminar ${product.nombre} mientras tenga existencias.\nLocal 14: ${Number(split?.['14'] || 0)}\nLocal 20: ${Number(split?.['20'] || 0)}\nSin asignar: ${unassigned}\nTotal: ${total}\n\nAjusta el inventario a cero antes de eliminarlo.`);
        }
        return originalDelete(id);
      } catch (error) {
        console.error(error);
        alert('❌ No se pudo validar el inventario antes de eliminar: ' + (error?.message || error));
      }
    };
  }

  console.log('✅ Productos: stock protegido; borrado bloqueado con existencias; ajustes en Inventario y movimientos en Traspasos');
})();
