import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TripsClient } from './TripsClient';
import type { Trip, Booking, Route } from '@/types';

export default async function MyTripsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [bookingsRes, routesRes, settingsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('routes')
      .select('*'),

    supabase
      .from('settings')
      .select('rate')
      .eq('id', 1)
      .maybeSingle(),
  ]);

  const bookings = (bookingsRes.data as Booking[]) ?? [];
  const tripIds = [...new Set(bookings.map((b) => b.trip_id))];

  // Every trip the passenger ever booked, regardless of status or date —
  // the main dashboard only loads upcoming scheduled ones.
  const { data: tripsData } = tripIds.length
    ? await supabase.from('trips').select('*').in('id', tripIds)
    : { data: [] };

  return (
    <TripsClient
      initialBookings={bookings}
      initialTrips={(tripsData as Trip[]) ?? []}
      routes={(routesRes.data as Route[]) ?? []}
      globalRate={settingsRes.data?.rate ?? null}
      currentUserId={user.id}
    />
  );
}
