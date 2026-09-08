begin;

alter table if exists public.usuarios
  add column if not exists password_hash text,
  add column if not exists password_salt text,
  add column if not exists pin_hash text,
  add column if not exists pin_salt text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='usuarios' and column_name='password'
  ) then
    execute 'alter table public.usuarios alter column password drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='usuarios' and column_name='pin'
  ) then
    execute 'alter table public.usuarios alter column pin drop not null';
  end if;
end $$;

commit;;
