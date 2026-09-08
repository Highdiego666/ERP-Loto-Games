// ============================================
// LOTO GAMES - AUDITORÍA V1
// Consulta unificada del historial local/nube.
// ============================================

(function () {
  'use strict';

  const db = window.DB;
  if (!db) {
    console.error('❌ audit-v1.js requiere window.DB');
    return;
  }

  db.getAuditoria = async function () {
    if (window.LotoDesktopStorage?.getCollection) {
      return window.LotoDesktopStorage
        .getCollection('auditoria_modificaciones')
        .slice()
        .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at));
    }

    if (window.supabase) {
      const { data, error } = await window.supabase
        .from('auditoria_modificaciones')
        .select('*')
        .order('fecha', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    try {
      return JSON.parse(localStorage.getItem('auditoria_modificaciones') || '[]')
        .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at));
    } catch (_) {
      return [];
    }
  };

  console.log('✅ Auditoría V1 disponible para reportes');
})();
