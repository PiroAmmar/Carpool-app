-- ============================================================
-- GRANTS & PERMISSIONS
-- Run this in the Supabase SQL Editor to apply all necessary
-- table-level permissions to the public schema.
-- ============================================================

-- 1. Schema usage
grant usage on schema public to anon, authenticated;

-- 2. Base SELECT for all tables
grant select on public.users     to anon, authenticated;
grant select on public.trips     to anon, authenticated;
grant select on public.routes    to anon, authenticated;
grant select on public.settings  to anon, authenticated;
grant select on public.bookings  to anon, authenticated;

-- 3. Users table (Allow inserting/updating own profile via upsert)
grant insert, update, delete on public.users to anon, authenticated;

-- 4. Bookings table (Passengers can insert/update, admins can update/delete)
grant insert, update, delete on public.bookings to authenticated;

-- 5. Admin-only tables (RLS restricts these to admins, but table permissions must exist)
grant insert, update, delete on public.trips  to authenticated;
grant insert, update, delete on public.routes to authenticated;
grant update on public.settings to authenticated;

-- 6. Sequences (Needed for any serial/identity columns)
grant usage, select on all sequences in schema public to authenticated;

-- 7. Reload schema cache (Critical step so the API sees these new permissions)
NOTIFY pgrst, 'reload schema';
