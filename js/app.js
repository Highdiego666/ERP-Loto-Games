// ============================================
// LOTO GAMES POS - APLICACIÓN PRINCIPAL
// ============================================

console.log('🚀 LOTO GAMES POS - Iniciando...');

const content = document.getElementById('content');

// Función para mostrar el login
function mostrarLogin() {
    console.log("🔐 Mostrando login...");
    content.innerHTML = window.loginModule();
    setTimeout(() => {
        if (window.inicializarTecladoPIN) {
            window.inicializarTecladoPIN();
        }
    }, 100);
}

// Función para cargar el sistema después del login
window.cargarSistemaLogin = (usuario) => {
    console.log("🎉 Cargando sistema para:", usuario.nombre);
    
    // Guardar usuario actual
    window.usuarioActual = usuario;
    
    // Mostrar sidebar y main content
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.main-content').style.display = 'flex';
    
    // Actualizar información del usuario en la barra lateral
    const userNameSpan = document.getElementById('userNameSidebar');
    const userRoleSpan = document.getElementById('userRoleSidebar');
    if (userNameSpan) userNameSpan.innerText = usuario.nombre;
    if (userRoleSpan) userRoleSpan.innerText = usuario.rol;
    
    // Cargar el dashboard
    cargarModulo('dashboard');
};

// Función para cargar módulos
function cargarModulo(moduleName) {
    const fn = window[`${moduleName}Module`];
    if (typeof fn === 'function') {
        content.innerHTML = fn();
        
        const titles = {
            dashboard: 'Dashboard', ventas: 'Ventas', productos: 'Productos',
            inventario: 'Inventario', servicios: 'Servicios', clientes: 'Clientes',
            usuarios: 'Usuarios', reportes: 'Reportes'
        };
        document.getElementById('pageTitle').innerText = titles[moduleName] || moduleName;
        
        // Inicializar datos del módulo
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
    }
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.module === moduleName) item.classList.add('active');
    });
}

// Verificar sesión al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado');
    
    // Ocultar sidebar y main content hasta login
    document.querySelector('.sidebar').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
    
    // Verificar si hay sesión guardada
    const session = localStorage.getItem('loto_session');
    if (session) {
        const data = JSON.parse(session);
        if (data.loggedIn && (Date.now() - data.timestamp) < 28800000) {
            // Sesión válida, cargar sistema directamente
            window.cargarSistemaLogin(data);
        } else {
            mostrarLogin();
        }
    } else {
        mostrarLogin();
    }
});

// Eventos del menú
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        cargarModulo(item.dataset.module);
    });
});

// Botón de cerrar sesión
window.cerrarSesion = () => {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('loto_session');
        location.reload();
    }
};

// Agregar botón de cerrar sesión al sidebar
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

// Actualizar fecha
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
