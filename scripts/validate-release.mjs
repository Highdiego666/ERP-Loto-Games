import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const required = [
  'index.html',
  'css/style.css',
  'assets/img/loto-games-logo.svg',
  'electron/main.cjs',
  'electron/preload.cjs',
  'js/desktop-storage.js',
  'js/desktop-sync.js',
  'js/cloud-auth.js',
  'js/supabase-client.js',
  'supabase/migrations/20260903_windows_offline_bigint.sql',
  'supabase/migrations/20260903_secure_cloud_sync_rls.sql',
  'vendor/chart.umd.js',
  'vendor/JsBarcode.all.min.js',
  'vendor/supabase.js',
  'vendor/fontawesome/css/all.min.css'
];

for (const file of required) {
  if (!exists(file)) throw new Error(`Archivo requerido faltante: ${file}`);
}

const html = read('index.html');
for (const forbidden of ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com']) {
  if (html.includes(forbidden)) throw new Error(`Dependencia externa prohibida en release: ${forbidden}`);
}
if (!html.includes('Content-Security-Policy')) throw new Error('Falta Content-Security-Policy');
if (!html.includes("object-src 'none'")) throw new Error('CSP debe bloquear plugins/objetos');
if (!html.includes('js/desktop-storage.js')) throw new Error('Persistencia local no está cargada');
if (!html.includes('js/desktop-sync.js')) throw new Error('Motor de sincronización no está cargado');
if (!html.includes('js/cloud-auth.js')) throw new Error('Vinculación segura de nube no está cargada');

const supabaseClient = read('js/supabase-client.js');
if (supabaseClient.includes('SUPABASE_ANON_KEY')) throw new Error('Se detectó clave anon heredada');
if (!supabaseClient.includes('sb_publishable_')) throw new Error('Falta publishable key de Supabase');
if (!supabaseClient.includes('persistSession: true')) throw new Error('La sesión de sincronización debe persistir en escritorio');

const main = read('electron/main.cjs');
for (const securitySetting of [
  'contextIsolation: true',
  'nodeIntegration: false',
  'sandbox: true',
  'webSecurity: true'
]) {
  if (!main.includes(securitySetting)) throw new Error(`Electron sin ajuste requerido: ${securitySetting}`);
}
for (const durabilitySetting of [
  "journal_mode = WAL",
  "synchronous = FULL",
  'storage:set-sync',
  'sync:enqueue-sync',
  'UNIQUE(entity, record_id)'
]) {
  if (!main.includes(durabilitySetting)) throw new Error(`Persistencia durable incompleta: ${durabilitySetting}`);
}
if (!main.includes('loto-games.db')) throw new Error('SQLite local no configurado');

const preload = read('electron/preload.cjs');
for (const bridge of ['setSync', 'enqueueSync', 'loadAll']) {
  if (!preload.includes(bridge)) throw new Error(`Preload sin puente durable requerido: ${bridge}`);
}

const storage = read('js/desktop-storage.js');
for (const contract of ['applyRemoteCollection', 'persistSetSync', 'enqueueSync']) {
  if (!storage.includes(contract)) throw new Error(`Contrato de persistencia incompleto: ${contract}`);
}

const sync = read('js/desktop-sync.js');
for (const contract of ['pullCloudSnapshot', 'authorizeCloud', "toLowerCase() === 'admin'", 'desktop.sync.pending(1)']) {
  if (!sync.includes(contract)) throw new Error(`Contrato offline-first incompleto: ${contract}`);
}
if (sync.includes("usuarios: ['id','nombre','email','password'")) {
  throw new Error('La sincronización no debe transportar contraseñas heredadas en texto plano');
}

const cloudAuth = read('js/cloud-auth.js');
for (const contract of ['signInWithPassword', 'auth.signUp', 'finalizePairing', 'users.length === 0']) {
  if (!cloudAuth.includes(contract)) throw new Error(`Vinculación de nube incompleta: ${contract}`);
}

const rls = read('supabase/migrations/20260903_secure_cloud_sync_rls.sql');
for (const contract of [
  'private.loto_cloud_admin()',
  'revoke all on table public.productos from anon',
  'to authenticated',
  "lower(trim(coalesce(u.rol, ''))) = 'admin'"
]) {
  if (!rls.includes(contract)) throw new Error(`Migración RLS incompleta: ${contract}`);
}

const pkg = JSON.parse(read('package.json'));
if (pkg.build?.nsis?.deleteAppDataOnUninstall !== false) {
  throw new Error('El desinstalador no debe borrar automáticamente los datos del negocio');
}
if (!String(pkg.build?.win?.artifactName || '').includes('LotoGames-Setup-')) {
  throw new Error('Nombre de artefacto Windows inesperado');
}
if (!pkg.build?.asarUnpack?.some?.(entry => String(entry).includes('better-sqlite3'))) {
  throw new Error('better-sqlite3 debe quedar desempaquetado del ASAR');
}

console.log('✅ Release checks OK: offline, SQLite durable, sync bidireccional, cloud auth, RLS y empaquetado');
