-- ============================================================
-- 03_alter_existing_db.sql — Ammar FAST Carpool · Live DB Patches
-- Run this ONLY if you already have a running DB from an earlier
-- schema version. Safe to re-run (all statements use IF EXISTS /
-- IF NOT EXISTS guards).
-- ============================================================

-- ① direction column added to trips (was missing in early schema)
alter table public.trips
  add column if not exists direction text check (direction in (
    'Home -> FAST main campus',
    'FAST main campus -> Home',
    'Home -> FAST city campus',
    'FAST city campus -> Home'
  ));

-- ② seat_number column added to bookings (required by Phase 2 seat map)
alter table public.bookings
  add column if not exists seat_number int not null default 0;

-- Remove the migration default once all rows are backfilled.
-- Uncomment and run manually after verifying data:
-- alter table public.bookings alter column seat_number drop default;

-- ③ Unique index — no two non-rejected bookings on the same trip/seat
create unique index if not exists bookings_trip_seat_unique
  on public.bookings(trip_id, seat_number)
  where status <> 'rejected';

-- ④ Widen booking visibility from "own only" to "all authenticated"
--    (needed so the seat map shows other passengers' seats as taken)
drop policy if exists "Users can view own bookings"   on public.bookings;
drop policy if exists "Admins can view all bookings"  on public.bookings;

drop policy if exists "Authenticated users can view bookings" on public.bookings;

create policy "Authenticated users can view bookings"
  on public.bookings for select
  using (auth.uid() is not null);

-- ⑤ Allow users to flip their own rejected booking back to pending (rebook)
drop policy if exists "Users can rebook own rejected bookings" on public.bookings;

create policy "Users can rebook own rejected bookings"
  on public.bookings for update
  using (auth.uid() = user_id and status = 'rejected')
  with check (auth.uid() = user_id and status = 'pending');

-- ⑥ Add users table to Realtime publication if not already added
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end $$;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
