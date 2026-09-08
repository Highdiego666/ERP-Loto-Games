import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const BIGINT_MIGRATION = 'supabase/migrations/20260904003156_widen_ids_for_offline_sync.sql';
const RLS_MIGRATION = 'supabase/migrations/20260908054255_secure_cloud_sync_rls_reconcile.sql';
const AUDIT_MIGRATION = 'supabase/migrations/20260908064307_auditoria_modificaciones_append_only.sql';

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
  'js/utils/audit-v1.js',
  'js/modules/reportes-v2.js',
  BIGINT_MIGRATION,
  RLS_MIGRATION,
  AUDIT_MIGRATION,
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
if (!html.includes('js/utils/audit-v1.js')) throw new Error('Auditoría no está cargada');

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
  'storage:commit-collection-sync',
  'db.transaction',
  'UNIQUE(entity, record_id)',
  "AUDIT_ENTITY = 'auditoria_modificaciones'"
]) {
  if (!main.includes(durabilitySetting)) throw new Error(`Persistencia durable incompleta: ${durabilitySetting}`);
}
if (!main.includes('loto-games.db')) throw new Error('SQLite local no configurado');
if (!main.includes('La auditoría de Loto Games es append-only')) {
  throw new Error('La auditoría local debe bloquear eliminaciones');
}

const preload = read('electron/preload.cjs');
for (const bridge of ['setSync', 'enqueueSync', 'loadAll', 'commitCollectionSync', 'auditValue', 'auditJobs']) {
  if (!preload.includes(bridge)) throw new Error(`Preload sin puente durable requerido: ${bridge}`);
}

const storage = read('js/desktop-storage.js');
for (const contract of [
  'applyRemoteCollection',
  'persistSetSync',
  'buildCollectionDiff',
  'commitManagedCollectionSync',
  'desktop.storage.commitCollectionSync',
  'buildAuditEntries',
  'currentActor',
  'SENSITIVE_AUDIT_FIELDS',
  "AUDIT_ENTITY = 'auditoria_modificaciones'"
]) {
  if (!storage.includes(contract)) throw new Error(`Contrato de persistencia/auditoría incompleto: ${contract}`);
}
if (!storage.includes('El borrado global del almacenamiento está bloqueado')) {
  throw new Error('Debe bloquearse el borrado global de datos del negocio');
}

const sync = read('js/desktop-sync.js');
for (const contract of ['pullCloudSnapshot', 'authorizeCloud', "toLowerCase() === 'admin'", 'desktop.sync.pending(1)', "AUDIT_ENTITY = 'auditoria_modificaciones'"]) {
  if (!sync.includes(contract)) throw new Error(`Contrato offline-first incompleto: ${contract}`);
}
if (!sync.includes('const pulled = await pullCloudSnapshot(client);')) {
  throw new Error('El pull posterior al push debe volver a validar una fotografía fresca de usuarios');
}
if (sync.includes('pullCloudSnapshot(client, authorization.users)')) {
  throw new Error('No se debe reutilizar el snapshot de usuarios anterior al push');
}
if (sync.includes("usuarios: ['id','nombre','email','password'")) {
  throw new Error('La sincronización no debe transportar contraseñas heredadas en texto plano');
}
if (!sync.includes("error.code !== '23505'")) {
  throw new Error('La auditoría debe tolerar reintentos idempotentes sin permitir UPDATE');
}

const audit = read('js/utils/audit-v1.js');
if (!audit.includes('getAuditoria') || !audit.includes('auditoria_modificaciones')) {
  throw new Error('Consulta de auditoría incompleta');
}

const reports = read('js/modules/reportes-v2.js');
for (const contract of ['Modificaciones', 'generarReporteAuditoriaV2', 'filtrarAuditoriaV2', 'exportarAuditoriaCSV']) {
  if (!reports.includes(contract)) throw new Error(`Reporte de auditoría incompleto: ${contract}`);
}

const cloudAuth = read('js/cloud-auth.js');
for (const contract of ['signInWithPassword', 'auth.signUp', 'finalizePairing', 'users.length === 0']) {
  if (!cloudAuth.includes(contract)) throw new Error(`Vinculación de nube incompleta: ${contract}`);
}

const rls = read(RLS_MIGRATION);
for (const contract of [
  'private.loto_cloud_admin()',
  'revoke all on table public.productos from anon',
  'to authenticated',
  "lower(trim(coalesce(u.rol, ''))) = 'admin'"
]) {
  if (!rls.includes(contract)) throw new Error(`Migración RLS incompleta: ${contract}`);
}

const auditMigration = read(AUDIT_MIGRATION);
for (const contract of [
  'create table if not exists public.auditoria_modificaciones',
  'enable row level security',
  'grant select, insert on table public.auditoria_modificaciones to authenticated',
  'Loto audit admin read',
  'Loto audit admin append'
]) {
  if (!auditMigration.includes(contract)) throw new Error(`Migración de auditoría incompleta: ${contract}`);
}
if (/grant[^;]*(update|delete)[^;]*auditoria_modificaciones/i.test(auditMigration)) {
  throw new Error('La auditoría remota debe ser append-only');
}

const bigint = read(BIGINT_MIGRATION);
for (const contract of [
  'alter table public.productos',
  'alter column id type bigint',
  'alter table public.servicios_tecnicos'
]) {
  if (!bigint.includes(contract)) throw new Error(`Migración bigint incompleta: ${contract}`);
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

console.log('✅ Release checks OK: offline, SQLite durable, cola transaccional, auditoría append-only, sync bidireccional, cloud auth, RLS y empaquetado');
