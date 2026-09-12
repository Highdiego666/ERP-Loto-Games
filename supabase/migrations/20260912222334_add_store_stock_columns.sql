alter table public.productos
  add column if not exists stock_local_14 integer not null default 0;

alter table public.productos
  add column if not exists stock_local_20 integer not null default 0;
