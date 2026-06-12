// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let currentModule = 'dashboard';
let usuarioActual = null;

// Función para mostrar el login
function mostrarLogin() {
  content.innerHTML = window.loginModule();
  
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errorDiv = document.getElementById('loginError');
      
      const result = await window.verificarLogin(email, password);
      
      if (result.success) {
        usuarioActual = result.usuario;
        errorDiv.style.display = 'none';
        cargarSistema();
      } else {
        errorDiv.style.display = 'block';
      }
    });
  }
}

// Función para cargar el sistema después del login
function cargarSistema() {
  // Mostrar barra lateral y contenido principal
  document.querySelector('.sidebar').style.display = 'flex';
  document.querySelector('.main-content').style.display = 'flex';
  
  // Actualizar nombre de usuario en la barra lateral
  const userNameSpan = document.getElementById('userNameSidebar');
  const userRoleSpan = document.getElementById('userRoleSidebar');
  if (userNameSpan) userNameSpan.innerText = usuarioActual?.nombre || 'Usuario';
  if (userRoleSpan) userRoleSpan.innerText = window.getNombreRol?.(usuarioActual?.rol) || usuarioActual?.rol || 'Usuario';
  
  // Cargar dashboard
  loadModule('dashboard');
}

// Función principal para cargar módulos
async function loadModule(moduleName) {
  currentModule = moduleName;
  const moduleFunction = window[`${moduleName}Module`];
  
  console.log(`📦 Cargando módulo: ${moduleName}`, typeof moduleFunction === 'function' ? '✅' : '❌');
  
  if (typeof moduleFunction === 'function') {
    content.innerHTML = moduleFunction();
    
    const titles = {
      dashboard: 'Dashboard',
      ventas: 'Punto de Venta',
      productos: 'Productos',
      inventario: 'Inventario',
      servicios: 'Servicio Técnico',
      clientes: 'Clientes',
      usuarios: 'Usuarios',
      reportes: 'Reportes'
    };
    
    const descriptions = {
      dashboard: 'Visión general del negocio',
      ventas: 'Registro de ventas y carrito',
      productos: 'Gestión de productos e inventario',
      inventario: 'Control de stock y carga masiva',
      servicios: 'Gestión de reparaciones y mantenimiento',
      clientes: 'Registro y gestión de clientes',
      usuarios: 'Administración de usuarios y roles',
      reportes: 'Estadísticas y análisis de ventas'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    const pageDescription = document.getElementById('pageDescription');
    
    if (pageTitle) pageTitle.innerText = titles[moduleName] || moduleName;
    if (pageDescription) pageDescription.innerText = descriptions[moduleName] || 'Módulo del sistema';
    
    setTimeout(async () => {
      console.log(`🔄 Inicializando datos de: ${moduleName}`);
      
      try {
        switch(moduleName) {
          case 'dashboard':
            if (window.actualizarDashboard) await window.actualizarDashboard();
            break;
          case 'productos':
            if (window.cargarProductos) await window.cargarProductos();
            break;
          case 'ventas':
            if (window.cargarProductosVenta) await window.cargarProductosVenta();
            break;
          case 'inventario':
            if (window.cargarInventario) await window.cargarInventario();
            break;
          case 'servicios':
            if (window.cargarServicios) await window.cargarServicios();
            break;
          case 'clientes':
            if (window.cargarClientes) await window.cargarClientes();
            break;
          case 'usuarios':
            if (window.cargarUsuarios) await window.cargarUsuarios();
            break;
          case 'reportes':
            if (window.actualizarReportes) await window.actualizarReportes();
            break;
        }
      } catch (error) {
        console.error(`❌ Error al inicializar ${moduleName}:`, error);
      }
    }, 200);
  } else {
    content.innerHTML = `
      <div style="background: var(--bg-card); border-radius: 16px; padding: 40px; text-align: center;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--danger);"></i>
        <h3>Módulo no disponible</h3>
        <p>El módulo "${moduleName}" está en desarrollo.</p>
      </div>
    `;
  }
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.module === moduleName) {
      item.classList.add('active');
    }
  });
}

// Event listeners para el menú
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado');
  
  // Ocultar sidebar y contenido principal hasta login
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.main-content').style.display = 'none';
  
  // Verificar sesión existente
  const session = window.verificarSesion();
  if (session) {
    usuarioActual = session;
    cargarSistema();
  } else {
    mostrarLogin();
  }
  
  // Configurar eventos del menú (después del login)
  const menuItems = document.querySelectorAll('.nav-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const module = item.dataset.module;
      loadModule(module);
    });
  });
});

// Función para cerrar sesión (agregar al sidebar)
window.cerrarSesion = () => {
  if (confirm('¿Cerrar sesión?')) {
    window.logout();
  }
};

// Agregar botón de cerrar sesión al sidebar
setTimeout(() => {
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (sidebarFooter && !document.getElementById('logoutBtn')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión';
    logoutBtn.style.cssText = 'background: var(--danger); color: white; border: none; padding: 10px; border-radius: 10px; width: 100%; margin-top: 10px; cursor: pointer; font-weight: bold;';
    logoutBtn.onclick = () => window.cerrarSesion();
    sidebarFooter.appendChild(logoutBtn);
  }
}, 500);

// Actualizar fecha
function updateDateTime() {
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    const now = new Date();
    dateElement.innerText = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

updateDateTime();
setInterval(updateDateTime, 60000);

console.log('✅ Sistema listo');
