-- ============================================================
-- 02_grants.sql — Ammar FAST Carpool · Table-Level Permissions
-- Run after 01_schema.sql. Safe to re-run (grants are idempotent).
-- ============================================================

-- Schema usage
grant usage on schema public to anon, authenticated;

-- SELECT on all tables
grant select on public.users    to anon, authenticated;
grant select on public.trips    to anon, authenticated;
grant select on public.routes   to anon, authenticated;
grant select on public.settings to anon, authenticated;
grant select on public.bookings to anon, authenticated;

-- Users table — own profile upsert
grant insert, update, delete on public.users to anon, authenticated;

-- Bookings — passengers insert; admins update/delete (RLS enforces who can do what)
grant insert, update, delete on public.bookings to authenticated;

-- Trips & routes — admin-only via RLS, but table permission must exist
grant insert, update, delete on public.trips  to authenticated;
grant insert, update, delete on public.routes to authenticated;

-- Settings — admin-only rate update
grant update on public.settings to authenticated;

-- Sequences
grant usage, select on all sequences in schema public to authenticated;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
