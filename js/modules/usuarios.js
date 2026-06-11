window.usuariosModule = () => {
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h2>👥 Usuarios del Sistema</h2>
                <p style="color: var(--text-muted);">Gestiona los accesos al sistema</p>
            </div>
            <button class="btn btn-primary" onclick="window.mostrarModalUsuario()">
                <i class="fas fa-plus"></i> Nuevo Usuario
            </button>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tablaUsuarios">
                </tbody>
            </table>
        </div>
        
        <div id="modalUsuario" class="modal">
            <div class="modal-content">
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
                        <label>Rol *</label>
                        <select id="userRol" class="form-control">
                            <option value="admin">Administrador</option>
                            <option value="vendedor">Vendedor</option>
                            <option value="tecnico">Técnico</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Estado *</label>
                        <select id="userEstado" class="form-control">
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Usuario</button>
                </form>
            </div>
        </div>
    `;
};

window.cargarUsuarios = () => {
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const tbody = document.getElementById('tablaUsuarios');
    if (!tbody) return;
    
    tbody.innerHTML = usuarios.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.nombre}</td>
            <td>${u.email}</td>
            <td>${u.rol}</td>
            <td><span style="color: ${u.estado === 'activo' ? 'var(--success)' : 'var(--danger)'}">${u.estado}</span></td>
            <td>
                <button class="btn" style="background: var(--warning); padding: 5px 10px; margin-right: 5px;" onclick="window.editarUsuario(${u.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn" style="background: var(--danger); padding: 5px 10px;" onclick="window.eliminarUsuario(${u.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.mostrarModalUsuario = () => {
    document.getElementById('modalUsuarioTitulo').innerText = 'Nuevo Usuario';
    document.getElementById('usuarioId').value = '';
    document.getElementById('formUsuario').reset();
    document.getElementById('modalUsuario').style.display = 'flex';
};

window.cerrarModalUsuario = () => {
    document.getElementById('modalUsuario').style.display = 'none';
};

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
        document.getElementById('modalUsuario').style.display = 'flex';
    }
};

window.eliminarUsuario = (id) => {
    if (confirm('¿Eliminar este usuario?')) {
        let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        usuarios = usuarios.filter(u => u.id != id);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        window.cargarUsuarios();
    }
};

document.addEventListener('submit', (e) => {
    if (e.target.id === 'formUsuario') {
        e.preventDefault();
        const id = document.getElementById('usuarioId').value;
        const nombre = document.getElementById('userNombre').value;
        const email = document.getElementById('userEmail').value;
        const rol = document.getElementById('userRol').value;
        const estado = document.getElementById('userEstado').value;
        
        let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        
        if (id) {
            const index = usuarios.findIndex(u => u.id == id);
            if (index !== -1) {
                usuarios[index] = { ...usuarios[index], nombre, email, rol, estado };
            }
        } else {
            usuarios.push({
                id: Date.now(),
                nombre,
                email,
                rol,
                estado,
                createdAt: new Date().toISOString()
            });
        }
        
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        window.cerrarModalUsuario();
        window.cargarUsuarios();
    }
});
