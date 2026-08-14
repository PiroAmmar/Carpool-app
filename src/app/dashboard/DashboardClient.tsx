'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { SeatMap } from '@/components/SeatMap';
import { BookingModal } from '@/components/BookingModal';
import { RouteDisplay } from '@/components/RouteDisplay';
import { ContactCard } from '@/components/ContactCard';
import { Sidebar } from '@/components/Sidebar';
import { HudBar } from '@/components/HudBar';
import { LocationBadge } from '@/components/LocationBadge';
import type { Trip, Booking, Route } from '@/types';

interface DashboardClientProps {
  initialTrips: Trip[];
  initialRoutes: Route[];
  initialTripId: string | null;
  initialBookings: Booking[];
  currentUserId: string;
  userName: string;
  userWhatsApp?: string | null;
  globalRate?: number | null;
  isAdmin?: boolean;
}

function formatTripDateTime(date: string, time: string): string {
  try {
    const dt = new Date(`${date}T${time}`);
    if (Number.isNaN(dt.getTime())) return `${date} · ${time}`;
    const day = dt.toLocaleDateString('en-US', { weekday: 'short' });
    const t = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} · ${t}`;
  } catch {
    return `${date} · ${time}`;
  }
}

function formatTripDateOnly(dateStr: string): string {
  try {
    const dt = new Date(dateStr);
    if (Number.isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime12h(timeString: string | null) {
  if (!timeString) return 'TBD';
  try {
    const [h, m] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return timeString;
  }
}

export function DashboardClient({
  initialTrips,
  initialRoutes,
  initialTripId,
  initialBookings,
  currentUserId,
  userName,
  userWhatsApp,
  globalRate,
  isAdmin,
}: DashboardClientProps) {
  const [activeTripId, setActiveTripId] = useState<string | null>(
    initialTripId || (initialTrips.length > 0 ? initialTrips[0].id : null)
  );

  const trip = useMemo(
    () => initialTrips.find((t) => t.id === activeTripId) || initialTrips[0] || null,
    [initialTrips, activeTripId]
  );

  const route = useMemo(() => {
    if (!trip?.route_id) return null;
    return initialRoutes.find((r) => r.id === trip.route_id) || null;
  }, [initialRoutes, trip]);

  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  /* ── Reset bookings when trip changes (instant switch + immediate fetch) ── */
  useEffect(() => {
    if (!trip) return;
    setSelectedSeat(null);
    setBookingError(null);

    if (trip.id === initialTripId) {
      setBookings(initialBookings);
    } else {
      supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', trip.id)
        .then(({ data }) => {
          if (data) setBookings(data as Booking[]);
        });
    }
  }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Periodic & Realtime Sync ──────────────────────────────────── */
  useEffect(() => {
    if (!trip) return;

    // Fast fallback poll for live sync
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', trip.id);
      if (data) {
        setBookings(data as Booking[]);
      }
    };

    const interval = setInterval(fetchLatest, 2500);

    const channel = supabase
      .channel(`trip-bookings-${trip.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedB = payload.new as Booking;
            setBookings((prev) => {
              const filtered = prev.filter(
                (b) => b.id !== updatedB.id && !(b.user_id?.toLowerCase() === updatedB.user_id?.toLowerCase() && b.trip_id === updatedB.trip_id)
              );
              return [...filtered, updatedB];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<Booking>).id;
            setBookings((prev) => prev.filter((b) => b.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase, trip?.id]);

  /* ── Derived state ────────────────────────────────────────────── */
  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'rejected'), [bookings]);
  const seatsTotal = trip?.seats_total ?? 4;
  const seatsOpen = useMemo(() => seatsTotal - activeBookings.length, [seatsTotal, activeBookings.length]);

  // Find the user's booking. Prioritize active (approved/pending) over rejected.
  const myBooking = useMemo(() => {
    const uid = currentUserId?.toLowerCase();
    const userBookings = bookings.filter(b => b.user_id?.toLowerCase() === uid);
    if (userBookings.length === 0) return undefined;
    const active = userBookings.find(b => b.status !== 'rejected');
    if (active) return active;
    return [...userBookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }, [bookings, currentUserId]);

  const canBook = useMemo(() => {
    if (!trip || trip.status !== 'scheduled') return false;
    return !myBooking || myBooking.status === 'rejected';
  }, [trip, myBooking]);

  const tripRate = (trip as (Trip & { rate?: number }) | null)?.rate ?? null;
  const rate = tripRate ?? globalRate ?? null;

  /* ── Booking flow ─────────────────────────────────────────────── */
  async function handleBook(seatNumber: number, pickupLocation: string) {
    if (!trip) return;

    const optimisticId = `opt-${Date.now()}`;
    const optimistic: Booking = {
      id: optimisticId,
      trip_id: trip.id,
      user_id: currentUserId,
      seat_number: seatNumber,
      pickup_location: pickupLocation,
      status: 'pending',
      approved_time: null,
      created_at: new Date().toISOString(),
    };

    setBookings((prev) => [...prev.filter((b) => b.id !== myBooking?.id), optimistic]);
    setSelectedSeat(null);
    setBookingError(null);

    // If rebooking over a rejected booking, call dedicated API route
    if (myBooking && myBooking.status === 'rejected') {
      try {
        const res = await fetch('/api/bookings/rebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: myBooking.id,
            seatNumber,
            pickupLocation,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
          setBookingError(json.error || 'Failed to re-book seat.');
          return;
        }

        if (json.booking) {
          setBookings((prev) =>
            prev.map((b) => (b.id === optimisticId ? (json.booking as Booking) : b))
          );
        }
      } catch (err: any) {
        setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
        setBookingError(err.message || 'Network error while re-booking.');
      }
      return;
    }

    // Standard initial booking insert
    const { data: newBooking, error } = await supabase
      .from('bookings')
      .insert({
        trip_id: trip.id,
        user_id: currentUserId,
        seat_number: seatNumber,
        pickup_location: pickupLocation,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
      if (error.code === '23505') {
        setBookingError(`Seat ${seatNumber} was just taken. Please choose another seat.`);
      } else {
        setBookingError(error.message);
      }
    } else if (newBooking) {
      setBookings((prev) =>
        prev.map((b) => (b.id === optimisticId ? (newBooking as Booking) : b))
      );
    }
  }

  function handleBookClick() {
    if (!trip || seatsOpen <= 0) return;
    const takenSeats = new Set(activeBookings.map((b) => b.seat_number));
    let firstAvailable = 1;
    while (firstAvailable <= seatsTotal && takenSeats.has(firstAvailable)) {
      firstAvailable++;
    }
    if (firstAvailable <= seatsTotal) {
      setSelectedSeat(firstAvailable);
    }
  }

  return (
    <main className="min-h-screen bg-asphalt flex flex-col items-center relative overflow-hidden">
      <Sidebar
        userName={userName}
        userWhatsApp={userWhatsApp}
        currentUserId={currentUserId}
        trips={initialTrips}
        activeTripId={activeTripId}
        onSelectTrip={(tripId) => {
          setActiveTripId(tripId);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tripId', tripId);
            window.history.replaceState(null, '', url.pathname + url.search);
          }
        }}
        isAdmin={isAdmin}
      />

      <div className="w-full max-w-sm flex-1 flex flex-col relative z-0">
        <HudBar rate={rate} />
        <div className="px-6 py-6 flex flex-col flex-1">
          {/* ── Approval notification card ─────────────────────────── */}
          <AnimatePresence>
            {myBooking && (
              <motion.div
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="mb-4"
              >
                {myBooking.status === 'approved' && (
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 p-4 flex flex-col gap-3 shadow-[0_4px_20px_rgba(16,185,129,0.08)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[10px] tracking-widest text-emerald-400 uppercase font-bold">
                          Ride Confirmed
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-warmwhite">
                          Seat {myBooking.seat_number} — Be ready by{' '}
                          <span className="text-emerald-400 font-mono font-bold">
                            {formatTime12h(myBooking.approved_time)}
                          </span>
                        </p>
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex-shrink-0 ml-3 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                        ✓
                      </div>
                    </div>

                    {myBooking.pickup_location && (
                      <div className="pt-2.5 border-t border-emerald-500/15 flex items-center justify-between">
                        <LocationBadge location={myBooking.pickup_location} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/60 font-medium">
                          Pickup Point
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {myBooking.status === 'rejected' && (
                  <div className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 flex items-center justify-between shadow-lg">
                    <div>
                      <p className="font-mono text-[10px] tracking-widest text-accent-red uppercase font-semibold">
                        Request Declined
                      </p>
                      <p className="mt-0.5 text-xs text-warmwhite/70">
                        Seat {myBooking.seat_number} is no longer available. You can re-book another open seat.
                      </p>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-red/20 text-accent-red text-xs font-bold flex-shrink-0 ml-3">
                      ✕
                    </div>
                  </div>
                )}

                {myBooking.status === 'pending' && (
                  <div className="rounded-xl border border-signal-amber/30 bg-signal-amber/10 p-4 flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[10px] tracking-widest text-signal-amber uppercase font-semibold">
                          Request Pending
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-warmwhite">
                          Seat {myBooking.seat_number} · Waiting for Ammar
                        </p>
                      </div>
                      <div className="animate-pulse h-2.5 w-2.5 rounded-full bg-signal-amber shadow-[0_0_8px_rgba(224,165,38,0.6)] flex-shrink-0 ml-4" />
                    </div>

                    {myBooking.pickup_location && (
                      <div className="pt-2.5 border-t border-signal-amber/15 flex items-center justify-between">
                        <LocationBadge location={myBooking.pickup_location} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-warmwhite/40">
                          Pickup Point
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Rate Display & Current Trip Date ────────────────────── */}
          {rate !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="mb-4 mt-4 flex flex-col items-center text-center py-2"
            >
              <p className="text-xs text-warmwhite/50 tracking-widest uppercase font-semibold">Trip Rate</p>
              <p className="text-4xl font-mono font-bold text-white mt-1 tracking-tight">
                <span className="text-xl text-warmwhite/60 font-sans tracking-normal align-top mr-1">Rs.</span>
                {rate}
              </p>

              {/* Current Trip Date displayed below Trip rate */}
              {trip && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-chrome/15 bg-panel px-3.5 py-1 shadow-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-red">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span className="font-mono text-xs font-medium text-warmwhite/80">
                    {formatTripDateOnly(trip.trip_date)}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Seat map + info ──────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
            style={{ willChange: 'transform, opacity' }}
            className="mt-2 bezel-shell"
          >
            <div className="bezel-core py-6 px-4">
              <div className="flex items-center gap-4">
                {/* Left column: seat count + depart time */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <p className="font-mono text-xs text-warmwhite/60 bg-chrome/5 py-1.5 px-3 rounded-full border border-chrome/10 text-center">
                    {trip ? (seatsOpen === 0 ? 'No Seats' : `${seatsOpen} / ${seatsTotal} open`) : 'No Seats'}
                  </p>
                  {trip && (
                    <div className="text-center">
                      <p className="font-mono text-[9px] tracking-widest text-warmwhite/50 uppercase mb-1">
                        Reaching/Departing Campus Time
                      </p>
                      <p className="text-sm font-medium text-warmwhite/90 leading-snug">
                        {formatTripDateTime(trip.trip_date, trip.trip_time)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right column: car seat map */}
                <div className="flex-shrink-0 w-[140px]">
                  <SeatMap
                    bookings={activeBookings}
                    currentUserId={currentUserId}
                    seatsTotal={seatsTotal}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Route display ────────────────────────────────────── */}
          {route && <RouteDisplay stops={route.stops} direction={trip?.direction} />}

          {/* ── No trip fallback ─────────────────────────────────── */}
          {!trip && (
            <div className="mt-8 rounded-xl border border-chrome/10 bg-panel p-6 text-center">
              <p className="text-sm text-warmwhite/50">No upcoming trip scheduled.</p>
              <p className="mt-1 text-xs text-warmwhite/30">Check back soon.</p>
            </div>
          )}

          {/* ── Contact card ─────────────────────────────────────── */}
          <div className="mb-28 mt-6">
            <ContactCard />
          </div>

          {/* ── Sticky CTA ────────────────────────────────────────── */}
          {trip && canBook && (
            <div className="fixed bottom-0 left-0 w-full px-6 py-6 pb-8 bg-asphalt/90 border-t border-chrome/10 z-10 flex flex-col items-center">
              <AnimatePresence>
                {bookingError && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm mb-3 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2.5 text-xs text-accent-red text-center flex items-center justify-between shadow-lg"
                  >
                    <span>{bookingError}</span>
                    <button onClick={() => setBookingError(null)} className="ml-2 opacity-60 hover:opacity-100 uppercase font-mono tracking-wider font-semibold">Dismiss</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full max-w-sm">
                {seatsOpen > 0 ? (
                  <motion.button
                    onClick={handleBookClick}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                    className="group w-full flex items-center justify-between rounded-xl pl-5 pr-2 py-2 text-sm font-bold tracking-wide bg-accent-red/90 text-white hover:bg-accent-red shadow-lg shadow-accent-red/20 uppercase"
                  >
                    {myBooking?.status === 'rejected' ? 'Re-book a seat' : 'Book a seat'}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/15 transition-transform duration-160 ease-out group-hover:translate-x-0.5 group-active:scale-95">
                      →
                    </span>
                  </motion.button>
                ) : (
                  <div className="w-full rounded-xl border border-chrome/20 bg-chrome/10 px-4 py-4 text-sm text-warmwhite/60 text-center font-medium">
                    Trip is fully booked
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Booking modal ─────────────────────────────────────── */}
          <AnimatePresence>
            {selectedSeat !== null && (
              <BookingModal
                key="booking-modal"
                seatNumber={selectedSeat}
                onConfirm={handleBook}
                onCancel={() => setSelectedSeat(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
