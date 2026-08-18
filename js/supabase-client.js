// ============================================
// LOTO GAMES POS - CONEXIÓN SUPABASE
// ?demo=1 desactiva la nube y usa únicamente localStorage
// ============================================

const SUPABASE_URL = "https://vreznzasckljieptvqas.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZXpuemFzY2tsamllcHR2cWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzEwNTEsImV4cCI6MjA5NjQ0NzA1MX0.Z8RcUx2sL9b5fFW00tetzaq41pGx7A0uqnLqL4yOXj8";

const DEMO_MODE = new URLSearchParams(window.location.search).get('demo') === '1';
window.LOTO_DEMO_MODE = DEMO_MODE;

if (DEMO_MODE) {
  window.supabase = null;
  console.warn('🧪 MODO DEMO: Supabase desactivado. Los datos permanecen sólo en este navegador.');
} else {
  window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase conectado correctamente');
}
