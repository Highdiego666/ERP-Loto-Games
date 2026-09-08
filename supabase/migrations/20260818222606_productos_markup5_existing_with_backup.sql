begin;

create table if not exists public.productos_backup_pre_v5_20260818 as
select
  id, nombre, sku, codigo_barras, categoria, tipo, local, stock,
  precio, precio_cliente, precio_mayorista, precio_plaza,
  precio_base_cliente, precio_base_mayorista, precio_base_plaza,
  precio_markup_5_aplicado, created_at
from public.productos;

update public.productos
set
  precio_base_cliente = coalesce(precio_base_cliente, precio_cliente, precio, 0),
  precio_base_mayorista = coalesce(precio_base_mayorista, precio_mayorista, precio_cliente, precio, 0),
  precio_base_plaza = coalesce(precio_base_plaza, precio_plaza, precio_cliente, precio, 0)
where precio_markup_5_aplicado = false;

update public.productos
set
  precio_cliente = round(precio_base_cliente * 1.05, 2),
  precio_mayorista = round(precio_base_mayorista * 1.05, 2),
  precio_plaza = round(precio_base_plaza * 1.05, 2),
  precio = round(precio_base_cliente * 1.05, 2),
  precio_markup_5_aplicado = true
where precio_markup_5_aplicado = false;

commit;;
