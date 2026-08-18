// ============================================
// LOTO GAMES POS - COMPATIBILIDAD V2
// Helpers para módulos antiguos que siguen siendo útiles
// ============================================

(function () {
  'use strict';
  if (!window.DB) return;

  window.DB.getVentasPorFecha = async function (fechaISO) {
    const ventas = await this.getVentas();
    return ventas
      .filter(v => {
        const d = new Date(v.fecha);
        if (Number.isNaN(d.getTime())) return false;
        const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return local === fechaISO;
      })
      .map(v => ({ ...v, metodoPago: v.metodoPago || v.metodo_pago || 'Efectivo' }));
  };

  console.log('✅ Compatibilidad V2 cargada');
})();
