import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HudBar } from '@/components/HudBar';
import { DashboardClient } from './DashboardClient';
import { Sidebar } from '@/components/Sidebar';
import type { Trip, Booking, Route } from '@/types';

export default async function DashboardPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined } }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date().toISOString().split('T')[0];
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  /* ── Batch 1: Parallelize User Upsert, Trips Query, Settings Query, & SearchParams ── */
  const [
    _upsertRes,
    tripsRes,
    settingsRes,
    resolvedSearchParams,
  ] = await Promise.all([
    // Non-blocking upsert to ensure user record exists
    Promise.resolve(
      supabase
        .from('users')
        .upsert({ id: user.id, email: user.email!, full_name: fullName }, { onConflict: 'id' })
    ).catch(err => ({ error: err })),

    // Scheduled upcoming trips
    supabase
      .from('trips')
      .select('*')
      .eq('status', 'scheduled')
      .gte('trip_date', today)
      .order('trip_date', { ascending: true })
      .order('trip_time', { ascending: true }),

    // Global rate settings
    supabase
      .from('settings')
      .select('rate')
      .eq('id', 1)
      .maybeSingle(),

    // Search parameters resolution
    props.searchParams,
  ]);

  const trips = (tripsRes.data as Trip[]) ?? [];
  if (tripsRes.error) {
    console.error('[dashboard] trips query failed:', tripsRes.error.code, tripsRes.error.message);
  }

  const queryTripId = resolvedSearchParams?.tripId as string | undefined;
  const activeTripId = queryTripId || (trips && trips.length > 0 ? trips[0].id : null);
  const activeTrip = trips.find((t: Trip) => t.id === activeTripId) || null;

  /* ── Batch 2: Parallelize Bookings & Route queries for active trip ── */
  const [bookingsRes, routeRes] = await Promise.all([
    activeTrip
      ? supabase
          .from('bookings')
          .select('*')
          .eq('trip_id', activeTrip.id)
      : Promise.resolve({ data: [] }),
    activeTrip?.route_id
      ? supabase
          .from('routes')
          .select('*')
          .eq('id', activeTrip.route_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const bookings = (bookingsRes.data as Booking[]) ?? [];
  const route = (routeRes.data as Route | null) ?? null;

  /* ── Rate calculation ── */
  const tripRate = (activeTrip as (Trip & { rate?: number }) | null)?.rate ?? null;
  const rate = tripRate ?? settingsRes.data?.rate ?? null;

  /* ── User display name ── */
  const userName: string =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Passenger';

  return (
    <main className="min-h-screen bg-asphalt flex flex-col items-center relative overflow-hidden">
      <Sidebar 
        userName={userName} 
        trips={(trips as Trip[]) || []} 
        activeTripId={activeTripId} 
      />
      
      <div className="w-full max-w-sm flex-1 flex flex-col relative z-0">
        <HudBar rate={rate} />
        <div className="px-6 py-6 flex flex-col flex-1">
          <DashboardClient
            trip={activeTrip as Trip | null}
            initialBookings={bookings}
            route={route}
            currentUserId={user.id}
            userName={userName}
            rate={rate}
          />
        </div>
      </div>
    </main>
  );
}
