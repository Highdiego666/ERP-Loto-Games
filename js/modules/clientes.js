window.clientesModule = () => `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <div>
      <h2>👥 Clientes</h2>
      <p style="color: var(--text-muted);">Registro y gestión de clientes</p>
    </div>
    <button class="btn btn-primary" onclick="window.mostrarModalCliente()">
      <i class="fas fa-plus"></i> Nuevo Cliente
    </button>
  </div>
  
  <div class="cards-grid">
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-users"></i></div>
      <div class="stat-value" id="totalClientes">0</div>
      <div class="stat-label">Total Clientes</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-user-plus"></i></div>
      <div class="stat-value" id="clientesEsteMes">0</div>
      <div class="stat-label">Clientes este mes</div>
    </div>
  </div>
  
  <div class="table-container">
    <div style="margin-bottom: 20px;">
      <input type="text" id="buscarCliente" class="form-control" placeholder="🔍 Buscar por nombre, email o teléfono..." onkeyup="window.buscarCliente()">
    </div>
    <div style="overflow-x: auto;">
      <table style="width: 100%;">
        <thead>
          <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Dirección</th><th>Acciones</th></tr>
        </thead>
        <tbody id="tablaClientes"></tbody>
      </table>
    </div>
  </div>
  
  <div id="modalCliente" class="modal">
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3 id="modalClienteTitulo">Nuevo Cliente</h3>
        <span class="close-modal" onclick="window.cerrarModalCliente()">&times;</span>
      </div>
      <form id="formCliente">
        <input type="hidden" id="clienteId">
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" id="clienteNombre" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="clienteEmail" class="form-control">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="tel" id="clienteTelefono" class="form-control">
        </div>
        <div class="form-group">
          <label>Dirección</label>
          <textarea id="clienteDireccion" class="form-control" rows="2"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Cliente</button>
      </form>
    </div>
  </div>
`;

let clientesData = [];

window.cargarClientes = async () => {
  clientesData = await window.DB.getClientes();
  document.getElementById('totalClientes').innerHTML = clientesData.length;
  
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const clientesMes = clientesData.filter(c => new Date(c.createdAt) >= inicioMes);
  document.getElementById('clientesEsteMes').innerHTML = clientesMes.length;
  
  window.renderizarClientes(clientesData);
};

window.renderizarClientes = (clientes) => {
  const tbody = document.getElementById('tablaClientes');
  if (!tbody) return;
  
  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay clientes registrados</td></tr>';
    return;
  }
  
  tbody.innerHTML = clientes.map(c => `
    <tr>
      <td>${c.id}</td>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.email || '-'}</td>
      <td>${c.telefono || '-'}</td>
      <td>${c.direccion ? c.direccion.substring(0, 30) : '-'}${c.direccion?.length > 30 ? '...' : ''}</td>
      <td>
        <button class="btn" style="background: var(--warning); padding: 5px 10px; margin-right: 5px;" onclick="window.editarCliente(${c.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn" style="background: var(--danger); padding: 5px 10px;" onclick="window.eliminarCliente(${c.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
};

window.buscarCliente = () => {
  const busqueda = document.getElementById('buscarCliente').value.toLowerCase();
  if (!busqueda) {
    window.renderizarClientes(clientesData);
    return;
  }
  const filtrados = clientesData.filter(c => 
    c.nombre?.toLowerCase().includes(busqueda) ||
    c.email?.toLowerCase().includes(busqueda) ||
    c.telefono?.includes(busqueda)
  );
  window.renderizarClientes(filtrados);
};

window.mostrarModalCliente = () => {
  document.getElementById('modalClienteTitulo').innerText = 'Nuevo Cliente';
  document.getElementById('clienteId').value = '';
  document.getElementById('formCliente').reset();
  document.getElementById('modalCliente').style.display = 'flex';
};

window.cerrarModalCliente = () => {
  document.getElementById('modalCliente').style.display = 'none';
};

window.editarCliente = (id) => {
  const cliente = clientesData.find(c => c.id == id);
  if (cliente) {
    document.getElementById('modalClienteTitulo').innerText = 'Editar Cliente';
    document.getElementById('clienteId').value = cliente.id;
    document.getElementById('clienteNombre').value = cliente.nombre;
    document.getElementById('clienteEmail').value = cliente.email || '';
    document.getElementById('clienteTelefono').value = cliente.telefono || '';
    document.getElementById('clienteDireccion').value = cliente.direccion || '';
    document.getElementById('modalCliente').style.display = 'flex';
  }
};

window.eliminarCliente = async (id) => {
  if (confirm('¿Eliminar este cliente?')) {
    await window.DB.deleteCliente(id);
    await window.cargarClientes();
  }
};

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'formCliente') {
    e.preventDefault();
    const id = document.getElementById('clienteId').value;
    const nombre = document.getElementById('clienteNombre').value;
    const email = document.getElementById('clienteEmail').value;
    const telefono = document.getElementById('clienteTelefono').value;
    const direccion = document.getElementById('clienteDireccion').value;
    
    if (id) {
      await window.DB.updateCliente(id, { nombre, email, telefono, direccion });
    } else {
      await window.DB.saveCliente({ nombre, email, telefono, direccion });
    }
    window.cerrarModalCliente();
    await window.cargarClientes();
  }
});

setTimeout(() => {
  if (document.getElementById('tablaClientes')) {
    window.cargarClientes();
  }
}, 100);
