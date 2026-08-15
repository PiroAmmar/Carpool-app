-- ============================================================
-- 00_teardown.sql — Ammar FAST Carpool · Full Schema Teardown
-- Undoes everything in 01_schema.sql + 03_alter_existing_db.sql.
-- Run in Supabase SQL Editor to wipe and start fresh.
-- WARNING: This is DESTRUCTIVE. All data will be lost.
-- ============================================================


-- ============================================================
-- REALTIME — remove tables from publication first
-- ============================================================
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bookings') then
    alter publication supabase_realtime drop table public.bookings;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'trips') then
    alter publication supabase_realtime drop table public.trips;
  end if;
end $$;


-- ============================================================
-- RLS POLICIES — drop before tables (avoids dependency errors)
-- ============================================================

-- settings
drop policy if exists "Anyone signed in can view settings" on public.settings;
drop policy if exists "Only admins can update settings"    on public.settings;

-- bookings
drop policy if exists "Authenticated users can view bookings"     on public.bookings;
drop policy if exists "Users can view own bookings"               on public.bookings;
drop policy if exists "Admins can view all bookings"              on public.bookings;
drop policy if exists "Users can create own bookings"             on public.bookings;
drop policy if exists "Only admins can update booking status"     on public.bookings;
drop policy if exists "Users can rebook own rejected bookings"    on public.bookings;

-- trips
drop policy if exists "Anyone signed in can view trips"  on public.trips;
drop policy if exists "Only admins can manage trips"     on public.trips;

-- routes
drop policy if exists "Anyone signed in can view routes" on public.routes;
drop policy if exists "Only admins can manage routes"    on public.routes;

-- users
drop policy if exists "Users can view all profiles"  on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;


-- ============================================================
-- INDEXES
-- ============================================================
drop index if exists public.bookings_trip_seat_unique;


-- ============================================================
-- TABLES — drop in reverse FK dependency order
-- ============================================================
drop table if exists public.bookings cascade;
drop table if exists public.settings cascade;
drop table if exists public.trips    cascade;
drop table if exists public.routes   cascade;
drop table if exists public.users    cascade;


-- ============================================================
-- REVOKE GRANTS
-- ============================================================
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke usage on schema public from anon, authenticated;


-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
