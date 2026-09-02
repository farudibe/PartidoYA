-- ============================================================
-- PartidoYA - Migración v5
-- Correr en el SQL Editor de Supabase, después de las anteriores.
--
-- 1) Prueba gratuita de 30 días para dueños de cancha (desde que
--    se registran), con un contador visible en su panel.
-- 2) Canchas individuales dentro de un predio (Fútbol 5/8/11),
--    para poder cargar turnos sobre una cancha puntual en vez de
--    un simple número.
-- ============================================================

-- 1) Prueba gratuita ------------------------------------------------
alter table profiles add column if not exists trial_hasta timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, role, trial_hasta)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'jugador'),
    case when coalesce((new.raw_user_meta_data->>'role')::user_role, 'jugador') = 'cancha'
      then now() + interval '30 days'
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill para dueños que ya se habían registrado antes de este cambio
update profiles set trial_hasta = coalesce(created_at, now()) + interval '30 days'
where role = 'cancha' and trial_hasta is null;

-- 2) Canchas individuales dentro del predio --------------------------
do $$ begin
  create type tipo_cancha as enum ('futbol5', 'futbol8', 'futbol11');
exception when duplicate_object then null;
end $$;

create table if not exists canchas_predio (
  id uuid primary key default gen_random_uuid(),
  predio_id uuid references canchas(id) on delete cascade not null,
  tipo tipo_cancha not null,
  created_at timestamptz default now()
);

create index if not exists canchas_predio_predio_idx on canchas_predio (predio_id);

alter table canchas_predio enable row level security;

drop policy if exists "canchas_predio_select_all" on canchas_predio;
create policy "canchas_predio_select_all" on canchas_predio for select using (true);

drop policy if exists "canchas_predio_manage_own" on canchas_predio;
create policy "canchas_predio_manage_own" on canchas_predio for all using (
  exists (select 1 from canchas where canchas.id = canchas_predio.predio_id and canchas.owner_id = auth.uid())
);

grant select, insert, update, delete on public.canchas_predio to authenticated;
grant select on public.canchas_predio to anon;

-- Los turnos ahora se cargan sobre una cancha individual (con su tipo)
alter table turnos add column if not exists cancha_predio_id uuid references canchas_predio(id) on delete cascade;

-- 3) Un predio aparece en el mapa si está activo (pagó) O sigue en
--    prueba gratuita, sin necesidad de ningún proceso automático aparte.
create or replace function canchas_cercanas(lat float, lng float, radio_km float default 20)
returns table (
  id uuid, nombre text, direccion text, descripcion text, cantidad_canchas int,
  distancia_km float, lat float, lng float
) language sql stable as $$
  select
    c.id, c.nombre, c.direccion, c.descripcion, c.cantidad_canchas,
    st_distance(c.ubicacion, st_makepoint(lng, lat)::geography) / 1000 as distancia_km,
    st_y(c.ubicacion::geometry) as lat,
    st_x(c.ubicacion::geometry) as lng
  from canchas c
  where (
    c.status = 'activa'
    or exists (select 1 from profiles p where p.id = c.owner_id and p.trial_hasta > now())
  )
  and st_dwithin(c.ubicacion, st_makepoint(lng, lat)::geography, radio_km * 1000)
  order by distancia_km asc;
$$;

create or replace function buscar_canchas_por_nombre(query text)
returns table (
  id uuid, nombre text, direccion text, descripcion text, cantidad_canchas int, lat float, lng float
) language sql stable as $$
  select
    c.id, c.nombre, c.direccion, c.descripcion, c.cantidad_canchas,
    st_y(c.ubicacion::geometry) as lat,
    st_x(c.ubicacion::geometry) as lng
  from canchas c
  where (
    c.status = 'activa'
    or exists (select 1 from profiles p where p.id = c.owner_id and p.trial_hasta > now())
  )
  and c.nombre ilike '%' || query || '%'
  order by c.nombre
  limit 20;
$$;
