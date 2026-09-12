# Auditoría funcional — Loto Games POS 0.9.3 Employee Pilot

Fecha de auditoría: 2026-09-12
Rama: `stabilize/employee-pilot`

## Alcance

Esta auditoría revisa código activo, persistencia SQLite, contratos entre módulos, esquema/datos de Supabase y reglas de negocio detectables sin hardware. No sustituye pruebas físicas en Windows para miniprinter, lector HID ni estabilidad prolongada de foco/inputs.

## Estado por módulo

| Módulo | Estado software | Verificaciones principales | Pendiente físico/operativo |
|---|---|---|---|
| Login / Auth | Verificado con observaciones | contraseña + PIN offline, PBKDF2, sesión 8h, último admin protegido | validar credenciales reales de empleados |
| Dashboard | Verificado | productos, ventas, servicios, clientes, actividad y métricas | recorrido visual en Windows |
| Punto de Venta | Verificado para una estación | listas de precio, F6, venta rápida, Cuenta Plaza, stock local, movimientos, ticket | scanner real, miniprinter, prueba E2E de venta |
| Productos | Verificado | alta, edición sin tocar stock/local, precios, búsqueda, etiquetas, borrado bloqueado con stock | etiqueta física |
| Inventario | Verificado | Local 14/20/Total, ajustes por local, movimientos, CSV con columna local | ajuste físico de prueba |
| Servicio Técnico | Verificado | alta, edición, búsqueda reparada, estados, cliente/técnico | recorrido de orden real |
| Clientes | Verificado | cliente/mayorista/plaza, cuenta, abonos, borrado protegido por saldo y servicios | flujo real de Cuenta Plaza |
| Usuarios | Verificado | roles, privilegios, hash, último admin, correo único, PIN único | crear cuentas empleado reales |
| Reportes | Verificado | ventas, usuario, movimientos, auditoría, plaza, existencias Local 14/20, fechas locales, CSV | contrastar contra operaciones piloto |
| Traspasos | Verificado para una estación | Local 14 ↔ 20, valida origen/destino/cantidad, actualiza ambos stocks manteniendo total | primer traspaso físico real |
| Corte de Caja | Verificado | operaciones del día local, vendido/cobrado/plaza, métodos normalizados, impresión sin popup | miniprinter real |
| Configuración | Verificado, admin-only | impresoras, ancho 58/80, copias, directa/manual, scanner, local de estación, respaldo, diagnóstico | detectar hardware real |
| SQLite / persistencia | Verificado | WAL, synchronous FULL, cola, backups, colecciones administradas | reinicio y uso prolongado real |
| Sincronización | Verificado para una estación | push/pull, cola, RLS admin, pull diferido durante edición | prueba offline/reconexión real |

## Correcciones incorporadas durante la auditoría

- Impresión de tickets, etiquetas y corte fuera de `window.open()`.
- Miniprinter e impresora de etiquetas seleccionables mediante puente Electron.
- Traspasos reconstruidos para Local 14 y Local 20.
- `stock_local_14`, `stock_local_20` y stock total coherentes.
- Inventario y Reportes muestran existencias por local.
- CSV exige Local 14/20 y no usa GTIN/EAN ficticios.
- Productos no puede editar stock/local desde la pantalla de catálogo ni eliminar artículos con existencias.
- Clientes no puede borrarse si conserva saldo Plaza u órdenes de servicio.
- PIN rápido debe ser único entre usuarios.
- Ventas requiere local de estación y respeta disponibilidad del local.
- Métodos históricos `efectivo/tarjeta/transferencia` se normalizan en lectura.
- Reportes usan límites de fecha local y marcan ventas históricas sin total.
- Scanner acepta configuración Enter/Tab/Auto y timeout 30–500 ms.
- Pull de nube se pospone durante captura activa para proteger formularios.
- Código legacy de Traspasos fue retirado.

## Datos históricos detectados

- 161 productos.
- Inventario actual: 1364 unidades Local 14, 277 Local 20 y 3 unidades sin asignar.
- 0 stocks negativos y 0 productos asignados con suma Local 14/20 inconsistente.
- 108 ventas históricas.
- 2 ventas antiguas tienen `total` nulo; no se inventó un valor. Reportes las muestran como registros históricos incompletos.
- 83 ventas usan variantes antiguas del método de pago; se normalizan en lectura sin reescribir el historial.
- 4 usuarios activos; actualmente los cuatro tienen rol admin.
- 0 traspasos productivos registrados al momento de la auditoría.

## Bloqueador para uso concurrente de ambos locales

La cola offline-first actual sincroniza filas completas de `productos`. Dos estaciones trabajando al mismo tiempo pueden partir de snapshots diferentes y el último upsert podría sobrescribir el decremento del otro local.

Por ello:

- **Piloto controlado en una estación:** permitido después de pasar CI y las pruebas físicas.
- **Uso simultáneo Local 14 + Local 20:** NO certificado todavía.
- Seguimiento: GitHub issue #11, sincronización atómica/idempotente de stock multi-local.

## Pruebas físicas obligatorias antes de empleados

1. Mantener la app abierta al menos 30 minutos y editar repetidamente formularios.
2. Crear/editar Cliente, Producto, Servicio y Usuario.
3. Hacer una venta real de prueba y verificar stock + movimiento + persistencia.
4. Hacer un traspaso real de 1 unidad y verificar L14/L20/Total.
5. Imprimir ticket en miniprinter real.
6. Imprimir etiqueta CODE128.
7. Escanear un producto con la pistola real.
8. Reiniciar Windows/app y confirmar persistencia SQLite.
9. Probar offline, crear cambios, reconectar y verificar sincronización.
10. Revisar Configuración → Diagnóstico si algún input vuelve a quedar bloqueado.

## Criterio de aprobación

La candidata sólo se promueve a estable si la CI completa pasa y las pruebas físicas anteriores no muestran pérdida de datos, congelamiento de campos, impresión fallida ni discrepancias de inventario.
