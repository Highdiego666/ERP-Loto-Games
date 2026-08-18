// ============================================
// LOTO GAMES POS - PRODUCTOS MARKUP V3
// UX para capturar precio base y mostrar precio público +5%
// ============================================

(function () {
  'use strict';

  const originalProductosModule = window.productosModule;
  if (typeof originalProductosModule === 'function') {
    window.productosModule = () => {
      let html = originalProductosModule();
      html = html
        .replace('Catálogo, stock y listas de precio', 'Catálogo, stock y precios base con +5% automático')
        .replace('<label>Cliente *</label>', '<label>Cliente base *</label>')
        .replace('<label>Mayorista *</label>', '<label>Mayorista base *</label>')
        .replace('<label>Venta a plaza *</label>', '<label>Venta a plaza base *</label>')
        .replace(
          'El precio Cliente se mantiene también como precio base para compatibilidad con módulos antiguos.',
          'Captura el precio base. El sistema agrega automáticamente 5% al precio público. En caja, F6 puede retirar ese mismo ajuste y cobrar el precio base.<div id="previewPrecios5" style="margin-top:8px;font-weight:700;color:var(--success);"></div>'
        );
      return html;
    };
  }

  function money(value) {
    return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }

  function actualizarPreview() {
    const target = document.getElementById('previewPrecios5');
    if (!target || !window.DB?.getPrecioPublicoDesdeBase) return;
    const cliente = Number(document.getElementById('prodPrecioCliente')?.value || 0);
    const mayorista = Number(document.getElementById('prodPrecioMayorista')?.value || 0);
    const plaza = Number(document.getElementById('prodPrecioPlaza')?.value || 0);
    target.textContent = `Precio público (+5%): Cliente ${money(window.DB.getPrecioPublicoDesdeBase(cliente))} · Mayorista ${money(window.DB.getPrecioPublicoDesdeBase(mayorista))} · Plaza ${money(window.DB.getPrecioPublicoDesdeBase(plaza))}`;
  }

  document.addEventListener('input', event => {
    if (['prodPrecioCliente', 'prodPrecioMayorista', 'prodPrecioPlaza'].includes(event.target?.id)) {
      actualizarPreview();
    }
  });

  const originalMostrar = window.mostrarModalProducto;
  if (typeof originalMostrar === 'function') {
    window.mostrarModalProducto = (...args) => {
      const result = originalMostrar(...args);
      setTimeout(actualizarPreview, 0);
      return result;
    };
  }

  window.editarProducto = async id => {
    try {
      const producto = await window.DB.getProductoById(id);
      if (!producto) return alert('Producto no encontrado.');

      document.getElementById('modalProductoTitulo').textContent = 'Editar Producto';
      document.getElementById('productoId').value = producto.id;
      document.getElementById('prodNombre').value = producto.nombre || '';
      document.getElementById('prodCategoria').value = producto.categoria || 'consolas';
      document.getElementById('prodTipo').value = producto.tipo || 'nueva';
      document.getElementById('prodLocal').value = producto.local || '';
      document.getElementById('prodStock').value = producto.stock || 0;
      document.getElementById('prodPrecioCliente').value = window.DB.getPrecioBaseProducto(producto, 'cliente');
      document.getElementById('prodPrecioMayorista').value = window.DB.getPrecioBaseProducto(producto, 'mayorista');
      document.getElementById('prodPrecioPlaza').value = window.DB.getPrecioBaseProducto(producto, 'plaza');
      document.getElementById('modalProducto').style.display = 'flex';
      actualizarPreview();
    } catch (error) {
      console.error(error);
      alert('❌ No se pudo abrir el producto: ' + error.message);
    }
  };

  console.log('✅ Productos Markup V3: captura base y vista previa +5%');
})();
