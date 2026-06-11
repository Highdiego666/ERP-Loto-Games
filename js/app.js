console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');
let currentModule = 'dashboard';

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
        
        document.getElementById('pageTitle').innerText = titles[moduleName] || moduleName;
        
        setTimeout(async () => {
            if (moduleName === 'dashboard' && window.actualizarDashboard) {
                window.actualizarDashboard();
            } else if (moduleName === 'productos' && window.cargarProductos) {
                await window.cargarProductos();
            } else if (moduleName === 'ventas' && window.cargarProductosVenta) {
                await window.cargarProductosVenta();
            } else if (moduleName === 'usuarios' && window.cargarUsuarios) {
                await window.cargarUsuarios();
            }
        }, 100);
    } else {
        content.innerHTML = `<div class="table-container"><h3>Módulo en construcción</h3></div>`;
    }
    
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
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.innerText = new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

updateDateTime();
setInterval(updateDateTime, 60000);
loadModule('dashboard');

console.log('✅ Sistema listo con Supabase');
