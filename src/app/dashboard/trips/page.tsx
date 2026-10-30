import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TripsClient } from './TripsClient';
import { splitBookingsAndTrips, type BookingWithTrip } from '@/lib/payments';
import type { Route } from '@/types';

export default async function MyTripsPage() {
  const supabase = await createClient();

  // Session was already validated by the proxy; getClaims verifies the JWT
  // locally where possible instead of another round trip to the auth server.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  // One parallel batch. Trips are embedded in the bookings query so every
  // trip the passenger ever booked comes back regardless of status or date.
  const [bookingsRes, routesRes, settingsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, trips(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    supabase
      .from('routes')
      .select('id, name, stops, is_preset'),

    supabase
      .from('settings')
      .select('rate')
      .eq('id', 1)
      .maybeSingle(),
  ]);

  const { bookings, trips } = splitBookingsAndTrips((bookingsRes.data as BookingWithTrip[]) ?? []);

  return (
    <TripsClient
      initialBookings={bookings}
      initialTrips={trips}
      routes={(routesRes.data as Route[]) ?? []}
      globalRate={settingsRes.data?.rate ?? null}
      currentUserId={userId}
    />
  );
}
