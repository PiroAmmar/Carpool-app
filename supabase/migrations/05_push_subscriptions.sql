-- ============================================================
-- 05_push_subscriptions.sql — Ammar FAST Carpool · Web Push
-- Stores one row per browser/device that has granted notification
-- permission. A user can have multiple rows (phone + laptop, etc).
-- Safe to re-run (IF NOT EXISTS guards).
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Admin needs to read all subscriptions server-side to fan out pushes
-- on trip create/approve/reject — service role key bypasses RLS for
-- that, so no admin-read policy needed here.

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);
