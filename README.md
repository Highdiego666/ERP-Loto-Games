# Loto Games ERP / POS

Sistema web de operación para Loto Games: punto de venta, inventario, productos, servicio técnico, clientes, usuarios, reportes, traspasos, corte de caja y cuenta corriente de locatarios.

## Estado de la versión

**Versión de aplicación:** V1.0

El frontend está preparado para trabajar con Supabase en modo real y con `?demo=1` para pruebas locales sin tocar la base.

### Incluido

- POS con carrito lateral y navegación por teclado.
- Precios Cliente, Mayorista y Plaza.
- Precio capturado = base; precio público = base + 5%.
- F6 retira exactamente el ajuste del 5% y vuelve al precio base.
- Venta rápida.
- Persistencia de subtotal, descuento y total.
- Clientes, mayoristas y locatarios.
- Cuenta Plaza con cargos, abonos e historial.
- Usuarios con roles, privilegios y credenciales derivadas con PBKDF2.
- Inventario y movimientos.
- Traspasos y reportes.
- Corte de caja.
- Branding oficial Loto Games.
- Diagnóstico visual del estado de Supabase.

## Ejecución local

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Producción / Supabase real:

```text
http://127.0.0.1:8080/
```

Demo local:

```text
http://127.0.0.1:8080/?demo=1
```

## Base de datos

Las migraciones están en `supabase/migrations/`.

Para una base antigua, la estructura final está documentada de forma idempotente en:

```text
20260818_v1_schema_final.sql
```

La transformación masiva de precios existentes a base + 5% se mantiene separada en:

```text
20260818_productos_markup5.sql
```

Eso evita aplicar cambios monetarios por accidente.

## Validación antes de operación

Antes de considerar una publicación como release estable se debe comprobar al menos:

1. Login por PIN y contraseña.
2. Alta y edición de producto con las tres listas de precio.
3. Venta normal y descuento F6.
4. Descuento de stock exactamente una vez.
5. Venta con transferencia.
6. Venta a Cuenta Plaza y posterior abono.
7. Reportes y corte de caja.
8. Traspasos.
9. Servicio técnico.
10. Ticket / impresión real.

## Seguridad

La aplicación usa una clave `anon` de Supabase en el navegador, lo cual es normal para un frontend web. La seguridad real debe estar en las políticas RLS y en el mecanismo de autenticación/autorización del backend.

Mientras se termina el endurecimiento de producción, **no debe asumirse que el login visual del navegador sustituye RLS**. Antes de exponer la URL como sistema de producción abierto a Internet se debe migrar el acceso a un flujo autenticado que permita cerrar las políticas públicas actuales sin romper el POS.

## Repositorio

La rama `main` es la fuente de GitHub Pages. Los cambios grandes deben validarse primero en una rama de release y pasar los checks de GitHub Actions antes de llegar a `main`.
