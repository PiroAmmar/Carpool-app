'use client';

import { startPolling } from '@/lib/poll';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { PullToRefresh } from '@/components/PullToRefresh';
import { LocationBadge } from '@/components/LocationBadge';
import { categoryOf, CATEGORY_LABEL } from '@/lib/tripCategory';
import { fareFor, isTripUpcoming } from '@/lib/payments';
import type { Trip, Booking, Route } from '@/types';

interface TripsClientProps {
  initialBookings: Booking[];
  initialTrips: Trip[];
  routes: Route[];
  globalRate: number | null;
  currentUserId: string;
}

type Filter = 'all' | 'upcoming' | 'past' | 'unpaid';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'unpaid', label: 'Unpaid' },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime12h(timeString: string | null) {
  if (!timeString) return '';
  try {
    const [h, m] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return timeString;
  }
}

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-US')}`;
}

function bookingBadge(b: Booking, trip: Trip | undefined) {
  if (trip?.status === 'cancelled') return { label: 'Trip cancelled', className: 'bg-white/5 text-warmwhite/40 border-white/10' };
  if (b.status === 'rejected') return { label: 'Rejected', className: 'bg-accent-red/15 text-accent-red border-accent-red/30' };
  if (b.status === 'pending') return { label: 'Awaiting approval', className: 'bg-signal-amber/15 text-signal-amber border-signal-amber/30' };
  if (b.payment_status === 'paid') {
    const method = b.payment_method ? ` · ${b.payment_method}` : '';
    return { label: `Paid${method}`, className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  }
  if (b.payment_status === 'waived') return { label: 'Waived', className: 'bg-chrome/10 text-chrome border-chrome/25' };
  if (trip && isTripUpcoming(trip)) return { label: 'Upcoming', className: 'bg-chrome/10 text-chrome border-chrome/20' };
  return { label: 'Unpaid', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
}

export function TripsClient({
  initialBookings,
  initialTrips,
  routes,
  globalRate,
  currentUserId,
}: TripsClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [filter, setFilter] = useState<Filter>('all');

  const supabase = useMemo(() => createClient(), []);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  /* ── Sync: own bookings + the trips they belong to ──────────────── */
  useEffect(() => {
    const fetchLatest = async () => {
      const { data: bData } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      if (!bData) return;
      setBookings(bData as Booking[]);

      const tripIds = [...new Set((bData as Booking[]).map((b) => b.trip_id))];
      if (tripIds.length === 0) {
        setTrips([]);
        return;
      }
      const { data: tData } = await supabase.from('trips').select('*').in('id', tripIds);
      if (tData) setTrips(tData as Trip[]);
    };

    refreshRef.current = fetchLatest;
    const stopPolling = startPolling(fetchLatest);

    // Payment status / method changes land here the moment the admin marks them.
    const bookingsChannel = supabase
      .channel('my-trips-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedB = payload.new as Booking;
            setBookings((prev) => [updatedB, ...prev.filter((b) => b.id !== updatedB.id)]);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<Booking>).id;
            setBookings((prev) => prev.filter((b) => b.id !== deletedId));
          }
        }
      )
      .subscribe();

    const tripsChannel = supabase
      .channel('my-trips-trips')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips' },
        (payload) => {
          const updatedT = payload.new as Trip;
          setTrips((prev) => prev.map((t) => (t.id === updatedT.id ? updatedT : t)));
        }
      )
      .subscribe();

    return () => {
      stopPolling();
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(tripsChannel);
    };
  }, [supabase, currentUserId]);

  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);
  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  /* ── Payment stats ─────────────────────────────────────────────── */
  // Only approved bookings carry a charge. Upcoming trips are kept out
  // of the balance until the ride has actually happened.
  const stats = useMemo(() => {
    let balance = 0, paid = 0, waived = 0, upcomingDue = 0, online = 0, cash = 0;
    let balanceCount = 0, paidCount = 0, waivedCount = 0, upcomingCount = 0, ridesTaken = 0;
    const outstanding: { booking: Booking; trip: Trip; amount: number }[] = [];

    for (const b of bookings) {
      const trip = tripById.get(b.trip_id);
      if (b.status !== 'approved' || !trip) continue;
      const amount = fareFor(b, trip, globalRate);
      const upcoming = isTripUpcoming(trip);
      if (!upcoming && trip.status !== 'cancelled') ridesTaken++;

      if (b.payment_status === 'paid') {
        paid += amount; paidCount++;
        if (b.payment_method === 'online') online += amount;
        else if (b.payment_method === 'cash') cash += amount;
      } else if (b.payment_status === 'waived') {
        waived += amount; waivedCount++;
      } else if (upcoming) {
        upcomingDue += amount; upcomingCount++;
      } else {
        balance += amount; balanceCount++;
        outstanding.push({ booking: b, trip, amount });
      }
    }

    outstanding.sort((a, b) =>
      `${a.trip.trip_date} ${a.trip.trip_time}`.localeCompare(`${b.trip.trip_date} ${b.trip.trip_time}`)
    );

    return {
      balance, paid, waived, upcomingDue, online, cash,
      balanceCount, paidCount, waivedCount, upcomingCount, ridesTaken,
      outstanding,
    };
  }, [bookings, tripById, globalRate]);

  /* ── History list ──────────────────────────────────────────────── */
  const history = useMemo(() => {
    const rows = bookings
      .map((b) => ({ booking: b, trip: tripById.get(b.trip_id) }))
      .filter((r): r is { booking: Booking; trip: Trip } => Boolean(r.trip));

    const filtered = rows.filter(({ booking, trip }) => {
      const upcoming = isTripUpcoming(trip);
      if (filter === 'upcoming') return upcoming;
      if (filter === 'past') return !upcoming;
      if (filter === 'unpaid') {
        return booking.status === 'approved' && booking.payment_status === 'pending' && !upcoming;
      }
      return true;
    });

    return filtered.sort((a, b) =>
      `${b.trip.trip_date} ${b.trip.trip_time}`.localeCompare(`${a.trip.trip_date} ${a.trip.trip_time}`)
    );
  }, [bookings, tripById, filter]);

  return (
    <main className="min-h-screen bg-asphalt flex flex-col items-center relative overflow-hidden">
      <PullToRefresh onRefresh={() => refreshRef.current()} />

      <div className="w-full max-w-sm flex-1 flex flex-col relative z-0">
        <header className="relative flex items-center justify-between px-4 py-3.5 border-b border-chrome/10 w-full">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-warmwhite/50 hover:text-warmwhite transition-colors flex-shrink-0"
            aria-label="Back to rides"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <span className="text-sm font-semibold text-chrome tracking-tight truncate text-center mx-auto px-2">
            My Trips &amp; Payments
          </span>
          <div className="w-9 flex-shrink-0" aria-hidden="true" />
        </header>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* ── Balance ─────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-5 ${
              stats.balance > 0
                ? 'border-signal-amber/30 bg-signal-amber/10 shadow-[0_4px_16px_rgba(224,165,38,0.08)]'
                : 'border-emerald-500/25 bg-emerald-500/10'
            }`}
          >
            <p className="font-mono text-[10px] tracking-widest uppercase text-warmwhite/50">Pending balance</p>
            <p className={`mt-1 font-mono text-3xl font-bold ${stats.balance > 0 ? 'text-signal-amber' : 'text-emerald-400'}`}>
              {formatRs(stats.balance)}
            </p>
            <p className="mt-1 text-xs text-warmwhite/50">
              {stats.balance > 0
                ? `${stats.balanceCount} unpaid ${stats.balanceCount === 1 ? 'ride' : 'rides'}`
                : 'All settled — nothing to pay'}
            </p>
            {stats.upcomingCount > 0 && (
              <p className="mt-3 pt-3 border-t border-white/10 text-[11px] font-mono text-warmwhite/45">
                + {formatRs(stats.upcomingDue)} for {stats.upcomingCount} upcoming{' '}
                {stats.upcomingCount === 1 ? 'ride' : 'rides'} (due after the ride)
              </p>
            )}
          </motion.section>

          {/* ── Stats ───────────────────────────────────────────── */}
          <section className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
              <p className="font-mono text-sm font-bold text-emerald-400">{formatRs(stats.paid)}</p>
              <p className="text-[10px] text-warmwhite/50 mt-0.5">Paid ({stats.paidCount})</p>
            </div>
            <div className="rounded-lg border border-chrome/20 bg-chrome/5 px-3 py-2.5">
              <p className="font-mono text-sm font-bold text-chrome">{stats.ridesTaken}</p>
              <p className="text-[10px] text-warmwhite/50 mt-0.5">Rides taken</p>
            </div>
            <div className="rounded-lg border border-chrome/20 bg-chrome/5 px-3 py-2.5">
              <p className="font-mono text-sm font-bold text-chrome">{formatRs(stats.waived)}</p>
              <p className="text-[10px] text-warmwhite/50 mt-0.5">Waived ({stats.waivedCount})</p>
            </div>
            <div className="rounded-lg border border-chrome/20 bg-chrome/5 px-3 py-2.5">
              <p className="font-mono text-[11px] font-bold text-warmwhite/80 leading-5">
                Cash {formatRs(stats.cash)}
                <br />
                Online {formatRs(stats.online)}
              </p>
              <p className="text-[10px] text-warmwhite/50 mt-0.5">Paid by method</p>
            </div>
          </section>

          {/* ── Outstanding ─────────────────────────────────────── */}
          {stats.outstanding.length > 0 && (
            <section>
              <p className="font-mono text-[10px] tracking-widest uppercase text-warmwhite/40 mb-2">
                Outstanding ({stats.outstanding.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {stats.outstanding.map(({ booking, trip, amount }) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-panel px-3 py-2"
                  >
                    <span className="text-xs text-warmwhite/80 truncate">
                      {formatDate(trip.trip_date)} · {CATEGORY_LABEL[categoryOf(trip.direction)]}
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-400 flex-shrink-0">{formatRs(amount)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── History ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <p className="font-mono text-[10px] tracking-widest uppercase text-warmwhite/40">
                Trip history ({history.length})
              </p>
            </div>

            <div className="flex gap-1.5 mb-3 overflow-x-auto" role="tablist" aria-label="Filter trips">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 rounded-full border text-[11px] font-mono font-semibold transition-colors flex-shrink-0 ${
                    filter === f.id
                      ? 'bg-warmwhite text-asphalt border-warmwhite'
                      : 'bg-transparent text-warmwhite/50 border-chrome/15 hover:text-warmwhite/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-warmwhite/35 font-mono py-8 text-center">
                {bookings.length === 0 ? 'You haven’t booked any trips yet.' : 'No trips match this filter.'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map(({ booking: b, trip }) => {
                  const route = trip.route_id ? routeById.get(trip.route_id) : undefined;
                  const category = categoryOf(trip.direction);
                  const badge = bookingBadge(b, trip);
                  const charged = b.status === 'approved' && trip.status !== 'cancelled';
                  const location = category === 'campus_to_home' ? b.dropoff_location : b.pickup_location;

                  return (
                    <div key={b.id} className="rounded-xl border border-chrome/10 bg-panel px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-warmwhite">
                            {formatDate(trip.trip_date)} · {formatTime12h(trip.trip_time)}
                          </p>
                          <p className="text-[11px] text-warmwhite/50 font-mono truncate mt-0.5">
                            {CATEGORY_LABEL[category]}
                            {route?.name ? ` · ${route.name}` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase flex-shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <LocationBadge location={location} size="sm" />
                        <span className="text-[11px] font-mono text-warmwhite/50 flex-shrink-0 ml-auto">
                          Seat {b.seat_number}
                          {charged && (
                            <>
                              {' · '}
                              <span className="text-warmwhite/85 font-semibold">{formatRs(fareFor(b, trip, globalRate))}</span>
                            </>
                          )}
                        </span>
                      </div>

                      {b.status === 'approved' && (b.approved_time || b.free_by_time || b.admin_message) && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-0.5 text-[11px] text-warmwhite/50">
                          {b.approved_time && <p>Pickup at {formatTime12h(b.approved_time)}</p>}
                          {b.free_by_time && <p>Free by {b.free_by_time}</p>}
                          {b.admin_message && <p className="text-warmwhite/65">“{b.admin_message}”</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
