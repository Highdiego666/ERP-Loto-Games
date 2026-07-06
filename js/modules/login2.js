// ============================================
// LOTO GAMES POS - LOGIN CON PIN (VERSIÓN DEFINITIVA)
// ============================================

console.log("🚀 Cargando login2.js con usuarios incrustados...");

window.verificarPIN = async (pin) => {
  console.log("🔍 Verificando PIN:", pin);
  
  // Usuarios incrustados directamente en la función
  const usuarios = [
    { id: 1, nombre: "Diego Perez", pin: "1620", rol: "admin", email: "admin@lotogames.com", privilegios: [] },
    { id: 2, nombre: "Francisco Lopez", pin: "2005", rol: "admin", email: "admin@lotogames.com", privilegios: [] },
    { id: 1, nombre: "Carlos", pin: "0811", rol: "admin", email: "admin@lotogames.com", privilegios: [] },
    { id: 3, nombre: "Charlie", pin: "2025", rol: "admin", email: "admin@lotogames.com", privilegios: [] },
    { id: 4, nombre: "Charlie", pin: "1420", rol: "soporte", email: "soporte@lotogames.com", privilegios: [] },
    { id: 5, nombre: "Alejandra", pin: "2222", rol: "vendedor", email: "vendedor@lotogames.com", privilegios: [] },
    { id: 6, nombre: "Técnico", pin: "3333", rol: "tecnico", email: "tecnico@lotogames.com", privilegios: [] }
  ];
  
  console.log("👥 Usuarios disponibles:", usuarios);
  
  const usuario = usuarios.find(u => u.pin === pin);
  console.log("✅ Usuario encontrado:", usuario);
  
  if (usuario) {
    localStorage.setItem('loto_session', JSON.stringify({
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
      email: usuario.email,
      pin: usuario.pin,
      privilegios: usuario.privilegios || [],
      loggedIn: true,
      timestamp: Date.now()
    }));
    return { success: true, usuario };
  }
  return { success: false };
};

window.logout = () => {
  localStorage.removeItem('loto_session');
  pinIngresado = "";
  const loginRoot = document.getElementById('loginRoot');
  if (loginRoot) loginRoot.remove();
  location.reload();
};

window.verificarSesion = () => {
  const session = localStorage.getItem('loto_session');
  if (session) {
    const data = JSON.parse(session);
    if (data.loggedIn && (Date.now() - data.timestamp) < 28800000) return data;
  }
  return null;
};

window.loginModule = () => {
  return `
    <div id="loginRoot" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); display: flex; justify-content: center; align-items: center; z-index: 999999; margin: 0; padding: 0; border: none;">
      <div style="background: #1e293b; padding: 40px; border-radius: 32px; width: 450px; max-width: 90%; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            <i class="fas fa-gamepad" style="font-size: 40px; color: white;"></i>
          </div>
          <h2 style="color: #f1f5f9; font-size: 28px;">LOTO GAMES POS</h2>
          <p style="color: #94a3b8;">Ingrese su PIN de 4 dígitos</p>
        </div>
        <div style="margin-bottom: 30px;">
          <div style="background: #0f172a; border-radius: 16px; padding: 20px; text-align: center; border: 2px solid #334155;">
            <div id="pinDisplay" style="font-size: 48px; font-weight: bold; letter-spacing: 15px; color: #818cf8; font-family: monospace;">••••</div>
            <div id="pinMessage" style="font-size: 12px; color: #94a3b8; margin-top: 10px;"></div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <button class="pin-btn" data-num="1" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">1</button>
          <button class="pin-btn" data-num="2" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">2</button>
          <button class="pin-btn" data-num="3" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">3</button>
          <button class="pin-btn" data-num="4" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">4</button>
          <button class="pin-btn" data-num="5" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">5</button>
          <button class="pin-btn" data-num="6" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">6</button>
          <button class="pin-btn" data-num="7" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">7</button>
          <button class="pin-btn" data-num="8" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">8</button>
          <button class="pin-btn" data-num="9" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">9</button>
          <button class="pin-btn" data-num="clear" style="background: #f59e0b; border: none; border-radius: 16px; padding: 20px; font-size: 18px; font-weight: bold; color: white; cursor: pointer;">⌫ Borrar</button>
          <button class="pin-btn" data-num="0" style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; font-size: 28px; font-weight: bold; color: white; cursor: pointer;">0</button>
          <button class="pin-btn" data-num="enter" style="background: #10b981; border: none; border-radius: 16px; padding: 20px; font-size: 18px; font-weight: bold; color: white; cursor: pointer;">✓ Ingresar</button>
        </div>
        <div id="loginError" style="display: none; margin-top: 20px; padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 12px; color: #ef4444; text-align: center;">❌ PIN incorrecto</div>
      </div>
    </div>
  `;
};

let pinIngresado = "";

window.inicializarTecladoPIN = () => {
  pinIngresado = "";
  const pinDisplay = document.getElementById('pinDisplay');
  const errorDiv = document.getElementById('loginError');
  const messageDiv = document.getElementById('pinMessage');
  
  if (pinDisplay) pinDisplay.innerHTML = "••••";
  if (errorDiv) errorDiv.style.display = "none";
  if (messageDiv) messageDiv.innerHTML = "";
  
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const num = btn.getAttribute('data-num');
      if (errorDiv) errorDiv.style.display = "none";
      
      if (num === 'clear') {
        pinIngresado = pinIngresado.slice(0, -1);
        if (pinDisplay) {
          let display = "";
          for (let i = 0; i < 4; i++) display += i < pinIngresado.length ? "●" : "•";
          pinDisplay.innerHTML = display;
        }
        if (messageDiv) messageDiv.innerHTML = "";
      } 
      else if (num === 'enter') {
        if (pinIngresado.length === 4) {
          window.verificarPIN(pinIngresado).then(result => {
            if (result.success) {
              window.usuarioActual = result.usuario;
              const loginRoot = document.getElementById('loginRoot');
              if (loginRoot) loginRoot.remove();
              if (window.cargarSistemaLogin) window.cargarSistemaLogin(result.usuario);
            } else {
              if (errorDiv) errorDiv.style.display = "block";
              pinIngresado = "";
              if (pinDisplay) pinDisplay.innerHTML = "••••";
              if (messageDiv) messageDiv.innerHTML = "PIN incorrecto";
            }
          });
        } else if (messageDiv) {
          messageDiv.innerHTML = "Ingrese 4 dígitos";
          messageDiv.style.color = "#f59e0b";
          setTimeout(() => { messageDiv.innerHTML = ""; }, 2000);
        }
      } 
      else if (pinIngresado.length < 4) {
        pinIngresado += num;
        if (pinDisplay) {
          let display = "";
          for (let i = 0; i < 4; i++) display += i < pinIngresado.length ? "●" : "•";
          pinDisplay.innerHTML = display;
        }
        if (messageDiv) messageDiv.innerHTML = "";
        if (pinIngresado.length === 4 && messageDiv) {
          messageDiv.innerHTML = "Presione Ingresar";
          messageDiv.style.color = "#10b981";
          setTimeout(() => { if (messageDiv) messageDiv.innerHTML = ""; }, 2000);
        }
      }
    };
  });
  console.log("✅ Teclado inicializado");
};

console.log("✅ Login2 module loaded (con usuarios incrustados en verificarPIN)");
