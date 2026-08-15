-- Payment status on bookings + 'closed' trip status
-- Run manually in Supabase SQL editor.

alter table public.bookings
  add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending', 'paid', 'waived'));

alter table public.trips
  drop constraint if exists trips_status_check;

alter table public.trips
  add constraint trips_status_check
  check (status in ('scheduled', 'cancelled', 'completed', 'closed'));

-- ============================================================
-- RLS GAP FIX: passenger self-escalation via public.users update
-- "Users can update own profile" had no with check, so any
-- authenticated user could set role='admin' on their own row via
-- direct API call (UI never exposes it, but RLS didn't block it).
-- Fix: force role to stay equal to its current stored value.
-- ============================================================
drop policy if exists "Users can update own profile" on public.users;

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select u.role from public.users u where u.id = auth.uid())
  );
