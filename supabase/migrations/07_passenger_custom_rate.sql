-- Passenger custom rate override + historical rate snapshot
-- Run manually in Supabase SQL editor.

-- ============================================================
-- 1. custom_rate on users — flat per-passenger override.
--    Admin-only, hidden from passenger dashboard by design
--    (never surfaced in any passenger-facing query/component).
-- ============================================================
alter table public.users
  add column if not exists custom_rate numeric(10,2);

-- Admins need to update OTHER users' rows (existing policy only
-- allows self-update). Scoped update, no delete/insert grant change.
drop policy if exists "Admins can update any user" on public.users;

create policy "Admins can update any user"
  on public.users for update
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ============================================================
-- 2. rate_applied on bookings — snapshot the rate at the moment
--    a booking is created/rebooked. This is what payment totals
--    read from, so changing a passenger's custom_rate later never
--    rewrites historical paid/waived/pending amounts.
-- ============================================================
alter table public.bookings
  add column if not exists rate_applied numeric(10,2);

-- Backfill existing rows using today's live calc (trip.rate, else
-- global settings.rate) so history isn't blank post-migration.
-- custom_rate doesn't exist retroactively for these, so it's
-- correctly excluded from the backfill calc.
update public.bookings b
set rate_applied = coalesce(
  (select t.rate from public.trips t where t.id = b.trip_id),
  (select s.rate from public.settings s where s.id = 1)
)
where rate_applied is null;

NOTIFY pgrst, 'reload schema';
