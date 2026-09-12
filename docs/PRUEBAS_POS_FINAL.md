# Plan de pruebas — LOTO GAMES POS pre-piloto

> Esta lista es obligatoria antes de entregar una candidata a empleados. Compilar un `.exe` no cuenta como prueba funcional.

## 1. Build que se está probando

Registrar siempre:

- commit / rama de la candidata;
- versión mostrada por el instalador;
- PC donde se probó;
- impresora utilizada;
- si había Internet o se trabajó offline.

La rama de estabilización debe partir de `vnext/windows-release` y conservar SQLite local como fuente primaria.

## 2. Prueba de estabilidad prolongada

Mantener la aplicación abierta al menos 30 minutos.

Durante ese período, repetir varias veces:

- abrir y cerrar formularios;
- escribir en `input`, `textarea` y `select`;
- cambiar entre Clientes, Productos, Ventas, Inventario, Servicio, Usuarios y Traspasos;
- dejar pasar múltiples ciclos de sincronización;
- comprobar que ningún campo deja de aceptar entrada;
- comprobar que no aparece un overlay invisible que capture el foco.

Si ocurre un fallo, abrir consola de desarrollo en una build de diagnóstico y ejecutar:

```js
window.LotoRuntimeHealth?.snapshot()
window.LotoRuntimeHealth?.getErrors()
```

No continuar el piloto si la aplicación pierde capacidad de edición.

## 3. Usuarios y acceso

- Ingresar con administrador.
- Crear un vendedor y un técnico de prueba.
- Confirmar privilegios por módulo.
- Cerrar y abrir la aplicación y verificar que el login local sigue funcionando offline.
- Confirmar que no se guardan nuevas contraseñas ni PIN en texto plano.
- No eliminar ni desactivar el último administrador válido.

## 4. Productos

- Crear un producto con precios Cliente, Mayorista y Plaza.
- Editarlo sin perder SKU, código, categoría, local ni stock.
- Buscar por nombre, SKU y código.
- Ajustar stock desde Inventario.
- Confirmar que el ajuste genera un movimiento de inventario con stock anterior, nuevo, motivo y usuario.
- Imprimir una etiqueta CODE128 desde el ejecutable y confirmar que ya no solicita permiso de ventanas emergentes.

## 5. Inventario

- Ajustar stock hacia arriba y hacia abajo.
- Confirmar que no se alteran nombre/precios/SKU al tocar sólo stock.
- Revisar Reportes → Movimientos.
- Verificar que una entrada se registra como `entrada` y una reducción como `salida`.

La importación masiva debe considerarse CSV mientras no exista un parser XLSX real. No anunciar soporte `.xlsx/.xls` en producción hasta implementarlo.

## 6. Punto de Venta

- Agregar producto por clic.
- Buscar por nombre/SKU.
- Escanear un código de barras real.
- Confirmar que un código exacto agrega el producto una sola vez.
- Cambiar cantidades.
- Probar Cliente / Mayorista / Plaza.
- Probar venta rápida.
- Probar descuento F6.
- Finalizar venta y verificar reducción exacta de stock.
- Reiniciar la aplicación y confirmar que la venta sigue existiendo.

## 7. Ticket y miniprinter

- Finalizar una venta.
- Elegir imprimir ticket.
- Confirmar que el ejecutable abre el diálogo de impresión del sistema sin usar popups.
- Elegir la miniprinter instalada en Windows.
- Probar papel de 58 mm y 80 mm según el equipo disponible.
- Verificar legibilidad de nombre, cantidades, precios, total, método de pago, vendedor y fecha.

La selección persistente y la impresión silenciosa por impresora configurada quedan como siguiente etapa del módulo Configuración.

## 8. Clientes y Cuenta Plaza

- Crear cliente normal.
- Editarlo.
- Crear locatario Plaza con crédito.
- Hacer una venta a Cuenta Plaza.
- Confirmar cargo, artículos, usuario y saldo.
- Registrar un abono y verificar saldo nuevo.

## 9. Servicio Técnico

- Crear una orden.
- Editarla.
- Buscar por equipo, cliente, problema y técnico.
- Confirmar que la búsqueda genera filas reales y nunca texto provisional como `...`.
- Cambiar estado hasta entregado.

## 10. Traspasos — prueba E2E obligatoria

- Seleccionar producto.
- Elegir origen y destino distintos.
- Capturar cantidad y motivo.
- Registrar el traspaso.
- Confirmar mensaje de éxito.
- Confirmar que aparece inmediatamente en historial.
- Reiniciar la aplicación y confirmar persistencia.
- Con Internet, esperar sincronización y confirmar que aparece en Supabase.
- Revisar Reportes → Movimientos.

El modelo actual registra el traslado y conserva el stock total. Todavía no modela stock separado por almacén; no presentar esa parte como inventario multi-almacén terminado.

## 11. Corte y reportes

- Venta efectivo.
- Venta tarjeta/transferencia.
- Venta Cuenta Plaza.
- Verificar total vendido, total cobrado y pendiente Plaza.
- Revisar auditoría de altas, cambios y eliminaciones.

## 12. Offline / online

- Trabajar con Internet.
- Desconectar red y crear/editar datos.
- Cerrar y abrir el POS offline.
- Confirmar que los datos locales siguen presentes.
- Reconectar.
- Esperar sincronización.
- Confirmar que los cambios llegan a Supabase sin bloquear formularios abiertos.

La descarga de snapshots de nube debe posponerse mientras haya un formulario en edición.

## 13. Criterio para entregar a empleados

La candidata sólo se entrega si:

- supera la prueba prolongada sin congelar entradas;
- Clientes, Productos, Inventario, Servicio, Ventas y Traspasos completan operaciones E2E;
- persiste datos tras reinicio;
- trabaja offline;
- sincroniza al recuperar Internet;
- imprime ticket y etiqueta desde el ejecutable sin pedir popups;
- no aparecen errores JavaScript no controlados durante el recorrido;
- existe respaldo local de SQLite.

Los fallos encontrados durante el piloto se registran con módulo, hora aproximada, acción realizada y captura si aplica.
