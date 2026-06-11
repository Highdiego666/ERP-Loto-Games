console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let currentModule = 'dashboard';

function loadModule(moduleName) {
    currentModule = moduleName;
    const moduleFunction = window[`${moduleName}Module`];
    
    if (typeof moduleFunction === 'function') {
        content.innerHTML = moduleFunction();
        
        // Actualizar título
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
        
        document.getElementById('pageTitle').innerText = titles[moduleName] || moduleName;
        
        // Cargar datos específicos del módulo
        setTimeout(() => {
            if (moduleName === 'dashboard' && window.actualizarDashboard) {
                window.actualizarDashboard();
            } else if (moduleName === 'productos' && window.cargarProductos) {
                window.cargarProductos();
            } else if (moduleName === 'ventas' && window.cargarProductosVenta) {
                window.cargarProductosVenta();
            } else if (moduleName === 'usuarios' && window.cargarUsuarios) {
                window.cargarUsuarios();
            }
        }, 100);
    } else {
        content.innerHTML = `
            <div class="table-container">
                <h3>Módulo no disponible</h3>
                <p style="color: var(--text-muted);">El módulo ${moduleName} está en construcción</p>
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

// Event listeners
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        loadModule(item.dataset.module);
    });
});

// Fecha actual
function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.innerText = now.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Inicializar
updateDateTime();
setInterval(updateDateTime, 60000);
loadModule('dashboard');

console.log('✅ Sistema listo');

