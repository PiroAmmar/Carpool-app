-- Payment method on bookings (online / cash)
-- Run manually in Supabase SQL editor.
-- Existing rows left NULL — no reliable data to backfill from; method is
-- only known going forward, captured at the point admin marks a booking paid.

alter table public.bookings
  add column if not exists payment_method text
  check (payment_method in ('online', 'cash'));
