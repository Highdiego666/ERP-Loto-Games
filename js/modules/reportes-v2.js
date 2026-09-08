// ============================================
// LOTO GAMES POS - REPORTES V2
// Traspasos, cuentas de plaza y auditoría de modificaciones
// ============================================

(function () {
  'use strict';

  let activoV2 = 'corte';
  let movimientosInvV2 = [];
  let auditoriaV2 = [];
  let auditoriaFiltradaV2 = [];
  const money = v => Number(v || 0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const entityLabel = value => ({
    productos:'Productos', ventas:'Ventas', clientes:'Clientes', usuarios:'Usuarios',
    servicios:'Servicio técnico', traspasos:'Traspasos',
    cuentas_plaza_movimientos:'Cuenta plaza', movimientos_inventario:'Inventario'
  }[value] || value || '-');
  const actionLabel = value => ({crear:'➕ Crear',editar:'✏️ Editar',eliminar:'🗑️ Eliminar'}[value] || value || '-');
  const roleLabel = value => ({admin:'Administrador',soporte:'Soporte',vendedor:'Vendedor',tecnico:'Técnico'}[value] || value || '-');

  window.reportesModule = () => `
    <div style="margin-bottom:18px;"><h2 style="margin:0;">📈 Reportes</h2><p style="color:var(--text-muted);margin:4px 0 0;">Ventas, caja, inventario, cuentas, movimientos y auditoría</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
      ${[
        ['corte','💰 Corte'],['ventas','📊 Ventas'],['usuario','👤 Por usuario'],['inventario','🔄 Movimientos'],['existencias','📦 Existencias'],['plaza','📒 Cuenta Plaza'],['servicios','🔧 Servicios'],['auditoria','🧾 Modificaciones']
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
      else if (tipo==='auditoria') await window.generarReporteAuditoriaV2(c);
    } catch (error) {
      console.error(error);
      c.innerHTML=`<div style="padding:16px;background:rgba(239,68,68,.12);color:#ef4444;border-radius:10px;">Error generando reporte: ${esc(error.message)}</div>`;
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
        return `<tr><td>${new Date(t.created_at||t.fecha).toLocaleString('es-MX')}</td><td>${esc(t.producto_nombre||'-')}</td><td><strong>${esc(movimiento)}</strong></td><td>${t.cantidad||0}</td><td>${esc(t.motivo||'-')}</td><td>${esc(t.usuario||'-')}</td></tr>`;
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
        ${resumen.map(r=>`<tr><td><strong>${esc(r.c.nombre)}</strong></td><td>${r.movs}</td><td>${money(r.cargos)}</td><td>${money(r.abonos)}</td><td style="font-weight:bold;color:${r.saldo>0?'#f59e0b':'#10b981'};">${money(r.saldo)}</td><td>${r.c.credito_habilitado?'✅ Crédito activo':'⛔ Bloqueado'}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;">Sin locatarios registrados</td></tr>'}
      </tbody></table></div>`;
  };

  window.generarReporteAuditoriaV2 = async container => {
    auditoriaV2 = await window.DB.getAuditoria();
    const usuarios = [...new Set(auditoriaV2.map(r=>r.usuario_nombre).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    const entidades = [...new Set(auditoriaV2.map(r=>r.entidad).filter(Boolean))].sort();
    const now = new Date();
    const from = new Date(); from.setDate(from.getDate()-30);

    container.innerHTML = `
      <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg-card);margin-bottom:14px;">
        <strong>🧾 Historial de modificaciones</strong>
        <p style="margin:5px 0 0;color:var(--text-muted);">Quién creó, editó o eliminó información, con fecha y campos modificados.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(130px,1fr));gap:10px;align-items:end;margin-bottom:14px;">
        <div><label>Desde</label><input id="auditInicio" type="date" class="form-control" value="${from.toISOString().slice(0,10)}"></div>
        <div><label>Hasta</label><input id="auditFin" type="date" class="form-control" value="${now.toISOString().slice(0,10)}"></div>
        <div><label>Usuario</label><select id="auditUsuario" class="form-control"><option value="">Todos</option>${usuarios.map(u=>`<option value="${esc(u)}">${esc(u)}</option>`).join('')}</select></div>
        <div><label>Módulo</label><select id="auditEntidad" class="form-control"><option value="">Todos</option>${entidades.map(e=>`<option value="${esc(e)}">${esc(entityLabel(e))}</option>`).join('')}</select></div>
        <div><label>Acción</label><select id="auditAccion" class="form-control"><option value="">Todas</option><option value="crear">Crear</option><option value="editar">Editar</option><option value="eliminar">Eliminar</option></select></div>
        <div><label>Buscar</label><input id="auditBuscar" class="form-control" placeholder="Nombre, registro, campo…"></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        <button class="btn btn-primary" onclick="window.filtrarAuditoriaV2()">Aplicar filtros</button>
        <button class="btn" style="background:var(--success);color:white;" onclick="window.exportarAuditoriaCSV()">⬇️ Exportar CSV</button>
      </div>
      <div id="tablaAuditoriaV2"></div>`;
    window.filtrarAuditoriaV2();
  };

  window.filtrarAuditoriaV2 = () => {
    const ini=document.getElementById('auditInicio')?.value;
    const fin=document.getElementById('auditFin')?.value;
    const usuario=document.getElementById('auditUsuario')?.value||'';
    const entidad=document.getElementById('auditEntidad')?.value||'';
    const accion=document.getElementById('auditAccion')?.value||'';
    const buscar=(document.getElementById('auditBuscar')?.value||'').trim().toLowerCase();
    let rows=[...auditoriaV2];
    if(ini) rows=rows.filter(r=>new Date(r.fecha||r.created_at)>=new Date(ini));
    if(fin) rows=rows.filter(r=>new Date(r.fecha||r.created_at)<=new Date(fin+'T23:59:59'));
    if(usuario) rows=rows.filter(r=>r.usuario_nombre===usuario);
    if(entidad) rows=rows.filter(r=>r.entidad===entidad);
    if(accion) rows=rows.filter(r=>r.accion===accion);
    if(buscar) rows=rows.filter(r=>{
      const campos=Array.isArray(r.cambios?.campos)?r.cambios.campos.join(' '):'';
      return `${r.usuario_nombre||''} ${r.usuario_email||''} ${r.entidad||''} ${r.registro_id||''} ${campos}`.toLowerCase().includes(buscar);
    });
    rows.sort((a,b)=>new Date(b.fecha||b.created_at)-new Date(a.fecha||a.created_at));
    auditoriaFiltradaV2=rows;

    const c=document.getElementById('tablaAuditoriaV2'); if(!c)return;
    c.innerHTML=`
      <div style="margin-bottom:8px;color:var(--text-muted);">${rows.length} modificación(es)</div>
      <div class="table-container" style="overflow:auto;"><table style="width:100%;"><thead><tr><th>Fecha</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Módulo</th><th>Registro</th><th>Cambios</th></tr></thead><tbody>
        ${rows.map(r=>{
          const campos=Array.isArray(r.cambios?.campos)?r.cambios.campos:[];
          return `<tr>
            <td style="white-space:nowrap;">${new Date(r.fecha||r.created_at).toLocaleString('es-MX')}</td>
            <td><strong>${esc(r.usuario_nombre||'-')}</strong><br><small>${esc(r.usuario_email||'')}</small></td>
            <td>${esc(roleLabel(r.usuario_rol))}</td>
            <td>${esc(actionLabel(r.accion))}</td>
            <td>${esc(entityLabel(r.entidad))}</td>
            <td>${esc(r.registro_id||'-')}</td>
            <td>${campos.length?campos.map(esc).join(', '):'—'}</td>
          </tr>`;
        }).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;">Sin modificaciones en el período</td></tr>'}
      </tbody></table></div>`;
  };

  window.exportarAuditoriaCSV = () => {
    if (!auditoriaFiltradaV2.length) return alert('No hay modificaciones para exportar.');
    const cell = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
    const lines = [
      ['Fecha','Usuario','Email','Rol','Acción','Módulo','Registro','Campos modificados'].map(cell).join(','),
      ...auditoriaFiltradaV2.map(r=>[
        new Date(r.fecha||r.created_at).toLocaleString('es-MX'),
        r.usuario_nombre||'',r.usuario_email||'',roleLabel(r.usuario_rol),r.accion||'',entityLabel(r.entidad),r.registro_id||'',
        Array.isArray(r.cambios?.campos)?r.cambios.campos.join(' | '):''
      ].map(cell).join(','))
    ];
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`loto-games-modificaciones-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  window.actualizarReporte = () => window.cambiarReporte(activoV2);
  console.log('✅ Reportes V2 activo: traspasos + cuenta plaza + auditoría');
})();
