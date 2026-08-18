# Plan de pruebas — LOTO GAMES POS final

> No hacer merge a `main` hasta completar esta lista.

## 1. Prueba segura sin Supabase

Levantar el proyecto en localhost y abrir:

`http://127.0.0.1:8080/?demo=1`

Con `?demo=1` la aplicación no se conecta a Supabase y usa sólo `localStorage` del navegador.

## 2. Acceso y teclado

- Crear el primer administrador.
- Cerrar sesión.
- Ingresar con correo/contraseña usando teclado físico.
- Ingresar con PIN usando teclado físico.
- Crear un vendedor y restringir sus módulos.
- Confirmar que el vendedor no ve módulos no autorizados.
- Probar F2 (POS/búsqueda), F4 (finalizar venta), Esc (cerrar modal), Alt+1…9 y Ctrl+Enter.

## 3. Productos

- Crear producto con precio Cliente, Mayorista y Plaza diferentes.
- Editar el producto sin perder SKU, código, categoría ni stock.
- Ajustar únicamente stock desde Inventario y comprobar que el resto de los campos NO se borra.
- Imprimir una etiqueta de prueba.

## 4. Punto de Venta

- Confirmar que productos ocupan la mayor parte de la pantalla y carrito queda a la derecha.
- Agregar productos por clic.
- Buscar por nombre/SKU.
- Probar código de barras si hay escáner disponible.
- Cambiar cantidades.
- Editar precio sólo cuando se solicita explícitamente desde el carrito.
- Venta con precio Cliente.
- Venta con precio Mayorista.
- Venta con precio Plaza.
- Confirmar que el stock baja sólo por la cantidad vendida.

## 5. Locatarios / Cuenta Plaza

- Crear comprador tipo `Locatario / Plaza` con crédito habilitado.
- Seleccionarlo en POS y confirmar selección automática de precio Plaza.
- Elegir `Cuenta Plaza` como método de pago.
- Finalizar venta.
- Abrir Clientes → Cuenta del locatario.
- Confirmar cargo, artículos, fecha, vendedor y saldo.
- Hacer otra salida el mismo día y confirmar historial acumulado.
- Registrar un abono parcial.
- Confirmar nuevo saldo.
- Revisar Reportes → Cuenta Plaza.

## 6. Traspasos

- Registrar un traspaso entre dos ubicaciones distintas.
- Confirmar que aparece inmediatamente en Historial de Traspasos.
- Abrir Reportes → Movimientos.
- Confirmar que muestra `origen → destino`, cantidad, motivo y usuario.
- Confirmar que un traslado interno no reduce falsamente el stock total del catálogo.

## 7. Corte de Caja

- Registrar venta en efectivo.
- Registrar venta por transferencia/tarjeta.
- Registrar venta a Cuenta Plaza.
- Abrir Corte de Caja.
- Confirmar que `Total vendido` incluye todas las operaciones.
- Confirmar que `Total cobrado` NO suma lo pendiente de Cuenta Plaza.
- Confirmar que Cuenta Plaza se muestra por separado.

## 8. Paso a Supabase

Antes de abrir la rama sin `?demo=1`, ejecutar en Supabase SQL Editor, en este orden:

1. `supabase/migrations/20260818_pos_final.sql`
2. `supabase/migrations/20260818_auth_legacy_compat.sql`

Después repetir las pruebas 2–7 con datos de prueba controlados.

## 9. Antes del merge

- Rotar los PIN/credenciales que estuvieron hardcodeados en versiones públicas anteriores.
- Revisar RLS/policies de Supabase antes de exponer el POS fuera de una red/control local.
- No utilizar una `service_role` key en el navegador.
- Crear respaldo de la base de datos antes de liberar a producción.
