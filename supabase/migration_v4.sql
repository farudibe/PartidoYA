-- ============================================================
-- PartidoYA - Migración v4
-- Corrige "permission denied for table canchas" (y previene el
-- mismo error en turnos/reservas/pagos_cuota): a estas tablas
-- les faltaban los GRANT de nivel tabla para los roles anon /
-- authenticated. RLS solo filtra FILAS, pero antes de eso
-- Postgres exige que el rol tenga permiso sobre la TABLA entera;
-- sin ese permiso, cualquier policy de RLS es irrelevante y da
-- este error.
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.canchas to authenticated;
grant select on public.canchas to anon;

grant select, insert, update, delete on public.turnos to authenticated;
grant select on public.turnos to anon;

grant select, insert, update on public.reservas to authenticated;

grant select, insert on public.pagos_cuota to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
