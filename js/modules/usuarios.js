window.usuariosModule = () => `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <div>
      <h2>👥 Usuarios del Sistema</h2>
      <p style="color: var(--text-muted);">Gestiona accesos, roles y privilegios</p>
    </div>
    <button class="btn btn-primary" onclick="window.mostrarModalUsuario()">
      <i class="fas fa-plus"></i> Nuevo Usuario
    </button>
  </div>
  
  <!-- Tabla de usuarios -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Privilegios</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tablaUsuarios">
      </tbody>
    </table>
  </div>
  
  <!-- Modal para crear/editar usuario -->
  <div id="modalUsuario" class="modal">
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3 id="modalUsuarioTitulo">Nuevo Usuario</h3>
        <span class="close-modal" onclick="window.cerrarModalUsuario()">&times;</span>
      </div>
      <form id="formUsuario">
        <input type="hidden" id="usuarioId">
        
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" id="userNombre" class="form-control" required>
        </div>
        
        <div class="form-group">
          <label>Email *</label>
          <input type="email" id="userEmail" class="form-control" required>
        </div>
        
        <div class="form-group">
          <label>Contraseña</label>
          <input type="password" id="userPassword" class="form-control" placeholder="Dejar en blanco para mantener actual">
          <small style="color: var(--text-muted);">Solo para nuevos usuarios o para cambiar contraseña</small>
        </div>
        
        <div class="form-group">
          <label>Rol *</label>
          <select id="userRol" class="form-control" onchange="window.cargarPrivilegiosPorRol()">
            <option value="admin">👑 Administrador - Acceso total</option>
            <option value="soporte">🔧 Soporte Técnico - Gestión de servicios y productos</option>
            <option value="vendedor">🛒 Vendedor - Solo ventas y clientes</option>
            <option value="tecnico">⚙️ Técnico - Solo servicio técnico</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Privilegios específicos:</label>
          <div id="privilegiosContainer" style="background: var(--bg-dark); padding: 15px; border-radius: 10px; margin-top: 10px;">
            <!-- Los privilegios se cargarán dinámicamente -->
          </div>
        </div>
        
        <div class="form-group">
          <label>Estado *</label>
          <select id="userEstado" class="form-control">
            <option value="activo">🟢 Activo</option>
            <option value="inactivo">🔴 Inactivo</option>
          </select>
        </div>
        
        <button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Usuario</button>
      </form>
    </div>
  </div>
  
  <!-- Modal para ver/editar privilegios -->
  <div id="modalPrivilegios" class="modal">
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3>🔐 Editar Privilegios</h3>
        <span class="close-modal" onclick="window.cerrarModalPrivilegios()">&times;</span>
      </div>
      <div id="privilegiosLista"></div>
      <button class="btn btn-primary" onclick="window.guardarPrivilegios()" style="width: 100%; margin-top: 20px;">Guardar Cambios</button>
    </div>
  </div>
`;

// Definición de privilegios disponibles
window.privilegiosDisponibles = {
  admin: [
    { id: 'acceso_total', nombre: 'Acceso Total al Sistema', descripcion: 'Puede hacer cualquier cosa' }
  ],
  soporte: [
    { id: 'ver_dashboard', nombre: 'Ver Dashboard', descripcion: 'Ver estadísticas del negocio', activo: true },
    { id: 'gestionar_productos', nombre: 'Gestionar Productos', descripcion: 'Crear, editar, eliminar productos', activo: true },
    { id: 'gestionar_inventario', nombre: 'Gestionar Inventario', descripcion: 'Control de stock y alertas', activo: true },
    { id: 'gestionar_servicios', nombre: 'Gestionar Servicios Técnicos', descripcion: 'Reparaciones, garantías, mantenimiento especializado', activo: true },
    { id: 'ver_ventas', nombre: 'Ver Ventas', descripcion: 'Consultar historial de ventas', activo: true },
    { id: 'gestionar_clientes', nombre: 'Gestionar Clientes', descripcion: 'CRUD de clientes', activo: false },
    { id: 'gestionar_usuarios', nombre: 'Gestionar Usuarios', descripcion: 'Crear/editar usuarios del sistema', activo: false }
  ],
  vendedor: [
    { id: 'ver_dashboard', nombre: 'Ver Dashboard', descripcion: 'Ver estadísticas básicas', activo: true },
    { id: 'realizar_ventas', nombre: 'Realizar Ventas', descripcion: 'Crear nuevas ventas', activo: true },
    { id: 'gestionar_clientes', nombre: 'Gestionar Clientes', descripcion: 'Registrar y editar clientes', activo: true },
    { id: 'ver_productos', nombre: 'Ver Productos', descripcion: 'Consultar productos disponibles', activo: true },
    { id: 'ver_servicios', nombre: 'Ver Servicios', descripcion: 'Consultar servicios', activo: false }
  ],
  tecnico: [
    { id: 'ver_servicios', nombre: 'Ver Servicios', descripcion: 'Consultar lista de servicios', activo: true },
    { id: 'registrar_servicios', nombre: 'Registrar Servicios', descripcion: 'Crear nuevas órdenes de servicio', activo: true },
    { id: 'actualizar_servicios', nombre: 'Actualizar Servicios', descripcion: 'Cambiar estado de reparaciones', activo: true },
    { id: 'ver_productos', nombre: 'Ver Productos', descripcion: 'Consultar repuestos y piezas', activo: true },
    { id: 'ver_inventario', nombre: 'Ver Inventario', descripcion: 'Consultar stock de repuestos', activo: true }
  ]
};

