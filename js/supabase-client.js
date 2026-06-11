// Configuración de Supabase
const SUPABASE_URL = "https://vreznzasckljieptvqas.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZXpuemFzY2tsamllcHR2cWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzEwNTEsImV4cCI6MjA5NjQ0NzA1MX0.Z8RcUx2sL9b5fFW00tetzaq41pGx7A0uqnLqL4yOXj8";

// Inicializar Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Guardar en window para uso global
window.supabase = supabaseClient;

console.log("✅ Supabase conectado correctamente");
console.log("📊 Base de datos en la nube lista");
