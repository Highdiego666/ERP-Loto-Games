// ============================================
// LOTO GAMES - REPORTE DE INVENTARIO V1
// Une traspasos con entradas/salidas reales de stock.
// ============================================

(function () {
  'use strict';

  let rowsV1 = [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  if (typeof window.DB.getMovimientosInventario !== 'function') {
    window.DB.getMovimientosInventario = async () => {
      if (window.supabase) {
        const { data, error } = await window.supabase
          .from('movimientos_inventario')
          .select('*')
          .order('fecha', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      const rows = JSON.parse(localStorage.getItem('movimientos_inventario') || '[]');
      return Array.isArray(rows) ? rows : [];
    };
  }

  window.generarReporteInventarioV2 = async container => {
    const [traspasos, movimientos] = await Promise.all([
      window.DB.getTraspasos(),
      window.DB.getMovimientosInventario()
    ]);

    rowsV1 = [
      ...traspasos.map(row => ({ ...row, __kind: 'traspaso' })),
      ...movimientos.map(row => ({ ...row, __kind: 'stock' }))
    ].sort((a, b) => new Date(b.created_at || b.fecha || 0) - new Date(a.created_at || a.fecha || 0));

    container.innerHTML = `
      <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:14px;">
        <div><label>Desde</label><input id="invV2Inicio" type="date" class="form-control"></div>
        <div><label>Hasta</label><input id="invV2Fin" type="date" class="form-control"></div>
        <button class="btn btn-primary" onclick="window.filtrarInventarioV2()">Filtrar</button>
      </div>
      <div id="tablaInventarioV2"></div>`;

    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    document.getElementById('invV2Inicio').value = from.toISOString().slice(0, 10);
    document.getElementById('invV2Fin').value = now.toISOString().slice(0, 10);
    window.filtrarInventarioV2();
  };

  window.filtrarInventarioV2 = () => {
    const ini = document.getElementById('invV2Inicio')?.value;
    const fin = document.getElementById('invV2Fin')?.value;
    let rows = [...rowsV1];
    if (ini) rows = rows.filter(row => new Date(row.created_at || row.fecha) >= new Date(ini));
    if (fin) rows = rows.filter(row => new Date(row.created_at || row.fecha) <= new Date(`${fin}T23:59:59`));

    const container = document.getElementById('tablaInventarioV2');
    if (!container) return;

    container.innerHTML = `<div class="table-container" style="overflow:auto;"><table style="width:100%;">
      <thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Existencia</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>
      ${rows.map(row => {
        const origen = row.origen || row.local_origen;
        const destino = row.destino || row.local_destino;
        let movimiento;
        let existencia = '—';

        if (row.__kind === 'traspaso') {
          movimiento = `🔄 ${origen || '?'} → ${destino || '?'}`;
        } else {
          movimiento = row.tipo === 'entrada' ? '✅ Entrada' : row.tipo === 'salida' ? '📤 Salida' : (row.tipo || 'Ajuste');
          if (row.stock_anterior !== undefined || row.stock_nuevo !== undefined) {
            existencia = `${Number(row.stock_anterior || 0)} → ${Number(row.stock_nuevo || 0)}`;
          }
        }

        return `<tr>
          <td>${esc(new Date(row.created_at || row.fecha).toLocaleString('es-MX'))}</td>
          <td>${esc(row.producto_nombre || '-')}</td>
          <td><strong>${esc(movimiento)}</strong></td>
          <td>${Number(row.cantidad || 0)}</td>
          <td>${esc(existencia)}</td>
          <td>${esc(row.motivo || '-')}</td>
          <td>${esc(row.usuario || '-')}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="7" style="text-align:center;">Sin movimientos en el período</td></tr>'}
      </tbody></table></div>`;
  };

  console.log('✅ Reporte Inventario V1: traspasos + entradas/salidas de stock');
})();
