// ============================================
// LOTO GAMES - GUARDA DE BORRADO DE CLIENTES V1
// Respeta la FK servicios_tecnicos.cliente_id -> clientes.id.
// ============================================

(function () {
  'use strict';

  const originalDelete = window.eliminarCliente;
  if (typeof originalDelete !== 'function') return;

  window.eliminarCliente = async id => {
    try {
      const [clients, services] = await Promise.all([
        window.DB.getClientes(),
        window.DB.getServicios()
      ]);
      const client = (clients || []).find(row => String(row.id) === String(id));
      if (!client) return alert('Cliente no encontrado. Recarga el módulo.');

      const linked = (services || []).filter(service => String(service.cliente_id ?? '') === String(id));
      if (linked.length > 0) {
        const open = linked.filter(service => !['entregado'].includes(String(service.estado || '').toLowerCase())).length;
        return alert(`No se puede eliminar ${client.nombre}: tiene ${linked.length} orden(es) de servicio asociada(s)${open ? `, ${open} aún no entregada(s)` : ''}.\n\nConserva el cliente para mantener el historial técnico.`);
      }

      return originalDelete(id);
    } catch (error) {
      console.error(error);
      alert('❌ No se pudo validar el historial del cliente: ' + (error?.message || error));
    }
  };

  console.log('✅ Clientes: borrado protegido cuando existen servicios asociados');
})();
