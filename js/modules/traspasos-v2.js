// ============================================
// LOTO GAMES POS - TRASPASOS V2
// Registro normalizado y compatible con Reportes
// ============================================

(function () {
  'use strict';

  const ALMACENES_V2 = {
    principal: '🏪 Almacén Principal',
    secundario: '📦 Almacén Secundario',
    taller: '🔧 Taller',
    tienda: '🏬 Tienda'
  };
  let productosTraspasoV2 = [];
  let traspasosV2 = [];

  window.traspasosModule = () => `
    <div style="margin-bottom:18px;"><h2 style="margin:0;">🔄 Traspasos de inventario</h2><p style="color:var(--text-muted);margin:4px 0 0;">Bitácora de movimientos entre ubicaciones</p></div>
    <div class="table-container" style="margin-bottom:16px;padding:18px;">
      <h3 style="margin-top:0;">Nuevo traspaso</h3>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 120px;gap:10px;align-items:end;">
        <div><label>Producto</label><select id="selectProductoTraspaso" class="form-control"><option value="">Seleccionar...</option></select></div>
        <div><label>Origen</label><select id="selectOrigenTraspaso" class="form-control">${Object.entries(ALMACENES_V2).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
        <div><label>Destino</label><select id="selectDestinoTraspaso" class="form-control">${Object.entries(ALMACENES_V2).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
        <div><label>Cantidad</label><input id="inputCantidadTraspaso" type="number" min="1" class="form-control"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:10px;align-items:end;">
        <div><label>Motivo</label><input id="motivoTraspasoV2" class="form-control" placeholder="Reposición, devolución, traslado, etc."></div>
        <button class="btn btn-primary" onclick="window.registrarTraspaso()" style="padding:11px 18px;">Registrar traspaso</button>
      </div>
      <small style="display:block;color:var(--text-muted);margin-top:10px;">Este módulo registra el movimiento sin alterar el stock total del catálogo. El modelo actual aún no separa existencias físicas por almacén, por lo que descontar del total en un traslado interno produciría una pérdida falsa de inventario.</small>
    </div>

    <div class="table-container">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;"><h3 style="margin:0;">Historial</h3><input id="filtroTraspasos" class="form-control" placeholder="🔍 Filtrar" oninput="window.filtrarTraspasos()" style="max-width:280px;"></div>
      <div style="overflow:auto;"><table style="width:100%;"><thead><tr><th>Fecha</th><th>Producto</th><th>Origen</th><th>Destino</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody id="tablaTraspasos"></tbody></table></div>
    </div>
  `;

  window.cargarProductosTraspaso = async () => {
    productosTraspasoV2 = await window.DB.getProductos();
    const sel = document.getElementById('selectProductoTraspaso');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar...</option>' + productosTraspasoV2.map(p => `<option value="${p.id}">${p.nombre} (${p.sku || 'sin SKU'}) — stock total ${p.stock || 0}</option>`).join('');
    const origen = document.getElementById('selectOrigenTraspaso');
    const destino = document.getElementById('selectDestinoTraspaso');
    if (origen) origen.value = 'principal';
    if (destino) destino.value = 'tienda';
  };

  window.registrarTraspaso = async () => {
    const id = document.getElementById('selectProductoTraspaso').value;
    const origen = document.getElementById('selectOrigenTraspaso').value;
    const destino = document.getElementById('selectDestinoTraspaso').value;
    const cantidad = parseInt(document.getElementById('inputCantidadTraspaso').value,10);
    const motivo = document.getElementById('motivoTraspasoV2').value.trim() || 'Transferencia entre almacenes';
    const p = productosTraspasoV2.find(x => String(x.id) === String(id));
    if (!p) return alert('Selecciona un producto.');
    if (!Number.isFinite(cantidad) || cantidad < 1) return alert('Ingresa una cantidad válida.');
    if (origen === destino) return alert('Origen y destino deben ser diferentes.');
    if (cantidad > Number(p.stock || 0)) return alert(`La cantidad supera el stock total registrado (${p.stock || 0}).`);
    if (!confirm(`Registrar ${cantidad} x ${p.nombre}\n${ALMACENES_V2[origen]} → ${ALMACENES_V2[destino]}?`)) return;

    try {
      await window.DB.saveTraspasoV2({
        producto_id:p.id, producto_nombre:p.nombre, producto_sku:p.sku,
        origen, destino, cantidad, motivo,
        usuario:window.AuthV2.getSession()?.nombre || 'Usuario', fecha:new Date().toISOString()
      });
      document.getElementById('inputCantidadTraspaso').value='';
      document.getElementById('motivoTraspasoV2').value='';
      await window.cargarTraspasos();
      alert('✅ Traspaso registrado y disponible en Reportes.');
    } catch (error) { console.error(error); alert('❌ Error registrando traspaso: '+error.message); }
  };

  function render(rows) {
    const tbody = document.getElementById('tablaTraspasos');
    if (!tbody) return;
    if (!rows.length) return tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px;">Sin traspasos registrados</td></tr>';
    tbody.innerHTML = rows.map(t => `<tr>
      <td>${new Date(t.created_at || t.fecha).toLocaleString('es-MX')}</td>
      <td><strong>${t.producto_nombre || '-'}</strong><br><small>${t.producto_sku || ''}</small></td>
      <td>${ALMACENES_V2[t.origen || t.local_origen] || t.origen || t.local_origen || '-'}</td>
      <td>${ALMACENES_V2[t.destino || t.local_destino] || t.destino || t.local_destino || '-'}</td>
      <td><strong>${t.cantidad || 0}</strong></td><td>${t.motivo || '-'}</td><td>${t.usuario || '-'}</td>
    </tr>`).join('');
  }

  window.cargarTraspasos = async () => { traspasosV2 = await window.DB.getTraspasos(); render(traspasosV2); };
  window.filtrarTraspasos = () => {
    const q=(document.getElementById('filtroTraspasos')?.value||'').toLowerCase();
    render(!q?traspasosV2:traspasosV2.filter(t=>[t.producto_nombre,t.producto_sku,t.origen,t.destino,t.motivo,t.usuario].some(v=>String(v||'').toLowerCase().includes(q))));
  };

  console.log('✅ Traspasos V2 activo: esquema normalizado + reportes consistentes');
})();
