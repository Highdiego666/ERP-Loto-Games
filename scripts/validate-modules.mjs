import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const requireFile = rel => { if (!exists(rel)) throw new Error(`Falta archivo de módulo: ${rel}`); return read(rel); };
const requireAll = (text, label, contracts) => {
  for (const contract of contracts) if (!text.includes(contract)) throw new Error(`${label}: falta contrato ${contract}`);
};

const index = requireFile('index.html');
const app = requireFile('js/app-v2.js');

const runtimeFiles = [
  'js/modules/login-v2.js',
  'js/modules/dashboard.js',
  'js/modules/ventas-v5.js',
  'js/modules/productos-v2.js',
  'js/modules/inventario.js',
  'js/modules/servicios.js',
  'js/modules/clientes-v2.js',
  'js/modules/usuarios-v2.js',
  'js/modules/reportes.js',
  'js/modules/reportes-v2.js',
  'js/modules/traspasos-v2.js',
  'js/modules/corte-v2.js',
  'js/configuracion-v1.js',
  'js/store-stock-v1.js',
  'js/inventory-store-view-v1.js',
  'js/product-stock-guard-v1.js',
  'js/client-delete-guard-v1.js',
  'js/user-pin-guard-v1.js',
  'js/sales-store-ui-v1.js',
  'js/reports-store-view-v1.js',
  'js/scanner-config-v2.js',
  'js/legacy-data-normalization-v1.js',
  'js/native-print-v1.js',
  'js/corte-print-pilot.js',
  'js/desktop-sync.js'
];
for (const rel of runtimeFiles) {
  requireFile(rel);
  if (!index.includes(`src="${rel}"`)) throw new Error(`Runtime: ${rel} existe pero index.html no lo carga`);
}
if (exists('js/modules/traspasos.js')) throw new Error('Traspasos legacy volvió al repositorio');

const expectedModules = ['dashboard','ventas','productos','inventario','servicios','clientes','usuarios','reportes','traspasos','corte','configuracion'];
for (const module of expectedModules) {
  if (!app.includes(`${module}: {`)) throw new Error(`Shell: falta definición de ${module}`);
  if (!index.includes(`data-module="${module}"`)) throw new Error(`Menú: falta ${module}`);
}

const login = read('js/modules/login-v2.js');
requireAll(login, 'Login', ['window.loginModule', 'loginWithPassword', 'loginWithPin', 'window.inicializarTecladoPIN']);
const auth = requireFile('js/utils/auth-v2.js');
requireAll(auth, 'Auth', ['PBKDF2', 'password_hash', 'pin_hash', '28800000']);

const dashboard = read('js/modules/dashboard.js');
requireAll(dashboard, 'Dashboard', ['window.dashboardModule', 'window.actualizarDashboard', 'DB.getVentas', 'DB.getServicios', 'DB.getClientes']);

const sales = read('js/modules/ventas-v5.js');
requireAll(sales, 'Ventas', ['window.ventasModule', 'window.cargarProductosVenta', 'window.finalizarVenta', 'window.inicializarEscannerV2', 'window.procesarCodigoEscaneadoV2', "metodo === 'Cuenta Plaza'"]);
const salesDb = requireFile('js/utils/database-sales-v3.js');
requireAll(salesDb, 'Ventas DB', ['Stock insuficiente', 'registrarMovimientoInventario', 'descuento_monto', 'registrarMovimientoPlaza']);
const salesStore = read('js/sales-store-ui-v1.js');
requireAll(salesStore, 'Ventas por local', ['loto_store_id', 'getStocksByStore', 'requireStation', 'Local ${store}', 'window.finalizarVenta', 'Sin existencias']);
const scanner = read('js/scanner-config-v2.js');
requireAll(scanner, 'Scanner', ['loto_scanner_timeout_ms', 'loto_scanner_suffix', "['Enter','Tab','Auto']", 'window.inicializarEscannerV2', 'window.guardarScannerConfig', 'window.procesarCodigoEscaneadoV2']);

const products = read('js/modules/productos-v2.js');
requireAll(products, 'Productos', ['window.productosModule', 'window.cargarProductos', 'window.mostrarModalProducto', 'window.editarProducto', 'window.eliminarProducto']);
const pricing = requireFile('js/utils/database-pricing-v4.js');
requireAll(pricing, 'Precios', ['MARKUP = 1.05', 'precio_base_cliente', 'getPrecioPublicoDesdeBase']);
const productGuard = read('js/product-stock-guard-v1.js');
requireAll(productGuard, 'Productos stock guard', ['Inventario', 'Traspasos', 'setInventoryFieldsLocked', 'No se puede eliminar', 'getStocksByStore', 'event.stopImmediatePropagation']);

const inventory = read('js/modules/inventario.js');
requireAll(inventory, 'Inventario', ['window.inventarioModule', 'window.cargarInventario', 'window.abrirModalAjusteStock']);
const inventoryUi = requireFile('js/inventory-ui-fixes-v1.js');
requireAll(inventoryUi, 'Inventario CSV', ["['nombre', 'categoria', 'tipo', 'precio', 'stock', 'local', 'sku', 'codigo_barras']", "['14', '20'].includes(local)", 'setStocksByStore', 'LGCODE-']);
const inventoryView = read('js/inventory-store-view-v1.js');
requireAll(inventoryView, 'Inventario por local', ['Local 14', 'Local 20', 'getStocksByStore', 'sin asignar']);

const services = read('js/modules/servicios.js');
requireAll(services, 'Servicio Técnico', ['window.serviciosModule', 'window.cargarServicios', 'window.editarServicio', 'window.eliminarServicio']);
const stability = requireFile('js/stability-fixes-v1.js');
requireAll(stability, 'Servicio búsqueda reparada', ['window.buscarServicio', 'tecnico_asignado', 'Sin coincidencias']);

