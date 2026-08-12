-- Phase 2 migration — run this in Supabase SQL Editor before testing Phase 2.

-- 1. Add seat_number to bookings
alter table public.bookings
  add column if not exists seat_number int check (seat_number between 1 and 8);

-- 2. Ensure no two non-rejected bookings on the same trip can claim the same seat
create unique index if not exists bookings_trip_seat_unique
  on public.bookings(trip_id, seat_number)
  where status <> 'rejected';

-- 3. Fix RLS so all passengers can see seat occupancy (needed for the seat map visual).
--    At this scale (10-15 people who all know each other) full visibility is fine.
--    The pickup_location is visible too — acceptable for a private carpool.
drop policy if exists "Users can view own bookings" on public.bookings;
drop policy if exists "Admins can view all bookings" on public.bookings;

create policy "Authenticated users can view bookings"
  on public.bookings for select
  using (auth.uid() is not null);
