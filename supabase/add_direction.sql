-- Add the direction column to the trips table with a strict constraint
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS direction text check (direction in (
  'Home -> FAST main campus',
  'FAST main campus -> Home',
  'Home -> FAST city campus',
  'FAST city campus -> Home'
));

-- Update schema.sql so it persists for new setups
-- This is just for your local DB.
NOTIFY pgrst, 'reload schema';
