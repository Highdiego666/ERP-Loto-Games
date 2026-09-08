-- LOTO GAMES POS - Descuento real del 5%
-- Migración aditiva y reversible a nivel de aplicación.
-- Ejecutar en Supabase SQL Editor antes de probar ventas reales con V4.

begin;

alter table if exists public.ventas
  add column if not exists subtotal numeric(12,2),
  add column if not exists descuento_porcentaje numeric(5,2) default 0,
  add column if not exists descuento_monto numeric(12,2) default 0;

-- Para ventas históricas no inferimos un descuento que no podemos reconstruir.
-- Sólo dejamos un subtotal compatible cuando todavía no exista.
update public.ventas
set
  subtotal = coalesce(subtotal, total),
  descuento_porcentaje = coalesce(descuento_porcentaje, 0),
  descuento_monto = coalesce(descuento_monto, 0)
where subtotal is null
   or descuento_porcentaje is null
   or descuento_monto is null;

commit;
