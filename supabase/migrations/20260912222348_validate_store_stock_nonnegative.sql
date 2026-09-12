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
