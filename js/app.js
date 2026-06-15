// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL (SIN LOGIN)
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let currentModule = 'dashboard';

// Función para cargar módulos
async function loadModule(moduleName) {
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
            try {
                switch (moduleName) {
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
                console.error(`Error en ${moduleName}:`, error);
            }
        }, 200);
    } else {
        content.innerHTML = `<div class="error-module"><h3>Módulo no disponible</h3><p>${moduleName}</p></div>`;
    }

    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.module === moduleName) item.classList.add('active');
    });
}

// Asegurar que sidebar y main content estén visibles
document.querySelector('.sidebar').style.display = 'flex';
document.querySelector('.main-content').style.display = 'flex';

// Cargar Dashboard al inicio
loadModule('dashboard');

// Asignar eventos del menú
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        loadModule(item.dataset.module);
    });
});

// Actualizar fecha/hora
function updateDateTime() {
    const el = document.getElementById('currentDate');
    if (el) {
        el.innerText = new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
updateDateTime();
setInterval(updateDateTime, 60000);

// Verificar módulos cargados
setTimeout(() => {
    const modules = ['dashboard', 'ventas', 'productos', 'inventario', 'servicios', 'clientes', 'usuarios', 'reportes'];
    const status = modules.map(m => `${m}: ${typeof window[`${m}Module`] === 'function' ? '✅' : '❌'}`).join(', ');
    console.log('📦 Módulos:', status);
}, 500);

console.log('✅ Sistema listo (sin login)');
