-- LOTO GAMES POS - Windows offline-first
-- Amplía las claves numéricas a bigint para aceptar IDs generados localmente
-- sin colisionar con las secuencias históricas de Supabase.

begin;

alter table public.servicios_tecnicos
  drop constraint if exists servicios_tecnicos_cliente_id_fkey;

alter table public.clientes
  alter column id type bigint using id::bigint;

alter table public.productos
  alter column id type bigint using id::bigint;

alter table public.ventas
  alter column id type bigint using id::bigint;

alter table public.servicios_tecnicos
  alter column id type bigint using id::bigint,
  alter column cliente_id type bigint using cliente_id::bigint;

alter table public.traspasos
  alter column id type bigint using id::bigint,
  alter column producto_id type bigint using producto_id::bigint;

alter table public.usuarios
  alter column id type bigint using id::bigint;

alter table public.movimientos_inventario
  alter column id type bigint using id::bigint,
  alter column producto_id type bigint using producto_id::bigint;

alter sequence if exists public.clientes_id_seq as bigint;
alter sequence if exists public.productos_id_seq as bigint;
alter sequence if exists public.ventas_id_seq as bigint;
alter sequence if exists public.servicios_tecnicos_id_seq as bigint;
alter sequence if exists public.traspasos_id_seq as bigint;
alter sequence if exists public.usuarios_id_seq as bigint;
alter sequence if exists public.movimientos_inventario_id_seq as bigint;

alter table public.servicios_tecnicos
  add constraint servicios_tecnicos_cliente_id_fkey
  foreign key (cliente_id) references public.clientes(id);

commit;
