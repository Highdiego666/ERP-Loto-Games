-- LOTO GAMES ERP / POS
-- Permite registrar traspasos internos con el módulo V2 sin romper
-- compatibilidad con movimientos históricos.

begin;

alter table public.traspasos
  drop constraint if exists traspasos_tipo_check;

alter table public.traspasos
  add constraint traspasos_tipo_check
  check (tipo in ('entrada','salida','traspaso','traspaso_local','salida_locatario'));

commit;
