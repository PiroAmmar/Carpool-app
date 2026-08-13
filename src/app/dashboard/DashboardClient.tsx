'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { SeatMap } from '@/components/SeatMap';
import { BookingModal } from '@/components/BookingModal';
import { RouteDisplay } from '@/components/RouteDisplay';
import { ContactCard } from '@/components/ContactCard';
import type { Trip, Booking, Route } from '@/types';

interface DashboardClientProps {
  trip: Trip | null;
  initialBookings: Booking[];
  route: Route | null;
  currentUserId: string;
  userName: string;
  rate?: number | null;
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

export function DashboardClient({ trip, initialBookings, route, currentUserId, userName, rate }: DashboardClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  /* ── Reset bookings when trip changes (fixes stale approval across trips) ── */
  useEffect(() => {
    setBookings(initialBookings);
    setSelectedSeat(null);
    setBookingError(null);
  }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Periodic & Realtime Sync ──────────────────────────────────── */
  useEffect(() => {
    if (!trip) return;

    // Fast fallback poll to guarantee bulletproof sync across devices
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
    // Return the most recently created rejected booking if no active booking exists
    return [...userBookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }, [bookings, currentUserId]);

  const canBook = useMemo(() => {
    if (!trip || trip.status !== 'scheduled') return false;
    return !myBooking || myBooking.status === 'rejected';
  }, [trip, myBooking]);

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

    setBookings(prev => {
      const filtered = prev.filter(b => b.user_id !== currentUserId || b.trip_id !== trip.id);
      return [...filtered, optimistic];
    });
    setSelectedSeat(null);

    // Delete any existing booking row for (trip_id, user_id) so insert never hits unique constraint
    await supabase
      .from('bookings')
      .delete()
      .eq('trip_id', trip.id)
      .eq('user_id', currentUserId);

    const { data, error } = await supabase
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
      console.error('[dashboard] booking request failed:', error.message);
      setBookings(prev => prev.filter(b => b.id !== optimisticId));
      setBookingError(error.message || 'Failed to submit booking request.');
    } else if (data) {
      setBookings(prev => prev.map(b => b.id === optimisticId ? (data as Booking) : b));
    }
  }

  function handleBookClick() {
    if (!trip || !canBook) return;
    const occupied = new Set(activeBookings.map((b) => b.seat_number));
    for (let i = 1; i <= seatsTotal; i++) {
      if (!occupied.has(i)) {
        setSelectedSeat(i);
        return;
      }
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col flex-1 pb-6">

      {/* ── Page-wide Trip Completed / Cancelled Disclaimer ───────── */}
      {trip && trip.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ willChange: 'transform, opacity' }}
          className="mt-4 mb-3 w-full rounded-2xl border border-chrome/20 bg-panel px-6 py-5 shadow-2xl text-center flex flex-col items-center justify-center gap-1.5"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-chrome/50" />
            <span className="font-mono text-xs uppercase tracking-widest text-warmwhite/60 font-bold">
              Trip Status
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-warmwhite">
            Trip Completed!
          </h2>
          <p className="text-xs text-warmwhite/50 max-w-xs">
            This ride has finished. New seat bookings are closed for this trip.
          </p>
        </motion.div>
      )}

      {trip && trip.status === 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ willChange: 'transform, opacity' }}
          className="mt-4 mb-3 w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-5 shadow-2xl text-center flex flex-col items-center justify-center gap-1.5"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="font-mono text-xs uppercase tracking-widest text-rose-400 font-bold">
              Trip Status
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-warmwhite">
            Trip Cancelled
          </h2>
          <p className="text-xs text-warmwhite/60 max-w-xs">
            This trip was cancelled by the driver.
          </p>
        </motion.div>
      )}

      {/* ── Booking status panel — in dashboard, above rate ─────── */}
      <AnimatePresence mode="wait">
        {trip && myBooking && (
          <motion.div
            key={`booking-panel-${trip.id}`}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
            style={{ willChange: 'transform, opacity' }}
            className={`mt-4 mb-2 rounded-2xl border px-5 py-4 shadow-xl ${myBooking.status === 'approved'
              ? 'border-emerald-500/40 bg-emerald-500/[0.12] text-emerald-400'
              : myBooking.status === 'rejected'
                ? 'border-rose-500/40 bg-rose-500/[0.12] text-rose-400'
                : 'border-signal-amber/30 bg-signal-amber/10 text-signal-amber'
              }`}
          >
            {myBooking.status === 'approved' ? (
              <div className="flex flex-col items-center text-center space-y-1.5 py-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400/80">Approved</span>
                <span className="text-4xl font-extrabold font-mono text-white tracking-tight drop-shadow-md">
                  {formatTime12h(myBooking.approved_time)}
                </span>
                <span className="text-sm font-medium text-white/80 bg-black/20 px-3 py-1 rounded-full">
                  Seat {myBooking.seat_number}
                </span>
                {myBooking.pickup_location && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300/75 font-mono">
                    <span className="opacity-60">↑</span>
                    <span>{myBooking.pickup_location}</span>
                  </div>
                )}
              </div>
            ) : myBooking.status === 'rejected' ? (
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm opacity-80 bg-black/10 px-2 py-0.5 rounded w-max">
                    Seat {myBooking.seat_number}
                  </span>
                  <p className="font-semibold tracking-tight text-[15px]">Request Declined</p>
                  <p className="text-xs opacity-70 mt-0.5">Sorry for the inconvenience.</p>
                </div>
                <button
                  onClick={handleBookClick}
                  className="px-3.5 py-1.5 rounded-full bg-accent-red text-white text-xs font-bold hover:bg-accent-red/90 transition-colors uppercase flex-shrink-0 ml-4 shadow-lg shadow-accent-red/20"
                >
                  Re-book Seat
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm opacity-80 bg-black/10 px-2 py-0.5 rounded w-max">
                    Seat {myBooking.seat_number}
                  </span>
                  <p className="font-semibold tracking-tight text-[15px]">Pending approval</p>
                  {myBooking.pickup_location && (
                    <p className="text-xs font-mono opacity-70 mt-0.5">↑ {myBooking.pickup_location}</p>
                  )}
                </div>
                <div className="animate-pulse h-2.5 w-2.5 rounded-full bg-signal-amber shadow-[0_0_8px_rgba(224,165,38,0.6)] flex-shrink-0 ml-4" />
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

      {/* ── Seat map + info — seat map on right ──────────────── */}
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

            {/* Right column: car seat map — explicit width anchors the flex slot */}
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

      {/* ── Sticky CTA — only shown when not yet booked ─────── */}
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
  );
}
