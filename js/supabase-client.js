// ============================================
// LOTO GAMES POS - CONEXIÓN SUPABASE
// En navegador: Supabase mantiene compatibilidad con la versión web.
// En Electron: los módulos operan LOCAL y cloudSupabase sólo sincroniza.
// ============================================

const SUPABASE_URL = "https://vreznzasckljieptvqas.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GyZkdKYivt0zJ2sQdYrfhw_CHlkwKeY";

const params = new URLSearchParams(window.location.search);
const DEMO_MODE = params.get('demo') === '1';
const DESKTOP_MODE = !!window.lotoDesktop?.isDesktop;
window.LOTO_DEMO_MODE = DEMO_MODE;
window.LOTO_DESKTOP_MODE = DESKTOP_MODE;

if (typeof supabase === 'undefined') {
  window.supabase = null;
  window.cloudSupabase = null;
  console.warn('⚠️ Cliente Supabase no disponible. El sistema seguirá trabajando localmente.');
} else if (DEMO_MODE) {
  window.supabase = null;
  window.cloudSupabase = null;
  console.warn('🧪 MODO DEMO: Supabase desactivado.');
} else {
  const cloudClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  window.cloudSupabase = cloudClient;

  if (DESKTOP_MODE) {
    // Offline-first: todas las operaciones del POS escriben en localStorage,
    // que desktop-storage.js replica inmediatamente a SQLite.
    window.supabase = null;
    console.log('✅ Escritorio: almacenamiento local primario + cliente de sincronización Supabase');
  } else {
    window.supabase = cloudClient;
    console.log('✅ Supabase conectado correctamente');
  }
}
