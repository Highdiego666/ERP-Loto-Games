// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let currentModule = 'dashboard';
let usuarioActual = null;

// Función para mostrar el login con PIN
function mostrarLogin() {
  console.log("Mostrando pantalla de login...");
  if (typeof window.loginModule === 'function') {
    content.innerHTML = window.loginModule();
    setTimeout(() => {
      if (window.inicializarTecladoPIN) window.inicializarTecladoPIN();
    }, 100);
  } else {
    console.error("loginModule no está disponible");
    content.innerHTML = '<div style="text-align:center;padding:50px"><h2>Error</h2><p>Módulo de login no encontrado</p><p>Verifica que el archivo login.js existe</p></div>';
  }
}

// Función para cargar el sistema después del login
window.cargarSistemaLogin = () => {
  console.log("✅ Cargando sistema para:", usuarioActual?.nombre);
  
  // Mostrar barra lateral y contenido principal
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  if (sidebar) sidebar.style.display = 'flex';
  if (mainContent) mainContent.style.display = 'flex';
  
  // Actualizar nombre de usuario en la barra lateral
  const userNameSpan = document.getElementById('userNameSidebar');
  const userRoleSpan = document.getElementById('userRoleSidebar');
  if (userNameSpan) userNameSpan.innerText = usuarioActual?.nombre || 'Usuario';
  if (userRoleSpan) userRoleSpan.innerText = usuarioActual?.rol || 'Usuario';
  
  // Cargar dashboard
  loadModule('dashboard');
};

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
          default:
            console.log(`ℹ️ Módulo ${moduleName} sin inicialización específica`);
        }
      } catch (error) {
        console.error(`❌ Error al inicializar ${moduleName}:`, error);
      }
    }, 200);
    
  } else {
    console.error(`❌ Módulo ${moduleName} no encontrado`);
    content.innerHTML = `
      <div style="background: var(--bg-card); border-radius: 16px; padding: 40px; text-align: center; border: 1px solid var(--border);">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--danger); margin-bottom: 20px;"></i>
        <h3>Módulo no disponible</h3>
        <p style="color: var(--text-muted);">El módulo "${moduleName}" está en desarrollo o no se cargó correctamente.</p>
        <p style="color: var(--text-muted);">Verifica la consola (F12) para más detalles.</p>
      </div>
    `;
  }
  
  // Actualizar navegación activa
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.module === moduleName) {
      item.classList.add('active');
    }
  });
}

// Event listeners para el menú
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado, asignando event listeners...');
  
  // Ocultar sidebar y contenido principal hasta login
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  if (sidebar) sidebar.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';
  
  // Verificar sesión existente
  const session = window.verificarSesion ? window.verificarSesion() : null;
  if (session) {
    usuarioActual = session;
    window.cargarSistemaLogin();
  } else {
    mostrarLogin();
  }
  
  // Configurar eventos del menú
  const menuItems = document.querySelectorAll('.nav-item');
  console.log(`🔗 Encontrados ${menuItems.length} items en el menú`);
  
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const module = item.dataset.module;
      console.log(`🖱️ Click en: ${module}`);
      loadModule(module);
    });
  });
});

// Función para cerrar sesión
window.cerrarSesion = () => {
  if (confirm('¿Cerrar sesión?')) {
    if (window.logout) window.logout();
  }
};

// Agregar botón de cerrar sesión al sidebar
setTimeout(() => {
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (sidebarFooter && !document.getElementById('logoutBtn')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión';
    logoutBtn.style.cssText = 'background: var(--danger); color: white; border: none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 15px; cursor: pointer; font-weight: bold; font-size: 14px;';
    logoutBtn.onclick = () => window.cerrarSesion();
    sidebarFooter.appendChild(logoutBtn);
  }
}, 500);

// Función auxiliar para obtener nombre del rol
window.getNombreRol = (rol) => {
  const roles = {
    admin: 'Administrador',
    soporte: 'Soporte Técnico',
    vendedor: 'Vendedor',
    tecnico: 'Técnico'
  };
  return roles[rol] || rol;
};

// Actualizar fecha y hora
function updateDateTime() {
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.innerText = now.toLocaleDateString('es-MX', options);
  }
}

// Inicializar fecha y actualizar cada minuto
updateDateTime();
setInterval(updateDateTime, 60000);

// Verificar conexión con Supabase
setTimeout(() => {
  if (window.supabase) {
    console.log('✅ Conexión con Supabase establecida');
  } else {
    console.warn('⚠️ Supabase no está disponible');
  }
  
  if (window.DB) {
    console.log('✅ Base de datos lista');
  } else {
    console.warn('⚠️ DB no está disponible');
  }
}, 500);

// Verificar todos los módulos cargados
setTimeout(() => {
  const modules = {
    'dashboard': typeof window.dashboardModule,
    'ventas': typeof window.ventasModule,
    'productos': typeof window.productosModule,
    'inventario': typeof window.inventarioModule,
    'servicios': typeof window.serviciosModule,
    'clientes': typeof window.clientesModule,
    'usuarios': typeof window.usuariosModule,
    'reportes': typeof window.reportesModule,
    'login': typeof window.loginModule
  };
  
  const allLoaded = Object.values(modules).every(t => t === 'function');
  const missing = Object.entries(modules).filter(([k, v]) => v !== 'function').map(([k]) => k);
  
  if (allLoaded) {
    console.log('✅ Todos los módulos cargados correctamente');
  } else {
    console.warn('⚠️ Módulos faltantes:', missing);
  }
  console.log('📦 Estado de módulos:', modules);
}, 1000);

console.log('✅ Sistema listo');
