console.log('🚀 Iniciando POS');

const content = document.getElementById('content');

function mostrarLogin() {
    content.innerHTML = window.loginModule();
    setTimeout(() => window.inicializarTecladoPIN(), 100);
}

function cargarSistema(usuario) {
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.main-content').style.display = 'flex';
    document.getElementById('userNameSidebar').innerText = usuario.nombre;
    document.getElementById('userRoleSidebar').innerText = usuario.rol;
    if (window.actualizarDashboard) window.actualizarDashboard();
}

window.cargarSistemaLogin = (usuario) => {
    cargarSistema(usuario);
};

const session = localStorage.getItem('loto_session');
if (session) {
    const data = JSON.parse(session);
    if (data.loggedIn && (Date.now() - data.timestamp) < 28800000) {
        cargarSistema(data);
    } else {
        mostrarLogin();
    }
} else {
    mostrarLogin();
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const module = item.dataset.module;
        const fn = window[`${module}Module`];
        if (fn) content.innerHTML = fn();
    });
});
