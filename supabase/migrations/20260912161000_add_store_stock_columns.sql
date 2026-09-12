-- Loto Games: existencias físicas por los dos locales operativos.
-- Conserva public.productos.stock como total global y distribuye el stock
-- inicial según el campo legacy public.productos.local.

alter table public.productos
  add column if not exists stock_local_14 integer not null default 0;

alter table public.productos
  add column if not exists stock_local_20 integer not null default 0;

update public.productos
set
  stock_local_14 = case
    when trim(coalesce(local, '')) = '14' then greatest(coalesce(stock, 0), 0)
    else 0
  end,
  stock_local_20 = case
    when trim(coalesce(local, '')) = '20' then greatest(coalesce(stock, 0), 0)
    else 0
  end
where coalesce(stock_local_14, 0) = 0
  and coalesce(stock_local_20, 0) = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'productos_stock_local_14_nonnegative'
      and conrelid = 'public.productos'::regclass
  ) then
    alter table public.productos
      add constraint productos_stock_local_14_nonnegative check (stock_local_14 >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'productos_stock_local_20_nonnegative'
      and conrelid = 'public.productos'::regclass
  ) then
    alter table public.productos
      add constraint productos_stock_local_20_nonnegative check (stock_local_20 >= 0);
  end if;
end $$;
