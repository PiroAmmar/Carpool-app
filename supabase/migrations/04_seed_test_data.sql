-- ============================================================
-- 04_seed_test_data.sql — Ammar FAST Carpool · Rich Mock Dataset
-- Run this in Supabase SQL Editor to populate lots of realistic test data.
-- Idempotent: safe to run even if users/emails already exist!
-- ============================================================

DO $$
DECLARE
  -- User UUID holders
  u_admin UUID;
  u_ali UUID;
  u_bilal UUID;
  u_daniyal UUID;
  u_fatima UUID;
  u_hamza UUID;
  u_hassan UUID;
  u_mariam UUID;
  u_osama UUID;
  u_sara UUID;
  u_zain UUID;

  -- Route UUIDs
  r_gulshan UUID := gen_random_uuid();
  r_johar UUID := gen_random_uuid();
  r_dha UUID := gen_random_uuid();
  r_nazimabad UUID := gen_random_uuid();
  r_malir UUID := gen_random_uuid();

  -- Trip UUIDs
  t_today_m1 UUID := gen_random_uuid();
  t_today_m2 UUID := gen_random_uuid();
  t_today_e1 UUID := gen_random_uuid();
  t_tom_m1 UUID := gen_random_uuid();
  t_tom_m2 UUID := gen_random_uuid();
  t_tom_e1 UUID := gen_random_uuid();
  t_day3_m1 UUID := gen_random_uuid();
  t_day4_m1 UUID := gen_random_uuid();
  t_day5_m1 UUID := gen_random_uuid();
  t_next_m1 UUID := gen_random_uuid();
  t_past_c1 UUID := gen_random_uuid();
  t_past_c2 UUID := gen_random_uuid();
  t_past_closed UUID := gen_random_uuid();

  user_rec RECORD;
