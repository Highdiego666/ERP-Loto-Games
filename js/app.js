// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let currentModule = 'dashboard';
let usuarioActual = null;

function mostrarLogin() {
  console.log("🔐 Mostrando login...");
  if (typeof window.loginModule === 'function') {
    content.innerHTML = window.loginModule();
    setTimeout(() => {
      if (window.inicializarTecladoPIN) window.inicializarTecladoPIN();
    }, 100);
  } else {
    content.innerHTML = '<div style="color:white;text-align:center;padding:50px"><h2>Error</h2><p>Login no disponible</p></div>';
  }
}

window.cargarSistemaLogin = () => {
  console.log("🎉 Cargando sistema para:", usuarioActual?.nombre);
  document.querySelector('.sidebar').style.display = 'flex';
  document.querySelector('.main-content').style.display = 'flex';
  const userNameSpan = document.getElementById('userNameSidebar');
  const userRoleSpan = document.getElementById('userRoleSidebar');
  if (userNameSpan) userNameSpan.innerText = usuarioActual?.nombre || 'Usuario';
  if (userRoleSpan) userRoleSpan.innerText = usuarioActual?.rol || 'Usuario';
  loadModule('dashboard');
};

async function loadModule(moduleName) {
  currentModule = moduleName;
  const fn = window[`${moduleName}Module`];
  if (typeof fn === 'function') {
    content.innerHTML = fn();
    const titles = { dashboard: 'Dashboard', ventas: 'Ventas', productos: 'Productos', inventario: 'Inventario', servicios: 'Servicios', clientes: 'Clientes', usuarios: 'Usuarios', reportes: 'Reportes' };
    document.getElementById('pageTitle').innerText = titles[moduleName] || moduleName;
    setTimeout(async () => {
      if (moduleName === 'dashboard' && window.actualizarDashboard) await window.actualizarDashboard();
      if (moduleName === 'productos' && window.cargarProductos) await window.cargarProductos();
      if (moduleName === 'ventas' && window.cargarProductosVenta) await window.cargarProductosVenta();
      if (moduleName === 'inventario' && window.cargarInventario) await window.cargarInventario();
      if (moduleName === 'servicios' && window.cargarServicios) await window.cargarServicios();
      if (moduleName === 'clientes' && window.cargarClientes) await window.cargarClientes();
      if (moduleName === 'usuarios' && window.cargarUsuarios) await window.cargarUsuarios();
      if (moduleName === 'reportes' && window.actualizarReportes) await window.actualizarReportes();
    }, 200);
  }
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.module === moduleName) item.classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado');
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.main-content').style.display = 'none';
  const session = window.verificarSesion ? window.verificarSesion() : null;
  if (session) {
    usuarioActual = session;
    window.cargarSistemaLogin();
  } else {
    mostrarLogin();
  }
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      loadModule(item.dataset.module);
    });
  });
});

window.cerrarSesion = () => { if (confirm('¿Cerrar sesión?')) window.logout?.(); };
setTimeout(() => {
  const footer = document.querySelector('.sidebar-footer');
  if (footer && !document.getElementById('logoutBtn')) {
    const btn = document.createElement('button');
    btn.id = 'logoutBtn';
    btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión';
    btn.style.cssText = 'background:#ef4444;color:white;border:none;padding:12px;border-radius:12px;width:100%;margin-top:15px;cursor:pointer';
    btn.onclick = () => window.cerrarSesion();
    footer.appendChild(btn);
  }
}, 500);

function updateDateTime() {
  const el = document.getElementById('currentDate');
  if (el) el.innerText = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
updateDateTime();
setInterval(updateDateTime, 60000);

console.log('✅ Sistema listo');
