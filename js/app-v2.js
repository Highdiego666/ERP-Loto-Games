// ============================================
// LOTO GAMES POS - APP V3
// Shell persistente + sesión ERP/Supabase sincronizada
// ============================================

(function () {
  'use strict';

  const content = document.getElementById('content');
  let usuarioActual = null;
  let currentModule = 'dashboard';
  let cloudSessionCheckRunning = false;

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

  const isCloud = () => !window.LOTO_DEMO_MODE && !!window.supabase;
  const norm = value => String(value || '').trim().toLowerCase();

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

  function pintarEstadoDB(tipo, texto, detalle = '') {
    const className = {
      ok: 'db-status-ok',
      error: 'db-status-error',
      demo: 'db-status-demo',
      checking: 'db-status-checking'
    }[tipo] || 'db-status-checking';

    [document.getElementById('dbStatusSidebar'), document.getElementById('dbStatusTop')]
      .filter(Boolean)
      .forEach(el => {
        el.className = `db-status ${className}`;
        el.innerHTML = `<span class="db-dot"></span><span>${texto}</span>`;
        if (detalle) el.title = detalle;
      });
  }

  async function verificarSesionNube(expectedUser = usuarioActual) {
    if (!isCloud()) return true;
    if (cloudSessionCheckRunning) return true;

    cloudSessionCheckRunning = true;
    try {
      const { data: sessionData, error: sessionError } = await window.supabase.auth.getSession();
      if (sessionError || !sessionData?.session) return false;

      const { data: userData, error: userError } = await window.supabase.auth.getUser();
      if (userError || !userData?.user) return false;

      if (expectedUser?.email && norm(expectedUser.email) !== norm(userData.user.email)) return false;
      return true;
    } catch (error) {
      console.warn('Sesión Supabase no válida:', error);
      return false;
    } finally {
      cloudSessionCheckRunning = false;
    }
  }

  async function invalidarSesionLocal(mensaje = '') {
    usuarioActual = null;
    window.usuarioActual = null;
    window.AuthV2?.clearSession();
    if (mensaje) console.warn(mensaje);
    await mostrarLogin();
  }

  async function actualizarEstadoDB() {
    if (window.LOTO_DEMO_MODE || !window.supabase) {
      pintarEstadoDB('demo', 'Modo local', 'Supabase no está activo en esta sesión.');
      return { ok: false, modo: 'demo/local' };
    }

    if (usuarioActual && !await verificarSesionNube(usuarioActual)) {
      pintarEstadoDB('error', 'Sesión vencida', 'Vuelve a iniciar sesión para recuperar las escrituras.');
      return { ok: false, error: new Error('Sesión Supabase vencida') };
    }

    pintarEstadoDB('checking', 'Verificando…');
    try {
      if (typeof window.DB?.verificarConexionFinal === 'function') {
        const estado = await window.DB.verificarConexionFinal();
        if (estado?.ok) {
          pintarEstadoDB('ok', 'Supabase OK', 'Esquema V1 verificado.');
        } else {
          const errores = Object.entries(estado?.tablas || {})
            .filter(([, valor]) => !valor?.ok)
            .map(([tabla, valor]) => `${tabla}: ${valor?.error || 'error'}`)
            .join(' · ');
          pintarEstadoDB('error', 'Base incompleta', errores || estado?.mensaje || 'Error de esquema');
        }
        return estado;
      }

      const { error } = await window.supabase.from('productos').select('id').limit(1);
      if (error) throw error;
      pintarEstadoDB('ok', 'Supabase OK');
      return { ok: true };
    } catch (error) {
      console.error('❌ Verificación Supabase:', error);
      pintarEstadoDB('error', 'Supabase error', error.message || String(error));
      return { ok: false, error };
    }
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

    if (isCloud() && !await verificarSesionNube(usuarioActual)) {
      pintarEstadoDB('error', 'Sesión vencida', 'Vuelve a iniciar sesión.');
      await invalidarSesionLocal('La sesión Supabase dejó de ser válida.');
      return;
    }

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
    if (isCloud() && !await verificarSesionNube(usuario)) {
      window.AuthV2?.clearSession();
      await mostrarLogin();
      return;
    }

    usuarioActual = usuario;
    window.usuarioActual = usuario;
    setShellVisible(true);
    document.getElementById('loginRoot')?.remove();

    const userName = document.getElementById('userNameSidebar');
    const userRole = document.getElementById('userRoleSidebar');
    if (userName) userName.textContent = usuario.nombre || 'Usuario';
    if (userRole) userRole.textContent = usuario.rol || '';

    construirMenu(usuario);
    await actualizarEstadoDB();

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
  window.verificarEstadoDB = actualizarEstadoDB;
  window.verificarSesionNube = verificarSesionNube;

  window.cerrarSesion = async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    try {
      if (isCloud()) await window.supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('Error cerrando Supabase:', error);
    }
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

  function bindCloudAuthEvents() {
    if (!isCloud() || window.__lotoAuthSubscription) return;

    const { data } = window.supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        setTimeout(() => {
          if (usuarioActual) actualizarEstadoDB();
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        setTimeout(() => {
          if (!usuarioActual) return;
          usuarioActual = null;
          window.usuarioActual = null;
          window.AuthV2?.clearSession();
          mostrarLogin();
        }, 0);
      }
    });

    window.__lotoAuthSubscription = data?.subscription || null;
  }

  function updateDateTime() {
    const el = document.getElementById('currentDate');
    if (el) {
      el.textContent = new Date().toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  }

  async function periodicCloudCheck() {
    if (!usuarioActual || !isCloud()) return;
    const ok = await verificarSesionNube(usuarioActual);
    if (!ok) {
      pintarEstadoDB('error', 'Sesión vencida', 'Ingresa nuevamente para continuar editando.');
      await invalidarSesionLocal('Chequeo periódico: sesión Supabase inválida.');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindNavigation();
    bindCloudAuthEvents();
    updateDateTime();
    setInterval(updateDateTime, 60000);
    setInterval(periodicCloudCheck, 120000);

    const session = window.AuthV2?.getSession();
    if (session) {
      if (!isCloud() || await verificarSesionNube(session)) {
        await window.cargarSistemaLogin(session);
      } else {
        window.AuthV2?.clearSession();
        await mostrarLogin();
      }
    } else {
      await mostrarLogin();
    }
  });

  console.log('✅ App V3 cargado: sesión ERP + Supabase sincronizada');
})();
