// ============================================
// LOTO GAMES - IMPRESIÓN DE CORTE PRE-PILOTO
// Reutiliza la ruta interna/nativa de impresión para evitar window.open en Electron.
// ============================================

(function () {
  'use strict';

  const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  async function imprimirCorteNativo() {
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const ventas = await window.DB.getVentasPorFecha(iso);
    if (!ventas.length) return alert('No hay ventas para imprimir.');

    const total = ventas.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const plaza = ventas
      .filter(venta => (venta.metodo_pago || venta.metodoPago) === 'Cuenta Plaza' || venta.es_credito_plaza)
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const cobrado = total - plaza;
    const width = Number(localStorage.getItem('loto_ticket_width_mm') || 80) === 58 ? 58 : 80;

    const detalle = ventas.map(venta => `
      <div class="row">
        <span>${esc(new Date(venta.fecha).toLocaleTimeString('es-MX'))} · ${esc(venta.metodo_pago || venta.metodoPago || 'Efectivo')}</span>
        <strong>${money(venta.total)}</strong>
      </div>`).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Corte de caja</title>
      <style>
        *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,sans-serif}
        body{width:${width}mm;padding:3mm;font-size:11px}.center{text-align:center}.title{font-size:16px;font-weight:800}.sep{border-top:1px dashed #000;margin:2.5mm 0}
        .row{display:flex;justify-content:space-between;gap:3mm;padding:1.2mm 0;border-bottom:1px dotted #aaa}.total{font-size:15px;font-weight:800}
        @page{margin:0}@media print{body{width:${width}mm}}
      </style></head><body>
      <div class="center"><div class="title">LOTO GAMES</div><div>CORTE DE CAJA</div><div>${esc(hoy.toLocaleString('es-MX'))}</div></div>
      <div class="sep"></div>
      <div class="row"><span>Operaciones</span><strong>${ventas.length}</strong></div>
      <div class="row"><span>Total vendido</span><strong>${money(total)}</strong></div>
      <div class="row"><span>Cuenta Plaza</span><strong>${money(plaza)}</strong></div>
      <div class="row total"><span>Total cobrado</span><strong>${money(cobrado)}</strong></div>
      <div class="sep"></div>${detalle}
      </body></html>`;

    if (!window.LotoPilotPrint?.printInFrame) throw new Error('Motor de impresión del piloto no disponible.');
    await window.LotoPilotPrint.printInFrame(html, width, { kind: 'ticket' });
    return true;
  }

  async function safePrintCorte() {
    try {
      return await imprimirCorteNativo();
    } catch (error) {
      console.error('Error imprimiendo corte:', error);
      alert('❌ No se pudo imprimir el corte: ' + (error?.message || error));
      return false;
    }
  }

  window.imprimirCorteCompleto = safePrintCorte;
  window.imprimirCorteMiniPrinter = safePrintCorte;

  console.log('✅ Corte/Reportes: impresión unificada sin popup activa');
})();
