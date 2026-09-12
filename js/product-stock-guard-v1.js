// ============================================
// LOTO GAMES - GUARDA DE STOCK EN PRODUCTOS V3
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

  // El submit heredado lee stock/local manualmente aunque los controles estén
  // disabled. Interceptamos sólo EDICIONES para garantizar que esos campos no
  // viajen a DB.updateProducto. Los productos nuevos conservan el flujo original.
  document.addEventListener('submit', async event => {
    if (event.target?.id !== 'formProducto') return;
    const id = document.getElementById('productoId')?.value;
    if (!id) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const data = {
      nombre: document.getElementById('prodNombre')?.value.trim() || '',
      categoria: document.getElementById('prodCategoria')?.value || 'consolas',
      tipo: document.getElementById('prodTipo')?.value || 'nueva',
      precio_cliente: Number(document.getElementById('prodPrecioCliente')?.value),
      precio_mayorista: Number(document.getElementById('prodPrecioMayorista')?.value),
      precio_plaza: Number(document.getElementById('prodPrecioPlaza')?.value)
    };

    if (!data.nombre) return alert('El nombre del producto es obligatorio.');
    if ([data.precio_cliente, data.precio_mayorista, data.precio_plaza].some(value => !Number.isFinite(value) || value < 0)) {
      return alert('Revisa los tres precios.');
    }

    try {
      const updated = await window.DB.updateProducto(id, data);
      if (updated === false) throw new Error('El producto ya no existe en la copia local.');
      window.cerrarModalProducto?.();
      await window.cargarProductos?.();
      await window.cargarProductosVenta?.();
      await window.cargarInventario?.();
    } catch (error) {
      console.error(error);
      alert('❌ Error guardando producto: ' + (error?.message || error));
    }
  }, true);

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

  console.log('✅ Productos: edición sin stock/local; borrado bloqueado con existencias');
})();
