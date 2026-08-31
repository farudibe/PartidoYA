-- ============================================================
-- PartidoYA - Esquema de base de datos (Supabase / Postgres)
-- Ejecutar en el SQL Editor de tu proyecto de Supabase
-- Versión 2: pagos por transferencia + comprobante, y señas
-- ============================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

create type user_role as enum ('jugador', 'cancha');
create type cancha_status as enum ('activa', 'pausada', 'pendiente');
create type reserva_status as enum ('señada', 'confirmada', 'cancelada', 'completada');
create type pago_status as enum ('en_revision', 'aprobado', 'rechazado');

-- Perfiles (extiende auth.users)
create table profiles (
  id uuid references auth.users(id) primary key,
  role user_role not null,
  nombre text not null,
  telefono text,
  created_at timestamptz default now()
);

-- Canchas / predios (dueños = perfiles con role 'cancha')
create table canchas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) not null,
  nombre text not null,
  direccion text not null,
  ubicacion geography(point, 4326) not null,
  descripcion text,
  cantidad_canchas int not null default 1,
  status cancha_status not null default 'pendiente',
  -- datos para que el jugador le pague la seña a ESTA cancha (no a la plataforma)
  alias_transferencia text,
  mp_link_pago text,
  created_at timestamptz default now()
);

create index canchas_ubicacion_idx on canchas using gist (ubicacion);
create index canchas_owner_idx on canchas (owner_id);

-- Horarios / turnos que define el dueño
create table turnos (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid references canchas(id) on delete cascade not null,
  numero_cancha int not null default 1,
  dia_semana int check (dia_semana between 0 and 6),
  fecha date,
  hora_inicio time not null,
  hora_fin time not null,
  precio numeric(10,2),
  sena numeric(10,2), -- monto de la seña para reservar este turno
  activo boolean not null default true,
  check (dia_semana is not null or fecha is not null)
);

create index turnos_cancha_idx on turnos (cancha_id);

-- Reservas ("señas") hechas por jugadores sobre un turno, en una fecha puntual
create table reservas (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid references turnos(id) not null,
  jugador_id uuid references profiles(id) not null,
  fecha date not null,
  status reserva_status not null default 'señada',
  metodo_pago text, -- 'transferencia' | 'mercadopago'
  nombre_cuenta_pagador text, -- solo si fue por transferencia
  comprobante_url text, -- solo si fue por transferencia
  created_at timestamptz default now(),
  unique (turno_id, fecha)
);

create index reservas_jugador_idx on reservas (jugador_id);

-- Vista pública liviana: qué turnos están ocupados en qué fecha,
-- sin exponer datos del jugador que reservó (para que cualquiera
-- pueda ver disponibilidad sin filtrar información personal).
create view public.turnos_ocupados as
  select turno_id, fecha, status
  from reservas
  where status <> 'cancelada';

grant select on public.turnos_ocupados to anon, authenticated;

-- Pagos de la cuota mensual de la cancha (a la plataforma, alias "partidoya")
create table pagos_cuota (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid references canchas(id) on delete cascade not null,
  nombre_cuenta_pagador text not null,
  comprobante_url text not null,
  status pago_status not null default 'en_revision',
  created_at timestamptz default now()
);

create index pagos_cuota_cancha_idx on pagos_cuota (cancha_id);

-- ============================================================
-- Función: canchas activas cercanas a un punto, ordenadas por distancia
-- ============================================================
create or replace function canchas_cercanas(lat float, lng float, radio_km float default 20)
returns table (
  id uuid,
  nombre text,
  direccion text,
  descripcion text,
  cantidad_canchas int,
  distancia_km float,
  lat float,
  lng float
) language sql stable as $$
  select
    c.id, c.nombre, c.direccion, c.descripcion, c.cantidad_canchas,
    st_distance(c.ubicacion, st_makepoint(lng, lat)::geography) / 1000 as distancia_km,
    st_y(c.ubicacion::geometry) as lat,
    st_x(c.ubicacion::geometry) as lng
  from canchas c
  where c.status = 'activa'
    and st_dwithin(c.ubicacion, st_makepoint(lng, lat)::geography, radio_km * 1000)
  order by distancia_km asc;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table canchas enable row level security;
alter table turnos enable row level security;
alter table reservas enable row level security;
alter table pagos_cuota enable row level security;

create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "canchas_select_activas_o_propias" on canchas for select
  using (status = 'activa' or owner_id = auth.uid());
create policy "canchas_insert_own" on canchas for insert with check (owner_id = auth.uid());
create policy "canchas_update_own" on canchas for update using (owner_id = auth.uid());

create policy "turnos_select_all" on turnos for select using (true);
create policy "turnos_manage_own" on turnos for all using (
  exists (select 1 from canchas where canchas.id = turnos.cancha_id and canchas.owner_id = auth.uid())
);

create policy "reservas_select_involved" on reservas for select using (
  jugador_id = auth.uid() or exists (
    select 1 from turnos join canchas on canchas.id = turnos.cancha_id
    where turnos.id = reservas.turno_id and canchas.owner_id = auth.uid()
  )
);
create policy "reservas_insert_own" on reservas for insert with check (jugador_id = auth.uid());
create policy "reservas_update_own" on reservas for update using (jugador_id = auth.uid());

create policy "pagos_cuota_select_own" on pagos_cuota for select using (
  exists (select 1 from canchas where canchas.id = pagos_cuota.cancha_id and canchas.owner_id = auth.uid())
);
create policy "pagos_cuota_insert_own" on pagos_cuota for insert with check (
  exists (select 1 from canchas where canchas.id = pagos_cuota.cancha_id and canchas.owner_id = auth.uid())
);

-- ============================================================
-- Storage: bucket público para las fotos de comprobantes de pago
-- ============================================================
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

create policy "comprobantes_insert_autenticados" on storage.objects for insert
  with check (bucket_id = 'comprobantes' and auth.role() = 'authenticated');

create policy "comprobantes_lectura_publica" on storage.objects for select
  using (bucket_id = 'comprobantes');

-- ============================================================
-- IMPORTANTE — revisión manual de pagos:
-- Ni la cuota mensual ni la seña se aprueban solas: vos (el dueño de
-- PartidoYA) tenés que entrar a Supabase > Table Editor y:
--   - En "pagos_cuota": revisar el comprobante (comprobante_url) y,
--     si está OK, poner status = 'aprobado' y además actualizar
--     "canchas".status = 'activa' para esa cancha.
--   - En "reservas": si querés, revisar comprobante_url de las señas
--     por transferencia.
-- ============================================================
