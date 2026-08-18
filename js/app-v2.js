// ============================================
// LOTO GAMES POS - APP V2
// Shell persistente, sesión real y permisos coherentes
// ============================================

(function () {
  'use strict';

  const content = document.getElementById('content');
  let usuarioActual = null;
  let currentModule = 'dashboard';

  const modulos = {
    dashboard: { nombre: 'Dashboard', descripcion: 'Visión general del negocio' },
    ventas: { nombre: 'Punto de Venta', descripcion: 'Venta rápida, clientes y cuenta de plaza' },
    productos: { nombre: 'Productos', descripcion: 'Catálogo, precios y productos' },
    inventario: { nombre: 'Inventario', descripcion: 'Control de stock' },
    servicios: { nombre: 'Servicio Técnico', descripcion: 'Reparaciones y mantenimiento' },
    clientes: { nombre: 'Clientes', descripcion: 'Clientes, mayoristas y locatarios' },
    usuarios: { nombre: 'Usuarios', descripcion: 'Usuarios, roles y privilegios' },
    reportes: { nombre: 'Reportes', descripcion: 'Ventas, inventario y movimientos' },
    traspasos: { nombre: 'Traspasos', descripcion: 'Movimientos entre almacenes' },
    corte: { nombre: 'Corte de Caja', descripcion: 'Cierre y resumen de caja' }
  };

  const rolesPorDefecto = {
    admin: Object.keys(modulos),
    soporte: ['dashboard', 'productos', 'inventario', 'servicios', 'clientes', 'reportes', 'traspasos', 'corte'],
    vendedor: ['dashboard', 'ventas', 'productos', 'clientes', 'corte'],
    tecnico: ['dashboard', 'servicios', 'productos', 'inventario', 'clientes']
  };

  function normalizarPrivilegios(usuario) {
    return window.AuthV2?.normalizePrivileges(usuario?.privilegios) || [];
  }

  function obtenerModulosAcceso(usuario) {
    if (!usuario) return [];
    if (usuario.rol === 'admin') return Object.keys(modulos);
    const privileges = normalizarPrivilegios(usuario).filter(p => modulos[p]);
    return privileges.length ? privileges : (rolesPorDefecto[usuario.rol] || ['dashboard']);
  }

  function tieneAcceso(moduleName) {
    return obtenerModulosAcceso(usuarioActual).includes(moduleName);
  }

  function setShellVisible(visible) {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = visible ? 'flex' : 'none';
    if (main) main.style.display = visible ? 'flex' : 'none';
  }

  async function mostrarLogin() {
    setShellVisible(false);
    document.getElementById('loginRoot')?.remove();
    if (typeof window.loginModule !== 'function') {
      console.error('❌ loginModule no disponible');
      return;
    }
    document.body.insertAdjacentHTML('beforeend', window.loginModule());
    setTimeout(() => window.inicializarTecladoPIN?.(), 30);
  }

  function construirMenu(usuario) {
    const accesos = obtenerModulosAcceso(usuario);
    document.querySelectorAll('.nav-item[data-module]').forEach(item => {
      item.style.display = accesos.includes(item.dataset.module) ? 'flex' : 'none';
    });
  }

  async function inicializarModulo(moduleName) {
    switch (moduleName) {
      case 'dashboard': await window.actualizarDashboard?.(); break;
      case 'ventas': await window.cargarProductosVenta?.(); break;
      case 'productos': await window.cargarProductos?.(); break;
      case 'inventario': await window.cargarInventario?.(); break;
      case 'servicios': await window.cargarServicios?.(); break;
      case 'clientes': await window.cargarClientes?.(); break;
      case 'usuarios': await window.cargarUsuarios?.(); break;
      case 'reportes': await window.cambiarReporte?.('corte'); break;
      case 'traspasos':
        await window.cargarProductosTraspaso?.();
        await window.cargarTraspasos?.();
        break;
      case 'corte': await window.cargarCorte?.(); break;
    }
  }

  async function loadModule(moduleName) {
    if (!usuarioActual) return mostrarLogin();
    if (!tieneAcceso(moduleName)) {
      alert('No tienes privilegios para acceder a este módulo.');
      return;
    }

    const fn = window[`${moduleName}Module`];
    if (typeof fn !== 'function') {
      content.innerHTML = `<div class="error-module"><h3>Módulo no disponible</h3><p>${moduleName}</p></div>`;
      return;
    }

    currentModule = moduleName;
    content.innerHTML = fn();
    const meta = modulos[moduleName] || { nombre: moduleName, descripcion: '' };
    const title = document.getElementById('pageTitle');
    const desc = document.getElementById('pageDescription');
    if (title) title.textContent = meta.nombre;
    if (desc) desc.textContent = meta.descripcion;

    document.querySelectorAll('.nav-item[data-module]').forEach(item => {
      item.classList.toggle('active', item.dataset.module === moduleName);
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      await inicializarModulo(moduleName);
    } catch (error) {
      console.error(`❌ Error inicializando ${moduleName}:`, error);
      const msg = document.createElement('div');
      msg.style.cssText = 'margin:12px 0;padding:12px;border-radius:10px;background:rgba(239,68,68,.12);color:#ef4444;';
      msg.textContent = `Error al cargar datos: ${error.message}`;
      content.prepend(msg);
    }
  }

  window.cargarSistemaLogin = async usuario => {
    usuarioActual = usuario;
    window.usuarioActual = usuario;
    setShellVisible(true);
    document.getElementById('loginRoot')?.remove();

    const userName = document.getElementById('userNameSidebar');
    const userRole = document.getElementById('userRoleSidebar');
    if (userName) userName.textContent = usuario.nombre || 'Usuario';
    if (userRole) userRole.textContent = usuario.rol || '';
    construirMenu(usuario);

    const accesos = obtenerModulosAcceso(usuario);
    const inicial = accesos.includes('ventas') && usuario.rol === 'vendedor'
      ? 'ventas'
      : (accesos.includes('dashboard') ? 'dashboard' : accesos[0]);
    if (inicial) await loadModule(inicial);
  };

  window.loadModule = loadModule;
  window.getCurrentModule = () => currentModule;
  window.getUsuarioActual = () => usuarioActual;
  window.getModulosAcceso = () => obtenerModulosAcceso(usuarioActual);

  window.cerrarSesion = () => {
    if (!confirm('¿Cerrar sesión?')) return;
    window.AuthV2?.clearSession();
    location.reload();
  };

  function bindNavigation() {
    document.querySelectorAll('.nav-item[data-module]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        loadModule(item.dataset.module);
      });
    });

    const footer = document.querySelector('.sidebar-footer');
    if (footer && !document.getElementById('logoutBtn')) {
      const btn = document.createElement('button');
      btn.id = 'logoutBtn';
      btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión';
      btn.style.cssText = 'background:#ef4444;color:white;border:0;padding:10px;border-radius:10px;width:100%;margin-top:12px;cursor:pointer;font-weight:600;';
      btn.addEventListener('click', window.cerrarSesion);
      footer.appendChild(btn);
    }
  }

  function updateDateTime() {
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindNavigation();
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const session = window.AuthV2?.getSession();
    if (session) await window.cargarSistemaLogin(session);
    else await mostrarLogin();
  });

  console.log('✅ App V2 cargado: shell persistente + permisos + sesiones V2');
})();
