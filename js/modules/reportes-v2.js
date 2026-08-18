// ============================================
// LOTO GAMES POS - REPORTES V2
// Corrige traspasos y añade cuentas de plaza
// ============================================

(function () {
  'use strict';

  let activoV2 = 'corte';
  let movimientosInvV2 = [];
  const money = v => Number(v || 0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});

  window.reportesModule = () => `
    <div style="margin-bottom:18px;"><h2 style="margin:0;">📈 Reportes</h2><p style="color:var(--text-muted);margin:4px 0 0;">Ventas, caja, inventario, cuentas y movimientos</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
      ${[
        ['corte','💰 Corte'],['ventas','📊 Ventas'],['usuario','👤 Por usuario'],['inventario','🔄 Movimientos'],['existencias','📦 Existencias'],['plaza','📒 Cuenta Plaza'],['servicios','🔧 Servicios']
      ].map(([id,label])=>`<button id="tabV2_${id}" class="btn" onclick="window.cambiarReporte('${id}')">${label}</button>`).join('')}
    </div>
    <div id="reporteContenido"></div>
  `;

  window.cambiarReporte = async tipo => {
    activoV2 = tipo;
    document.querySelectorAll('[id^="tabV2_"]').forEach(b=>{b.style.background='var(--bg-card)';b.style.color='var(--text)';});
    const active = document.getElementById(`tabV2_${tipo}`);
    if (active) { active.style.background='var(--primary)'; active.style.color='white'; }
    const c = document.getElementById('reporteContenido');
    if (!c) return;
    try {
      if (tipo==='corte') await window.generarCorteCaja(c);
      else if (tipo==='ventas') await window.generarReporteVentas(c);
      else if (tipo==='usuario') await window.generarReporteUsuario(c);
      else if (tipo==='inventario') await window.generarReporteInventarioV2(c);
      else if (tipo==='existencias') await window.generarReporteExistencias(c);
      else if (tipo==='plaza') await window.generarReportePlazaV2(c);
      else if (tipo==='servicios') await window.generarReporteServicios(c);
    } catch (error) {
      console.error(error);
      c.innerHTML=`<div style="padding:16px;background:rgba(239,68,68,.12);color:#ef4444;border-radius:10px;">Error generando reporte: ${error.message}</div>`;
    }
  };

  window.generarReporteInventarioV2 = async container => {
    movimientosInvV2 = await window.DB.getTraspasos();
    container.innerHTML = `
      <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:14px;">
        <div><label>Desde</label><input id="invV2Inicio" type="date" class="form-control"></div>
        <div><label>Hasta</label><input id="invV2Fin" type="date" class="form-control"></div>
        <button class="btn btn-primary" onclick="window.filtrarInventarioV2()">Filtrar</button>
      </div>
      <div id="tablaInventarioV2"></div>`;
    const now=new Date(); const from=new Date(); from.setDate(from.getDate()-30);
    document.getElementById('invV2Inicio').value=from.toISOString().slice(0,10);
    document.getElementById('invV2Fin').value=now.toISOString().slice(0,10);
    window.filtrarInventarioV2();
  };

  window.filtrarInventarioV2 = () => {
    const ini=document.getElementById('invV2Inicio')?.value;
    const fin=document.getElementById('invV2Fin')?.value;
    let rows=[...movimientosInvV2];
    if(ini) rows=rows.filter(t=>new Date(t.created_at||t.fecha)>=new Date(ini));
    if(fin) rows=rows.filter(t=>new Date(t.created_at||t.fecha)<=new Date(fin+'T23:59:59'));
    const c=document.getElementById('tablaInventarioV2'); if(!c)return;
    c.innerHTML=`<div class="table-container" style="overflow:auto;"><table style="width:100%;"><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>
      ${rows.map(t=>{
        const origen=t.origen||t.local_origen; const destino=t.destino||t.local_destino;
        let movimiento='';
        if(origen||destino||t.tipo==='traspaso'||t.tipo==='traspaso_local') movimiento=`🔄 ${origen||'?'} → ${destino||'?'}`;
        else if(t.tipo==='entrada') movimiento='✅ Entrada';
        else if(t.tipo==='salida_locatario') movimiento=`📒 Salida a ${t.locatario_nombre||'locatario'}`;
        else movimiento=t.tipo||'Movimiento';
        return `<tr><td>${new Date(t.created_at||t.fecha).toLocaleString('es-MX')}</td><td>${t.producto_nombre||'-'}</td><td><strong>${movimiento}</strong></td><td>${t.cantidad||0}</td><td>${t.motivo||'-'}</td><td>${t.usuario||'-'}</td></tr>`;
      }).join('')||'<tr><td colspan="6" style="text-align:center;">Sin movimientos en el período</td></tr>'}
    </tbody></table></div>`;
  };

  window.generarReportePlazaV2 = async container => {
    const [clientes,movs]=await Promise.all([window.DB.getClientes(),window.DB.getMovimientosPlaza()]);
    const plaza=clientes.filter(c=>c.tipo_cliente==='plaza');
    const resumen=plaza.map(c=>{
      const cm=movs.filter(m=>String(m.cliente_id)===String(c.id));
      const cargos=cm.filter(m=>m.tipo==='cargo').reduce((s,m)=>s+Number(m.monto||0),0);
      const abonos=cm.filter(m=>m.tipo==='abono').reduce((s,m)=>s+Number(m.monto||0),0);
      return {c,cargos,abonos,saldo:cargos-abonos,movs:cm.length};
    });
    const saldoTotal=resumen.reduce((s,r)=>s+Math.max(0,r.saldo),0);
    const cargosTotal=resumen.reduce((s,r)=>s+r.cargos,0);
    const abonosTotal=resumen.reduce((s,r)=>s+r.abonos,0);
    container.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:12px;margin-bottom:16px;">
        <div class="stat-card"><div class="stat-value">${money(saldoTotal)}</div><div class="stat-label">Saldo pendiente total</div></div>
        <div class="stat-card"><div class="stat-value">${money(cargosTotal)}</div><div class="stat-label">Mercancía entregada</div></div>
        <div class="stat-card"><div class="stat-value">${money(abonosTotal)}</div><div class="stat-label">Abonos registrados</div></div>
      </div>
      <div class="table-container" style="overflow:auto;"><table style="width:100%;"><thead><tr><th>Locatario</th><th>Movimientos</th><th>Cargos</th><th>Abonos</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>
        ${resumen.map(r=>`<tr><td><strong>${r.c.nombre}</strong></td><td>${r.movs}</td><td>${money(r.cargos)}</td><td>${money(r.abonos)}</td><td style="font-weight:bold;color:${r.saldo>0?'#f59e0b':'#10b981'};">${money(r.saldo)}</td><td>${r.c.credito_habilitado?'✅ Crédito activo':'⛔ Bloqueado'}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;">Sin locatarios registrados</td></tr>'}
      </tbody></table></div>`;
  };

  window.actualizarReporte = () => window.cambiarReporte(activoV2);
  console.log('✅ Reportes V2 activo: traspasos normalizados + cuenta plaza');
})();
