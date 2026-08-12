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

function formatTime12h(timeString: string | null) {
  if (!timeString) return 'TBD';
  try {
    const [h, m] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (e) {
    return timeString;
  }
}

export function DashboardClient({ trip, initialBookings, route, currentUserId, userName, rate }: DashboardClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  /* ── Realtime: subscribe to booking changes on this trip ──────── */
  useEffect(() => {
    if (!trip) return;

    const channel = supabase
      .channel(`trip-bookings-${trip.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          const newB = payload.new as Booking;
          setBookings(prev => {
            // If we already have this id (from optimistic update), replace it
            const exists = prev.some(b => b.id === newB.id);
            return exists ? prev.map(b => b.id === newB.id ? newB : b) : [...prev, newB];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `trip_id=eq.${trip.id}` },
        (payload) => {
          const updatedB = payload.new as Booking;
          setBookings(prev => prev.map(b => b.id === updatedB.id ? updatedB : b));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bookings' },
        (payload) => {
          const deletedId = (payload.old as Partial<Booking>).id;
          setBookings(prev => prev.filter(b => b.id !== deletedId));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, trip]);

  /* ── Derived state ────────────────────────────────────────────── */
  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'rejected'), [bookings]);
  const seatsTotal = trip?.seats_total ?? 4;
  const seatsOpen = useMemo(() => seatsTotal - activeBookings.length, [seatsTotal, activeBookings.length]);
  const myBooking = useMemo(() => activeBookings.find(b => b.user_id === currentUserId), [activeBookings, currentUserId]);
  const hasBooked = !!myBooking;

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

    // Optimistic update
    setBookings(prev => [...prev, optimistic]);
    setSelectedSeat(null);

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
      console.error('[dashboard] booking insert failed:', error.message);
      // Rollback
      setBookings(prev => prev.filter(b => b.id !== optimisticId));
      setBookingError(error.message || 'Failed to book seat. Please try again.');
      return;
    }

    setBookingError(null);

    // Swap optimistic placeholder for real row
    setBookings(prev =>
      prev.map(b => b.id === optimisticId ? (data as Booking) : b)
    );
  }

  function handleBookClick() {
    // Find first available seat number
    const occupied = new Set(activeBookings.map(b => b.seat_number));
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

      {/* Rate Display */}
      {rate !== null && (
        <div className="mb-6 mt-4 flex flex-col items-center text-center py-2">
          <p className="text-xs text-warmwhite/50 tracking-widest uppercase font-semibold">Trip Rate</p>
          <p className="text-4xl font-mono font-bold text-white mt-1 tracking-tight">
            <span className="text-xl text-warmwhite/60 font-sans tracking-normal align-top mr-1">Rs.</span>
            {rate}
          </p>
        </div>
      )}

      {/* Seat map */}
      <div className="mt-2">
        <SeatMap
          bookings={activeBookings}
          currentUserId={currentUserId}
          seatsTotal={seatsTotal}
        />

        {/* Seat count readout — monospace like a dashboard odometer */}
        <p className="mt-4 text-center font-mono text-sm text-warmwhite/50 bg-chrome/5 py-1.5 px-4 rounded-full w-max mx-auto border border-chrome/10">
          {trip
            ? `${seatsOpen} / ${seatsTotal} seats open`
            : 'No trip scheduled'}
        </p>
      </div>

      {/* Route display */}
      {route && <RouteDisplay stops={route.stops} direction={trip?.direction} />}

      {/* Trip info */}
      {trip ? (
        <div className="mt-12 mb-4 flex flex-col items-center text-center">
          <p className="font-mono text-xs tracking-widest text-warmwhite/40 uppercase mb-1">
            Next trip
          </p>
          <p className="text-lg font-medium text-warmwhite/90">
            {formatTripDateTime(trip.trip_date, trip.trip_time)}
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-chrome/10 bg-panel p-6 text-center">
          <p className="text-sm text-warmwhite/50">No upcoming trip scheduled.</p>
          <p className="mt-1 text-xs text-warmwhite/30">Check back soon.</p>
        </div>
      )}

      {/* Contact card */}
      <div className="mb-56 mt-6">
        <ContactCard />
      </div>

      {/* Sticky Bottom CTA */}
      {trip && (
        <div className="fixed bottom-0 left-0 w-full px-6 py-6 pb-8 bg-asphalt/90 backdrop-blur-xl border-t border-chrome/10 z-10 flex flex-col items-center">
          {/* Error Banner */}
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
            {!hasBooked ? (
              seatsOpen > 0 ? (
                <motion.button
                  onClick={handleBookClick}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full rounded-xl px-4 py-4 text-sm font-bold tracking-wide transition-colors bg-accent-red/90 text-white hover:bg-accent-red shadow-lg shadow-accent-red/20 uppercase"
                >
                  Book a seat
                </motion.button>
              ) : (
                <div className="w-full rounded-xl border border-chrome/20 bg-chrome/10 px-4 py-4 text-sm text-warmwhite/60 text-center font-medium">
                  Trip is fully booked
                </div>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full rounded-2xl border px-5 py-4 text-left shadow-2xl ${
                  myBooking?.status === 'approved'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                    : 'border-signal-amber/30 bg-signal-amber/10 text-signal-amber'
                }`}
              >
                {myBooking?.status === 'approved' ? (
                  <div className="flex flex-col items-center justify-center space-y-1 text-center py-2">
                    <span className="text-xs uppercase tracking-widest font-bold text-emerald-400/80 mb-1">Approved</span>
                    <span className="text-4xl font-extrabold font-mono text-white tracking-tight drop-shadow-md">
                      {formatTime12h(myBooking.approved_time)}
                    </span>
                    <span className="text-sm font-medium mt-2 text-white/80 bg-black/20 px-3 py-1 rounded-full">Seat {myBooking.seat_number}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <span className="font-mono text-sm opacity-80 bg-black/10 px-2 py-0.5 rounded">Seat {myBooking?.seat_number}</span>
                      <p className="font-semibold mt-1.5 tracking-tight text-[15px]">Pending approval</p>
                    </div>
                    <div className="animate-pulse h-2.5 w-2.5 rounded-full bg-signal-amber shadow-[0_0_8px_rgba(224,165,38,0.6)]"></div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Booking modal — portal-style, rendered over everything */}
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
