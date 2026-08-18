-- LOTO GAMES POS - precio base + ajuste automático 5%
-- Ejecutar una sola vez DESPUÉS de 20260818_pos_final.sql.
-- Es idempotente: sólo transforma filas donde precio_markup_5_aplicado = false.

begin;

alter table if exists public.productos
  add column if not exists precio_base_cliente numeric(12,2),
  add column if not exists precio_base_mayorista numeric(12,2),
  add column if not exists precio_base_plaza numeric(12,2),
  add column if not exists precio_markup_5_aplicado boolean not null default false;

-- Guardar primero los precios actuales como BASE para no perder el valor original.
update public.productos
set
  precio_base_cliente = coalesce(precio_base_cliente, precio_cliente, precio, 0),
  precio_base_mayorista = coalesce(precio_base_mayorista, precio_mayorista, precio_cliente, precio, 0),
  precio_base_plaza = coalesce(precio_base_plaza, precio_plaza, precio_cliente, precio, 0)
where precio_markup_5_aplicado = false;

-- Aplicar +5% al precio público. Se redondea a centavos.
update public.productos
set
  precio_cliente = round(precio_base_cliente * 1.05, 2),
  precio_mayorista = round(precio_base_mayorista * 1.05, 2),
  precio_plaza = round(precio_base_plaza * 1.05, 2),
  precio = round(precio_base_cliente * 1.05, 2),
  precio_markup_5_aplicado = true
where precio_markup_5_aplicado = false;

commit;

-- Ejemplo esperado:
-- precio_base_cliente = 100.00
-- precio_cliente      = 105.00
-- En caja, F6 retira el ajuste y vuelve a 100.00.
