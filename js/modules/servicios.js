window.serviciosModule = () => `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <div>
      <h2>🔧 Servicio Técnico</h2>
      <p style="color: var(--text-muted);">Gestión de reparaciones y mantenimiento</p>
    </div>
    <button class="btn btn-primary" onclick="window.mostrarModalServicio()">
      <i class="fas fa-plus"></i> Nueva Orden
    </button>
  </div>
  
  <div class="cards-grid">
    <div class="stat-card" onclick="window.filtrarServicios('todos')" style="cursor:pointer;">
      <div class="stat-value" id="totalServicios">0</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card" onclick="window.filtrarServicios('pendiente')" style="cursor:pointer;">
      <div class="stat-value" id="serviciosPendientes">0</div>
      <div class="stat-label">⏳ Pendientes</div>
    </div>
    <div class="stat-card" onclick="window.filtrarServicios('completado')" style="cursor:pointer;">
      <div class="stat-value" id="serviciosCompletados">0</div>
      <div class="stat-label">✅ Completados</div>
    </div>
  </div>
  
  <div class="table-container">
    <div style="margin-bottom: 20px;">
      <input type="text" id="buscarServicio" class="form-control" placeholder="🔍 Buscar por equipo o cliente..." onkeyup="window.buscarServicio()">
    </div>
    <div style="overflow-x: auto;">
      <table style="width: 100%;">
        <thead>
          <tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Equipo</th><th>Problema</th><th>Estado</th><th>Precio</th><th>Acciones</th></tr>
        </thead>
        <tbody id="tablaServicios"></tbody>
      </table>
    </div>
  </div>
  
  <div id="modalServicio" class="modal">
    <div class="modal-content" style="max-width: 550px;">
      <div class="modal-header">
        <h3 id="modalServicioTitulo">Nueva Orden</h3>
        <span class="close-modal" onclick="window.cerrarModalServicio()">&times;</span>
      </div>
      <form id="formServicio">
        <input type="hidden" id="servicioId">
        <div class="form-group">
          <label>Cliente</label>
          <select id="servicioCliente" class="form-control"></select>
          <button type="button" class="btn" style="margin-top:5px; width:100%;" onclick="window.abrirModalClienteRapido()">+ Nuevo Cliente</button>
        </div>
        <div class="form-group">
          <label>Equipo / Consola</label>
          <input type="text" id="servicioEquipo" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Problema reportado</label>
          <textarea id="servicioProblema" class="form-control" rows="2" required></textarea>
        </div>
        <div class="form-group">
          <label>Diagnóstico</label>
          <textarea id="servicioDiagnostico" class="form-control" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select id="servicioEstado" class="form-control">
            <option value="pendiente">⏳ Pendiente</option>
            <option value="en_progreso">🔧 En progreso</option>
            <option value="completado">✅ Completado</option>
            <option value="entregado">📦 Entregado</option>
          </select>
        </div>
        <div class="form-group">
          <label>Precio / Cotización</label>
          <input type="number" id="servicioPrecio" class="form-control">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Guardar</button>
      </form>
    </div>
  </div>
`;

let serviciosData = [];
let currentFiltro = 'todos';

window.cargarServicios = async () => {
  serviciosData = await window.DB.getServicios();
  document.getElementById('totalServicios').innerHTML = serviciosData.length;
  document.getElementById('serviciosPendientes').innerHTML = serviciosData.filter(s => s.estado === 'pendiente').length;
  document.getElementById('serviciosCompletados').innerHTML = serviciosData.filter(s => s.estado === 'completado' || s.estado === 'entregado').length;
  window.renderizarServicios();
};

window.renderizarServicios = () => {
  let filtrados = serviciosData;
  if (currentFiltro !== 'todos') {
    filtrados = serviciosData.filter(s => s.estado === currentFiltro);
  }
  const tbody = document.getElementById('tablaServicios');
  if (!tbody) return;
  if (filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay servicios</td></tr>';
    return;
  }
  tbody.innerHTML = filtrados.map(s => `
    <tr>
      <td>#${s.id}</td>
      <td>${new Date(s.createdAt).toLocaleDateString()}</td>
      <td>${s.cliente_nombre || '-'}</td>
      <td>${s.equipo || '-'}</td>
      <td>${(s.problema || '').substring(0, 30)}${s.problema?.length > 30 ? '...' : ''}</td>
      <td>${window.getEstadoBadge(s.estado)}</td>
      <td>$${(s.precio || 0).toLocaleString()}</td>
      <td>
        <button class="btn" style="background:var(--warning);padding:5px 10px;" onclick="window.editarServicio(${s.id})">✏️</button>
      </td>
    </tr>
  `).join('');
};

