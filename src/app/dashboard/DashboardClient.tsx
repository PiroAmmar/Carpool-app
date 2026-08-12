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
}

function formatTripDateTime(date: string, time: string): string {
  // Combine into a local datetime string the browser can parse
  const dt = new Date(`${date}T${time}`);
  const day = dt.toLocaleDateString('en-US', { weekday: 'short' });
  const t = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} · ${t}`;
}

export function DashboardClient({ trip, initialBookings, route, currentUserId, userName }: DashboardClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [bookingMode, setBookingMode] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

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
  const activeBookings = bookings.filter(b => b.status !== 'rejected');
  const seatsTotal = trip?.seats_total ?? 4;
  const seatsOpen = seatsTotal - activeBookings.length;
  const myBooking = activeBookings.find(b => b.user_id === currentUserId);
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

    // Optimistic update — seat turns amber immediately
    setBookings(prev => [...prev, optimistic]);
    setSelectedSeat(null);
    setBookingMode(false);

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
      // Rollback — seat reverts to gray
      setBookings(prev => prev.filter(b => b.id !== optimisticId));
      return;
    }

    // Swap optimistic placeholder for real row
    setBookings(prev =>
      prev.map(b => b.id === optimisticId ? (data as Booking) : b)
    );
  }

  function handleSeatClick(seatNumber: number) {
    if (!bookingMode || hasBooked) return;
    setSelectedSeat(seatNumber);
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col flex-1 pb-6">

      {/* Welcome greeting */}
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-warmwhite">
          Welcome back, {userName.split(' ')[0]}
        </h1>
        <p className="mt-0.5 text-xs text-warmwhite/35 font-mono">
          Signed in as&nbsp;{userName}
        </p>
      </div>

      {/* Seat map */}
      <div className="mt-4">
        <SeatMap
          bookings={activeBookings}
          currentUserId={currentUserId}
          seatsTotal={seatsTotal}
          onSeatClick={handleSeatClick}
          isBookingMode={bookingMode && !hasBooked}
        />

        {/* Seat count readout — monospace like a dashboard odometer */}
        <p className="mt-3 text-center font-mono text-sm text-warmwhite/45">
          {trip
            ? `${seatsOpen} / ${seatsTotal} seats open`
            : 'No trip scheduled'}
        </p>
      </div>

      {/* Route display */}
      {route && <RouteDisplay stops={route.stops} />}

      {/* Trip info + CTA */}
      {trip ? (
        <div className="mt-6 text-center">
          <p className="font-mono text-[10px] tracking-widest text-warmwhite/30 uppercase mb-1">
            Next trip
          </p>
          <p className="text-sm text-warmwhite/65">
            {formatTripDateTime(trip.trip_date, trip.trip_time)}
          </p>

          {!hasBooked ? (
            <motion.button
              onClick={() => setBookingMode(v => !v)}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className={`mt-4 w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                bookingMode
                  ? 'border border-chrome/20 bg-chrome/8 text-warmwhite/60'
                  : 'bg-route-green/90 text-asphalt hover:bg-route-green'
              }`}
            >
              {bookingMode ? '← Tap a seat above to select' : 'Book a seat'}
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`mt-4 rounded-lg border px-4 py-3 text-sm text-left ${
                myBooking?.status === 'approved'
                  ? 'border-route-green/30 bg-route-green/10 text-route-green'
                  : 'border-signal-amber/30 bg-signal-amber/10 text-signal-amber'
              }`}
            >
              <span className="font-mono">Seat {myBooking?.seat_number}</span>
              {' · '}
              {myBooking?.status === 'approved'
                ? `Approved — pickup ${myBooking.approved_time ?? 'TBD'}`
                : 'Pending admin approval'}
            </motion.div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-chrome/10 bg-panel p-6 text-center">
          <p className="text-sm text-warmwhite/40">No upcoming trip scheduled.</p>
          <p className="mt-1 text-xs text-warmwhite/25">Check back soon.</p>
        </div>
      )}

      {/* Contact card */}
      <ContactCard />

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
