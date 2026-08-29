-- Passenger blacklist feature
-- Run manually in Supabase SQL editor.

-- ============================================================
-- 1. Blacklist columns on users.
-- ============================================================
alter table public.users
  add column if not exists is_blacklisted boolean not null default false;

alter table public.users
  add column if not exists blacklisted_at timestamptz;

-- Admin update policy ("Admins can update any user") already exists
-- from migration 07 — covers toggling is_blacklisted, no new policy needed.

-- ============================================================
-- 2. Defense in depth: block booking INSERT at RLS level too,
--    even though the API routes already check server-side via
--    the admin client. Direct client inserts (if any) get blocked here.
-- ============================================================
drop policy if exists "Users can create own bookings" on public.bookings;

create policy "Users can create own bookings"
  on public.bookings for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.users u where u.id = auth.uid() and u.is_blacklisted = true
    )
  );

NOTIFY pgrst, 'reload schema';
