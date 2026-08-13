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

  const ADMIN_EMAILS = ['piroammar388@gmail.com'];
  const userEmail = (user.email ?? '').toLowerCase();
  const isAdminEmail = ADMIN_EMAILS.includes(userEmail);

  /* ── Batch 1: Parallelize User Upsert, Trips Query, Settings Query, User Profile & SearchParams ── */
  const [
    _upsertRes,
    tripsRes,
    settingsRes,
    userProfileRes,
    resolvedSearchParams,
  ] = await Promise.all([
    // Non-blocking upsert to ensure user record exists with correct role
    Promise.resolve(
      supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          role: isAdminEmail ? 'admin' : undefined
        }, { onConflict: 'id' })
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

    // User profile role & contact check
    supabase
      .from('users')
      .select('role, whatsapp, phone')
      .eq('id', user.id)
      .maybeSingle(),

    // Search parameters resolution
    props.searchParams,
  ]);

  const trips = (tripsRes.data as Trip[]) ?? [];
  if (tripsRes.error) {
    console.error('[dashboard] trips query failed:', tripsRes.error.code, tripsRes.error.message);
  }

  const isAdmin = isAdminEmail || userProfileRes.data?.role === 'admin';
  const queryView = resolvedSearchParams?.view as string | undefined;

  // Redirect admin users to the Admin Dashboard unless explicitly viewing passenger view
  if (isAdmin && queryView !== 'passenger') {
    redirect('/admin');
  }
  const queryTripId = resolvedSearchParams?.tripId as string | undefined;
  const activeTripId = queryTripId || (trips && trips.length > 0 ? trips[0].id : null);
  let activeTrip = trips.find((t: Trip) => t.id === activeTripId) || null;

  // If trip was specifically requested via tripId but is completed/cancelled (not in scheduled list), fetch it directly
  if (!activeTrip && queryTripId) {
    const { data: directTrip } = await supabase
      .from('trips')
      .select('*')
      .eq('id', queryTripId)
      .maybeSingle();
    if (directTrip) {
      activeTrip = directTrip as Trip;
    }
  }

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

  const userWhatsApp = userProfileRes.data?.whatsapp || userProfileRes.data?.phone || null;

  return (
    <main className="min-h-screen bg-asphalt flex flex-col items-center relative overflow-hidden">
      <Sidebar 
        userName={userName} 
        userWhatsApp={userWhatsApp}
        currentUserId={user.id}
        trips={(trips as Trip[]) || []} 
        activeTripId={activeTripId} 
        isAdmin={isAdmin}
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
