-- ============================================================
-- 09_bookings_privacy.sql — Ammar FAST Carpool
-- Passengers can only read their OWN bookings (payment status,
-- amount, pickup/dropoff). The seat map moves to a stripped-down
-- seat_occupancy table (no payment or location data) that a
-- trigger keeps in sync with bookings.
-- Run manually in Supabase SQL editor. Safe to re-run.
--
-- BEFORE RUNNING: admins read all bookings via users.role = 'admin'
-- (same rule the existing update policies use). Confirm every admin
-- account has it, or the admin panel will show no bookings:
--   select email, role from public.users where role = 'admin';
-- ============================================================

-- ① Seat occupancy: only what the seat map and sidebar badges need.
create table if not exists public.seat_occupancy (
  id uuid primary key references public.bookings(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  seat_number int not null,
  status text not null,
  created_at timestamptz not null
);

create index if not exists seat_occupancy_trip_idx on public.seat_occupancy(trip_id);

alter table public.seat_occupancy enable row level security;

drop policy if exists "Authenticated users can view seat occupancy" on public.seat_occupancy;

create policy "Authenticated users can view seat occupancy"
  on public.seat_occupancy for select
  using (auth.uid() is not null);

-- Read-only from the API; only the trigger below writes to it.
revoke insert, update, delete on public.seat_occupancy from anon, authenticated;
grant select on public.seat_occupancy to authenticated;

-- ② Sync trigger. Deletes are handled by the FK cascade above.
create or replace function public.sync_seat_occupancy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.seat_occupancy (id, trip_id, user_id, seat_number, status, created_at)
  values (new.id, new.trip_id, new.user_id, new.seat_number, new.status, new.created_at)
  on conflict (id) do update
    set trip_id     = excluded.trip_id,
        user_id     = excluded.user_id,
        seat_number = excluded.seat_number,
        status      = excluded.status,
        created_at  = excluded.created_at;
  return new;
end;
$$;

drop trigger if exists bookings_sync_seat_occupancy on public.bookings;

create trigger bookings_sync_seat_occupancy
  after insert or update of trip_id, user_id, seat_number, status on public.bookings
  for each row execute function public.sync_seat_occupancy();

-- ③ Backfill existing bookings.
insert into public.seat_occupancy (id, trip_id, user_id, seat_number, status, created_at)
select id, trip_id, user_id, seat_number, status, created_at from public.bookings
on conflict (id) do update
  set trip_id     = excluded.trip_id,
      user_id     = excluded.user_id,
      seat_number = excluded.seat_number,
      status      = excluded.status,
      created_at  = excluded.created_at;

-- ④ Narrow bookings visibility back to own rows + admins
--    (reverses the widening done in 03_alter_existing_db.sql).
drop policy if exists "Authenticated users can view bookings" on public.bookings;
drop policy if exists "Users can view own bookings"           on public.bookings;
drop policy if exists "Admins can view all bookings"          on public.bookings;

create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "Admins can view all bookings"
  on public.bookings for select
  using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

-- Anonymous visitors never need booking rows.
revoke select on public.bookings from anon;

-- ⑤ Realtime for the seat map.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'seat_occupancy'
  ) then
    alter publication supabase_realtime add table public.seat_occupancy;
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