// Cargar usuarios en la tabla
window.cargarUsuarios = () => {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const tbody = document.getElementById('tablaUsuarios');
  if (!tbody) return;
  
  // Usuario actual (simulado - después se implementará login)
  const usuarioActual = 'soporte';
  
  tbody.innerHTML = usuarios.map(u => {
    // Verificar si el usuario actual puede editar este usuario
    const puedeEditar = usuarioActual === 'admin' || u.rol !== 'admin';
    
    return `
      <tr>
        <td>${u.id}</td>
        <td><strong>${u.nombre}</strong></td>
        <td>${u.email}</td>
        <td><span style="background: ${window.getColorRol(u.rol)}; padding: 4px 8px; border-radius: 8px; font-size: 12px;">${window.getIconoRol(u.rol)} ${window.getNombreRol(u.rol)}</span></td>
        <td>
          <button class="btn" style="background: var(--primary); padding: 5px 10px; font-size: 11px;" onclick="window.verPrivilegios(${u.id})">
            <i class="fas fa-key"></i> Ver
          </button>
        </td>
        <td><span style="color: ${u.estado === 'activo' ? '#10b981' : '#ef4444'}">${u.estado === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}</span></td>
        <td>
          ${puedeEditar ? `
            <button class="btn" style="background: var(--warning); padding: 5px 10px; margin-right: 5px;" onclick="window.editarUsuario(${u.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn" style="background: var(--danger); padding: 5px 10px;" onclick="window.eliminarUsuario(${u.id})">
              <i class="fas fa-trash"></i>
            </button>
          ` : '<span style="color: var(--text-muted);">🔒</span>'}
        </td>
      </table>
    `;
  }).join('');
};

// Funciones auxiliares para roles
window.getNombreRol = (rol) => {
  const roles = {
    admin: 'Administrador',
    soporte: 'Soporte Técnico',
    vendedor: 'Vendedor',
    tecnico: 'Técnico'
  };
  return roles[rol] || rol;
};

window.getIconoRol = (rol) => {
  const iconos = {
    admin: '👑',
    soporte: '🔧',
    vendedor: '🛒',
    tecnico: '⚙️'
  };
  return iconos[rol] || '👤';
};

window.getColorRol = (rol) => {
  const colores = {
    admin: '#6366f1',
    soporte: '#f59e0b',
    vendedor: '#10b981',
    tecnico: '#8b5cf6'
  };
  return colores[rol] || '#64748b';
};

// Cargar privilegios según el rol seleccionado
window.cargarPrivilegiosPorRol = () => {
  const rol = document.getElementById('userRol').value;
  const privilegios = window.privilegiosDisponibles[rol] || [];
  const container = document.getElementById('privilegiosContainer');
  
  if (rol === 'admin') {
    container.innerHTML = '<p style="color: var(--success);">👑 Administrador tiene acceso TOTAL a todas las funciones del sistema.</p>';
  } else {
    container.innerHTML = `
      <div style="display: grid; gap: 12px;">
        ${privilegios.map(p => `
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px; background: var(--bg-card); border-radius: 8px;">
            <input type="checkbox" name="privilegio_${p.id}" ${p.activo ? 'checked' : ''} style="width: 18px; height: 18px;">
            <div style="flex: 1;">
              <strong>${p.nombre}</strong>
              <br>
              <small style="color: var(--text-muted);">${p.descripcion}</small>
            </div>
          </label>
        `).join('')}
      </div>
    `;
  }
};

// Mostrar modal de usuario
window.mostrarModalUsuario = () => {
  document.getElementById('modalUsuarioTitulo').innerText = 'Nuevo Usuario';
  document.getElementById('usuarioId').value = '';
  document.getElementById('formUsuario').reset();
  document.getElementById('userPassword').required = true;
  window.cargarPrivilegiosPorRol();
  document.getElementById('modalUsuario').style.display = 'flex';
};

// Cerrar modal de usuario
window.cerrarModalUsuario = () => {
  document.getElementById('modalUsuario').style.display = 'none';
};

