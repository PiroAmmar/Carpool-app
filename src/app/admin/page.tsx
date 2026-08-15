import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HudBar } from '@/components/HudBar';
import { Sidebar } from '@/components/Sidebar';
import { AdminClient } from './AdminClient';
import type { Trip, Booking, Route } from '@/types';

interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string;
  created_at: string;
}

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const envAdmin = (process.env.ADMIN_EMAIL ?? '').toLowerCase().trim();
  const ADMIN_EMAILS = [
    'piroammar388@gmail.com',
    'ammarcarpool@gmail.com',
    ...(envAdmin ? envAdmin.split(',').map((e) => e.trim()) : []),
  ];
  const userEmail = (user.email ?? '').toLowerCase();
  const isAdminEmail = ADMIN_EMAILS.includes(userEmail);

  /* ── Parallel Data Fetching for Admin Dashboard ──────────────── */
  const [
    tripsRes,
    bookingsRes,
    routesRes,
    usersRes,
    settingsRes,
    userProfileRes,
  ] = await Promise.all([
    supabase
      .from('trips')
      .select('*')
      .order('trip_date', { ascending: false })
      .order('trip_time', { ascending: false }),

    supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false }),

    supabase
      .from('settings')
      .select('rate')
      .eq('id', 1)
      .maybeSingle(),

    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const isAdmin = isAdminEmail || userProfileRes.data?.role === 'admin';
  if (!isAdmin) {
    redirect('/dashboard');
  }

  const trips = (tripsRes.data as Trip[]) ?? [];
  const bookings = (bookingsRes.data as Booking[]) ?? [];
  const routes = (routesRes.data as Route[]) ?? [];
  const users = (usersRes.data as UserRecord[]) ?? [];
  const rate = settingsRes.data?.rate ?? null;

  const userName: string =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Admin';

  return (
    <main className="min-h-screen bg-asphalt flex flex-col items-center relative overflow-hidden">
      <Sidebar
        userName={userName}
        trips={trips}
        bookings={bookings}
        activeTripId={trips.length > 0 ? trips[0].id : null}
        isAdmin={true}
      />

      <div className="w-full max-w-2xl flex-1 flex flex-col relative z-0">
        <HudBar rate={rate} />
        <div className="px-6 py-6 flex flex-col flex-1">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-accent-red uppercase font-bold">
                Admin Control Panel
              </p>
              <h1 className="text-xl font-bold text-warmwhite">
                Ammar FAST Carpool Operations
              </h1>
            </div>
          </div>

          <AdminClient
            initialTrips={trips}
            initialBookings={bookings}
            initialRoutes={routes}
            initialUsers={users}
            initialRate={rate}
            currentUserId={user.id}
          />
        </div>
      </div>
    </main>
  );
}
