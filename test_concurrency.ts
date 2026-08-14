import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Set DATABASE_URL env var first. Example (PowerShell):');
  console.error('  $env:DATABASE_URL="postgresql://postgres.xxxx:[email protected]:5432/postgres"');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 20,
  idle_timeout: 10,
  connect_timeout: 10,
});

async function main() {
  try {
    console.log('Connecting to PostgreSQL database...');

    // 1. Ensure test users exist (test_p1 to test_p12)
    console.log('Verifying / Seeding 12 test users...');
    for (let i = 1; i <= 12; i++) {
      const email = `test_p${i}@nu.edu.pk`;
      const existingAuth = await sql`select id from auth.users where email = ${email} limit 1`;
      let userId: string;

      if (existingAuth.length > 0) {
        userId = existingAuth[0].id;
      } else {
        const authUser = await sql`
          insert into auth.users (id, email, created_at, updated_at, aud, role)
          values (
            gen_random_uuid(),
            ${email},
            now(),
            now(),
            'authenticated',
            'authenticated'
          )
          returning id;
        `;
        userId = authUser[0].id;
      }

      await sql`
        insert into public.users (id, email, full_name, role)
        values (${userId}, ${email}, ${'Test Passenger ' + i}, 'passenger')
        on conflict (id) do update set email = excluded.email;
      `;
    }

    // 2. Ensure test trip exists (1 seat on 2099-01-01 17:00)
    let trips = await sql`
      select id from public.trips
      where trip_date = '2099-01-01' and trip_time = '17:00'
      limit 1
    `;

    if (trips.length === 0) {
      console.log('Creating 1-seat test trip (2099-01-01 17:00)...');
      trips = await sql`
        insert into public.trips (trip_date, trip_time, seats_total, status)
        values ('2099-01-01', '17:00', 1, 'scheduled')
        returning id;
      `;
    }

    const tripId = trips[0].id;
    console.log(`Using Test Trip ID: ${tripId}`);

    // Clean up any existing bookings on this test trip before racing
    await sql`delete from public.bookings where trip_id = ${tripId}`;

    console.log(`\nRACING 12 PASSENGERS CONCURRENTLY FOR 1 SEAT (seat_number = 1)...`);

    // 3. Fire 12 concurrent requests
    const promises = Array.from({ length: 12 }, async (_, i) => {
      const passengerEmail = `test_p${i + 1}@nu.edu.pk`;
      try {
        const res = await sql`
          insert into public.bookings (trip_id, user_id, pickup_location, status, seat_number)
          select ${tripId}, id, 'Gate 3', 'pending', 1
          from public.users where email = ${passengerEmail}
          on conflict do nothing
          returning id;
        `;
        if (res.length > 0) {
          return { email: passengerEmail, status: 'WINNER (Booked Seat 1)', id: res[0].id };
        } else {
          return { email: passengerEmail, status: 'BLOCKED (Conflict / Missed)', id: null };
        }
      } catch (err: any) {
        return { email: passengerEmail, status: `ERROR: ${err.message}`, id: null };
      }
    });

    const results = await Promise.all(promises);
    console.table(results);

    // 4. Query final bookings
    console.log('\n--- VERIFICATION QUERY ---');
    const bookings = await sql`
      select u.email, b.seat_number, b.status, b.created_at
      from public.bookings b
      join public.users u on u.id = b.user_id
      where b.trip_id = ${tripId} and b.status <> 'rejected'
      order by b.created_at;
    `;

    console.table(bookings);
    console.log(`Total active seat_number=1 bookings in DB: ${bookings.length}`);

    if (bookings.length === 1) {
      console.log('PASS: exactly 1 passenger booked seat #1. Unique constraint holds under concurrency.\n');
    } else if (bookings.length > 1) {
      console.log('FAIL: more than 1 passenger booked the same seat. Race condition present.\n');
    } else {
      console.log('WARNING: 0 bookings registered — check trip/user seeding above.\n');
    }

    // 5. Cleanup test trip's bookings so re-runs start clean
    await sql`delete from public.bookings where trip_id = ${tripId}`;
    console.log('Cleaned up test bookings for this trip.');
  } catch (error) {
    console.error('Fatal error during test:', error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