// Ver privilegios de un usuario
window.verPrivilegios = (id) => {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const usuario = usuarios.find(u => u.id == id);
  if (usuario) {
    const privilegiosUsuario = usuario.privilegios || window.privilegiosDisponibles[usuario.rol] || [];
    const container = document.getElementById('privilegiosLista');
    container.innerHTML = `
      <div style="margin-bottom: 15px;">
        <strong>👤 Usuario:</strong> ${usuario.nombre}<br>
        <strong>🔧 Rol:</strong> ${window.getNombreRol(usuario.rol)} ${window.getIconoRol(usuario.rol)}
      </div>
      <div style="background: var(--bg-dark); padding: 15px; border-radius: 10px;">
        <strong>📋 Privilegios asignados:</strong>
        <div style="margin-top: 10px;">
          ${privilegiosUsuario.map(p => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--border);">
              <span>${p.activo !== false ? '✅' : '❌'}</span>
              <div>
                <strong>${p.nombre}</strong>
                <br><small style="color: var(--text-muted);">${p.descripcion}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.getElementById('modalPrivilegios').style.display = 'flex';
  }
};

// Cerrar modal de privilegios
window.cerrarModalPrivilegios = () => {
  document.getElementById('modalPrivilegios').style.display = 'none';
};

// Editar usuario
window.editarUsuario = (id) => {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const usuario = usuarios.find(u => u.id == id);
  if (usuario) {
    document.getElementById('modalUsuarioTitulo').innerText = 'Editar Usuario';
    document.getElementById('usuarioId').value = usuario.id;
    document.getElementById('userNombre').value = usuario.nombre;
    document.getElementById('userEmail').value = usuario.email;
    document.getElementById('userRol').value = usuario.rol;
    document.getElementById('userEstado').value = usuario.estado;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    window.cargarPrivilegiosPorRol();
    document.getElementById('modalUsuario').style.display = 'flex';
  }
};

// Eliminar usuario
window.eliminarUsuario = (id) => {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const usuario = usuarios.find(u => u.id == id);
  if (usuario && usuario.rol === 'admin') {
    alert('⚠️ No se puede eliminar al administrador principal');
    return;
  }
  if (confirm(`¿Eliminar a ${usuario?.nombre}?`)) {
    let usuariosFiltrados = usuarios.filter(u => u.id != id);
    localStorage.setItem('usuarios', JSON.stringify(usuariosFiltrados));
    window.cargarUsuarios();
    alert('✅ Usuario eliminado correctamente');
  }
};

// Guardar usuario
document.addEventListener('submit', (e) => {
  if (e.target.id === 'formUsuario') {
    e.preventDefault();
    const id = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('userNombre').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const rol = document.getElementById('userRol').value;
    const estado = document.getElementById('userEstado').value;
    
    let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    
    // Recolectar privilegios
    let privilegios = [];
    if (rol !== 'admin') {
      const privilegiosBase = window.privilegiosDisponibles[rol] || [];
      privilegios = privilegiosBase.map(p => ({
        ...p,
        activo: document.getElementById(`privilegio_${p.id}`)?.checked || false
      }));
    } else {
      privilegios = window.privilegiosDisponibles.admin;
    }
    
    if (id) {
      // Editar existente
      const index = usuarios.findIndex(u => u.id == id);
      if (index !== -1) {
        usuarios[index] = { 
          ...usuarios[index], 
          nombre, 
          email, 
          rol, 
          estado,
          privilegios
        };
        if (password) usuarios[index].password = password;
      }
      alert('✅ Usuario actualizado correctamente');
    } else {
      // Crear nuevo
      const nuevoUsuario = {
        id: Date.now(),
        nombre: nombre,
        email: email,
        password: password,
        rol: rol,
        estado: estado,
        privilegios: privilegios,
        fechaCreacion: new Date().toISOString()
      };
      usuarios.push(nuevoUsuario);
      alert('✅ Usuario creado correctamente');
    }
    
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    window.cerrarModalUsuario();
    window.cargarUsuarios();
  }
});

// Cargar usuarios al iniciar el módulo
setTimeout(() => {
  if (document.getElementById('tablaUsuarios')) {
    window.cargarUsuarios();
  }
}, 100);

// Agregar usuario de Soporte Técnico por defecto si no existe
const usuariosIniciales = JSON.parse(localStorage.getItem('usuarios') || '[]');
if (!usuariosIniciales.find(u => u.rol === 'soporte')) {
  usuariosIniciales.push({
    id: Date.now(),
    nombre: 'Soporte Técnico',
    email: 'soporte@lotogames.com',
    password: 'soporte123',
    rol: 'soporte',
    estado: 'activo',
    privilegios: window.privilegiosDisponibles.soporte,
    fechaCreacion: new Date().toISOString()
  });
  localStorage.setItem('usuarios', JSON.stringify(usuariosIniciales));
}

console.log('✅ Módulo de usuarios mejorado cargado - Roles y privilegios disponibles');
