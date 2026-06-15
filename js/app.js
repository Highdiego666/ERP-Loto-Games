// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let currentModule = 'dashboard';
let usuarioActual = null;

// ========== FUNCIONES DE LOGIN ==========
function mostrarLogin() {
    console.log("🔐 Mostrando pantalla de login...");
    if (typeof window.loginModule === 'function') {
        content.innerHTML = window.loginModule();
        setTimeout(() => {
            if (window.inicializarTecladoPIN) {
                window.inicializarTecladoPIN();
                console.log("⌨️ Teclado inicializado");
            }
        }, 100);
    } else {
        console.error("❌ loginModule no disponible");
        content.innerHTML = '<div style="text-align:center;padding:50px;color:white"><h2>Error</h2><p>Módulo de login no encontrado</p></div>';
    }
}

// Función llamada por login.js cuando el PIN es correcto
window.cargarSistemaLogin = (usuario) => {
    console.log("🎉 Cargando sistema para:", usuario.nombre, "Rol:", usuario.rol);
    usuarioActual = usuario;
    
    // Mostrar sidebar y main content
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'flex';
    
    // Actualizar información del usuario en la barra lateral
    const userNameSpan = document.getElementById('userNameSidebar');
    const userRoleSpan = document.getElementById('userRoleSidebar');
    if (userNameSpan) userNameSpan.innerText = usuario.nombre;
    if (userRoleSpan) userRoleSpan.innerText = window.getNombreRol ? window.getNombreRol(usuario.rol) : usuario.rol;
    
    // Ocultar el loading si existe
    const loading = document.querySelector('.loading');
    if (loading) loading.style.display = 'none';
    
    // Cargar el dashboard
    cargarModulo('dashboard');
};

// ========== FUNCIONES DE MÓDULOS ==========
async function cargarModulo(moduleName) {
    currentModule = moduleName;
    const moduleFunction = window[`${moduleName}Module`];
    
    console.log(`📦 Cargando módulo: ${moduleName}`, typeof moduleFunction === 'function' ? '✅' : '❌');
    
    if (typeof moduleFunction === 'function') {
        content.innerHTML = moduleFunction();
        
        // Actualizar título de la página
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
        
        // Inicializar datos del módulo
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
            <div class="error-module" style="background: var(--bg-card); border-radius: 16px; padding: 40px; text-align: center; border: 1px solid var(--border);">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--danger); margin-bottom: 20px;"></i>
                <h3>Módulo no disponible</h3>
                <p style="color: var(--text-muted);">El módulo "${moduleName}" está en desarrollo o no se cargó correctamente.</p>
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

// ========== EVENTOS Y CONFIGURACIÓN INICIAL ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado');
    
    // Ocultar sidebar y main content hasta login
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    
    // Verificar si hay sesión guardada
    const session = window.verificarSesion ? window.verificarSesion() : null;
    if (session) {
        console.log("🔄 Sesión existente para:", session.nombre);
        window.cargarSistemaLogin(session);
    } else {
        console.log("🔄 Sin sesión, mostrando login");
        mostrarLogin();
    }
    
    // Configurar eventos del menú (aunque el menú aún está oculto, se asignan los eventos)
    const menuItems = document.querySelectorAll('.nav-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.dataset.module;
            console.log(`🖱️ Click en: ${module}`);
            cargarModulo(module);
        });
    });
});

// ========== FUNCIONES AUXILIARES ==========
window.getNombreRol = (rol) => {
    const roles = {
        admin: 'Administrador',
        soporte: 'Soporte Técnico',
        vendedor: 'Vendedor',
        tecnico: 'Técnico'
    };
    return roles[rol] || rol;
};

window.cerrarSesion = () => {
    if (confirm('¿Cerrar sesión?')) {
        if (window.logout) window.logout();
        else {
            localStorage.removeItem('loto_session');
            location.reload();
        }
    }
};

// Agregar botón de cerrar sesión al sidebar (después de que el DOM esté listo y el sidebar visible)
setTimeout(() => {
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter && !document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión';
        logoutBtn.style.cssText = 'background: var(--danger); color: white; border: none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 15px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.2s;';
        logoutBtn.onclick = () => window.cerrarSesion();
        sidebarFooter.appendChild(logoutBtn);
    }
}, 500);

// Actualizar fecha y hora
function updateDateTime() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.innerText = now.toLocaleDateString('es-MX', options);
    }
}
updateDateTime();
setInterval(updateDateTime, 60000);

// Verificar conexión con Supabase (solo informativo)
setTimeout(() => {
    if (window.supabase) console.log('✅ Supabase conectado');
    if (window.DB) console.log('✅ DB lista');
}, 500);

console.log('✅ Sistema listo');
