-- Fix: grant missing privileges to authenticated/anon roles.
-- Run this in Supabase SQL Editor.
-- RLS policies are worthless without the base GRANT SELECT below.

grant usage on schema public to anon, authenticated;

grant select on public.trips     to anon, authenticated;
grant select on public.routes    to anon, authenticated;
grant select on public.settings  to anon, authenticated;
grant select on public.bookings  to anon, authenticated;

-- Passengers need to insert their own bookings
grant insert on public.bookings to authenticated;
-- Admins update bookings (approve/reject) — also granted to authenticated
-- so the admin user (who IS authenticated) can approve
grant update on public.bookings to authenticated;
grant delete on public.bookings to authenticated;

-- Admins need to manage trips
grant insert, update, delete on public.trips  to authenticated;
grant insert, update, delete on public.routes to authenticated;
grant update on public.settings to authenticated;

-- Sequence access for any serial/identity columns
grant usage, select on all sequences in schema public to authenticated;
