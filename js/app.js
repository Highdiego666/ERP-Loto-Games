// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');

// Función para mostrar el login con teclado numérico
function mostrarLogin() {
    console.log("🔐 Mostrando pantalla de login...");
    if (typeof window.loginModule === 'function') {
        content.innerHTML = window.loginModule();

        // Inyectar estilos ultra agresivos para asegurar visibilidad en Firefox/Chrome
        const style = document.createElement('style');
        style.textContent = `
            #loginRoot {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: linear-gradient(135deg, #0f172a, #1e293b) !important;
                z-index: 999999 !important;
                justify-content: center !important;
                align-items: center !important;
            }
            .pin-btn {
                background: #1e293b !important;
                border: 1px solid #334155 !important;
                border-radius: 16px !important;
                padding: 20px !important;
                font-size: 28px !important;
                font-weight: bold !important;
                color: white !important;
                cursor: pointer !important;
                min-width: 80px !important;
                transition: all 0.2s !important;
            }
            .pin-btn:hover {
                background: #334155 !important;
                transform: scale(1.02) !important;
            }
            .pin-btn:active {
                transform: scale(0.98) !important;
            }
            .pin-btn[data-num="clear"] {
                background: #f59e0b !important;
                border: none !important;
            }
            .pin-btn[data-num="enter"] {
                background: #10b981 !important;
                border: none !important;
            }
            #pinDisplay {
                font-size: 48px !important;
                letter-spacing: 15px !important;
                color: #818cf8 !important;
                font-family: monospace !important;
                text-align: center !important;
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            if (window.inicializarTecladoPIN) window.inicializarTecladoPIN();
            // Reforzar visibilidad por si acaso
            const root = document.getElementById('loginRoot');
            if (root) {
                root.style.setProperty('display', 'flex', 'important');
                root.style.setProperty('visibility', 'visible', 'important');
            }
        }, 100);
    } else {
        content.innerHTML = '<div style="color:white;text-align:center;padding:50px"><h2>Error</h2><p>Módulo de login no disponible</p></div>';
    }
}

// Función que llama login.js cuando el PIN es correcto
window.cargarSistemaLogin = (usuario) => {
    console.log("🎉 Cargando sistema para:", usuario.nombre);
    window.usuarioActual = usuario;

    // Mostrar sidebar y main content
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'flex';

    // Actualizar nombre en sidebar
    const userNameSpan = document.getElementById('userNameSidebar');
    const userRoleSpan = document.getElementById('userRoleSidebar');
    if (userNameSpan) userNameSpan.innerText = usuario.nombre;
    if (userRoleSpan) userRoleSpan.innerText = usuario.rol;

    // Cargar el dashboard
    cargarModulo('dashboard');
};

// Carga un módulo específico (dashboard, ventas, productos, etc.)
function cargarModulo(moduleName) {
    const fn = window[`${moduleName}Module`];
    if (typeof fn === 'function') {
        content.innerHTML = fn();

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

        // Inicializar funciones específicas del módulo
        setTimeout(() => {
            if (moduleName === 'dashboard' && window.actualizarDashboard) window.actualizarDashboard();
            if (moduleName === 'productos' && window.cargarProductos) window.cargarProductos();
            if (moduleName === 'ventas' && window.cargarProductosVenta) window.cargarProductosVenta();
            if (moduleName === 'inventario' && window.cargarInventario) window.cargarInventario();
            if (moduleName === 'servicios' && window.cargarServicios) window.cargarServicios();
            if (moduleName === 'clientes' && window.cargarClientes) window.cargarClientes();
            if (moduleName === 'usuarios' && window.cargarUsuarios) window.cargarUsuarios();
            if (moduleName === 'reportes' && window.actualizarReportes) window.actualizarReportes();
        }, 200);
    } else {
        console.warn(`Módulo ${moduleName} no encontrado`);
        content.innerHTML = `<div style="padding:50px;text-align:center"><h3>Módulo en construcción</h3><p>${moduleName}</p></div>`;
    }

    // Marcar el ítem del menú como activo
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.module === moduleName) item.classList.add('active');
    });
}

// Cerrar sesión
window.cerrarSesion = () => {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('loto_session');
        location.reload();
    }
};

// Eventos al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado');

    // Ocultar sidebar y main content hasta login
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';

    // Verificar si hay sesión activa
    const session = localStorage.getItem('loto_session');
    if (session) {
        const data = JSON.parse(session);
        if (data.loggedIn && (Date.now() - data.timestamp) < 28800000) {
            window.cargarSistemaLogin(data);
        } else {
            mostrarLogin();
        }
    } else {
        mostrarLogin();
    }

    // Asignar eventos de navegación a los ítems del menú
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.dataset.module;
            if (module) cargarModulo(module);
        });
    });
});

// Agregar botón de cerrar sesión al sidebar después de un breve retraso
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

// Actualizar la fecha y hora en la barra superior
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

console.log('✅ Sistema listo');
