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

  /* ── Upsert User to public.users ────────────────────────────── */
  // Fixes the foreign key issue without requiring the user to logout/login
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const { error: upsertError } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email!,
    full_name: fullName,
  }, { onConflict: 'id' });
  if (upsertError) console.error('[dashboard] user upsert failed:', upsertError.message);

  /* ── Get all upcoming scheduled trips ──────────────── */
  const today = new Date().toISOString().split('T')[0];

  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .eq('status', 'scheduled')
    .gte('trip_date', today)
    .order('trip_date', { ascending: true })
    .order('trip_time', { ascending: true });

  if (tripsError) console.error('[dashboard] trips query failed:', tripsError.code, tripsError.message);

  /* ── Resolve searchParams to find active trip ────────────────── */
  // Next 15 requires await on searchParams, Next 14 does not. This pattern works for both if we treat it carefully,
  // but standard Next.js approach is just awaiting it in 15. Let's safely resolve it.
  const resolvedSearchParams = await props.searchParams;
  const queryTripId = resolvedSearchParams?.tripId as string | undefined;

  const activeTripId = queryTripId || (trips && trips.length > 0 ? trips[0].id : null);
  const activeTrip = trips?.find((t) => t.id === activeTripId) || null;

  /* ── Bookings for active trip ────────────────── */
  const { data: bookings } = activeTrip
    ? await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', activeTrip.id)
    : { data: [] };

  /* ── Route for active trip ──────────────────────────────────── */
  let route: Route | null = null;
  if (activeTrip?.route_id) {
    const { data } = await supabase
      .from('routes')
      .select('*')
      .eq('id', activeTrip.route_id)
      .maybeSingle();
    route = data;
  }

  /* ── Rate: prefer trip-level rate, fall back to global settings ── */
  const tripRate = (activeTrip as (Trip & { rate?: number }) | null)?.rate ?? null;
  const { data: settings } = await supabase
    .from('settings')
    .select('rate')
    .eq('id', 1)
    .maybeSingle();
  const rate = tripRate ?? settings?.rate ?? null;

  /* ── Display name from Google OAuth or email ────────────────── */
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
            initialBookings={(bookings as Booking[]) ?? []}
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
