import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HudBar } from '@/components/HudBar';
import { DashboardClient } from './DashboardClient';
import type { Trip, Booking, Route } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  /* ── Active trip: next upcoming scheduled trip ──────────────── */
  const today = new Date().toISOString().split('T')[0];

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('status', 'scheduled')
    .gte('trip_date', today)
    .order('trip_date', { ascending: true })
    .order('trip_time', { ascending: true })
    .maybeSingle();

  if (tripError) console.error('[dashboard] trips query failed:', tripError.code, tripError.message);

  /* ── Bookings for active trip (non-rejected) ────────────────── */
  const { data: bookings } = trip
    ? await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', trip.id)
        .neq('status', 'rejected')
    : { data: [] };

  /* ── Route for active trip ──────────────────────────────────── */
  let route: Route | null = null;
  if (trip?.route_id) {
    const { data } = await supabase
      .from('routes')
      .select('*')
      .eq('id', trip.route_id)
      .maybeSingle();
    route = data;
  }

  /* ── Rate: prefer trip-level rate, fall back to global settings ── */
  const tripRate = (trip as (Trip & { rate?: number }) | null)?.rate ?? null;
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
    <main className="min-h-screen flex flex-col bg-asphalt">
      <HudBar rate={rate} />

      <div className="flex-1 mx-auto w-full max-w-sm px-6 py-6 flex flex-col">
        <DashboardClient
          trip={trip as Trip | null}
          initialBookings={(bookings as Booking[]) ?? []}
          route={route}
          currentUserId={user.id}
          userName={userName}
        />
      </div>
    </main>
  );
}
