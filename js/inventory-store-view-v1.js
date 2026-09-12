// ============================================
// LOTO GAMES - INVENTARIO POR LOCAL V1
// Visualiza existencias físicas Local 14 / Local 20 y total.
// ============================================

(function () {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  const originalModule = window.inventarioModule;
  if (typeof originalModule === 'function') {
    window.inventarioModule = () => originalModule()
      .replace('<th>Stock</th>', '<th>Local 14</th><th>Local 20</th><th>Total</th>')
      .replace(/colspan="9"/g, 'colspan="11"');
  }

  function stocks(product) {
    if (window.DB?.getStocksByStore) return window.DB.getStocksByStore(product);
    const total = Math.max(0, Number(product?.stock || 0));
    const local = String(product?.local || '').trim();
    return {
      '14': local === '14' ? total : 0,
      '20': local === '20' ? total : 0,
      unassigned: local === '14' || local === '20' ? 0 : total,
      total
    };
  }

  function qtyHtml(value) {
    const qty = Number(value || 0);
    const style = qty === 0
      ? 'color:var(--text-muted);'
      : qty < 5
        ? 'color:var(--warning);font-weight:800;'
        : 'font-weight:700;';
    return `<span style="${style}">${qty}</span>`;
  }

  window.renderizarTablaInventario = productos => {
    const tbody = document.getElementById('tablaInventario');
    if (!tbody) return;
    if (!Array.isArray(productos) || productos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:28px;color:var(--text-muted);">No hay productos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = productos.map(product => {
      const split = stocks(product);
      const price = Number(window.DB?.getPrecioProducto?.(product, 'cliente') ?? product.precio ?? 0);
      const pending = Number(split.unassigned || 0) > 0
        ? `<br><small style="color:var(--warning);">${Number(split.unassigned)} sin asignar</small>`
        : '';
      return `
        <tr>
          <td><strong>${esc(product.sku || 'N/A')}</strong></td>
          <td><small>${esc(product.codigo_barras || 'N/A')}</small></td>
          <td>${esc(product.nombre || '')}</td>
          <td><span style="background:var(--primary);padding:4px 8px;border-radius:8px;font-size:11px;">${esc(product.categoria || '-')}</span></td>
          <td>${esc(product.tipo || 'N/A')}</td>
          <td><strong style="color:var(--success);">${money(price)}</strong></td>
          <td>${qtyHtml(split['14'])}</td>
          <td>${qtyHtml(split['20'])}</td>
          <td>${qtyHtml(split.total)}${pending}</td>
          <td><strong>${money(price * Number(split.total || 0))}</strong></td>
          <td>
            <button class="btn" style="background:var(--warning);padding:5px 10px;" onclick="window.abrirModalAjusteStock(${Number(product.id)})">
              <i class="fas fa-edit"></i> Ajustar
            </button>
          </td>
        </tr>`;
    }).join('');
  };

  const originalStats = window.actualizarEstadisticasInventario;
  window.actualizarEstadisticasInventario = () => {
    if (typeof originalStats === 'function') originalStats();
    const rows = Array.isArray(window.inventarioProductos) ? window.inventarioProductos : null;
    // La implementación heredada mantiene su resumen total. La vista por local se
    // expresa en la tabla para no inventar tarjetas sin una fuente global estable.
    return rows;
  };

  console.log('✅ Inventario por local: Local 14 · Local 20 · Total');
})();
