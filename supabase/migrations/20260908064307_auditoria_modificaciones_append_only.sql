-- LOTO GAMES - auditoría de modificaciones
-- Registro append-only sincronizado entre instalaciones autorizadas.

create table if not exists public.auditoria_modificaciones (
  id text primary key,
  entidad text not null,
  registro_id text not null,
  accion text not null check (accion in ('crear','editar','eliminar')),
  usuario_id text,
  usuario_nombre text not null,
  usuario_email text,
  usuario_rol text,
  fecha timestamptz not null,
  cambios jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auditoria_modificaciones_fecha
  on public.auditoria_modificaciones (fecha desc);
create index if not exists idx_auditoria_modificaciones_usuario
  on public.auditoria_modificaciones (usuario_nombre, fecha desc);
create index if not exists idx_auditoria_modificaciones_entidad
  on public.auditoria_modificaciones (entidad, fecha desc);

alter table public.auditoria_modificaciones enable row level security;

revoke all on table public.auditoria_modificaciones from public;
revoke all on table public.auditoria_modificaciones from anon;
revoke all on table public.auditoria_modificaciones from authenticated;
grant select, insert on table public.auditoria_modificaciones to authenticated;

drop policy if exists "Loto audit admin read" on public.auditoria_modificaciones;
drop policy if exists "Loto audit admin append" on public.auditoria_modificaciones;

create policy "Loto audit admin read"
on public.auditoria_modificaciones
for select
to authenticated
using ((select private.loto_cloud_admin()));

create policy "Loto audit admin append"
on public.auditoria_modificaciones
for insert
to authenticated
with check ((select private.loto_cloud_admin()));
