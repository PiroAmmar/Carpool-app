-- ============================================================
-- 06_trip_categories.sql — Ammar FAST Carpool
-- Collapses trips.direction to strict 2-way categorization
-- (Home -> Campus / Campus -> Home) and adds the booking fields
-- needed by the Campus -> Home flow (dropoff, free-by time,
-- admin message) instead of pickup/approved_time.
-- Safe to re-run.
-- ============================================================

-- ① Backfill existing rows onto the 2-way values before the
--    constraint is narrowed, or the constraint add will fail.
update public.trips
  set direction = 'Home -> Campus'
  where direction in ('Home -> FAST main campus', 'Home -> FAST city campus');

update public.trips
  set direction = 'Campus -> Home'
  where direction in ('FAST main campus -> Home', 'FAST city campus -> Home');

-- ② Replace the 4-way check constraint with the 2-way one.
alter table public.trips
  drop constraint if exists trips_direction_check;

alter table public.trips
  add constraint trips_direction_check
  check (direction in ('Home -> Campus', 'Campus -> Home'));

-- ③ Bookings: pickup_location only required for Home -> Campus now.
alter table public.bookings
  alter column pickup_location drop not null;

-- ④ Bookings: new fields for the Campus -> Home flow.
alter table public.bookings
  add column if not exists dropoff_location text,
  add column if not exists free_by_time text,
  add column if not exists admin_message text;
