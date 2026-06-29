// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let usuarioActual = null;
let currentModule = 'dashboard';

// Definición de módulos y sus nombres
const modulos = {
  dashboard: { nombre: 'Dashboard', icono: '🏠' },
  ventas: { nombre: 'Punto de Venta', icono: '🛒' },
  productos: { nombre: 'Productos', icono: '📦' },
  inventario: { nombre: 'Inventario', icono: '📊' },
  servicios: { nombre: 'Servicio Técnico', icono: '🔧' },
  clientes: { nombre: 'Clientes', icono: '👥' },
  usuarios: { nombre: 'Usuarios', icono: '👤' },
  reportes: { nombre: 'Reportes', icono: '📈' },
  traspasos: { nombre: 'Traspasos', icono: '🔄' }
};

// Mapeo de roles a módulos permitidos (si no tienen privilegios específicos)
const rolesPorDefecto = {
  admin: Object.keys(modulos),
  soporte: ['dashboard', 'productos', 'inventario', 'servicios', 'clientes', 'reportes', 'traspasos'],
  vendedor: ['dashboard', 'ventas', 'productos', 'clientes'],
  tecnico: ['dashboard', 'servicios', 'productos', 'inventario', 'clientes']
};

// Función para mostrar el login (inyectado en el body)
function mostrarLogin() {
    console.log("🔐 Inyectando login en el body...");
    
    // Eliminar cualquier login previo
    const oldLogin = document.getElementById('loginRoot');
    if (oldLogin) oldLogin.remove();
    
    // Verificar que el módulo existe
    if (typeof window.loginModule !== 'function') {
        console.error("❌ loginModule no está definido");
        content.innerHTML = '<div style="color:white;text-align:center;padding:50px"><h2>Error</h2><p>Módulo de login no disponible</p></div>';
        return;
    }
    
    // Forzar que el body ocupe toda la pantalla
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#0f172a';
    
    // Insertar el login directamente en el body
    document.body.innerHTML = window.loginModule();
    
    // Forzar visibilidad después de insertar
    setTimeout(() => {
        const root = document.getElementById('loginRoot');
        if (root) {
            root.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: #0f172a !important; display: flex !important; justify-content: center !important; align-items: center !important; z-index: 999999 !important; margin: 0 !important; padding: 0 !important; border: none !important;';
        }
        if (window.inicializarTecladoPIN) {
            window.inicializarTecladoPIN();
        }
    }, 50);
}

// Cargar sistema después del login
window.cargarSistemaLogin = (usuario) => {
    // Eliminar el login del DOM
    const loginRoot = document.getElementById('loginRoot');
    if (loginRoot) loginRoot.remove();
    
    console.log("🎉 Cargando sistema para:", usuario.nombre);
    usuarioActual = usuario;
    
    // Mostrar sidebar y contenido
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.main-content').style.display = 'flex';
    
    // Actualizar nombre de usuario en la barra lateral
    document.getElementById('userNameSidebar').innerText = usuario.nombre;
    document.getElementById('userRoleSidebar').innerText = usuario.rol;
    
    // Construir menú dinámico según privilegios
    construirMenu(usuario);
    
    // Cargar dashboard (si tiene acceso)
    if (tieneAcceso('dashboard')) {
        loadModule('dashboard');
    } else {
        const modulosAcceso = obtenerModulosAcceso(usuario);
        if (modulosAcceso.length > 0) {
            loadModule(modulosAcceso[0]);
        }
    }
};

// Obtener lista de módulos a los que el usuario tiene acceso
function obtenerModulosAcceso(usuario) {
    if (usuario.rol === 'admin') return Object.keys(modulos);
    if (usuario.privilegios && usuario.privilegios.length > 0) {
        return usuario.privilegios.filter(m => modulos[m]);
    }
    return rolesPorDefecto[usuario.rol] || ['dashboard'];
}

// Verificar si el usuario tiene acceso a un módulo
function tieneAcceso(moduleName) {
    if (!usuarioActual) return false;
    const accesos = obtenerModulosAcceso(usuarioActual);
    return accesos.includes(moduleName);
}

