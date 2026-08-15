-- ============================================================
-- 01_schema.sql — Ammar FAST Carpool · Canonical Schema
-- Run once in Supabase SQL Editor on a fresh project.
-- ============================================================


-- ============================================================
-- USERS
-- Mirrors auth.users but adds app-specific fields (role, phone,
-- whatsapp) that Supabase Auth doesn't store.
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  whatsapp text,
  role text not null default 'passenger' check (role in ('admin', 'passenger')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view all profiles"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);


-- ============================================================
-- ROUTES
-- Admin-managed presets, plus one-off routes typed per trip.
-- ============================================================
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stops text[] not null default '{}',
  is_preset boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.routes enable row level security;

create policy "Anyone signed in can view routes"
  on public.routes for select
  using (auth.uid() is not null);

create policy "Only admins can manage routes"
  on public.routes for all
  using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));


-- ============================================================
-- TRIPS
-- One scheduled carpool run.
-- ============================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null,
  trip_time time not null,
  seats_total int not null default 4,
  route_id uuid references public.routes(id),
  direction text check (direction in (
    'Home -> FAST main campus',
    'FAST main campus -> Home',
    'Home -> FAST city campus',
    'FAST city campus -> Home'
  )),
  rate numeric(10,2),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "Anyone signed in can view trips"
  on public.trips for select
  using (auth.uid() is not null);

create policy "Only admins can manage trips"
  on public.trips for all
  using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));


-- ============================================================
-- BOOKINGS
-- A passenger's seat request on a specific trip.
-- ============================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  seat_number int not null,
  pickup_location text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_time time,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

alter table public.bookings enable row level security;

-- All authenticated users see seat occupancy (needed for the seat map).
-- Private carpool of ~15 colleagues - full visibility is intentional.
create policy "Authenticated users can view bookings"
  on public.bookings for select
  using (auth.uid() is not null);

create policy "Users can create own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Only admins can update booking status"
  on public.bookings for update
  using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

create policy "Users can rebook own rejected bookings"
  on public.bookings for update
  using (auth.uid() = user_id and status = 'rejected')
  with check (auth.uid() = user_id and status = 'pending');


-- ============================================================
-- SETTINGS
-- Single-row table for the per-trip rate the admin can edit.
-- ============================================================
create table if not exists public.settings (
  id int primary key default 1,
  rate numeric(10,2),
  constraint single_row check (id = 1)
);

insert into public.settings (id, rate) values (1, null)
  on conflict (id) do nothing;

alter table public.settings enable row level security;

create policy "Anyone signed in can view settings"
  on public.settings for select
  using (auth.uid() is not null);

create policy "Only admins can update settings"
  on public.settings for update
  using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));


-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.trips;
