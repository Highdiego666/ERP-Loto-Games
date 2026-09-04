// ============================================
// LOTO GAMES POS - COMPATIBILIDAD DE NUBE
// En Windows la sincronización vive en el proceso principal de Electron.
// ============================================

(function () {
  'use strict';

  const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';
  window.LOTO_DEMO_MODE = demoMode;

  if (window.lotoDesktop?.isDesktop) {
    // La UI nunca recibe claves de nube ni acceso directo a Supabase.
    window.supabase = null;
    console.log('✅ Windows: nube aislada en Electron; UI conectada a SQLite local.');
    return;
  }

  // La rama windows-desktop-v1 está diseñada para ejecución de escritorio.
  // Conservamos el modo web sólo como demo local para no depender de CDN remotos.
  window.supabase = null;
  if (!demoMode) {
    console.warn('ℹ️ Esta rama usa Supabase únicamente desde la aplicación de Windows. Modo web local activo.');
  }
})();
