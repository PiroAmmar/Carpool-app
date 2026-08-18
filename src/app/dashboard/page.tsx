import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';
import type { Trip, Booking, Route } from '@/types';

export default async function DashboardPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date().toISOString().split('T')[0];
  const envAdmin = (process.env.ADMIN_EMAIL ?? '').toLowerCase().trim();
  const ADMIN_EMAILS = [
    'piroammar388@gmail.com',
    'ammarcarpool@gmail.com',
    ...(envAdmin ? envAdmin.split(',').map((e) => e.trim()) : []),
  ];
  const userEmail = (user.email ?? '').toLowerCase();
  const isAdminEmail = ADMIN_EMAILS.includes(userEmail);

  /* ── Parallel Single-Batch Queries for Instant Loading ──────────────── */
  const [
    tripsRes,
    routesRes,
    settingsRes,
    userProfileRes,
    bookingsRes,
    resolvedSearchParams,
  ] = await Promise.all([
    supabase
      .from('trips')
      .select('*')
      .eq('status', 'scheduled')
      .gte('trip_date', today)
      .order('trip_date', { ascending: true })
      .order('trip_time', { ascending: true }),

    supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('settings')
      .select('rate')
      .eq('id', 1)
      .maybeSingle(),

    supabase
      .from('users')
      .select('role, whatsapp, phone, custom_rate')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false }),

    props.searchParams,
  ]);

  const isAdmin = isAdminEmail || userProfileRes.data?.role === 'admin';
  const queryView = resolvedSearchParams?.view as string | undefined;

  // Redirect admin users to Admin Dashboard unless explicitly viewing passenger view
  if (isAdmin && queryView !== 'passenger') {
    redirect('/admin');
  }

  const trips = (tripsRes.data as Trip[]) ?? [];
  const routes = (routesRes.data as Route[]) ?? [];
  const bookings = (bookingsRes.data as Booking[]) ?? [];
  const queryTripId = resolvedSearchParams?.tripId as string | undefined;
  const initialTripId = queryTripId || (trips.length > 0 ? trips[0].id : null);

  const userName: string =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Passenger';

  const userWhatsApp = userProfileRes.data?.whatsapp || userProfileRes.data?.phone || null;
  const globalRate = settingsRes.data?.rate ?? null;
  const userCustomRate = (userProfileRes.data?.custom_rate as number | null | undefined) ?? null;

  return (
    <DashboardClient
      initialTrips={trips}
      initialRoutes={routes}
      initialTripId={initialTripId}
      initialBookings={bookings}
      currentUserId={user.id}
      currentUserEmail={user.email ?? ''}
      userName={userName}
      userWhatsApp={userWhatsApp}
      globalRate={globalRate}
      userCustomRate={userCustomRate}
      isAdmin={isAdmin}
    />
  );
}
