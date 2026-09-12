// ============================================
// LOTO GAMES - REPORTE DE EXISTENCIAS POR LOCAL V1
// Local 14 / Local 20 / total, sin perder compatibilidad con Reportes V2.
// ============================================

(function () {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  function splitStock(product) {
    if (typeof window.DB?.getStocksByStore === 'function') return window.DB.getStocksByStore(product);
    const total = Number(product?.stock || 0);
    const local = String(product?.local || '');
    return {
      '14': local === '14' ? total : 0,
      '20': local === '20' ? total : 0,
      unassigned: ['14','20'].includes(local) ? 0 : total,
      total
    };
  }

  window.generarReporteExistencias = async container => {
    const products = await window.DB.getProductos();
    const rows = products.map(product => ({ product, split: splitStock(product) }));
    const units14 = rows.reduce((sum, row) => sum + Number(row.split['14'] || 0), 0);
    const units20 = rows.reduce((sum, row) => sum + Number(row.split['20'] || 0), 0);
    const unassigned = rows.reduce((sum, row) => sum + Number(row.split.unassigned || 0), 0);
    const totalUnits = rows.reduce((sum, row) => sum + Number(row.split.total || 0), 0);
    const totalValue = rows.reduce((sum, row) => {
      const price = Number(window.DB.getPrecioProducto?.(row.product, 'cliente') ?? row.product.precio ?? 0);
      return sum + price * Number(row.split.total || 0);
    }, 0);

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
        <div class="stat-card"><div class="stat-value">${products.length}</div><div class="stat-label">Productos</div></div>
        <div class="stat-card"><div class="stat-value">${units14}</div><div class="stat-label">Unidades Local 14</div></div>
        <div class="stat-card"><div class="stat-value">${units20}</div><div class="stat-label">Unidades Local 20</div></div>
        <div class="stat-card"><div class="stat-value">${totalUnits}</div><div class="stat-label">Unidades totales</div></div>
        <div class="stat-card"><div class="stat-value">${money(totalValue)}</div><div class="stat-label">Valor inventario</div></div>
      </div>
      ${unassigned > 0 ? `<div style="margin-bottom:12px;padding:11px;border-radius:10px;background:rgba(245,185,27,.12);border:1px solid rgba(245,185,27,.35);color:#fde68a;">⚠️ ${unassigned} unidad(es) siguen sin asignar a Local 14 o Local 20.</div>` : ''}
      <div class="table-container" style="overflow:auto;">
        <table style="width:100%;"><thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Local 14</th><th>Local 20</th><th>Total</th><th>Precio</th><th>Valor</th></tr></thead><tbody>
          ${rows.map(({ product, split }) => {
            const price = Number(window.DB.getPrecioProducto?.(product, 'cliente') ?? product.precio ?? 0);
            const pending = Number(split.unassigned || 0);
            return `<tr>
              <td>${esc(product.sku || '-')}</td>
              <td><strong>${esc(product.nombre || '-')}</strong>${pending ? `<br><small style="color:var(--warning);">${pending} sin asignar</small>` : ''}</td>
              <td>${esc(product.categoria || '-')}</td>
              <td>${Number(split['14'] || 0)}</td>
              <td>${Number(split['20'] || 0)}</td>
              <td><strong>${Number(split.total || 0)}</strong></td>
              <td>${money(price)}</td>
              <td>${money(price * Number(split.total || 0))}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="8" style="text-align:center;">Sin productos</td></tr>'}
        </tbody></table>
      </div>`;
  };

  console.log('✅ Reportes: existencias Local 14 / Local 20 / total');
})();
