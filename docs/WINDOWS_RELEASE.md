# Loto Games POS · Windows Desktop 1.2

## Arquitectura de entrega

La aplicación de Windows es **offline-first**:

1. Toda alta, edición, venta, movimiento de plaza o cambio de inventario se confirma primero en SQLite local.
2. La operación local y sus efectos relacionados se escriben dentro de una transacción cuando corresponde (por ejemplo, venta + descuento de stock + cargo a Cuenta Plaza).
3. Cada cambio local genera una entrada de sincronización pendiente.
4. Supabase se actualiza en segundo plano cuando está disponible.
5. Un fallo de Internet o de Supabase nunca invalida una operación que ya fue confirmada localmente.

## Datos locales

En Windows se usa `%LOCALAPPDATA%\Loto Games POS`.

- `data/loto-games.sqlite3`: base operativa local.
- `backups/`: respaldos SQLite.

El instalador no elimina estos datos al desinstalar (`deleteAppDataOnUninstall: false`).

## Respaldos

- Respaldo automático como máximo una vez cada 24 horas.
- Conservación de los últimos 30 respaldos.
- Botón de respaldo manual desde la barra lateral.

## Sincronización

Estados esperados:

- `Local + Supabase ✓`: no hay cambios pendientes.
- `Local · N pendientes`: la aplicación sigue operando y sincroniza en segundo plano.
- `Sin Internet · N pendientes`: los cambios están seguros en SQLite y esperan conexión.

La aplicación usa una clave **publishable** de Supabase desde el proceso principal de Electron. No se incluye `service_role` ni ninguna clave secreta en el renderer.

## Seguridad del escritorio

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- permisos del navegador denegados por defecto
- navegación y ventanas nuevas bloqueadas
- IPC limitado a métodos explícitos y con validación del origen
- CSP sin JavaScript remoto
- Chart.js, JsBarcode y Font Awesome se empaquetan como dependencias locales

## Instalador

El objetivo de build es NSIS x64:

```text
Loto-Games-POS-Setup-1.2.0.exe
```

El instalador crea acceso directo de escritorio y menú Inicio, permite elegir carpeta de instalación y conserva los datos de usuario al desinstalar.

## Criterios mínimos antes de etiquetar una release estable

- Inicio de sesión por contraseña y PIN con Internet y sin Internet.
- Alta/edición de producto y tres listas de precio.
- Venta normal, rápida, transferencia y Cuenta Plaza.
- Corte de Internet antes, durante y después de una venta.
- Reinicio de Windows con cambios pendientes y posterior sincronización.
- Verificar que el stock se descuenta exactamente una vez.
- Validar clientes, servicio técnico, traspasos, reportes y corte de caja.
- Crear y restaurar una copia de la base SQLite en una máquina de prueba.
- Instalar, actualizar, desinstalar y reinstalar sin pérdida de datos.
- Probar impresión física de ticket y código de barras.
- Revisar que Supabase no tenga políticas RLS o grants incompatibles con el modelo de acceso antes de abrir el sistema a múltiples equipos.
