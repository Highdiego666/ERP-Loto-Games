import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const required = [
  'js/stability-fixes-v1.js',
  'js/native-print-v1.js',
  'js/corte-print-pilot.js',
  'js/configuracion-v1.js',
  'js/desktop-sync.js',
  'js/modules/ventas-v5.js',
  'js/modules/traspasos-v2.js',
  'electron/main.cjs',
  'electron/preload.cjs',
  'supabase/migrations/20260912173000_allow_inventory_transfer_type.sql',
  'docs/PRUEBAS_POS_FINAL.md'
];
for (const file of required) {
  if (!exists(file)) throw new Error(`Piloto incompleto: falta ${file}`);
}

const forbiddenDeadFiles = [
  'js/app.js',
  'js/keyboard-v2.js',
  'js/keyboard-v3.js',
  'js/modules/clientes.js',
  'js/modules/corte.js',
  'js/modules/productos.js',
  'js/modules/ventas.js',
  'js/modules/ventas-v2.js',
  'js/modules/ventas-v3.js',
  'js/modules/ventas-v4.js'
];
for (const file of forbiddenDeadFiles) {
  if (exists(file)) throw new Error(`Código obsoleto volvió al piloto: ${file}`);
}

const html = read('index.html');
for (const script of [
  'js/stability-fixes-v1.js',
  'js/native-print-v1.js',
  'js/corte-print-pilot.js',
  'js/configuracion-v1.js'
]) {
  if (!html.includes(script)) throw new Error(`index.html no carga ${script}`);
}
if (html.includes('js/modules/ventas.js')) throw new Error('Ventas legacy no debe cargarse junto a Ventas V5');
if (html.indexOf('js/stability-fixes-v1.js') < html.indexOf('js/modules/ventas-v5.js')) {
  throw new Error('La estabilización debe cargarse después de Ventas V5 para aplicar overrides controlados');
}
if (html.indexOf('js/native-print-v1.js') < html.indexOf('js/stability-fixes-v1.js')) {
  throw new Error('La impresión nativa debe cargarse después del fallback de estabilidad');
}
if (html.indexOf('js/configuracion-v1.js') < html.indexOf('js/app-v2.js')) {
  throw new Error('Configuración debe cargarse después del shell para envolver cargarSistemaLogin');
}

const stability = read('js/stability-fixes-v1.js');
for (const contract of [
  'LotoRuntimeHealth',
  'registrarMovimientoInventario',
  'window.guardarAjusteStock',
  'window.buscarServicio',
  'window.imprimirTicketVenta',
  'window.imprimirEtiqueta',
  'printInFrame'
]) {
  if (!stability.includes(contract)) throw new Error(`Falta contrato pre-piloto: ${contract}`);
}
if (stability.includes('window.open(')) throw new Error('La impresión del piloto no debe depender de popups en la capa de estabilidad');

const nativePrint = read('js/native-print-v1.js');
for (const contract of ['LotoNativePrint', 'loto_ticket_printer', 'loto_label_printer', 'printHtml']) {
  if (!nativePrint.includes(contract)) throw new Error(`Impresión nativa incompleta: ${contract}`);
}
if (nativePrint.includes('window.open(')) throw new Error('La impresión nativa no puede usar window.open');

const main = read('electron/main.cjs');
for (const contract of ['getPrintersAsync', "ipcMain.handle('printer:list'", "ipcMain.handle('printer:print-html'", 'webContents.print']) {
  if (!main.includes(contract)) throw new Error(`Puente Electron de impresión incompleto: ${contract}`);
}

const preload = read('electron/preload.cjs');
for (const contract of ["ipcRenderer.invoke('printer:list')", "ipcRenderer.invoke('printer:print-html'"]) {
  if (!preload.includes(contract)) throw new Error(`Preload no expone impresión: ${contract}`);
}

const config = read('js/configuracion-v1.js');
for (const contract of ['Configuración', 'Miniprinter / tickets', 'Impresora de etiquetas', 'LotoRuntimeHealth', 'probarTicketConfiguracion']) {
  if (!config.includes(contract)) throw new Error(`Configuración de piloto incompleta: ${contract}`);
}

const sync = read('js/desktop-sync.js');
for (const contract of ['shouldDeferPull', 'Local · edición protegida', 'RECENT_EDIT_MS']) {
  if (!sync.includes(contract)) throw new Error(`Sincronización sin protección de edición: ${contract}`);
}

const transferMigration = read('supabase/migrations/20260912173000_allow_inventory_transfer_type.sql');
if (!transferMigration.includes("'traspaso'")) throw new Error('La migración no permite el tipo traspaso');

const testPlan = read('docs/PRUEBAS_POS_FINAL.md');
for (const contract of ['Prueba de estabilidad prolongada', 'Ticket y miniprinter', 'Traspasos — prueba E2E obligatoria']) {
  if (!testPlan.includes(contract)) throw new Error(`Plan de pruebas incompleto: ${contract}`);
}

console.log('✅ Pilot checks OK: runtime limpio, edición protegida, miniprinter nativa, impresión sin popup y Traspasos reproducible');
