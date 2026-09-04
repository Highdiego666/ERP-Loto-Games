// ============================================
// LOTO GAMES - VINCULACIÓN SEGURA DE NUBE
// En Windows, Supabase Auth protege la sincronización. El acceso cotidiano
// al POS sigue siendo local/offline mediante AuthV2 + SQLite.
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  const cloud = window.cloudSupabase;
  if (!desktop?.isDesktop || !cloud) return;

  const originalInitializer = window.inicializarTecladoPIN;
  let pairingOverlay = null;

  function loginMessage(text, type = 'error') {
    const el = document.getElementById('loginMessage');
    if (!el) return;
    el.style.display = 'block';
    el.style.background = type === 'ok' ? 'rgba(16,185,129,.14)' : type === 'info' ? 'rgba(31,99,255,.14)' : 'rgba(239,68,68,.14)';
    el.style.color = type === 'ok' ? '#34d399' : type === 'info' ? '#93c5fd' : '#f87171';
    el.textContent = text;
  }

  function setBusy(button, busy, busyText = 'Procesando…') {
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    button.disabled = !!busy;
    button.style.opacity = busy ? '.65' : '1';
    button.textContent = busy ? busyText : button.dataset.originalText;
  }

  async function cloudSessionEmail() {
    const { data, error } = await cloud.auth.getSession();
    if (error) throw error;
    return String(data?.session?.user?.email || '').trim().toLowerCase();
  }

  async function finalizePairing({ loginLocal = false } = {}) {
    if (!navigator.onLine) throw new Error('Necesitas Internet para vincular esta instalación.');
    if (!window.LotoSync?.syncOnce) throw new Error('El motor de sincronización no está disponible.');

    const result = await window.LotoSync.syncOnce();
    if (!result?.ok) throw new Error(result?.error || 'No se pudo sincronizar la base.');

    const email = await cloudSessionEmail();
    const users = await window.DB.getUsuarios();
    const admin = users.find(user =>
      String(user.email || '').trim().toLowerCase() === email &&
      (user.estado || 'activo') === 'activo' &&
      String(user.rol || '').trim().toLowerCase() === 'admin'
    );

    if (!admin) throw new Error('La cuenta de nube no corresponde a un administrador activo de Loto Games.');

    if (loginLocal) {
      const session = window.AuthV2.saveSession(admin);
      document.getElementById('loginRoot')?.remove();
      if (window.cargarSistemaLogin) await window.cargarSistemaLogin(session);
    }

    return { admin, result };
  }

  async function signIn(email, password, options = {}) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) throw new Error('Escribe el correo del administrador.');
    if (!password) throw new Error('Escribe la contraseña de nube.');

    const { error } = await cloud.auth.signInWithPassword({ email: normalized, password });
    if (error) throw error;
    return finalizePairing(options);
  }

  async function signUp(email, password, options = {}) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) throw new Error('Escribe el correo del administrador.');
    if (String(password || '').length < 8) throw new Error('La contraseña de nube debe tener al menos 8 caracteres.');

    const { data, error } = await cloud.auth.signUp({ email: normalized, password });
    if (error) throw error;

    if (!data?.session) {
      return {
        confirmationRequired: true,
        message: 'Revisa ese correo y confirma el acceso. Después vuelve aquí y pulsa “Entrar y descargar”.'
      };
    }

    return finalizePairing(options);
  }

  async function tryExistingSession({ loginLocal = false } = {}) {
    try {
      const email = await cloudSessionEmail();
      if (!email) return false;
      await finalizePairing({ loginLocal });
      return true;
    } catch (error) {
      console.warn('La sesión de nube existente no pudo completar la vinculación:', error);
      return false;
    }
  }

  function pairingFormHtml({ bootstrap = false } = {}) {
    return `
      <div style="padding:12px;background:rgba(31,99,255,.10);border:1px solid #315d9f;border-radius:12px;margin-bottom:16px;">
        <strong>${bootstrap ? 'Vincular esta instalación' : 'Sincronización con Supabase'}</strong><br>
        <small>${bootstrap
          ? 'Esta PC todavía no tiene una copia local. Usa el correo de un administrador activo de Loto Games para descargarla de forma segura.'
          : 'El POS seguirá funcionando sin Internet. Esta cuenta sólo autoriza el intercambio de datos con la nube.'}</small>
      </div>
      <form class="cloudPairForm" autocomplete="on">
        <div class="form-group">
          <label>Correo de administrador</label>
          <input class="form-control cloudEmail" type="email" autocomplete="username" required placeholder="admin@ejemplo.com">
        </div>
        <div class="form-group">
          <label>Contraseña de nube</label>
          <input class="form-control cloudPassword" type="password" autocomplete="current-password" minlength="8" required placeholder="Mínimo 8 caracteres">
          <small style="display:block;color:#94a3b8;margin-top:6px;">Es independiente del PIN local del POS.</small>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button type="submit" class="btn btn-primary cloudLoginBtn">Entrar y descargar</button>
          <button type="button" class="btn cloudCreateBtn" style="background:#263551;color:white;">Crear acceso de nube</button>
        </div>
        <div class="cloudPairMessage" style="display:none;margin-top:12px;padding:10px;border-radius:10px;text-align:center;"></div>
      </form>
    `;
  }

  function formMessage(container, text, type = 'error') {
    const el = container?.querySelector('.cloudPairMessage');
    if (!el) return;
    el.style.display = 'block';
    el.style.background = type === 'ok' ? 'rgba(16,185,129,.14)' : type === 'info' ? 'rgba(31,99,255,.14)' : 'rgba(239,68,68,.14)';
    el.style.color = type === 'ok' ? '#34d399' : type === 'info' ? '#93c5fd' : '#f87171';
    el.textContent = text;
  }

  function bindPairingForm(container, { bootstrap = false, onSuccess = null } = {}) {
    const form = container.querySelector('.cloudPairForm');
    const loginBtn = container.querySelector('.cloudLoginBtn');
    const createBtn = container.querySelector('.cloudCreateBtn');
    if (!form || !loginBtn || !createBtn) return;

    const values = () => ({
      email: container.querySelector('.cloudEmail')?.value || '',
      password: container.querySelector('.cloudPassword')?.value || ''
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      setBusy(loginBtn, true, 'Descargando…');
      createBtn.disabled = true;
      try {
        const { email, password } = values();
        const result = await signIn(email, password, { loginLocal: bootstrap });
        formMessage(container, 'Instalación vinculada y sincronizada.', 'ok');
        if (onSuccess) await onSuccess(result);
      } catch (error) {
        console.error(error);
        formMessage(container, error?.message || String(error));
      } finally {
        setBusy(loginBtn, false);
        createBtn.disabled = false;
      }
    });

    createBtn.addEventListener('click', async () => {
      setBusy(createBtn, true, 'Creando…');
      loginBtn.disabled = true;
      try {
        const { email, password } = values();
        const result = await signUp(email, password, { loginLocal: bootstrap });
        if (result?.confirmationRequired) {
          formMessage(container, result.message, 'info');
        } else {
          formMessage(container, 'Acceso creado; instalación vinculada.', 'ok');
          if (onSuccess) await onSuccess(result);
        }
      } catch (error) {
        console.error(error);
        formMessage(container, error?.message || String(error));
      } finally {
        setBusy(createBtn, false);
        loginBtn.disabled = false;
      }
    });
  }

  async function showBootstrap() {
    const bootstrap = document.getElementById('loginBootstrap');
    const normal = document.getElementById('loginNormal');
    if (!bootstrap || !normal) return;

    normal.style.display = 'none';
    bootstrap.style.display = 'block';

    if (!navigator.onLine) {
      bootstrap.innerHTML = `
        <div style="padding:16px;background:rgba(239,68,68,.12);border:1px solid #ef4444;border-radius:12px;">
          <strong>Primera instalación sin conexión</strong><br>
          <small>Conecta esta PC a Internet una vez para validar un administrador y descargar la copia local. Después Loto Games podrá trabajar offline.</small>
        </div>`;
      return;
    }

    bootstrap.innerHTML = pairingFormHtml({ bootstrap: true });
    bindPairingForm(bootstrap, { bootstrap: true });

    const existing = await tryExistingSession({ loginLocal: true });
    if (existing) loginMessage('Base local restaurada desde Supabase.', 'ok');
  }

  function closePairDialog() {
    pairingOverlay?.remove();
    pairingOverlay = null;
  }

  function showPairDialog() {
    if (pairingOverlay || !document.body) return;
    pairingOverlay = document.createElement('div');
    pairingOverlay.id = 'cloudPairOverlay';
    pairingOverlay.style.cssText = 'position:fixed;inset:0;z-index:1000000;background:rgba(2,6,23,.78);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
    pairingOverlay.innerHTML = `
      <div style="width:480px;max-width:100%;background:#141d31;border:1px solid #334766;border-radius:20px;padding:24px;color:#f8fafc;box-shadow:0 25px 70px rgba(0,0,0,.6);">
        ${pairingFormHtml({ bootstrap: false })}
        <button type="button" class="btn cloudCloseBtn" style="width:100%;margin-top:10px;background:#111827;color:#cbd5e1;">Cerrar</button>
      </div>`;
    document.body.appendChild(pairingOverlay);
    pairingOverlay.querySelector('.cloudCloseBtn')?.addEventListener('click', closePairDialog);
    pairingOverlay.addEventListener('click', event => {
      if (event.target === pairingOverlay) closePairDialog();
    });
    bindPairingForm(pairingOverlay, {
      bootstrap: false,
      onSuccess: async () => {
        setTimeout(closePairDialog, 350);
      }
    });
  }

  // Sustituimos únicamente el bootstrap vacío de escritorio. Si ya hay usuarios
  // locales, se conserva exactamente el login offline existente.
  window.inicializarTecladoPIN = async (...args) => {
    try {
      const users = await window.DB.getUsuarios();
      if (users.length === 0) {
        await showBootstrap();
        return;
      }
    } catch (error) {
      console.error('No se pudo comprobar la base local:', error);
      loginMessage('No se pudo abrir la base local: ' + (error?.message || error));
      return;
    }
    return originalInitializer?.(...args);
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      for (const id of ['dbStatusSidebar', 'dbStatusTop']) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.style.cursor = 'pointer';
        el.title = 'Haz clic para vincular o renovar la sincronización con Supabase';
        el.addEventListener('click', showPairDialog);
      }
    }, 100);
  });

  cloud.auth.onAuthStateChange(() => {
    setTimeout(() => window.LotoSync?.syncOnce?.(), 0);
  });

  window.LotoCloudAuth = {
    signIn,
    signUp,
    finalizePairing,
    showPairDialog,
    closePairDialog
  };

  console.log('✅ Vinculación segura de nube activa');
})();
