-- LOTO GAMES ERP / POS
-- Garantiza que una instalación nueva acepte el tipo usado por Traspasos V2.

begin;

alter table public.traspasos
  drop constraint if exists traspasos_tipo_check;

alter table public.traspasos
  add constraint traspasos_tipo_check
  check (tipo in ('entrada','salida','traspaso','traspaso_local','salida_locatario'));

commit;
