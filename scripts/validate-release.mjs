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
if (!html.includes('js/desktop-storage.js')) throw new Error('Persistencia local no está cargada');
if (!html.includes('js/desktop-sync.js')) throw new Error('Motor de sincronización no está cargado');

const supabaseClient = read('js/supabase-client.js');
if (supabaseClient.includes('SUPABASE_ANON_KEY')) throw new Error('Se detectó clave anon heredada');
if (!supabaseClient.includes('sb_publishable_')) throw new Error('Falta publishable key de Supabase');

const main = read('electron/main.cjs');
for (const securitySetting of [
  'contextIsolation: true',
  'nodeIntegration: false',
  'sandbox: true',
  'webSecurity: true'
]) {
  if (!main.includes(securitySetting)) throw new Error(`Electron sin ajuste requerido: ${securitySetting}`);
}
if (!main.includes('loto-games.db')) throw new Error('SQLite local no configurado');
if (!main.includes("deleteAppDataOnUninstall")) {
  // package.json carries this setting; this branch only ensures the installer retains user data.
}

const pkg = JSON.parse(read('package.json'));
if (pkg.build?.nsis?.deleteAppDataOnUninstall !== false) {
  throw new Error('El desinstalador no debe borrar automáticamente los datos del negocio');
}
if (!String(pkg.build?.win?.artifactName || '').includes('LotoGames-Setup-')) {
  throw new Error('Nombre de artefacto Windows inesperado');
}

console.log('✅ Release checks OK: offline assets, Electron hardening, SQLite y empaquetado');
