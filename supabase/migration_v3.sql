-- ============================================================
-- PartidoYA - Migración v3
-- Correr en el SQL Editor de Supabase (después del schema.sql original)
-- Agrega: código postal / provincia / fotos en canchas,
-- bucket de fotos, y búsqueda de canchas por nombre.
-- ============================================================

alter table canchas add column if not exists codigo_postal text;
alter table canchas add column if not exists provincia text;
alter table canchas add column if not exists fotos text[] default '{}';

-- ============================================================
-- Función: busca canchas activas por nombre (para el buscador
-- del jugador, sin importar la distancia)
-- ============================================================
create or replace function buscar_canchas_por_nombre(query text)
returns table (
  id uuid,
  nombre text,
  direccion text,
  descripcion text,
  cantidad_canchas int,
  lat float,
  lng float
) language sql stable as $$
  select
    c.id, c.nombre, c.direccion, c.descripcion, c.cantidad_canchas,
    st_y(c.ubicacion::geometry) as lat,
    st_x(c.ubicacion::geometry) as lng
  from canchas c
  where c.status = 'activa'
    and c.nombre ilike '%' || query || '%'
  order by c.nombre
  limit 20;
$$;

-- ============================================================
-- Storage: bucket público para las fotos de las canchas
-- ============================================================
insert into storage.buckets (id, name, public)
values ('canchas-fotos', 'canchas-fotos', true)
on conflict (id) do nothing;

create policy "canchas_fotos_insert_autenticados" on storage.objects for insert
  with check (bucket_id = 'canchas-fotos' and auth.role() = 'authenticated');

create policy "canchas_fotos_lectura_publica" on storage.objects for select
  using (bucket_id = 'canchas-fotos');
