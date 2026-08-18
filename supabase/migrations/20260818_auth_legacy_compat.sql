-- LOTO GAMES POS - compatibilidad con esquema de usuarios antiguo
-- Ejecutar DESPUÉS de 20260818_pos_final.sql

begin;

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

commit;

-- Las columnas antiguas se conservan temporalmente para que usuarios existentes
-- puedan migrarse. Los usuarios nuevos de la versión V2 sólo guardan
-- password_hash/password_salt y pin_hash/pin_salt.