window.getEstadoBadge = (estado) => {
  const badges = {
    pendiente: '<span style="background:#f59e0b;padding:4px 8px;border-radius:8px;">⏳ Pendiente</span>',
    en_progreso: '<span style="background:#6366f1;padding:4px 8px;border-radius:8px;">🔧 Progreso</span>',
    completado: '<span style="background:#10b981;padding:4px 8px;border-radius:8px;">✅ Completado</span>',
    entregado: '<span style="background:#06b6d4;padding:4px 8px;border-radius:8px;">📦 Entregado</span>'
  };
  return badges[estado] || estado;
};

window.filtrarServicios = (filtro) => {
  currentFiltro = filtro;
  window.renderizarServicios();
};

window.buscarServicio = () => {
  const busqueda = document.getElementById('buscarServicio').value.toLowerCase();
  const filtrados = serviciosData.filter(s => 
    s.equipo?.toLowerCase().includes(busqueda) ||
    s.cliente_nombre?.toLowerCase().includes(busqueda)
  );
  const tbody = document.getElementById('tablaServicios');
  if (tbody) {
    tbody.innerHTML = filtrados.map(s => `...`).join('');
  }
};

window.mostrarModalServicio = async () => {
  document.getElementById('modalServicioTitulo').innerText = 'Nueva Orden';
  document.getElementById('servicioId').value = '';
  document.getElementById('formServicio').reset();
  const clientes = await window.DB.getClientes();
  const select = document.getElementById('servicioCliente');
  select.innerHTML = '<option value="">Seleccionar cliente</option>' + clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  document.getElementById('modalServicio').style.display = 'flex';
};

window.cerrarModalServicio = () => document.getElementById('modalServicio').style.display = 'none';

window.abrirModalClienteRapido = () => {
  const nombre = prompt('Nombre del cliente:');
  if (nombre) {
    const telefono = prompt('Teléfono:');
    window.DB.saveCliente({ nombre, telefono }).then(async () => {
      const clientes = await window.DB.getClientes();
      const select = document.getElementById('servicioCliente');
      select.innerHTML = '<option value="">Seleccionar cliente</option>' + clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
      alert('Cliente agregado');
    });
  }
};

window.editarServicio = async (id) => {
  const servicio = serviciosData.find(s => s.id == id);
  if (servicio) {
    document.getElementById('modalServicioTitulo').innerText = 'Editar Orden';
    document.getElementById('servicioId').value = servicio.id;
    document.getElementById('servicioEquipo').value = servicio.equipo || '';
    document.getElementById('servicioProblema').value = servicio.problema || '';
    document.getElementById('servicioDiagnostico').value = servicio.diagnostico || '';
    document.getElementById('servicioEstado').value = servicio.estado || 'pendiente';
    document.getElementById('servicioPrecio').value = servicio.precio || '';
    const clientes = await window.DB.getClientes();
    const select = document.getElementById('servicioCliente');
    select.innerHTML = '<option value="">Seleccionar cliente</option>' + clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    document.getElementById('servicioCliente').value = servicio.cliente_id || '';
    document.getElementById('modalServicio').style.display = 'flex';
  }
};

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'formServicio') {
    e.preventDefault();
    const id = document.getElementById('servicioId').value;
    const clienteId = document.getElementById('servicioCliente').value;
    const cliente = (await window.DB.getClientes()).find(c => c.id == clienteId);
    const data = {
      cliente_id: clienteId,
      cliente_nombre: cliente?.nombre,
      equipo: document.getElementById('servicioEquipo').value,
      problema: document.getElementById('servicioProblema').value,
      diagnostico: document.getElementById('servicioDiagnostico').value,
      estado: document.getElementById('servicioEstado').value,
      precio: parseFloat(document.getElementById('servicioPrecio').value) || 0
    };
    if (id) await window.DB.updateServicio(id, data);
    else await window.DB.saveServicio(data);
    window.cerrarModalServicio();
    await window.cargarServicios();
  }
});

setTimeout(() => { if (document.getElementById('tablaServicios')) window.cargarServicios(); }, 100);
