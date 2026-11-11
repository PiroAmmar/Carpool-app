-- ============================================================
-- 11_lock_user_privileged_columns.sql — Ammar FAST Carpool
-- Closes a privilege-escalation hole: the "Users can update own
-- profile" policy let any passenger edit EVERY column of their own
-- public.users row — including role (→ admin), is_blacklisted,
-- custom_rate and email.
--
-- Passengers may still edit their own full_name / phone / whatsapp.
-- Only admins (users.role = 'admin') and server-side code using the
-- service-role key (or the SQL editor) can change the protected
-- columns. Protected values a passenger sends are silently kept at
-- their old value, so harmless no-op writes don't error.
--
-- Requires the app version whose /auth/callback upserts the profile
-- with the service-role client (otherwise admins' first-login row
-- would be forced to role = 'passenger').
-- Run manually in Supabase SQL editor. Safe to re-run.
-- ============================================================

create or replace function public.protect_user_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
    ''
  );
begin
  -- Service role (API routes, cron) and direct DB sessions (SQL editor)
  -- carry no anon/authenticated JWT role: trusted.
  if caller_role not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Admins manage other users (blacklist, custom rate, roles).
  if exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Self-created profile rows start unprivileged, with the verified email.
    new.role           := 'passenger';
    new.is_blacklisted := false;
    new.blacklisted_at := null;
    new.custom_rate    := null;
    new.email          := coalesce(
      (select lower(u.email) from auth.users u where u.id = new.id),
      new.email
    );
  else
    new.id             := old.id;
    new.role           := old.role;
    new.is_blacklisted := old.is_blacklisted;
    new.blacklisted_at := old.blacklisted_at;
    new.custom_rate    := old.custom_rate;
    new.email          := old.email;
    new.created_at     := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists users_protect_privileged_columns on public.users;

create trigger users_protect_privileged_columns
  before insert or update on public.users
  for each row execute function public.protect_user_privileged_columns();

-- ------------------------------------------------------------
-- AFTER RUNNING: check nobody already promoted themselves.
-- Every row here should be an account you expect to be admin;
-- demote anything else with:
--   update public.users set role = 'passenger' where email = '...';
-- ------------------------------------------------------------
-- select email, role, created_at from public.users where role = 'admin';
