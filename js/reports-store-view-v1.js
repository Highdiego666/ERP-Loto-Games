// ============================================
// LOTO GAMES - REPORTES CONSISTENTES V3
// Fechas locales + existencias Local 14 / Local 20 / total.
// ============================================

(function () {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  let filteredSales = [];

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

  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function localBoundary(dateValue, end = false) {
    if (!dateValue) return null;
    const value = new Date(`${dateValue}T${end ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(value.getTime()) ? null : value;
  }

  window.generarReporteVentas = async container => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - 30);
    container.innerHTML = `
      <div style="display:flex;gap:15px;flex-wrap:wrap;margin-bottom:20px;align-items:flex-end;">
        <div><label>Desde</label><input type="date" id="repFechaInicio" class="form-control" style="width:auto;" value="${localDateKey(start)}"></div>
        <div><label>Hasta</label><input type="date" id="repFechaFin" class="form-control" style="width:auto;" value="${localDateKey(today)}"></div>
        <div><button class="btn btn-primary" onclick="window.filtrarVentasPeriodo()">Filtrar</button></div>
        <div><button class="btn btn-success" onclick="window.exportarVentasCSV()">📥 Exportar CSV</button></div>
      </div>
      <div id="tablaVentasPeriodo" class="table-container"></div>`;
    await window.filtrarVentasPeriodo();
  };

  window.filtrarVentasPeriodo = async () => {
    const startRaw = document.getElementById('repFechaInicio')?.value || '';
    const endRaw = document.getElementById('repFechaFin')?.value || '';
    const start = localBoundary(startRaw, false);
    const end = localBoundary(endRaw, true);
    let sales = await window.DB.getVentas();

    sales = (sales || []).filter(sale => {
      const date = new Date(sale.fecha);
      if (Number.isNaN(date.getTime())) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
    filteredSales = sales;

    const total = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const container = document.getElementById('tablaVentasPeriodo');
    if (!container) return;
    container.innerHTML = `
      <div style="display:flex;gap:20px;margin-bottom:15px;flex-wrap:wrap;">
        <span><strong>Total Ventas:</strong> ${money(total)}</span>
        <span><strong>Número:</strong> ${sales.length}</span>
        <span><strong>Promedio:</strong> ${money(sales.length ? total / sales.length : 0)}</span>
      </div>
      <table><thead><tr><th>ID</th><th>Fecha</th><th>Items</th><th>Total</th><th>Método</th><th>Vendedor</th></tr></thead><tbody>
        ${sales.map(sale => `<tr>
          <td>#${esc(sale.id)}</td>
          <td>${new Date(sale.fecha).toLocaleString('es-MX')}</td>
          <td>${Array.isArray(sale.items) ? sale.items.length : 0}</td>
          <td><strong>${money(sale.total || 0)}</strong>${sale.total == null ? '<br><small style="color:var(--warning);">registro histórico sin total</small>' : ''}</td>
          <td>${esc(sale.metodo_pago || sale.metodoPago || 'Efectivo')}</td>
          <td>${esc(sale.usuario || 'Admin')}</td>
        </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">Sin datos</td></tr>'}
      </tbody></table>`;
  };

  window.exportarVentasCSV = () => {
    if (!filteredSales.length) return alert('No hay datos para exportar.');
    const csvEsc = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredSales.map(sale => [
      sale.id,
      new Date(sale.fecha).toLocaleString('es-MX'),
      sale.total == null ? '' : Number(sale.total),
      sale.metodo_pago || sale.metodoPago || 'Efectivo',
      sale.usuario || 'Admin'
    ]);
    const csv = [['ID','Fecha','Total','Método','Vendedor'], ...rows]
      .map(row => row.map(csvEsc).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ventas_${localDateKey(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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

  console.log('✅ Reportes V3: fechas locales + existencias Local 14 / Local 20 / total');
})();
