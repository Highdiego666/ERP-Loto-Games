import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const executableText = text => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const required = [
  'js/stability-fixes-v1.js',
  'js/native-print-v1.js',
  'js/corte-print-pilot.js',
  'js/configuracion-v1.js',
  'js/inventory-ui-fixes-v1.js',
  'js/inventory-report-v1.js',
  'js/desktop-sync.js',
  'js/modules/ventas-v5.js',
  'js/modules/traspasos-v2.js',
  'js/utils/database-sales-v3.js',
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
  'js/modules/productos-label-v2.js',
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
  'js/configuracion-v1.js',
  'js/inventory-ui-fixes-v1.js',
  'js/inventory-report-v1.js'
]) {
  if (!html.includes(script)) throw new Error(`index.html no carga ${script}`);
}
if (!html.includes('data-module="configuracion"')) throw new Error('Configuración no está integrada al menú real');
if (html.includes('js/modules/ventas.js')) throw new Error('Ventas legacy no debe cargarse junto a Ventas V5');
if (html.includes('js/modules/productos-label-v2.js')) throw new Error('Etiquetas legacy por popup no deben cargarse');
if (html.indexOf('js/stability-fixes-v1.js') < html.indexOf('js/modules/ventas-v5.js')) {
  throw new Error('La estabilización debe cargarse después de Ventas V5 para aplicar overrides controlados');
}
if (html.indexOf('js/native-print-v1.js') < html.indexOf('js/stability-fixes-v1.js')) {
  throw new Error('La impresión nativa debe cargarse después del fallback de estabilidad');
}
if (html.indexOf('js/inventory-ui-fixes-v1.js') < html.indexOf('js/modules/inventario.js')) {
  throw new Error('Los ajustes UI de inventario deben cargar después de Inventario');
}
if (html.indexOf('js/inventory-report-v1.js') < html.indexOf('js/modules/reportes-v2.js')) {
  throw new Error('El reporte de inventario V1 debe cargar después de Reportes V2');
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
if (/\bwindow\.open\s*\(/.test(executableText(stability))) {
  throw new Error('La capa de estabilidad ejecuta window.open');
}

const nativePrint = read('js/native-print-v1.js');
for (const contract of ['LotoNativePrint', 'loto_ticket_printer', 'loto_label_printer', 'printHtml']) {
  if (!nativePrint.includes(contract)) throw new Error(`Impresión nativa incompleta: ${contract}`);
}
if (/\bwindow\.open\s*\(/.test(executableText(nativePrint))) {
  throw new Error('La impresión nativa ejecuta window.open');
}

const main = read('electron/main.cjs');
for (const contract of ['getPrintersAsync', "ipcMain.handle('printer:list'", "ipcMain.handle('printer:print-html'", 'webContents.print']) {
  if (!main.includes(contract)) throw new Error(`Puente Electron de impresión incompleto: ${contract}`);
}

const preload = read('electron/preload.cjs');
for (const contract of ["ipcRenderer.invoke('printer:list')", "ipcRenderer.invoke('printer:print-html'"]) {
  if (!preload.includes(contract)) throw new Error(`Preload no expone impresión: ${contract}`);
}

const app = read('js/app-v2.js');
for (const contract of ["configuracion: {", "case 'configuracion'", "window.cargarConfiguracion"]) {
  if (!app.includes(contract)) throw new Error(`Configuración no está integrada al shell: ${contract}`);
}

const config = read('js/configuracion-v1.js');
for (const contract of ['window.configuracionModule', 'Miniprinter / tickets', 'Impresora de etiquetas', 'LotoRuntimeHealth', 'probarTicketConfiguracion', 'window.cargarConfiguracion']) {
  if (!config.includes(contract)) throw new Error(`Configuración de piloto incompleta: ${contract}`);
}

const inventoryUi = read('js/inventory-ui-fixes-v1.js');
for (const contract of ['Cargar CSV', 'accept=".csv,text/csv"', 'LGCODE-000001']) {
  if (!inventoryUi.includes(contract)) throw new Error(`Inventario sigue prometiendo importación incorrecta: ${contract}`);
}

const sync = read('js/desktop-sync.js');
for (const contract of ['shouldDeferPull', 'Local · edición protegida', 'RECENT_EDIT_MS']) {
  if (!sync.includes(contract)) throw new Error(`Sincronización sin protección de edición: ${contract}`);
}

const sales = read('js/utils/database-sales-v3.js');
for (const contract of ['Stock insuficiente', 'registrarMovimientoInventario', "tipo: 'salida'", 'stock_anterior', 'stock_nuevo']) {
  if (!sales.includes(contract)) throw new Error(`Venta sin trazabilidad de inventario: ${contract}`);
}

const inventoryReport = read('js/inventory-report-v1.js');
for (const contract of ['getMovimientosInventario', 'getTraspasos', 'stock_anterior', 'stock_nuevo']) {
  if (!inventoryReport.includes(contract)) throw new Error(`Reporte de inventario incompleto: ${contract}`);
}

const transferMigration = read('supabase/migrations/20260912173000_allow_inventory_transfer_type.sql');
if (!transferMigration.includes("'traspaso'")) throw new Error('La migración no permite el tipo traspaso');

const testPlan = read('docs/PRUEBAS_POS_FINAL.md');
for (const contract of ['Prueba de estabilidad prolongada', 'Ticket y miniprinter', 'Traspasos — prueba E2E obligatoria']) {
  if (!testPlan.includes(contract)) throw new Error(`Plan de pruebas incompleto: ${contract}`);
}

console.log('✅ Pilot checks OK: runtime limpio, configuración integrada, edición protegida, inventario trazable, miniprinter nativa, impresión sin popup y Traspasos reproducible');
