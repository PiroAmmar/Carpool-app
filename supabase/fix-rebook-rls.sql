-- Fix: rebook (upsert onConflict trip_id,user_id) resolves to an UPDATE.
-- Only policy on bookings UPDATE was admin-only, so the update silently
-- affected 0 rows under RLS and the old row stayed 'rejected' forever
-- (old delete+insert flow hit the unique constraint for the same reason).
-- This lets a user flip their OWN rejected booking back to pending.

drop policy if exists "Users can rebook own rejected bookings" on public.bookings;

create policy "Users can rebook own rejected bookings"
  on public.bookings for update
  using (auth.uid() = user_id and status = 'rejected')
  with check (auth.uid() = user_id and status = 'pending');
