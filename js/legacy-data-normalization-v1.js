// ============================================
// LOTO GAMES - NORMALIZACIÓN LEGACY V1
// Unifica variantes antiguas sin reescribir el historial persistido.
// ============================================

(function () {
  'use strict';

  const db = window.DB;
  if (!db?.getVentas) return;

  const originalGetVentas = db.getVentas.bind(db);

  function normalizePayment(value) {
    const raw = String(value || '').trim();
    const key = raw.toLowerCase();
    if (key === 'efectivo') return 'Efectivo';
    if (key === 'tarjeta') return 'Tarjeta';
    if (key === 'transferencia') return 'Transferencia';
    if (key === 'cuenta plaza' || key === 'cuenta_plaza' || key === 'plaza') return 'Cuenta Plaza';
    return raw || 'Efectivo';
  }

  db.getVentas = async function () {
    const rows = await originalGetVentas();
    return (Array.isArray(rows) ? rows : []).map(row => ({
      ...row,
      metodo_pago: normalizePayment(row.metodo_pago || row.metodoPago),
      metodoPago: normalizePayment(row.metodo_pago || row.metodoPago)
    }));
  };

  db.normalizePayment = normalizePayment;

  console.log('✅ Normalización legacy: métodos de pago canónicos en lectura');
})();
