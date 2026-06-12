// ============================================
// LOTO GAMES POS - LOGIN CON PIN NUMÉRICO
// ============================================

// Usuarios con PIN (4 dígitos cada uno)
const usuariosPIN = [
  { id: 1, nombre: "Administrador", pin: "1234", rol: "admin", email: "admin@lotogames.com" },
  { id: 2, nombre: "Soporte Técnico", pin: "1111", rol: "soporte", email: "soporte@lotogames.com" },
  { id: 3, nombre: "Vendedor", pin: "2222", rol: "vendedor", email: "vendedor@lotogames.com" },
  { id: 4, nombre: "Técnico", pin: "3333", rol: "tecnico", email: "tecnico@lotogames.com" }
];

// Función principal que genera el HTML del login
window.loginModule = () => {
  return `
    <div id="loginRoot" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); display: flex; justify-content: center; align-items: center; z-index: 99999; margin: 0; padding: 0;">
      <div style="background: #1e293b; padding: 40px; border-radius: 32px; width: 450px; max-width: 90%; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid #334155;">
        
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            <i class="fas fa-gamepad" style="font-size: 40px; color: white;"></i>
          </div>
          <h2 style="color: #f1f5f9; font-size: 28px; margin-bottom: 5px;">LOTO GAMES POS</h2>
          <p style="color: #94a3b8;">Ingrese su PIN de 4 dígitos</p>
        </div>
        
        <!-- Display del PIN -->
        <div style="margin-bottom: 30px;">
          <div style="background: #0f172a; border-radius: 16px; padding: 20px; text-align: center; border: 2px solid #334155;">
            <div id="pinDisplay" style="font-size: 48px; font-weight: bold; letter-spacing: 15px; color: #818cf8; font-family: monospace; text-align: center;">••••</div>
            <div id="pinMessage" style="font-size: 12px; color: #94a3b8; margin-top: 10px; text-align: center;"></div>
          </div>
        </div>
        
        <!-- Teclado numérico -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <button class="pin-btn" data-num="1" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">1</button>
          <button class="pin-btn" data-num="2" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">2</button>
          <button class="pin-btn" data-num="3" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">3</button>
          <button class="pin-btn" data-num="4" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">4</button>
          <button class="pin-btn" data-num="5" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">5</button>
          <button class="pin-btn" data-num="6" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">6</button>
          <button class="pin-btn" data-num="7" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">7</button>
          <button class="pin-btn" data-num="8" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">8</button>
          <button class="pin-btn" data-num="9" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">9</button>
          <button class="pin-btn" data-num="clear" style="background: #f59e0b; border: none; border-radius: 16px; padding: 20px; font-size: 18px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">
            <i class="fas fa-delete-left"></i> Borrar
          </button>
          <button class="pin-btn" data-num="0" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">0</button>
          <button class="pin-btn" data-num="enter" style="background: #10b981; border: none; border-radius: 16px; padding: 20px; font-size: 18px; font-weight: bold; color: white; cursor: pointer; transition: all 0.2s;">
            <i class="fas fa-check"></i> Ingresar
          </button>
        </div>
        
        <!-- Mensaje de error -->
        <div id="loginError" style="display: none; margin-top: 20px; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 12px; color: #ef4444; text-align: center; font-size: 14px;">
          <i class="fas fa-exclamation-triangle"></i> PIN incorrecto. Intente nuevamente.
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <small style="color: #64748b;">Sistema POS Profesional v1.0</small>
        </div>
      </div>
    </div>
  `;
};

// Variable para almacenar el PIN ingresado
let pinIngresado = "";

// Verificar PIN
window.verificarPIN = (pin) => {
  const usuario = usuariosPIN.find(u => u.pin === pin);
  if (usuario) {
    localStorage.setItem('loto_session', JSON.stringify({
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
      email: usuario.email,
      pin: usuario.pin,
      loggedIn: true,
      timestamp: Date.now()
    }));
    return { success: true, usuario };
  }
  return { success: false };
};

// Cerrar sesión
window.logout = () => {
  localStorage.removeItem('loto_session');
  pinIngresado = "";
  location.reload();
};

// Verificar sesión activa
window.verificarSesion = () => {
  const session = localStorage.getItem('loto_session');
  if (session) {
    const data = JSON.parse(session);
    if (data.loggedIn && (Date.now() - data.timestamp) < 28800000) {
      return data;
    }
  }
  return null;
};

// Inicializar el teclado
window.inicializarTecladoPIN = () => {
  pinIngresado = "";
  
  const pinDisplay = document.getElementById('pinDisplay');
  const errorDiv = document.getElementById('loginError');
  const messageDiv = document.getElementById('pinMessage');
  
  if (pinDisplay) pinDisplay.innerHTML = "••••";
  if (errorDiv) errorDiv.style.display = "none";
  if (messageDiv) messageDiv.innerHTML = "";
  
  // Asignar eventos a los botones
  const buttons = document.querySelectorAll('.pin-btn');
  console.log("🔢 Botones encontrados:", buttons.length);
  
  buttons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const num = btn.getAttribute('data-num');
      
      if (errorDiv) errorDiv.style.display = "none";
      
      if (num === 'clear') {
        // Borrar último dígito
        pinIngresado = pinIngresado.slice(0, -1);
        if (pinDisplay) {
          pinDisplay.innerHTML = "•".repeat(pinIngresado.length) + "•".repeat(4 - pinIngresado.length);
        }
        if (messageDiv) messageDiv.innerHTML = "";
      } 
      else if (num === 'enter') {
        // Validar PIN
        if (pinIngresado.length === 4) {
          const result = window.verificarPIN(pinIngresado);
          if (result.success) {
            window.usuarioActual = result.usuario;
            window.cargarSistemaLogin();
          } else {
            if (errorDiv) errorDiv.style.display = "block";
            pinIngresado = "";
            if (pinDisplay) pinDisplay.innerHTML = "••••";
            if (messageDiv) messageDiv.innerHTML = "PIN incorrecto";
          }
        } else {
          if (messageDiv) {
            messageDiv.innerHTML = "Ingrese 4 dígitos";
            messageDiv.style.color = "#f59e0b";
          }
        }
      } 
      else if (pinIngresado.length < 4) {
        // Agregar dígito
        pinIngresado += num;
        if (pinDisplay) {
          pinDisplay.innerHTML = "•".repeat(pinIngresado.length) + "•".repeat(4 - pinIngresado.length);
        }
        if (messageDiv) messageDiv.innerHTML = "";
        
        if (pinIngresado.length === 4) {
          if (messageDiv) {
            messageDiv.innerHTML = "Presione Ingresar";
            messageDiv.style.color = "#10b981";
          }
        }
      }
    };
  });
  
  console.log("✅ Teclado numérico inicializado correctamente");
};

console.log("✅ Módulo de login con PIN cargado correctamente");
