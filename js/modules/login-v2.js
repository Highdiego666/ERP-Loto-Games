// ============================================
// LOTO GAMES POS - LOGIN V2
// Usuarios reales desde DB + contraseña + PIN rápido opcional
// ============================================

(function () {
  'use strict';

  let pinIngresado = '';
  let loginMode = 'password';

  window.loginModule = () => `
    <div id="loginRoot" style="position:fixed;inset:0;background:radial-gradient(circle at 18% 12%,rgba(31,99,255,.20),transparent 30%),radial-gradient(circle at 82% 82%,rgba(239,43,36,.14),transparent 30%),linear-gradient(135deg,#030711,#0b1020 58%,#111a2c);display:flex;justify-content:center;align-items:center;z-index:999999;padding:20px;">
      <div style="background:rgba(20,29,49,.96);width:460px;max-width:100%;border:1px solid #263551;border-radius:24px;padding:28px;box-shadow:0 25px 70px rgba(0,0,0,.55);color:#f8fafc;backdrop-filter:blur(12px);">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="assets/img/loto-games-logo.svg" alt="Loto Games" style="display:block;width:290px;max-width:88%;height:138px;object-fit:contain;margin:0 auto 4px;filter:drop-shadow(0 12px 20px rgba(0,0,0,.45));">
          <div style="display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border:1px solid #334766;border-radius:999px;background:rgba(255,255,255,.03);font-size:10px;font-weight:800;letter-spacing:.16em;color:#9fb0c9;text-transform:uppercase;">ERP · POS V1</div>
          <p style="color:#94a3b8;margin:9px 0 0;">Acceso al sistema</p>
        </div>

        <div id="loginBootstrap" style="display:none;"></div>

        <div id="loginNormal">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;">
            <button id="tabPassword" type="button" class="btn btn-primary" onclick="window.cambiarModoLoginV2('password')">🔐 Contraseña</button>
            <button id="tabPin" type="button" class="btn" style="background:#263551;color:white;" onclick="window.cambiarModoLoginV2('pin')">⚡ PIN rápido</button>
          </div>

          <form id="formLoginPassword" autocomplete="on">
            <div class="form-group">
              <label>Correo / usuario</label>
              <input id="loginEmail" class="form-control" type="text" autocomplete="username" placeholder="correo@ejemplo.com" required autofocus>
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input id="loginPassword" class="form-control" type="password" autocomplete="current-password" placeholder="Contraseña" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;padding:13px;">Ingresar</button>
          </form>

          <div id="loginPinPanel" style="display:none;">
            <div id="pinDisplay" style="background:#070b14;border:2px solid #263551;border-radius:14px;padding:16px;text-align:center;font:700 38px monospace;letter-spacing:12px;color:#66a5ff;margin-bottom:14px;">••••</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              ${['1','2','3','4','5','6','7','8','9','clear','0','enter'].map(v => {
                const label = v === 'clear' ? '⌫' : v === 'enter' ? '✓' : v;
                const bg = v === 'clear' ? '#f5b91b' : v === 'enter' ? '#10b981' : '#263551';
                const color = v === 'clear' ? '#111827' : 'white';
                return `<button type="button" class="pin-btn-v2" data-num="${v}" style="border:0;border-radius:12px;padding:14px;background:${bg};color:${color};font-size:20px;font-weight:700;cursor:pointer;">${label}</button>`;
              }).join('')}
            </div>
            <small style="display:block;text-align:center;color:#94a3b8;margin-top:10px;">También puedes escribir el PIN con el teclado físico y presionar Enter.</small>
          </div>
        </div>

        <div id="loginMessage" style="display:none;margin-top:14px;padding:10px;border-radius:10px;text-align:center;"></div>
      </div>
    </div>
  `;

  function showMessage(text, type = 'error') {
    const el = document.getElementById('loginMessage');
    if (!el) return;
    el.style.display = 'block';
    el.style.background = type === 'ok' ? 'rgba(16,185,129,.14)' : 'rgba(239,68,68,.14)';
    el.style.color = type === 'ok' ? '#34d399' : '#f87171';
    el.textContent = text;
  }

  function updatePinDisplay() {
    const el = document.getElementById('pinDisplay');
    if (!el) return;
    const length = Math.max(4, pinIngresado.length);
    el.textContent = Array.from({ length }, (_, i) => i < pinIngresado.length ? '●' : '•').join('');
  }

  async function loginSuccess(user) {
    const session = window.AuthV2.saveSession(user);
    const root = document.getElementById('loginRoot');
    if (root) root.remove();
    if (window.cargarSistemaLogin) await window.cargarSistemaLogin(session);
  }

  async function loginWithPassword(email, password) {
    const users = await window.DB.getUsuarios();
    const needle = String(email || '').trim().toLowerCase();
    const user = users.find(u =>
      String(u.email || '').trim().toLowerCase() === needle ||
      String(u.nombre || '').trim().toLowerCase() === needle
    );
    if (!user || (user.estado || 'activo') !== 'activo') return false;
    if (!await window.AuthV2.verifyPassword(password, user)) return false;
    await loginSuccess(user);
    return true;
  }

  async function loginWithPin(pin) {
    const users = (await window.DB.getUsuarios()).filter(u => (u.estado || 'activo') === 'activo');
    for (const user of users) {
      if (await window.AuthV2.verifyPin(pin, user)) {
        await loginSuccess(user);
        return true;
      }
    }
    return false;
  }

  window.cambiarModoLoginV2 = mode => {
    loginMode = mode;
    pinIngresado = '';
    updatePinDisplay();
    const form = document.getElementById('formLoginPassword');
    const pin = document.getElementById('loginPinPanel');
    const tabPassword = document.getElementById('tabPassword');
    const tabPin = document.getElementById('tabPin');
    if (!form || !pin) return;
    form.style.display = mode === 'password' ? 'block' : 'none';
    pin.style.display = mode === 'pin' ? 'block' : 'none';
    tabPassword.style.background = mode === 'password' ? 'var(--primary,#1f63ff)' : '#263551';
    tabPin.style.background = mode === 'pin' ? 'var(--primary,#1f63ff)' : '#263551';
    if (mode === 'password') setTimeout(() => document.getElementById('loginEmail')?.focus(), 0);
  };

  async function setupFirstAdmin() {
    const bootstrap = document.getElementById('loginBootstrap');
    const normal = document.getElementById('loginNormal');
    if (!bootstrap || !normal) return;
    normal.style.display = 'none';
    bootstrap.style.display = 'block';
    bootstrap.innerHTML = `
      <div style="padding:12px;background:rgba(245,185,27,.12);border:1px solid #f5b91b;border-radius:12px;margin-bottom:16px;">
        <strong>Configuración inicial</strong><br>
        <small>No existen usuarios en la base de datos. Crea el administrador principal.</small>
      </div>
      <form id="formBootstrapAdmin">
        <div class="form-group"><label>Nombre</label><input id="bootNombre" class="form-control" required></div>
        <div class="form-group"><label>Correo</label><input id="bootEmail" type="email" class="form-control" required></div>
        <div class="form-group"><label>Contraseña (mínimo 6 caracteres)</label><input id="bootPassword" type="password" class="form-control" minlength="6" required></div>
        <div class="form-group"><label>PIN rápido (4–6 dígitos, opcional)</label><input id="bootPin" inputmode="numeric" pattern="[0-9]{4,6}" class="form-control"></div>
        <button class="btn btn-primary" style="width:100%;padding:13px;">Crear administrador</button>
      </form>
    `;

    document.getElementById('formBootstrapAdmin').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const nombre = document.getElementById('bootNombre').value.trim();
        const email = document.getElementById('bootEmail').value.trim().toLowerCase();
        const password = document.getElementById('bootPassword').value;
        const pin = document.getElementById('bootPin').value.trim();
        if (password.length < 6) return showMessage('La contraseña debe tener al menos 6 caracteres.');
        if (pin && !/^\d{4,6}$/.test(pin)) return showMessage('El PIN debe tener entre 4 y 6 dígitos.');

        const passCred = await window.AuthV2.createPassword(password);
        const pinCred = pin ? await window.AuthV2.createPin(pin) : {};
        const user = await window.DB.saveUsuario({
          nombre, email, rol: 'admin', estado: 'activo', privilegios: [], ...passCred, ...pinCred
        });
        showMessage('Administrador creado correctamente.', 'ok');
        setTimeout(() => loginSuccess(user), 300);
      } catch (error) {
        console.error(error);
        showMessage('No se pudo crear el administrador: ' + error.message);
      }
    });
  }

  window.inicializarTecladoPIN = async () => {
    try {
      const users = await window.DB.getUsuarios();
      if (users.length === 0) {
        await setupFirstAdmin();
        return;
      }
    } catch (error) {
      console.error(error);
      showMessage('No se pudieron cargar usuarios: ' + error.message);
      return;
    }

    document.getElementById('formLoginPassword')?.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const ok = await loginWithPassword(
          document.getElementById('loginEmail').value,
          document.getElementById('loginPassword').value
        );
        if (!ok) showMessage('Usuario o contraseña incorrectos.');
      } catch (error) {
        console.error(error);
        showMessage('Error de acceso: ' + error.message);
      }
    });

    document.querySelectorAll('.pin-btn-v2').forEach(btn => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.num;
        if (value === 'clear') pinIngresado = pinIngresado.slice(0, -1);
        else if (value === 'enter') {
          if (pinIngresado.length < 4) return showMessage('El PIN debe tener al menos 4 dígitos.');
          try {
            if (!await loginWithPin(pinIngresado)) {
              pinIngresado = '';
              updatePinDisplay();
              showMessage('PIN incorrecto.');
            }
          } catch (error) {
            showMessage('Error de acceso: ' + error.message);
          }
          return;
        } else if (pinIngresado.length < 6) pinIngresado += value;
        updatePinDisplay();
      });
    });

    if (window.__lotoLoginKeyHandler) document.removeEventListener('keydown', window.__lotoLoginKeyHandler);
    window.__lotoLoginKeyHandler = async e => {
      if (!document.getElementById('loginRoot') || loginMode !== 'pin') return;
      if (/^[0-9]$/.test(e.key) && pinIngresado.length < 6) {
        e.preventDefault();
        pinIngresado += e.key;
        updatePinDisplay();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pinIngresado = pinIngresado.slice(0, -1);
        updatePinDisplay();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pinIngresado.length >= 4) {
          try {
            if (!await loginWithPin(pinIngresado)) {
              pinIngresado = '';
              updatePinDisplay();
              showMessage('PIN incorrecto.');
            }
          } catch (error) {
            showMessage('Error de acceso: ' + error.message);
          }
        }
      }
    };
    document.addEventListener('keydown', window.__lotoLoginKeyHandler);
  };

  window.verificarSesion = () => window.AuthV2.getSession();
  window.logout = () => {
    window.AuthV2.clearSession();
    location.reload();
  };

  console.log('✅ Login V2 activo: DB + contraseña + PIN + teclado físico');
})();
