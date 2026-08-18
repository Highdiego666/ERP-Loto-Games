// ============================================
// LOTO GAMES POS - CORTE DE CAJA V2
// Separa ventas cobradas de mercancía a cuenta de plaza
// ============================================

(function () {
  'use strict';
  let ventasCorteV2 = [];
  const money = v => Number(v || 0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});

  window.corteModule = () => `
    <div style="margin-bottom:18px;"><h2 style="margin:0;">💰 Corte de Caja</h2><p style="color:var(--text-muted);margin:4px 0 0;">Ventas del día, cobros reales y cuenta de plaza</p></div>
    <div id="resumenCorteV2"></div>
  `;

  window.cargarCorte = async () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    ventasCorteV2 = await window.DB.getVentasPorFecha(iso);
    const totalVendido = ventasCorteV2.reduce((s,v)=>s+Number(v.total||0),0);
    const totalPlaza = ventasCorteV2.filter(v=>(v.metodo_pago||v.metodoPago)==='Cuenta Plaza' || v.es_credito_plaza).reduce((s,v)=>s+Number(v.total||0),0);
    const totalCobrado = totalVendido-totalPlaza;
    const metodos = {};
    ventasCorteV2.forEach(v=>{const m=v.metodo_pago||v.metodoPago||'Efectivo';metodos[m]=(metodos[m]||0)+Number(v.total||0);});
    const c=document.getElementById('resumenCorteV2'); if(!c)return;
    c.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
        <div class="stat-card"><div class="stat-value">${ventasCorteV2.length}</div><div class="stat-label">Operaciones</div></div>
        <div class="stat-card"><div class="stat-value">${money(totalVendido)}</div><div class="stat-label">Total vendido</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#10b981;">${money(totalCobrado)}</div><div class="stat-label">Total cobrado</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f59e0b;">${money(totalPlaza)}</div><div class="stat-label">Pendiente / Cuenta Plaza</div></div>
      </div>
      <div style="display:grid;grid-template-columns:320px minmax(0,1fr);gap:14px;">
        <div class="table-container"><h3>Por método</h3>${Object.entries(metodos).map(([m,t])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>${m}</span><strong>${money(t)}</strong></div>`).join('')||'<p>Sin ventas hoy.</p>'}</div>
        <div class="table-container" style="overflow:auto;"><h3>Ventas del día</h3><table style="width:100%;"><thead><tr><th>Hora</th><th>Comprador</th><th>Pago</th><th>Vendedor</th><th>Total</th></tr></thead><tbody>
          ${ventasCorteV2.map(v=>`<tr><td>${new Date(v.fecha).toLocaleTimeString('es-MX')}</td><td>${v.cliente_nombre||'Público general'}</td><td>${v.metodo_pago||v.metodoPago||'Efectivo'}</td><td>${v.usuario||'-'}</td><td><strong>${money(v.total)}</strong></td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;">Sin ventas hoy</td></tr>'}
        </tbody></table></div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px;" onclick="window.imprimirCorteCompleto()">🖨️ Imprimir corte</button>`;
  };

  window.imprimirCorteCompleto = () => {
    if (!ventasCorteV2.length) return alert('No hay ventas para imprimir.');
    const total=ventasCorteV2.reduce((s,v)=>s+Number(v.total||0),0);
    const plaza=ventasCorteV2.filter(v=>(v.metodo_pago||v.metodoPago)==='Cuenta Plaza'||v.es_credito_plaza).reduce((s,v)=>s+Number(v.total||0),0);
    const win=window.open('','_blank','width=400,height=650'); if(!win)return alert('Permite ventanas emergentes.');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Corte</title><style>body{font:12px Arial;width:74mm;margin:0 auto;padding:4mm}h2{text-align:center}.r{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted #aaa}.t{font-size:20px;font-weight:bold;margin:8px 0}@page{size:74mm auto;margin:0}</style></head><body><h2>LOTO GAMES<br>CORTE DE CAJA</h2><div>${new Date().toLocaleString('es-MX')}</div><hr><div class="r"><span>Operaciones</span><b>${ventasCorteV2.length}</b></div><div class="r"><span>Total vendido</span><b>${money(total)}</b></div><div class="r"><span>Cuenta Plaza</span><b>${money(plaza)}</b></div><div class="t">COBRADO: ${money(total-plaza)}</div><hr>${ventasCorteV2.map(v=>`<div class="r"><span>${new Date(v.fecha).toLocaleTimeString('es-MX')} ${v.metodo_pago||v.metodoPago||''}</span><b>${money(v.total)}</b></div>`).join('')}<script>setTimeout(()=>window.print(),400);<\/script></body></html>`);
    win.document.close();
  };

  window.cerrarCorte = () => alert('El corte queda registrado a partir de las ventas del día. No se eliminan ni modifican movimientos.');
  console.log('✅ Corte V2 activo: vendido vs cobrado vs Cuenta Plaza');
})();
