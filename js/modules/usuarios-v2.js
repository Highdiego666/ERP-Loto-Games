// ============================================
// LOTO GAMES POS - USUARIOS V2
// Usuarios reales, contraseñas derivadas y privilegios por módulo
// ============================================

(function () {
  'use strict';

  let usuariosV2 = [];

  const MODULOS = [
    ['dashboard','Dashboard'], ['ventas','Punto de Venta'], ['productos','Productos'],
    ['inventario','Inventario'], ['servicios','Servicio Técnico'], ['clientes','Clientes'],
    ['usuarios','Usuarios'], ['reportes','Reportes'], ['traspasos','Traspasos'], ['corte','Corte de Caja']
  ];

  const DEFAULTS = {
    soporte: ['dashboard','productos','inventario','servicios','clientes','reportes','traspasos','corte'],
    vendedor: ['dashboard','ventas','productos','clientes','corte'],
    tecnico: ['dashboard','servicios','productos','inventario','clientes']
  };

  const rolLabel = rol => ({ admin:'Administrador', soporte:'Soporte', vendedor:'Vendedor', tecnico:'Técnico' }[rol] || rol);

  window.usuariosModule = () => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div><h2 style="margin:0;">👥 Usuarios del sistema</h2><p style="color:var(--text-muted);margin:4px 0 0;">Accesos, contraseñas, PIN y privilegios reales</p></div>
      <button class="btn btn-primary" onclick="window.mostrarModalUsuario()"><i class="fas fa-user-plus"></i> Nuevo usuario</button>
    </div>
    <div class="table-container" style="overflow:auto;">
      <table style="width:100%;">
        <thead><tr><th>Nombre</th><th>Usuario / email</th><th>Rol</th><th>Privilegios</th><th>PIN</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody id="tablaUsuarios"><tr><td colspan="7" style="text-align:center;">Cargando...</td></tr></tbody>
      </table>
    </div>

    <div id="modalUsuario" class="modal">
      <div class="modal-content" style="max-width:760px;">
        <div class="modal-header"><h3 id="modalUsuarioTitulo">Nuevo usuario</h3><span class="close-modal" onclick="window.cerrarModalUsuario()">&times;</span></div>
        <form id="formUsuario">
          <input type="hidden" id="usuarioId">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label>Nombre completo *</label><input id="userNombre" class="form-control" required></div>
            <div class="form-group"><label>Correo / usuario *</label><input id="userEmail" type="email" class="form-control" autocomplete="username" required></div>
            <div class="form-group"><label>Contraseña <span id="passwordRequiredLabel">*</span></label><input id="userPassword" type="password" class="form-control" minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></div>
            <div class="form-group"><label>PIN rápido (opcional)</label><input id="userPin" class="form-control" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="4 a 6 dígitos"></div>
            <div class="form-group"><label>Rol *</label><select id="userRol" class="form-control" onchange="window.cargarPrivilegiosPorRol()"><option value="admin">Administrador</option><option value="soporte">Soporte</option><option value="vendedor">Vendedor</option><option value="tecnico">Técnico</option></select></div>
            <div class="form-group"><label>Estado *</label><select id="userEstado" class="form-control"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
          </div>
          <div style="margin-top:10px;padding:14px;background:var(--bg-dark);border:1px solid var(--border);border-radius:12px;">
            <strong>🔐 Privilegios</strong>
            <div id="privilegiosContainer" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;"></div>
          </div>
          <small id="credencialesHint" style="display:block;color:var(--text-muted);margin:10px 0;">Las contraseñas y PIN nuevos no se guardan en texto plano.</small>
          <button class="btn btn-primary" style="width:100%;padding:12px;">Guardar usuario</button>
        </form>
      </div>
    </div>
  `;

  window.cargarUsuarios = async () => {
    usuariosV2 = await window.DB.getUsuarios();
    const tbody = document.getElementById('tablaUsuarios');
    if (!tbody) return;
    if (!usuariosV2.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:25px;">No hay usuarios</td></tr>';
      return;
    }
    tbody.innerHTML = usuariosV2.map(u => {
      const privs = window.AuthV2.normalizePrivileges(u.privilegios);
      const pinActivo = !!(u.pin_hash || u.pin);
      return `<tr>
        <td><strong>${u.nombre}</strong></td>
        <td>${u.email || '-'}</td>
        <td>${rolLabel(u.rol)}</td>
        <td>${u.rol === 'admin' ? '<strong>Acceso total</strong>' : `${privs.length} módulos`}</td>
        <td>${pinActivo ? '✅' : '—'}</td>
        <td><span style="color:${(u.estado||'activo')==='activo'?'#10b981':'#ef4444'};">${u.estado||'activo'}</span></td>
        <td style="white-space:nowrap;"><button class="btn" style="background:var(--warning);padding:6px 10px;" onclick="window.editarUsuario(${u.id})">✏️</button> <button class="btn" style="background:var(--danger);padding:6px 10px;" onclick="window.eliminarUsuario(${u.id})">🗑️</button></td>
      </tr>`;
    }).join('');
  };

  function selectedPrivileges() {
    return Array.from(document.querySelectorAll('[data-privilege]:checked')).map(el => el.dataset.privilege);
  }

  window.cargarPrivilegiosPorRol = (selected = null) => {
    const rol = document.getElementById('userRol')?.value || 'vendedor';
    const container = document.getElementById('privilegiosContainer');
    if (!container) return;
    if (rol === 'admin') {
      container.innerHTML = '<div style="grid-column:1/-1;color:var(--success);">👑 El administrador tiene acceso total.</div>';
      return;
    }
    const defaults = Array.isArray(selected) ? selected : (DEFAULTS[rol] || []);
    container.innerHTML = MODULOS.map(([id, label]) => `
      <label style="display:flex;gap:8px;align-items:center;padding:9px;background:var(--bg-card);border-radius:8px;cursor:pointer;">
        <input type="checkbox" data-privilege="${id}" ${defaults.includes(id)?'checked':''}> <span>${label}</span>
      </label>`).join('');
  };

  window.mostrarModalUsuario = () => {
    document.getElementById('modalUsuarioTitulo').textContent = 'Nuevo usuario';
    document.getElementById('formUsuario').reset();
    document.getElementById('usuarioId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordRequiredLabel').textContent = '*';
    document.getElementById('userRol').value = 'vendedor';
    document.getElementById('userEstado').value = 'activo';
    window.cargarPrivilegiosPorRol();
    document.getElementById('modalUsuario').style.display = 'flex';
    setTimeout(() => document.getElementById('userNombre')?.focus(), 0);
  };

  window.cerrarModalUsuario = () => { document.getElementById('modalUsuario').style.display = 'none'; };

  window.editarUsuario = id => {
    const u = usuariosV2.find(x => String(x.id) === String(id));
    if (!u) return;
    document.getElementById('modalUsuarioTitulo').textContent = 'Editar usuario';
    document.getElementById('usuarioId').value = u.id;
    document.getElementById('userNombre').value = u.nombre || '';
    document.getElementById('userEmail').value = u.email || '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('passwordRequiredLabel').textContent = '(dejar vacío para conservar)';
    document.getElementById('userPin').value = '';
    document.getElementById('userRol').value = u.rol || 'vendedor';
    document.getElementById('userEstado').value = u.estado || 'activo';
    window.cargarPrivilegiosPorRol(window.AuthV2.normalizePrivileges(u.privilegios));
    document.getElementById('modalUsuario').style.display = 'flex';
  };

  window.eliminarUsuario = async id => {
    const u = usuariosV2.find(x => String(x.id) === String(id));
    if (!u) return;
    const current = window.AuthV2.getSession();
    if (current && String(current.id) === String(id)) return alert('No puedes eliminar el usuario con el que tienes la sesión abierta.');
    const adminsActivos = usuariosV2.filter(x => x.rol === 'admin' && (x.estado||'activo') === 'activo');
    if (u.rol === 'admin' && adminsActivos.length <= 1) return alert('Debe existir al menos un administrador activo.');
    if (!confirm(`¿Eliminar a ${u.nombre}?`)) return;
    try {
      await window.DB.deleteUsuario(id);
      await window.cargarUsuarios();
    } catch (error) { alert('❌ No se pudo eliminar: ' + error.message); }
  };

  document.addEventListener('submit', async e => {
    if (e.target.id !== 'formUsuario') return;
    e.preventDefault();
    const id = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('userNombre').value.trim();
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    const password = document.getElementById('userPassword').value;
    const pin = document.getElementById('userPin').value.trim();
    const rol = document.getElementById('userRol').value;
    const estado = document.getElementById('userEstado').value;
    if (!id && password.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');
    if (password && password.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');
    if (pin && !/^\d{4,6}$/.test(pin)) return alert('El PIN debe tener entre 4 y 6 dígitos.');

    try {
      const data = { nombre, email, rol, estado, privilegios: rol === 'admin' ? [] : selectedPrivileges() };
      if (password) Object.assign(data, await window.AuthV2.createPassword(password));
      if (pin) Object.assign(data, await window.AuthV2.createPin(pin));
      if (id) await window.DB.updateUsuario(id, data);
      else await window.DB.saveUsuario(data);
      window.cerrarModalUsuario();
      await window.cargarUsuarios();
      alert('✅ Usuario guardado. Ya puede ingresar con su contraseña' + (pin ? ' o PIN.' : '.'));
    } catch (error) {
      console.error(error);
      alert('❌ Error guardando usuario: ' + error.message);
    }
  });

  console.log('✅ Usuarios V2 activo: DB + roles + privilegios + credenciales');
})();
