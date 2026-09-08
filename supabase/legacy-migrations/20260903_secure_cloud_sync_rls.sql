-- LOTO GAMES - seguridad de sincronización Windows
-- Reemplaza las políticas públicas por acceso exclusivo de administradores
-- autenticados con Supabase Auth cuyo correo exista en public.usuarios.

begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

-- Conserva el respaldo histórico, pero fuera del esquema expuesto. Es idempotente:
-- en producción puede haberse movido previamente durante la auditoría.
do $$
begin
  if to_regclass('public.productos_backup_pre_v5_20260818') is not null then
    alter table public.productos_backup_pre_v5_20260818 set schema private;
  end if;
  if to_regclass('private.productos_backup_pre_v5_20260818') is not null then
    revoke all on table private.productos_backup_pre_v5_20260818 from public;
    revoke all on table private.productos_backup_pre_v5_20260818 from anon;
    revoke all on table private.productos_backup_pre_v5_20260818 from authenticated;
  end if;
end
$$;

create index if not exists idx_usuarios_email_lower
  on public.usuarios ((lower(trim(email))))
  where nullif(trim(email), '') is not null;

create or replace function private.loto_cloud_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.usuarios as u
      where lower(trim(u.email)) = lower(trim(coalesce((select auth.jwt() ->> 'email'), '')))
        and coalesce(u.estado, 'activo') = 'activo'
        and lower(trim(coalesce(u.rol, ''))) = 'admin'
    );
$$;

revoke all on function private.loto_cloud_admin() from public;
revoke all on function private.loto_cloud_admin() from anon;
grant execute on function private.loto_cloud_admin() to authenticated;

-- Todas estas tablas forman parte del espejo local/nube de la aplicación.
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.clientes enable row level security;
alter table public.usuarios enable row level security;
alter table public.servicios_tecnicos enable row level security;
alter table public.traspasos enable row level security;
alter table public.cuentas_plaza_movimientos enable row level security;
alter table public.movimientos_inventario enable row level security;

-- El publishable key sin una sesión de Auth no debe poder leer ni modificar datos.
revoke all on table public.productos from anon;
revoke all on table public.ventas from anon;
revoke all on table public.clientes from anon;
revoke all on table public.usuarios from anon;
revoke all on table public.servicios_tecnicos from anon;
revoke all on table public.traspasos from anon;
revoke all on table public.cuentas_plaza_movimientos from anon;
revoke all on table public.movimientos_inventario from anon;

revoke all on table public.productos from public;
revoke all on table public.ventas from public;
revoke all on table public.clientes from public;
revoke all on table public.usuarios from public;
revoke all on table public.servicios_tecnicos from public;
revoke all on table public.traspasos from public;
revoke all on table public.cuentas_plaza_movimientos from public;
revoke all on table public.movimientos_inventario from public;

grant select, insert, update, delete on table public.productos to authenticated;
grant select, insert, update, delete on table public.ventas to authenticated;
grant select, insert, update, delete on table public.clientes to authenticated;
grant select, insert, update, delete on table public.usuarios to authenticated;
grant select, insert, update, delete on table public.servicios_tecnicos to authenticated;
grant select, insert, update, delete on table public.traspasos to authenticated;
grant select, insert, update, delete on table public.cuentas_plaza_movimientos to authenticated;
grant select, insert, update, delete on table public.movimientos_inventario to authenticated;

-- Revoca también el uso directo de secuencias a anon. Aunque el cliente offline
-- envía sus propios IDs, authenticated conserva USAGE/SELECT por compatibilidad
-- con inserts administrativos que dejen que PostgreSQL genere el identificador.
do $$
declare
  seq_name text;
begin
  foreach seq_name in array array[
    pg_get_serial_sequence('public.productos', 'id'),
    pg_get_serial_sequence('public.ventas', 'id'),
    pg_get_serial_sequence('public.clientes', 'id'),
    pg_get_serial_sequence('public.usuarios', 'id'),
    pg_get_serial_sequence('public.servicios_tecnicos', 'id'),
    pg_get_serial_sequence('public.traspasos', 'id'),
    pg_get_serial_sequence('public.movimientos_inventario', 'id')
  ]
  loop
    if seq_name is not null then
      execute format('revoke all on sequence %s from anon', seq_name);
      execute format('revoke all on sequence %s from public', seq_name);
      execute format('grant usage, select on sequence %s to authenticated', seq_name);
    end if;
  end loop;
end
$$;

-- Elimina las políticas históricas tipo "Acceso público ..." y cualquier otra
-- política previa sobre el conjunto sincronizado, evitando que una regla permisiva
-- antigua se combine con la nueva política.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'productos',
        'ventas',
        'clientes',
        'usuarios',
        'servicios_tecnicos',
        'traspasos',
        'cuentas_plaza_movimientos',
        'movimientos_inventario'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

create policy "Loto cloud admin sync"
on public.productos
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

create policy "Loto cloud admin sync"
on public.ventas
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

create policy "Loto cloud admin sync"
on public.clientes
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

create policy "Loto cloud admin sync"
on public.usuarios
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

create policy "Loto cloud admin sync"
on public.servicios_tecnicos
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

create policy "Loto cloud admin sync"
on public.traspasos
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

create policy "Loto cloud admin sync"
on public.cuentas_plaza_movimientos
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

create policy "Loto cloud admin sync"
on public.movimientos_inventario
for all
to authenticated
using ((select private.loto_cloud_admin()))
with check ((select private.loto_cloud_admin()));

commit;