const clients = read('js/modules/clientes-v2.js');
requireAll(clients, 'Clientes', ['window.clientesModule', 'window.cargarClientes', 'window.abrirCuentaPlaza', 'window.registrarAbonoPlaza', 'credito_habilitado']);
const clientGuard = read('js/client-delete-guard-v1.js');
requireAll(clientGuard, 'Clientes historial', ['window.DB.getServicios', 'orden(es) de servicio', 'historial técnico']);

const users = read('js/modules/usuarios-v2.js');
requireAll(users, 'Usuarios', ['window.usuariosModule', 'window.cargarUsuarios', 'Debe existir al menos un administrador activo', 'duplicateEmail', 'createPassword', 'createPin']);
const pinGuard = read('js/user-pin-guard-v1.js');
requireAll(pinGuard, 'Usuarios PIN único', ['originalCreatePin', 'originalVerifyPin', 'Ese PIN ya está asignado a otro usuario']);

const reports = read('js/modules/reportes-v2.js');
requireAll(reports, 'Reportes', ['window.reportesModule', 'window.cambiarReporte', 'auditoria', 'plaza', 'existencias']);
const inventoryReport = read('js/inventory-report-v1.js');
requireAll(inventoryReport, 'Reporte inventario', ['getMovimientosInventario', 'getTraspasos', 'stock_anterior', 'stock_nuevo']);
const storeReport = read('js/reports-store-view-v1.js');
requireAll(storeReport, 'Reporte existencias por local', ['window.generarReporteExistencias', 'Local 14', 'Local 20', 'unassigned', 'getStocksByStore', "T${end ? '23:59:59.999' : '00:00:00.000'}"]);
const normalization = read('js/legacy-data-normalization-v1.js');
requireAll(normalization, 'Datos legacy', ['Efectivo', 'Tarjeta', 'Transferencia', 'Cuenta Plaza']);

const transfers = read('js/modules/traspasos-v2.js');
requireAll(transfers, 'Traspasos', ['TRASPASOS V3', 'Local 14', 'Local 20', 'transferBetweenStores', 'stock14Traspaso', 'stock20Traspaso']);
const storeStock = read('js/store-stock-v1.js');
requireAll(storeStock, 'Stock por local', ['stock_local_14', 'stock_local_20', 'transferBetweenStores', 'setStocksByStore', 'loto_store_id']);

const corte = read('js/modules/corte-v2.js');
requireAll(corte, 'Corte', ['window.corteModule', 'window.cargarCorte', 'Total cobrado', 'Cuenta Plaza']);
const cortePrint = read('js/corte-print-pilot.js');
requireAll(cortePrint, 'Corte impresión', ['window.imprimirCorteCompleto = safePrintCorte', 'window.imprimirCorteMiniPrinter = safePrintCorte', 'LotoPilotPrint.printInFrame']);
if (index.indexOf('js/corte-print-pilot.js') < index.indexOf('js/modules/corte-v2.js')) throw new Error('Corte nativo debe cargar después de corte-v2');

const config = read('js/configuracion-v1.js');
requireAll(config, 'Configuración', ['Miniprinter / tickets', 'Impresora de etiquetas', 'Lector de códigos', 'crearRespaldoConfiguracion', 'probarTicketConfiguracion', 'probarEtiquetaConfiguracion']);
const nativePrint = read('js/native-print-v1.js');
requireAll(nativePrint, 'Impresión nativa', ['getSetting(`loto_${kind}_printer`', 'desktop.printer.printHtml', 'listPrinters']);

const sync = read('js/desktop-sync.js');
requireAll(sync, 'Sincronización', ['shouldDeferPull', 'stock_local_14', 'stock_local_20', 'setInterval(syncOnce, 30000)']);
const desktopStorage = requireFile('js/desktop-storage.js');
requireAll(desktopStorage, 'SQLite', ['commitCollectionSync', 'MANAGED_COLLECTIONS', 'auditoria_modificaciones', 'createBackup']);

if (index.indexOf('js/legacy-data-normalization-v1.js') > index.indexOf('js/modules/dashboard.js')) throw new Error('Normalización legacy debe cargar antes de módulos');
if (index.indexOf('js/store-stock-v1.js') > index.indexOf('js/inventory-store-view-v1.js')) throw new Error('Stock por local debe cargar antes de la vista de inventario');
if (index.indexOf('js/store-stock-v1.js') > index.indexOf('js/sales-store-ui-v1.js')) throw new Error('Stock por local debe cargar antes de la protección de ventas');
if (index.indexOf('js/store-stock-v1.js') > index.indexOf('js/reports-store-view-v1.js')) throw new Error('Stock por local debe cargar antes del reporte de existencias');
if (index.indexOf('js/scanner-config-v2.js') < index.indexOf('js/configuracion-v1.js')) throw new Error('Scanner V2 debe cargar después de Configuración');
if (index.indexOf('js/client-delete-guard-v1.js') < index.indexOf('js/modules/clientes-v2.js')) throw new Error('Guarda de clientes debe cargar después del módulo Clientes');
if (index.indexOf('js/user-pin-guard-v1.js') < index.indexOf('js/modules/usuarios-v2.js')) throw new Error('Guarda de PIN debe cargar después del módulo Usuarios');

console.log('✅ Module audit OK: Login, Dashboard, Ventas, Productos, Inventario, Servicio, Clientes, Usuarios, Reportes, Traspasos, Corte, Configuración, Scanner, SQLite y sincronización');
