# Plan de pruebas — LOTO GAMES POS pre-piloto

> Esta lista es obligatoria antes de entregar una candidata a empleados. Compilar un `.exe` no cuenta como prueba funcional.

## 1. Build que se está probando

Registrar siempre:

- commit / rama de la candidata;
- versión mostrada por el instalador;
- PC donde se probó;
- impresora utilizada;
- local configurado en la estación: Local 14 o Local 20;
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

- Crear un producto indicando Local 14 o Local 20 y su stock inicial.
- Editar nombre, categoría, tipo y precios sin alterar existencias por local.
- Confirmar que al editar un producto existente los campos Local y Stock quedan protegidos.
- Buscar por nombre, SKU y código.
- Ajustar stock desde Inventario.
- Confirmar que el ajuste genera un movimiento de inventario con stock anterior, nuevo, motivo y usuario.
- Imprimir una etiqueta CODE128 desde el ejecutable y confirmar que ya no solicita permiso de ventanas emergentes.

## 5. Inventario

- Ajustar stock hacia arriba y hacia abajo seleccionando explícitamente Local 14 o Local 20.
- Confirmar que el total global es la suma de existencias asignadas más cualquier existencia legacy aún sin asignar.
- Confirmar que no se alteran nombre/precios/SKU al tocar sólo stock.
- Revisar Reportes → Movimientos.
- Verificar que una entrada se registra como `entrada` y una reducción como `salida`.

La importación masiva debe considerarse CSV mientras no exista un parser XLSX real. No anunciar soporte `.xlsx/.xls` en producción hasta implementarlo.

## 6. Punto de Venta

- En Configuración, seleccionar primero el local de la estación: Local 14 o Local 20.
- Agregar producto por clic.
- Buscar por nombre/SKU.
- Escanear un código de barras real.
- Confirmar que un código exacto agrega el producto una sola vez.
- Cambiar cantidades.
- Probar Cliente / Mayorista / Plaza.
- Probar venta rápida.
- Probar descuento F6.
- Finalizar venta y verificar reducción exacta del stock total y del local correspondiente.
- Reiniciar la aplicación y confirmar que la venta sigue existiendo.

## 7. Ticket y miniprinter

- Finalizar una venta.
- Elegir imprimir ticket.
- Confirmar que el ejecutable imprime sin depender de popups.
- En Configuración seleccionar la miniprinter instalada en Windows.
- Probar impresión directa y el diálogo de respaldo.
- Probar papel de 58 mm y 80 mm según el equipo disponible.
- Verificar legibilidad de nombre, cantidades, precios, total, método de pago, vendedor y fecha.

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

- Confirmar que Producto, Origen, Destino, Cantidad y Motivo aceptan interacción y escritura normal.
- Seleccionar un producto con existencia conocida en Local 14 o Local 20.
- Anotar antes del movimiento: stock Local 14, stock Local 20 y stock total.
- Elegir Local 14 → Local 20 o Local 20 → Local 14.
- Capturar cantidad 1 para la primera prueba y un motivo identificable.
- Registrar el traspaso.
- Confirmar mensaje de éxito.
- Confirmar que el local de origen disminuye exactamente 1.
- Confirmar que el local de destino aumenta exactamente 1.
- Confirmar que el stock total NO cambia.
- Confirmar que aparece inmediatamente en historial con producto, origen, destino, cantidad, motivo y usuario.
- Reiniciar la aplicación y confirmar persistencia.
- Con Internet, esperar sincronización y confirmar que aparece en Supabase.
- Revisar Reportes → Movimientos.
- Hacer el movimiento inverso si la prueba debe devolver físicamente la pieza al local original.

El modelo operativo de la candidata usa únicamente Local 14 y Local 20. No deben reaparecer ubicaciones genéricas como Principal, Secundario, Taller o Tienda.

## 11. Corte y reportes

- Venta efectivo.
- Venta tarjeta/transferencia.
- Venta Cuenta Plaza.
- Verificar total vendido, total cobrado y pendiente Plaza.
- Revisar auditoría de altas, cambios y eliminaciones.

## 12. Offline / online

- Trabajar con Internet.
- Desconectar red y crear/editar datos.
- Ejecutar un traspaso de prueba offline y confirmar que queda en la copia local.
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
- los traspasos preservan stock total y modifican correctamente Local 14 / Local 20;
- persiste datos tras reinicio;
- trabaja offline;
- sincroniza al recuperar Internet;
- imprime ticket y etiqueta desde el ejecutable sin pedir popups;
- no aparecen errores JavaScript no controlados durante el recorrido;
- existe respaldo local de SQLite.

Los fallos encontrados durante el piloto se registran con módulo, hora aproximada, acción realizada y captura si aplica.
