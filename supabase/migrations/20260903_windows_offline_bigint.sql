-- LOTO GAMES / Windows offline-first
-- Los registros locales usan Date.now() como identificador temporal (~13 dígitos),
-- por lo que los PK integer de 32 bits no son suficientes para sincronizarlos.
-- Esta migración amplía identificadores a bigint sin cambiar valores existentes.

begin;

alter table public.servicios_tecnicos
  drop constraint if exists servicios_tecnicos_cliente_id_fkey;

alter table public.productos alter column id type bigint;
alter table public.clientes alter column id type bigint;
alter table public.usuarios alter column id type bigint;
alter table public.ventas alter column id type bigint;
alter table public.servicios_tecnicos alter column id type bigint;
alter table public.servicios_tecnicos alter column cliente_id type bigint;
alter table public.traspasos alter column id type bigint;
alter table public.traspasos alter column producto_id type bigint;
alter table public.movimientos_inventario alter column id type bigint;
alter table public.movimientos_inventario alter column producto_id type bigint;

alter table public.servicios_tecnicos
  add constraint servicios_tecnicos_cliente_id_fkey
  foreign key (cliente_id) references public.clientes(id);

create index if not exists idx_servicios_tecnicos_cliente_id
  on public.servicios_tecnicos(cliente_id);

commit;
