// ============================================
// LOTO GAMES - PIN ÚNICO POR USUARIO V1
// El login rápido no debe ser ambiguo entre empleados.
// ============================================

(function () {
  'use strict';

  const auth = window.AuthV2;
  if (!auth?.createPin || !auth?.verifyPin || !window.DB?.getUsuarios) return;

  const originalCreatePin = auth.createPin.bind(auth);
  const originalVerifyPin = auth.verifyPin.bind(auth);

  auth.createPin = async pin => {
    const currentId = String(document.getElementById('usuarioId')?.value || '');
    const users = await window.DB.getUsuarios();

    for (const user of users || []) {
      if (currentId && String(user.id) === currentId) continue;

      let matches = false;
      if (user.pin_hash && user.pin_salt) {
        matches = await originalVerifyPin(pin, user);
      } else if (user.pin != null) {
        // Compatibilidad temporal con una fila legacy si existiera localmente.
        matches = String(user.pin) === String(pin);
      }

      if (matches) {
        throw new Error('Ese PIN ya está asignado a otro usuario. Elige uno diferente.');
      }
    }

    return originalCreatePin(pin);
  };

  console.log('✅ Usuarios: PIN rápido único entre cuentas');
})();
