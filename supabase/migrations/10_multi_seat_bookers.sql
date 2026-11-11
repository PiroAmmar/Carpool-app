-- ============================================================
-- 10_multi_seat_bookers.sql — Ammar FAST Carpool
-- Lets specific accounts book more than one seat on the same trip
-- (e.g. Ammar booking seats on behalf of freshies who don't have
-- NU email ids yet). Every other account keeps the old
-- one-booking-per-trip rule.
-- Run manually in Supabase SQL editor. Safe to re-run.
-- ============================================================

-- ① Allowlist. Kept in its own table (not a users column) because
--    users can update their own users row, so a column there would
--    be self-grantable. RLS on + no policies = only the service role
--    (API routes) and SQL editor can read or write it.
create table if not exists public.multi_seat_bookers (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.multi_seat_bookers enable row level security;
revoke all on public.multi_seat_bookers from anon, authenticated;

insert into public.multi_seat_bookers (email)
values ('k230740@nu.edu.pk')
on conflict (email) do nothing;

-- ② Replace the hard unique(trip_id, user_id) constraint with a
--    trigger that enforces it for everyone except allowlisted bookers.
--    The per-seat index (bookings_trip_seat_unique) is untouched, so
--    two bookings can still never hold the same seat.
alter table public.bookings drop constraint if exists bookings_trip_id_user_id_key;

create index if not exists bookings_trip_user_idx on public.bookings(trip_id, user_id);

create or replace function public.enforce_one_booking_per_trip()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (
    select 1
    -- auth.users, not public.users: passengers can edit their own
    -- public.users row (including email), but not auth.users.
    from auth.users u
    join public.multi_seat_bookers m on m.email = lower(u.email)
    where u.id = new.user_id
  ) then
    return new;
  end if;

  if exists (
    select 1 from public.bookings b
    where b.trip_id = new.trip_id
      and b.user_id = new.user_id
      and b.id <> new.id
  ) then
    raise exception 'User already has a booking on this trip'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_one_per_trip on public.bookings;

create trigger bookings_one_per_trip
  before insert or update of trip_id, user_id on public.bookings
  for each row execute function public.enforce_one_booking_per_trip();

NOTIFY pgrst, 'reload schema';
