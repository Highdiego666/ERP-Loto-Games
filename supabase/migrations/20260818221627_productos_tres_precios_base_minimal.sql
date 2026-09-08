begin;

alter table public.productos
  add column if not exists precio_cliente numeric(12,2),
  add column if not exists precio_mayorista numeric(12,2),
  add column if not exists precio_plaza numeric(12,2),
  add column if not exists precio_base_cliente numeric(12,2),
  add column if not exists precio_base_mayorista numeric(12,2),
  add column if not exists precio_base_plaza numeric(12,2),
  add column if not exists precio_markup_5_aplicado boolean not null default false;

update public.productos
set
  precio_cliente = coalesce(precio_cliente, precio, 0),
  precio_mayorista = coalesce(precio_mayorista, precio, 0),
  precio_plaza = coalesce(precio_plaza, precio, 0),
  precio_base_cliente = coalesce(precio_base_cliente, precio, 0),
  precio_base_mayorista = coalesce(precio_base_mayorista, precio, 0),
  precio_base_plaza = coalesce(precio_base_plaza, precio, 0)
where precio_cliente is null
   or precio_mayorista is null
   or precio_plaza is null
   or precio_base_cliente is null
   or precio_base_mayorista is null
   or precio_base_plaza is null;

commit;;