BEGIN

  -- 1. Create or link users in auth.users and public.users safely
  FOR user_rec IN
    SELECT * FROM (VALUES
      ('ammarcarpool@gmail.com', 'Syed Ammar Ali', '+923343115956', 'admin'),
      ('k210452@nu.edu.pk', 'Ali Raza', '+923001234567', 'passenger'),
      ('k220891@nu.edu.pk', 'Bilal Tariq', '+923129876543', 'passenger'),
      ('k201144@nu.edu.pk', 'Daniyal Sheikh', '+923334567890', 'passenger'),
      ('k230912@nu.edu.pk', 'Fatima Zahra', '+923451122334', 'passenger'),
      ('k210088@nu.edu.pk', 'Hamza Siddiqui', '+923214455667', 'passenger'),
      ('k221560@nu.edu.pk', 'Hassan Javed', '+923087788990', 'passenger'),
      ('k230119@nu.edu.pk', 'Mariam Khan', '+923359900112', 'passenger'),
      ('k210988@nu.edu.pk', 'Osama Bin Khalid', '+923153344556', 'passenger'),
      ('k220341@nu.edu.pk', 'Sara Ahmed', '+923467788112', 'passenger'),
      ('k200781@nu.edu.pk', 'Zain Ul Abideen', '+923026677889', 'passenger')
    ) AS t(email, full_name, phone, role)
  LOOP
    DECLARE
      target_id UUID;
    BEGIN
      SELECT id INTO target_id FROM auth.users WHERE email = user_rec.email LIMIT 1;
      
      IF target_id IS NULL THEN
        target_id := gen_random_uuid();
        INSERT INTO auth.users (
          id, instance_id, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
          target_id, '00000000-0000-0000-0000-000000000000', user_rec.email, '', now(),
          '{"provider":"google","providers":["google"]}',
          jsonb_build_object('full_name', user_rec.full_name),
          now(), now(), 'authenticated', 'authenticated'
        );
      END IF;

      INSERT INTO public.users (id, email, full_name, phone, whatsapp, role, created_at)
      VALUES (target_id, user_rec.email, user_rec.full_name, user_rec.phone, user_rec.phone, user_rec.role, now())
      ON CONFLICT (id) DO UPDATE 
        SET full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            whatsapp = EXCLUDED.whatsapp,
            role = EXCLUDED.role;
    END;
  END LOOP;

  -- 2. Resolve User UUIDs for bookings
  SELECT id INTO u_admin   FROM auth.users WHERE email = 'ammarcarpool@gmail.com' LIMIT 1;
  SELECT id INTO u_ali     FROM auth.users WHERE email = 'k210452@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_bilal   FROM auth.users WHERE email = 'k220891@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_daniyal FROM auth.users WHERE email = 'k201144@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_fatima  FROM auth.users WHERE email = 'k230912@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_hamza   FROM auth.users WHERE email = 'k210088@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_hassan  FROM auth.users WHERE email = 'k221560@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_mariam  FROM auth.users WHERE email = 'k230119@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_osama   FROM auth.users WHERE email = 'k210988@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_sara    FROM auth.users WHERE email = 'k220341@nu.edu.pk' LIMIT 1;
  SELECT id INTO u_zain    FROM auth.users WHERE email = 'k200781@nu.edu.pk' LIMIT 1;

  -- 3. Set global default rate in settings
  INSERT INTO public.settings (id, rate)
  VALUES (1, 350.00)
  ON CONFLICT (id) DO UPDATE SET rate = EXCLUDED.rate;

  -- 4. Insert Routes (presets)
  INSERT INTO public.routes (id, name, stops, is_preset, created_at)
  VALUES
    (r_gulshan, 'Gulshan-e-Iqbal → Main Campus', ARRAY['Maskan Chowrangi', 'Disco Bakery', 'Continental', 'Samama Shopping Complex', 'FAST Main Campus'], true, now() - interval '30 days'),
    (r_johar, 'Gulistan-e-Johar → Main Campus', ARRAY['Kamran Chowrangi', 'Rado Bakery', 'Munawar Chowrangi', 'Darul Sehat Hospital', 'FAST Main Campus'], true, now() - interval '30 days'),
    (r_dha, 'DHA Phase 6 & Clifton → Main Campus', ARRAY['Khayaban-e-Shahbaz', '26th Street', 'Bilawal Chowrangi', 'Shaheen Complex', 'FAST Main Campus'], true, now() - interval '28 days'),
    (r_nazimabad, 'North Nazimabad → Main Campus', ARRAY['5 Star Chowrangi', 'KDA Chowrangi', 'Sakhi Hassan', 'Water Pump', 'FAST Main Campus'], true, now() - interval '25 days'),
    (r_malir, 'Malir Cantt & Model Colony → Main Campus', ARRAY['Check Post 2', 'Cantt Bazaar', 'Model Colony Gate', 'Jinnah Terminal', 'FAST Main Campus'], true, now() - interval '20 days')
  ON CONFLICT (id) DO NOTHING;

  -- 5. Insert Trips
  INSERT INTO public.trips (id, trip_date, trip_time, seats_total, route_id, direction, rate, status, created_at)
  VALUES
    -- Today's Trips
    (t_today_m1, CURRENT_DATE, '07:30:00', 4, r_gulshan, 'Home -> FAST main campus', 350.00, 'scheduled', now() - interval '2 days'),
    (t_today_m2, CURRENT_DATE, '09:00:00', 4, r_johar, 'Home -> FAST main campus', 300.00, 'scheduled', now() - interval '2 days'),
    (t_today_e1, CURRENT_DATE, '16:00:00', 4, r_gulshan, 'FAST main campus -> Home', 350.00, 'scheduled', now() - interval '1 day'),

    -- Tomorrow's Trips
    (t_tom_m1, CURRENT_DATE + 1, '07:30:00', 4, r_dha, 'Home -> FAST main campus', 400.00, 'scheduled', now() - interval '1 day'),
    (t_tom_m2, CURRENT_DATE + 1, '08:15:00', 4, r_nazimabad, 'Home -> FAST main campus', 350.00, 'scheduled', now() - interval '1 day'),
    (t_tom_e1, CURRENT_DATE + 1, '17:15:00', 4, r_dha, 'FAST main campus -> Home', 400.00, 'scheduled', now() - interval '1 day'),

    -- Later this week
    (t_day3_m1, CURRENT_DATE + 2, '07:30:00', 4, r_gulshan, 'Home -> FAST main campus', 350.00, 'scheduled', now()),
    (t_day4_m1, CURRENT_DATE + 3, '08:00:00', 4, r_malir, 'Home -> FAST main campus', 350.00, 'scheduled', now()),
    (t_day5_m1, CURRENT_DATE + 4, '07:30:00', 4, r_johar, 'Home -> FAST main campus', 300.00, 'scheduled', now()),
    (t_next_m1, CURRENT_DATE + 7, '07:30:00', 4, r_gulshan, 'Home -> FAST main campus', 350.00, 'scheduled', now()),

    -- Past Completed & Closed Trips
    (t_past_c1, CURRENT_DATE - 2, '07:30:00', 4, r_gulshan, 'Home -> FAST main campus', 350.00, 'completed', now() - interval '5 days'),
    (t_past_c2, CURRENT_DATE - 1, '07:30:00', 4, r_johar, 'Home -> FAST main campus', 300.00, 'completed', now() - interval '4 days'),
    (t_past_closed, CURRENT_DATE - 3, '08:00:00', 4, r_dha, 'Home -> FAST main campus', 400.00, 'closed', now() - interval '7 days')
  ON CONFLICT (id) DO NOTHING;

  -- 6. Insert Bookings
  -- Trip 1 (Today Morning 7:30 Gulshan) — FULLY BOOKED (4 seats approved)
  INSERT INTO public.bookings (id, trip_id, user_id, seat_number, pickup_location, status, payment_status, approved_time, created_at)
  VALUES
    (gen_random_uuid(), t_today_m1, u_ali, 1, 'Maskan Chowrangi', 'approved', 'paid', '07:10:00', now() - interval '24 hours'),
    (gen_random_uuid(), t_today_m1, u_bilal, 2, 'Disco Bakery', 'approved', 'paid', '07:15:00', now() - interval '23 hours'),
    (gen_random_uuid(), t_today_m1, u_daniyal, 3, 'Samama Complex', 'approved', 'pending', '07:22:00', now() - interval '20 hours'),
    (gen_random_uuid(), t_today_m1, u_fatima, 4, 'Continental Bakery', 'approved', 'paid', '07:18:00', now() - interval '19 hours')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Trip 2 (Today Morning 9:00 Johar) — 2 Approved, 1 Pending Request, 1 Rejected (Seats left: 2 open)
  INSERT INTO public.bookings (id, trip_id, user_id, seat_number, pickup_location, status, payment_status, approved_time, created_at)
  VALUES
    (gen_random_uuid(), t_today_m2, u_hamza, 1, 'Kamran Chowrangi', 'approved', 'paid', '08:35:00', now() - interval '18 hours'),
    (gen_random_uuid(), t_today_m2, u_hassan, 2, 'Munawar Chowrangi', 'approved', 'pending', '08:42:00', now() - interval '15 hours'),
    (gen_random_uuid(), t_today_m2, u_mariam, 3, 'Darul Sehat Hospital', 'pending', 'pending', null, now() - interval '3 hours'),
    (gen_random_uuid(), t_today_m2, u_osama, 4, 'Rado Bakery', 'rejected', 'pending', null, now() - interval '6 hours')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Trip 3 (Today Evening 16:00 Gulshan) — 1 Approved, 1 Pending (Seats left: 3 open)
  INSERT INTO public.bookings (id, trip_id, user_id, seat_number, pickup_location, status, payment_status, approved_time, created_at)
  VALUES
    (gen_random_uuid(), t_today_e1, u_sara, 1, 'FAST Main Campus Gate 1', 'approved', 'waived', '16:05:00', now() - interval '10 hours'),
    (gen_random_uuid(), t_today_e1, u_zain, 2, 'FAST Main Campus Gate 2', 'pending', 'pending', null, now() - interval '2 hours')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Trip 4 (Tomorrow 7:30 DHA) — 3 Approved, 1 Open Seat (Seats left: 1)
  INSERT INTO public.bookings (id, trip_id, user_id, seat_number, pickup_location, status, payment_status, approved_time, created_at)
  VALUES
    (gen_random_uuid(), t_tom_m1, u_ali, 1, 'Khayaban-e-Shahbaz', 'approved', 'pending', '07:05:00', now() - interval '12 hours'),
    (gen_random_uuid(), t_tom_m1, u_daniyal, 2, '26th Street Tauheed Com', 'approved', 'paid', '07:12:00', now() - interval '8 hours'),
    (gen_random_uuid(), t_tom_m1, u_fatima, 3, 'Bilawal Chowrangi', 'approved', 'paid', '07:20:00', now() - interval '5 hours')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Trip 5 (Tomorrow 8:15 Nazimabad) — 2 Pending Requests (Seats left: 2 open)
  INSERT INTO public.bookings (id, trip_id, user_id, seat_number, pickup_location, status, payment_status, approved_time, created_at)
  VALUES
    (gen_random_uuid(), t_tom_m2, u_bilal, 1, '5 Star Chowrangi', 'pending', 'pending', null, now() - interval '4 hours'),
    (gen_random_uuid(), t_tom_m2, u_hamza, 2, 'KDA Chowrangi', 'pending', 'pending', null, now() - interval '1 hour')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Past Trips Bookings (Completed & Closed records for analytics/history)
  INSERT INTO public.bookings (id, trip_id, user_id, seat_number, pickup_location, status, payment_status, approved_time, created_at)
  VALUES
    (gen_random_uuid(), t_past_c1, u_ali, 1, 'Maskan Chowrangi', 'approved', 'paid', '07:10:00', now() - interval '3 days'),
    (gen_random_uuid(), t_past_c1, u_bilal, 2, 'Disco Bakery', 'approved', 'paid', '07:15:00', now() - interval '3 days'),
    (gen_random_uuid(), t_past_c1, u_sara, 3, 'Continental', 'approved', 'paid', '07:20:00', now() - interval '3 days'),
    (gen_random_uuid(), t_past_c2, u_hassan, 1, 'Kamran Chowrangi', 'approved', 'paid', '07:15:00', now() - interval '2 days'),
    (gen_random_uuid(), t_past_c2, u_zain, 2, 'Darul Sehat', 'approved', 'paid', '07:25:00', now() - interval '2 days'),
    (gen_random_uuid(), t_past_closed, u_daniyal, 1, 'Shahbaz', 'approved', 'paid', '07:45:00', now() - interval '4 days')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
