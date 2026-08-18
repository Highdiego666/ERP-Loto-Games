// ============================================
// LOTO GAMES POS - CLIENTES V2
// Cliente / Mayorista / Locatario + cuenta corriente de plaza
// ============================================

(function () {
  'use strict';

  let clientesV2 = [];
  let movimientosPlazaV2 = [];
  let clienteCuentaActual = null;

  const money = v => Number(v || 0).toLocaleString('es-MX', { style:'currency', currency:'MXN' });
  const typeLabel = t => ({ cliente:'Cliente', mayorista:'Mayorista', plaza:'Locatario / Plaza' }[t] || 'Cliente');

  function saldoCliente(id) {
    return movimientosPlazaV2.filter(m => String(m.cliente_id) === String(id)).reduce((s,m) => {
      const n = Number(m.monto || 0);
      return m.tipo === 'abono' ? s - n : s + n;
    }, 0);
  }

  function isToday(dateValue) {
    const d = new Date(dateValue);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }

  window.clientesModule = () => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div><h2 style="margin:0;">👥 Clientes y locatarios</h2><p style="color:var(--text-muted);margin:4px 0 0;">Clientes, mayoristas y cuentas de venta a plaza</p></div>
      <button class="btn btn-primary" onclick="window.mostrarModalCliente()"><i class="fas fa-plus"></i> Nuevo comprador</button>
    </div>

    <div class="cards-grid" style="margin-bottom:18px;">
      <div class="stat-card"><div class="stat-value" id="totalClientes">0</div><div class="stat-label">Compradores</div></div>
      <div class="stat-card"><div class="stat-value" id="totalLocatarios">0</div><div class="stat-label">Locatarios</div></div>
      <div class="stat-card"><div class="stat-value" id="totalDeudaPlaza">$0</div><div class="stat-label">Saldo pendiente plaza</div></div>
      <div class="stat-card"><div class="stat-value" id="cargosHoyPlaza">$0</div><div class="stat-label">Mercancía plaza hoy</div></div>
    </div>

    <div class="table-container">
      <input id="buscarCliente" class="form-control" placeholder="🔍 Buscar nombre, correo o teléfono" oninput="window.buscarCliente()" style="margin-bottom:14px;">
      <div style="overflow:auto;"><table style="width:100%;"><thead><tr><th>Nombre</th><th>Tipo</th><th>Contacto</th><th>Crédito</th><th>Saldo</th><th>Acciones</th></tr></thead><tbody id="tablaClientes"></tbody></table></div>
    </div>

    <div id="modalCliente" class="modal"><div class="modal-content" style="max-width:620px;">
      <div class="modal-header"><h3 id="modalClienteTitulo">Nuevo comprador</h3><span class="close-modal" onclick="window.cerrarModalCliente()">&times;</span></div>
      <form id="formCliente"><input type="hidden" id="clienteId">
        <div class="form-group"><label>Nombre / Local *</label><input id="clienteNombre" class="form-control" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>Tipo *</label><select id="clienteTipo" class="form-control" onchange="window.actualizarTipoClienteUI()"><option value="cliente">Cliente</option><option value="mayorista">Mayorista</option><option value="plaza">Locatario / Venta a plaza</option></select></div>
          <div class="form-group"><label>Teléfono</label><input id="clienteTelefono" class="form-control" type="tel"></div>
          <div class="form-group"><label>Email</label><input id="clienteEmail" class="form-control" type="email"></div>
          <div class="form-group"><label>Dirección / Local</label><input id="clienteDireccion" class="form-control"></div>
        </div>
        <label id="creditoClienteBox" style="display:none;align-items:center;gap:8px;margin:8px 0 14px;padding:10px;background:var(--bg-dark);border-radius:10px;"><input type="checkbox" id="clienteCredito"> Permitir mercancía a cuenta / crédito de plaza</label>
        <div class="form-group"><label>Notas</label><textarea id="clienteNotas" class="form-control" rows="2"></textarea></div>
        <button class="btn btn-primary" style="width:100%;padding:12px;">Guardar comprador</button>
      </form>
    </div></div>

    <div id="modalCuentaPlaza" class="modal"><div class="modal-content" style="max-width:900px;max-height:88vh;overflow:auto;">
      <div class="modal-header"><h3 id="cuentaPlazaTitulo">Cuenta de Plaza</h3><span class="close-modal" onclick="window.cerrarCuentaPlaza()">&times;</span></div>
      <div id="cuentaPlazaContenido"></div>
    </div></div>
  `;

  window.cargarClientes = async () => {
    [clientesV2, movimientosPlazaV2] = await Promise.all([
      window.DB.getClientes(), window.DB.getMovimientosPlaza()
    ]);
    document.getElementById('totalClientes').textContent = clientesV2.length;
    document.getElementById('totalLocatarios').textContent = clientesV2.filter(c => c.tipo_cliente === 'plaza').length;
    const deuda = clientesV2.reduce((s,c) => s + Math.max(0,saldoCliente(c.id)),0);
    const hoy = movimientosPlazaV2.filter(m => m.tipo === 'cargo' && isToday(m.fecha)).reduce((s,m) => s + Number(m.monto||0),0);
    document.getElementById('totalDeudaPlaza').textContent = money(deuda);
    document.getElementById('cargosHoyPlaza').textContent = money(hoy);
    window.renderizarClientes(clientesV2);
  };

  window.renderizarClientes = clientes => {
    const tbody = document.getElementById('tablaClientes');
    if (!tbody) return;
    if (!clientes.length) return tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:26px;">No hay compradores registrados</td></tr>';
    tbody.innerHTML = clientes.map(c => {
      const saldo = saldoCliente(c.id);
      return `<tr>
        <td><strong>${c.nombre}</strong><br><small>${c.direccion || ''}</small></td>
        <td>${typeLabel(c.tipo_cliente)}</td>
        <td>${c.telefono || '-'}<br><small>${c.email || ''}</small></td>
        <td>${c.tipo_cliente === 'plaza' ? (c.credito_habilitado ? '✅ Habilitado' : '⛔ Bloqueado') : '—'}</td>
        <td style="font-weight:bold;color:${saldo>0?'#f59e0b':'#10b981'};">${c.tipo_cliente === 'plaza' ? money(saldo) : '—'}</td>
        <td style="white-space:nowrap;">
          ${c.tipo_cliente === 'plaza' ? `<button class="btn btn-primary" style="padding:6px 10px;" onclick="window.abrirCuentaPlaza(${c.id})">📒 Cuenta</button>` : ''}
          <button class="btn" style="background:var(--warning);padding:6px 10px;" onclick="window.editarCliente(${c.id})">✏️</button>
          <button class="btn" style="background:var(--danger);padding:6px 10px;" onclick="window.eliminarCliente(${c.id})">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  };

  window.buscarCliente = () => {
    const q = (document.getElementById('buscarCliente')?.value || '').toLowerCase().trim();
    window.renderizarClientes(!q ? clientesV2 : clientesV2.filter(c =>
      String(c.nombre||'').toLowerCase().includes(q) || String(c.email||'').toLowerCase().includes(q) || String(c.telefono||'').includes(q)
    ));
  };

  window.actualizarTipoClienteUI = () => {
    const tipo = document.getElementById('clienteTipo')?.value;
    const box = document.getElementById('creditoClienteBox');
    if (box) box.style.display = tipo === 'plaza' ? 'flex' : 'none';
    if (tipo === 'plaza' && document.getElementById('clienteId')?.value === '') document.getElementById('clienteCredito').checked = true;
  };

  window.mostrarModalCliente = () => {
    document.getElementById('modalClienteTitulo').textContent = 'Nuevo comprador';
    document.getElementById('formCliente').reset();
    document.getElementById('clienteId').value = '';
    document.getElementById('clienteTipo').value = 'cliente';
    window.actualizarTipoClienteUI();
    document.getElementById('modalCliente').style.display = 'flex';
    setTimeout(() => document.getElementById('clienteNombre')?.focus(),0);
  };
  window.cerrarModalCliente = () => { document.getElementById('modalCliente').style.display = 'none'; };

  window.editarCliente = id => {
    const c = clientesV2.find(x => String(x.id) === String(id));
    if (!c) return;
    document.getElementById('modalClienteTitulo').textContent = 'Editar comprador';
    document.getElementById('clienteId').value = c.id;
    document.getElementById('clienteNombre').value = c.nombre || '';
    document.getElementById('clienteTipo').value = c.tipo_cliente || 'cliente';
    document.getElementById('clienteTelefono').value = c.telefono || '';
    document.getElementById('clienteEmail').value = c.email || '';
    document.getElementById('clienteDireccion').value = c.direccion || '';
    document.getElementById('clienteCredito').checked = !!c.credito_habilitado;
    document.getElementById('clienteNotas').value = c.notas || '';
    window.actualizarTipoClienteUI();
    document.getElementById('modalCliente').style.display = 'flex';
  };

  window.eliminarCliente = async id => {
    const c = clientesV2.find(x => String(x.id) === String(id));
    if (!c) return;
    const saldo = saldoCliente(id);
    if (Math.abs(saldo) > 0.009) return alert(`No se puede eliminar: la cuenta tiene saldo ${money(saldo)}. Primero liquida o ajusta la cuenta.`);
    if (!confirm(`¿Eliminar a ${c.nombre}?`)) return;
    try { await window.DB.deleteCliente(id); await window.cargarClientes(); }
    catch (error) { alert('❌ Error: ' + error.message); }
  };

  document.addEventListener('submit', async e => {
    if (e.target.id !== 'formCliente') return;
    e.preventDefault();
    const id = document.getElementById('clienteId').value;
    const tipo = document.getElementById('clienteTipo').value;
    const data = {
      nombre: document.getElementById('clienteNombre').value.trim(),
      tipo_cliente: tipo,
      telefono: document.getElementById('clienteTelefono').value.trim(),
      email: document.getElementById('clienteEmail').value.trim(),
      direccion: document.getElementById('clienteDireccion').value.trim(),
      credito_habilitado: tipo === 'plaza' && document.getElementById('clienteCredito').checked,
      notas: document.getElementById('clienteNotas').value.trim()
    };
    try {
      if (id) await window.DB.updateCliente(id,data); else await window.DB.saveCliente(data);
      window.cerrarModalCliente();
      await window.cargarClientes();
    } catch (error) { alert('❌ Error guardando comprador: ' + error.message); }
  });

  window.abrirCuentaPlaza = async id => {
    clienteCuentaActual = clientesV2.find(c => String(c.id) === String(id));
    if (!clienteCuentaActual) return;
    const movimientos = await window.DB.getMovimientosPlaza(id);
    const saldo = movimientos.reduce((s,m) => m.tipo === 'abono' ? s-Number(m.monto||0) : s+Number(m.monto||0),0);
    const cargosHoy = movimientos.filter(m => m.tipo==='cargo' && isToday(m.fecha)).reduce((s,m)=>s+Number(m.monto||0),0);
    document.getElementById('cuentaPlazaTitulo').textContent = `📒 Cuenta — ${clienteCuentaActual.nombre}`;
    const container = document.getElementById('cuentaPlazaContenido');
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
        <div class="stat-card"><div class="stat-value" style="color:${saldo>0?'#f59e0b':'#10b981'}">${money(saldo)}</div><div class="stat-label">Saldo actual</div></div>
        <div class="stat-card"><div class="stat-value">${money(cargosHoy)}</div><div class="stat-label">Solicitado hoy</div></div>
        <div class="stat-card"><div class="stat-value">${movimientos.length}</div><div class="stat-label">Movimientos históricos</div></div>
      </div>
      <div style="display:flex;gap:8px;align-items:end;margin-bottom:16px;padding:12px;background:var(--bg-dark);border-radius:10px;">
        <div style="flex:1;"><label>Registrar abono / pago</label><input id="abonoPlazaMonto" type="number" min="0.01" step="0.01" class="form-control" placeholder="Monto"></div>
        <div style="flex:2;"><label>Nota</label><input id="abonoPlazaNota" class="form-control" placeholder="Efectivo, transferencia, referencia..."></div>
        <button class="btn btn-success" onclick="window.registrarAbonoPlaza()">Registrar abono</button>
      </div>
      <div class="table-container" style="overflow:auto;max-height:440px;"><table style="width:100%;"><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Usuario</th><th>Monto</th></tr></thead><tbody>
        ${movimientos.map(m => {
          const items = Array.isArray(m.items) ? m.items.map(i => `${i.nombre} x${i.cantidad||1}`).join(', ') : '';
          return `<tr><td>${new Date(m.fecha).toLocaleString('es-MX')}</td><td>${m.tipo==='cargo'?'📦 Cargo':m.tipo==='abono'?'💵 Abono':'Ajuste'}</td><td>${items || m.nota || '-'}</td><td>${m.usuario||'-'}</td><td style="font-weight:bold;color:${m.tipo==='abono'?'#10b981':'#f59e0b'};">${m.tipo==='abono'?'-':'+'}${money(m.monto)}</td></tr>`;
        }).join('') || '<tr><td colspan="5" style="text-align:center;">Sin movimientos</td></tr>'}
      </tbody></table></div>`;
    document.getElementById('modalCuentaPlaza').style.display = 'flex';
  };

  window.registrarAbonoPlaza = async () => {
    if (!clienteCuentaActual) return;
    const monto = Number(document.getElementById('abonoPlazaMonto').value);
    const nota = document.getElementById('abonoPlazaNota').value.trim();
    if (!Number.isFinite(monto) || monto <= 0) return alert('Ingresa un monto válido.');
    try {
      await window.DB.registrarMovimientoPlaza({
        cliente_id: clienteCuentaActual.id, cliente_nombre: clienteCuentaActual.nombre,
        tipo:'abono', monto, nota, usuario: window.AuthV2.getSession()?.nombre || 'Admin'
      });
      movimientosPlazaV2 = await window.DB.getMovimientosPlaza();
      await window.abrirCuentaPlaza(clienteCuentaActual.id);
      await window.cargarClientes();
    } catch (error) { alert('❌ No se pudo registrar el abono: ' + error.message); }
  };

  window.cerrarCuentaPlaza = () => { document.getElementById('modalCuentaPlaza').style.display = 'none'; clienteCuentaActual = null; };

  console.log('✅ Clientes V2 activo: tipos + cuenta de plaza + historial + abonos');
})();
