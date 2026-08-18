// ============================================
// LOTO GAMES POS - AUTH V2
// Credenciales derivadas con Web Crypto (PBKDF2)
// ============================================

(function () {
  'use strict';

  const ITERATIONS = 160000;
  const encoder = new TextEncoder();

  function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  }

  async function derive(secret, saltB64) {
    if (!window.crypto?.subtle) {
      throw new Error('Web Crypto no está disponible. Ejecuta el POS en localhost o HTTPS.');
    }
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: base64ToBytes(saltB64),
      iterations: ITERATIONS,
      hash: 'SHA-256'
    }, keyMaterial, 256);
    return bytesToBase64(new Uint8Array(bits));
  }

  async function makeCredential(secret) {
    if (!secret) return { hash: null, salt: null };
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const saltB64 = bytesToBase64(salt);
    return { hash: await derive(secret, saltB64), salt: saltB64 };
  }

  async function verifyCredential(secret, hash, salt) {
    if (!secret || !hash || !salt) return false;
    const candidate = await derive(secret, salt);
    if (candidate.length !== hash.length) return false;
    // Comparación constante simple para evitar salir al primer carácter diferente.
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) {
      diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    return diff === 0;
  }

  function normalizePrivileges(value) {
    if (!Array.isArray(value)) return [];
    // Compatibilidad con la versión antigua, que guardaba objetos {id, activo}.
    return value
      .filter(v => typeof v === 'string' || (v && v.activo !== false))
      .map(v => typeof v === 'string' ? v : v.id)
      .filter(Boolean);
  }

  function publicUser(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      estado: user.estado || 'activo',
      privilegios: normalizePrivileges(user.privilegios)
    };
  }

  window.AuthV2 = {
    async createPassword(password) {
      const c = await makeCredential(password);
      return { password_hash: c.hash, password_salt: c.salt };
    },

    async createPin(pin) {
      const c = await makeCredential(pin);
      return { pin_hash: c.hash, pin_salt: c.salt };
    },

    async verifyPassword(password, user) {
      if (user.password_hash && user.password_salt) {
        return verifyCredential(password, user.password_hash, user.password_salt);
      }
      // Migración controlada de usuarios de base de datos antiguos.
      if (user.password && user.password === password) {
        const cred = await this.createPassword(password);
        await window.DB.updateUsuario(user.id, cred);
        return true;
      }
      return false;
    },

    async verifyPin(pin, user) {
      if (user.pin_hash && user.pin_salt) {
        return verifyCredential(pin, user.pin_hash, user.pin_salt);
      }
      if (user.pin && user.pin === pin) {
        const cred = await this.createPin(pin);
        await window.DB.updateUsuario(user.id, cred);
        return true;
      }
      return false;
    },

    normalizePrivileges,
    publicUser,

    saveSession(user) {
      const session = {
        ...publicUser(user),
        loggedIn: true,
        version: 2,
        timestamp: Date.now()
      };
      localStorage.setItem('loto_session', JSON.stringify(session));
      window.usuarioActual = session;
      return session;
    },

    getSession() {
      try {
        const raw = localStorage.getItem('loto_session');
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session.loggedIn || session.version !== 2) return null;
        if ((Date.now() - Number(session.timestamp || 0)) > 28800000) return null;
        return session;
      } catch (_) {
        return null;
      }
    },

    clearSession() {
      localStorage.removeItem('loto_session');
      window.usuarioActual = null;
    }
  };

  console.log('✅ Auth V2 cargado');
})();