// Construir el menú dinámicamente
function construirMenu(usuario) {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;
    
    const accesos = obtenerModulosAcceso(usuario);
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const module = item.dataset.module;
        if (accesos.includes(module)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Función principal para cargar módulos
async function loadModule(moduleName) {
    if (!tieneAcceso(moduleName)) {
        content.innerHTML = `
            <div style="background: var(--bg-card); border-radius: 16px; padding: 40px; text-align: center;">
                <i class="fas fa-lock" style="font-size: 48px; color: var(--danger);"></i>
                <h3>Acceso Denegado</h3>
                <p>No tienes permisos para acceder a este módulo.</p>
            </div>
        `;
        return;
    }
    
    currentModule = moduleName;
    const moduleFunction = window[`${moduleName}Module`];
    
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
            reportes: 'Reportes',
            traspasos: 'Traspasos'
        };
        
        const descriptions = {
            dashboard: 'Visión general del negocio',
            ventas: 'Registro de ventas y carrito',
            productos: 'Gestión de productos e inventario',
            inventario: 'Control de stock y carga masiva',
            servicios: 'Gestión de reparaciones y mantenimiento',
            clientes: 'Registro y gestión de clientes',
            usuarios: 'Administración de usuarios y roles',
            reportes: 'Estadísticas y análisis de ventas',
            traspasos: 'Entradas y salidas del almacén'
        };
        
        document.getElementById('pageTitle').innerText = titles[moduleName] || moduleName;
        document.getElementById('pageDescription').innerText = descriptions[moduleName] || 'Módulo del sistema';
        
        setTimeout(async () => {
            try {
                switch(moduleName) {
                    case 'dashboard': if (window.actualizarDashboard) await window.actualizarDashboard(); break;
                    case 'productos': if (window.cargarProductos) await window.cargarProductos(); break;
                    case 'ventas': if (window.cargarProductosVenta) await window.cargarProductosVenta(); break;
                    case 'inventario': if (window.cargarInventario) await window.cargarInventario(); break;
                    case 'servicios': if (window.cargarServicios) await window.cargarServicios(); break;
                    case 'clientes': if (window.cargarClientes) await window.cargarClientes(); break;
                    case 'usuarios': if (window.cargarUsuarios) await window.cargarUsuarios(); break;
                    case 'reportes': if (window.actualizarReportes) await window.actualizarReportes(); break;
                    case 'traspasos': if (window.cargarTraspasos) await window.cargarTraspasos(); break;
                }
            } catch (error) {
                console.error(`Error en ${moduleName}:`, error);
            }
        }, 200);
    } else {
        content.innerHTML = `<div style="text-align:center;padding:50px"><h3>Módulo en construcción</h3><p>${moduleName}</p></div>`;
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.module === moduleName) item.classList.add('active');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado');
    
    // Ocultar sidebar y main content hasta login
    document.querySelector('.sidebar').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
    
    // Verificar sesión
    const session = window.verificarSesion ? window.verificarSesion() : null;
    if (session) {
        window.cargarSistemaLogin(session);
    } else {
        mostrarLogin();
    }
    
    // Eventos del menú
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.dataset.module;
            if (tieneAcceso(module)) {
                loadModule(module);
            } else {
                alert('No tienes acceso a este módulo.');
            }
        });
    });
});

// Cerrar sesión
window.cerrarSesion = () => {
    if (confirm('¿Cerrar sesión?')) {
        if (window.logout) window.logout();
    }
};

// Agregar botón de cerrar sesión
setTimeout(() => {
    const footer = document.querySelector('.sidebar-footer');
    if (footer && !document.getElementById('logoutBtn')) {
        const btn = document.createElement('button');
        btn.id = 'logoutBtn';
        btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión';
        btn.style.cssText = 'background: #ef4444; color: white; border: none; padding: 12px; border-radius: 12px; width: 100%; margin-top: 15px; cursor: pointer; font-weight: bold;';
        btn.onclick = () => window.cerrarSesion();
        footer.appendChild(btn);
    }
}, 500);

// Fecha
function updateDateTime() {
    const el = document.getElementById('currentDate');
    if (el) {
        el.innerText = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}
updateDateTime();
setInterval(updateDateTime, 60000);

console.log('✅ Sistema listo');
