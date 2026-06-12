// ============================================
// LOTO GAMES POS - MÓDULO DE LOGIN
// ============================================

window.loginModule = () => {
  return `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
      <div class="login-container" style="background: var(--bg-card); padding: 40px; border-radius: 24px; width: 100%; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid var(--border);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            <i class="fas fa-gamepad" style="font-size: 40px; color: white;"></i>
          </div>
          <h2 style="color: var(--text);">LOTO GAMES POS</h2>
          <p style="color: var(--text-muted);">Sistema de Punto de Venta</p>
        </div>
        
        <form id="loginForm">
          <div class="form-group">
            <label><i class="fas fa-envelope"></i> Correo Electrónico</label>
            <input type="email" id="loginEmail" class="form-control" placeholder="admin@lotogames.com" required autocomplete="off">
          </div>
          <div class="form-group">
            <label><i class="fas fa-lock"></i> Contraseña</label>
            <input type="password" id="loginPassword" class="form-control" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 16px;">
            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
          </button>
        </form>
        
        <div id="loginError" style="display: none; margin-top: 20px; padding: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); border-radius: 8px; color: var(--danger); text-align: center; font-size: 14px;">
          <i class="fas fa-exclamation-triangle"></i> Correo o contraseña incorrectos
        </div>
      </div>
    </div>
  `;
};

// Usuarios predefinidos (después se pueden cargar desde Supabase)
const usuariosLogin = [
  { email: "admin@lotogames.com", password: "admin123", rol: "admin", nombre: "Administrador" },
  { email: "soporte@lotogames.com", password: "soporte123", rol: "soporte", nombre: "Soporte Técnico" },
  { email: "vendedor@lotogames.com", password: "vendedor123", rol: "vendedor", nombre: "Vendedor" }
];

// Función para verificar login
window.verificarLogin = async (email, password) => {
  // Primero buscar en usuarios predefinidos
  let usuario = usuariosLogin.find(u => u.email === email && u.password === password);
  
  // Si no está en predefinidos, buscar en Supabase
  if (!usuario) {
    const supabaseUsers = await window.DB.getUsuarios();
    usuario = supabaseUsers.find(u => u.email === email && u.password === password);
  }
  
  if (usuario) {
    // Guardar sesión
    localStorage.setItem('loto_session', JSON.stringify({
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      loggedIn: true,
      timestamp: Date.now()
    }));
    return { success: true, usuario };
  }
  
  return { success: false };
};

// Función para cerrar sesión
window.logout = () => {
  localStorage.removeItem('loto_session');
  location.reload();
};

// Verificar si hay sesión activa
window.verificarSesion = () => {
  const session = localStorage.getItem('loto_session');
  if (session) {
    const data = JSON.parse(session);
    // Verificar que la sesión no tenga más de 8 horas
    if (data.loggedIn && (Date.now() - data.timestamp) < 28800000) {
      return data;
    }
  }
  return null;
};

console.log("✅ Módulo de login cargado");
