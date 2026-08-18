'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { SeatMap } from '@/components/SeatMap';
import { BookingModal } from '@/components/BookingModal';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { RouteDisplay } from '@/components/RouteDisplay';
import { ContactCard } from '@/components/ContactCard';
import { Sidebar } from '@/components/Sidebar';
import { HudBar } from '@/components/HudBar';
import { LocationBadge } from '@/components/LocationBadge';
import { categoryOf } from '@/lib/tripCategory';
import type { Trip, Booking, Route } from '@/types';
import type { BookingSubmission } from '@/types';

interface DashboardClientProps {
  initialTrips: Trip[];
  initialRoutes: Route[];
  initialTripId: string | null;
  initialBookings: Booking[];
  currentUserId: string;
  currentUserEmail: string;
  userName: string;
  userWhatsApp?: string | null;
  globalRate?: number | null;
  userCustomRate?: number | null;
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
    const dt = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
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
  currentUserEmail,
  userName,
  userWhatsApp,
  globalRate: initialGlobalRate,
  userCustomRate: initialUserCustomRate,
  isAdmin,
}: DashboardClientProps) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [routes] = useState<Route[]>(initialRoutes);
  const [globalRate, setGlobalRate] = useState<number | null>(initialGlobalRate ?? null);
  const [userCustomRate, setUserCustomRate] = useState<number | null>(initialUserCustomRate ?? null);
  const [activeTripId, setActiveTripId] = useState<string | null>(
    initialTripId || (initialTrips.length > 0 ? initialTrips[0].id : null)
  );

  const [whatsAppNumber, setWhatsAppNumber] = useState<string | null>(userWhatsApp || null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [prevWhatsAppProp, setPrevWhatsAppProp] = useState(userWhatsApp);

  if (prevWhatsAppProp !== userWhatsApp) {
    setPrevWhatsAppProp(userWhatsApp);
    setWhatsAppNumber(userWhatsApp || null);
  }

  const [prevCustomRateProp, setPrevCustomRateProp] = useState(initialUserCustomRate);
  if (prevCustomRateProp !== initialUserCustomRate) {
    setPrevCustomRateProp(initialUserCustomRate);
    setUserCustomRate(initialUserCustomRate ?? null);
  }

  const trip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || trips[0] || null,
    [trips, activeTripId]
  );

  const route = useMemo(() => {
    if (!trip?.route_id) return null;
    return routes.find((r) => r.id === trip.route_id) || null;
  }, [routes, trip]);

  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const [prevTripId, setPrevTripId] = useState(activeTripId);
  if (prevTripId !== activeTripId) {
    setPrevTripId(activeTripId);
    setSelectedSeat(null);
    setBookingError(null);
  }

  /* ── Periodic & Realtime Sync (Bookings, Settings & Trips) ───────── */
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    const fetchLatest = async () => {
      // 1. Fetch latest bookings across trips
      const { data: bData } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (bData) {
        setBookings(bData as Booking[]);
      }

      // 2. Global Rate from settings
      const { data: sData } = await supabase
        .from('settings')
        .select('rate')
        .eq('id', 1)
        .maybeSingle();
      if (sData && sData.rate !== undefined) {
        setGlobalRate(sData.rate);
      }

      // 3. Trips (scheduled)
      const { data: tData } = await supabase
        .from('trips')
        .select('*')
        .eq('status', 'scheduled')
        .gte('trip_date', today)
        .order('trip_date', { ascending: true })
        .order('trip_time', { ascending: true });
      if (tData) {
        setTrips(tData as Trip[]);
      }

      // 4. Current user WhatsApp & Profile live sync (incl. custom_rate)
      if (currentUserId) {
        const { data: uData } = await supabase
          .from('users')
          .select('whatsapp, phone, custom_rate')
          .eq('id', currentUserId)
          .maybeSingle();
        if (uData) {
          const liveNum = uData.whatsapp || uData.phone || null;
          setWhatsAppNumber(liveNum);
          setUserCustomRate(
            uData.custom_rate !== null && uData.custom_rate !== undefined
              ? Number(uData.custom_rate)
              : null
          );
        }
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 2500);

    // Users channel (for live WhatsApp number and custom_rate updates)
    const usersChannel = supabase
      .channel('dashboard-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const u = payload.new as {
              id?: string;
              whatsapp?: string | null;
              phone?: string | null;
              custom_rate?: number | null;
            };
            if (u.id === currentUserId) {
              const liveNum = u.whatsapp || u.phone || null;
              setWhatsAppNumber(liveNum);
              if ('custom_rate' in u) {
                setUserCustomRate(
                  u.custom_rate !== null && u.custom_rate !== undefined
                    ? Number(u.custom_rate)
                    : null
                );
              }
            }
          }
        }
      )
      .subscribe();

    // Bookings channel
    const bookingsChannel = supabase
      .channel('dashboard-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedB = payload.new as Booking;
            setBookings((prev) => {
              const filtered = prev.filter((b) => b.id !== updatedB.id);
              return [updatedB, ...filtered];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<Booking>).id;
            setBookings((prev) => prev.filter((b) => b.id !== deletedId));
          }
        }
      )
      .subscribe();

    // Settings channel
    const settingsChannel = supabase
      .channel('dashboard-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'rate' in payload.new) {
            setGlobalRate(Number((payload.new as { rate?: number }).rate));
          }
        }
      )
      .subscribe();

    // Trips channel
    const tripsChannel = supabase
      .channel('dashboard-trips')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedT = payload.new as Trip;
            setTrips((prev) => {
              const existingIdx = prev.findIndex((t) => t.id === updatedT.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = updatedT;
                return next;
              }
              if (updatedT.status === 'scheduled') {
                return [...prev, updatedT].sort((a, b) =>
                  `${a.trip_date} ${a.trip_time}`.localeCompare(`${b.trip_date} ${b.trip_time}`)
                );
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<Trip>).id;
            setTrips((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(tripsChannel);
    };
  }, [supabase, currentUserId]);

  /* ── Derived state for currently active trip ───────────────────── */
  const currentTripBookings = useMemo(
    () => (trip ? bookings.filter((b) => b.trip_id === trip.id) : []),
    [bookings, trip]
  );

  const activeBookings = useMemo(
    () => currentTripBookings.filter((b) => b.status !== 'rejected'),
    [currentTripBookings]
  );

  const seatsTotal = trip?.seats_total ?? 4;
  const seatsOpen = useMemo(
    () => seatsTotal - activeBookings.length,
    [seatsTotal, activeBookings.length]
  );

  // Find the user's booking on the currently active trip (most recent first)
  const myBooking = useMemo(() => {
    if (!trip) return undefined;
    const uid = currentUserId?.toLowerCase();
    const userBookings = currentTripBookings.filter(
      (b) => b.user_id?.toLowerCase() === uid
    );
    if (userBookings.length === 0) return undefined;
    return [...userBookings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [currentTripBookings, currentUserId, trip]);

  const canBook = useMemo(() => {
    if (!trip || trip.status !== 'scheduled') return false;
    return !myBooking || myBooking.status === 'rejected';
  }, [trip, myBooking]);

  const tripRate = (trip as (Trip & { rate?: number }) | null)?.rate ?? null;
  // Priority: Passenger Custom Rate > Per-Trip Override Rate > Global Default Rate
  const rate = userCustomRate ?? tripRate ?? globalRate ?? null;
  const tripCategory = useMemo(() => categoryOf(trip?.direction), [trip]);

  /* ── Booking flow ─────────────────────────────────────────────── */
  async function handleBook(seatNumber: number, submission: BookingSubmission) {
    if (!trip) return;

    const optimisticId = `opt-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : seatNumber}`;
    const optimistic: Booking = {
      id: optimisticId,
      trip_id: trip.id,
      user_id: currentUserId,
      seat_number: seatNumber,
      pickup_location: submission.pickup_location ?? null,
      dropoff_location: submission.dropoff_location ?? null,
      free_by_time: submission.free_by_time ?? null,
      admin_message: null,
      status: 'pending',
      payment_status: 'pending',
      approved_time: null,
      rate_applied: rate,
      created_at: new Date().toISOString(),
    };

    setBookings((prev) => [optimistic, ...prev.filter((b) => b.id !== myBooking?.id)]);
    setSelectedSeat(null);
    setBookingError(null);

    // If rebooking over a rejected booking, call dedicated API route
    if (myBooking && myBooking.status === 'rejected') {
      try {
        const res = await fetch('/api/bookings/rebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: trip.id,
            bookingId: myBooking.id,
            seatNumber,
            pickupLocation: submission.pickup_location ?? null,
            dropoffLocation: submission.dropoff_location ?? null,
            freeByTime: submission.free_by_time ?? null,
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
          notifyAdminOfBooking(seatNumber, submission);
        }
      } catch (err: unknown) {
        setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
        const msg = err instanceof Error ? err.message : 'Network error while re-booking.';
        setBookingError(msg);
      }
      return;
    }

    // Standard initial booking — goes through API route so rate_applied is
    // resolved server-side (trip.rate > users.custom_rate > settings.rate).
    // The browser never touches users.custom_rate directly.
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          seatNumber,
          pickupLocation: submission.pickup_location ?? null,
          dropoffLocation: submission.dropoff_location ?? null,
          freeByTime: submission.free_by_time ?? null,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
        if (json.code === '23505') {
          setBookingError(`Seat ${seatNumber} was just taken. Please choose another seat.`);
        } else {
          setBookingError(json.error ?? 'Failed to book seat.');
        }
      } else {
        setBookings((prev) =>
          prev.map((b) => (b.id === optimisticId ? (json.booking as Booking) : b))
        );
        notifyAdminOfBooking(seatNumber, submission);
      }
    } catch (err) {
      setBookings((prev) => prev.filter((b) => b.id !== optimisticId));
      const msg = err instanceof Error ? err.message : 'Network error while booking.';
      setBookingError(msg);
    }
  }

  // Fire-and-forget — booking already committed, email failure shouldn't block the UI.
  function notifyAdminOfBooking(seatNumber: number, submission: BookingSubmission) {
    if (!trip) return;
    fetch('/api/notify/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passengerName: userName,
        passengerEmail: currentUserEmail,
        pickupLocation: submission.pickup_location ?? null,
        dropoffLocation: submission.dropoff_location ?? null,
        freeByTime: submission.free_by_time ?? null,
        seatNumber,
        tripDate: trip.trip_date,
        tripTime: trip.trip_time,
      }),
    }).catch((err) => console.error('[notify] booking email failed:', err));
  }

  async function handleSaveWhatsApp(newNum: string) {
    if (!currentUserId) return;

    // Check if number is already connected to another user
    const { data: conflict, error: queryErr } = await supabase
      .from('users')
      .select('id')
      .eq('whatsapp', newNum)
      .neq('id', currentUserId)
      .maybeSingle();

    if (queryErr) {
      console.error('[dashboard] error checking duplicate whatsapp:', queryErr.message);
    }

    if (conflict) {
      throw new Error('This WhatsApp number is already connected to a different user.');
    }

    const { error } = await supabase
      .from('users')
      .update({ whatsapp: newNum, phone: newNum })
      .eq('id', currentUserId);

    if (error) {
      console.error('[dashboard] whatsapp update failed:', error.message);
      throw new Error(error.message);
    }

    setWhatsAppNumber(newNum);
    setIsWhatsAppModalOpen(false);
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
        userWhatsApp={whatsAppNumber}
        currentUserId={currentUserId}
        trips={trips}
        bookings={bookings}
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
        onUpdateWhatsApp={setWhatsAppNumber}
      />

      <div className="w-full max-w-sm flex-1 flex flex-col relative z-0">
        <HudBar rate={rate} />
        <div className="px-6 py-6 flex flex-col flex-1">
          {/* ── WhatsApp missing alert banner ─────────────────────────── */}
          {!isAdmin && !Boolean(whatsAppNumber && whatsAppNumber.trim()) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border border-signal-amber/30 bg-signal-amber/10 p-3.5 flex items-start gap-3 shadow-[0_4px_16px_rgba(224,165,38,0.08)]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-amber/20 text-signal-amber font-bold text-xs flex-shrink-0 mt-0.5 border border-signal-amber/30">
                !
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-warmwhite">
                    WhatsApp Number Required
                  </p>
                  <button
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="text-[11px] font-mono font-bold text-signal-amber hover:text-signal-amber/80 transition-colors uppercase tracking-wide underline underline-offset-2 flex-shrink-0"
                  >
                    Add number →
                  </button>
                </div>
                <p className="text-[11px] text-warmwhite/60 mt-0.5 leading-relaxed">
                  Please link your WhatsApp number so Ammar can coordinate pickup times and confirm your ride.
                </p>
              </div>
            </motion.div>
          )}

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
                        {tripCategory === 'campus_to_home' ? (
                          <p className="mt-0.5 text-sm font-semibold text-warmwhite">
                            Seat {myBooking.seat_number} — Confirmed
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm font-semibold text-warmwhite">
                            Seat {myBooking.seat_number} — Be ready by{' '}
                            <span className="text-emerald-400 font-mono font-bold">
                              {formatTime12h(myBooking.approved_time)}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex-shrink-0 ml-3 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                        ✓
                      </div>
                    </div>

                    {tripCategory === 'campus_to_home' ? (
                      <>
                        {myBooking.admin_message && (
                          <p className="text-sm text-warmwhite/90 leading-relaxed pt-2.5 border-t border-emerald-500/15">
                            {myBooking.admin_message}
                          </p>
                        )}
                        {(myBooking.dropoff_location || myBooking.free_by_time) && (
                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                            <LocationBadge location={myBooking.dropoff_location} />
                            {myBooking.free_by_time && (
                              <span className="inline-flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-mono text-emerald-400">
                                Free by {myBooking.free_by_time}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      myBooking.pickup_location && (
                        <div className="pt-2.5 border-t border-emerald-500/15 flex items-center justify-between">
                          <LocationBadge location={myBooking.pickup_location} />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/60 font-medium">
                            Pickup Point
                          </span>
                        </div>
                      )
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
                        This seat request was declined. You can select another available seat or trip below.
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
                          Seat {myBooking.seat_number} · Waiting for Ammar&apos;s Approval
                        </p>
                      </div>
                      <div className="animate-pulse h-2.5 w-2.5 rounded-full bg-signal-amber shadow-[0_0_8px_rgba(224,165,38,0.6)] flex-shrink-0 ml-4" />
                    </div>

                    {tripCategory === 'campus_to_home' ? (
                      (myBooking.dropoff_location || myBooking.free_by_time) && (
                        <div className="pt-2.5 border-t border-signal-amber/15 flex items-center justify-between flex-wrap gap-1.5">
                          <LocationBadge location={myBooking.dropoff_location} />
                          {myBooking.free_by_time && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-warmwhite/40">
                              Free by {myBooking.free_by_time}
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      myBooking.pickup_location && (
                        <div className="pt-2.5 border-t border-signal-amber/15 flex items-center justify-between">
                          <LocationBadge location={myBooking.pickup_location} />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-warmwhite/40">
                            Pickup Point
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Instrument Cluster: Seat map + trip parameters ──────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
            style={{ willChange: 'transform, opacity' }}
            className="mt-2 bezel-shell"
          >
            <div className="bezel-core p-4 sm:p-5">
              {/* Bezel Top Telemetry Row: Trip Date & Fare */}
              {trip && (
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-white/5">
                  <div className="inline-flex items-center gap-1.5 min-w-0">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent-red flex-shrink-0"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span className="font-mono text-xs font-semibold text-warmwhite truncate">
                      {formatTripDateOnly(trip.trip_date)}
                    </span>
                  </div>

                  {rate !== null && (
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full bg-chrome/5 border border-chrome/10 px-2.5 py-0.5 flex-shrink-0"
                      suppressHydrationWarning
                    >
                      <span
                        className="font-mono text-[11px] uppercase tracking-wider text-warmwhite/40 font-medium"
                        suppressHydrationWarning
                      >
                        Fare
                      </span>
                      <span
                        className="font-mono text-[13px] font-bold text-warmwhite"
                        suppressHydrationWarning
                      >
                        <span className="text-[11.5px] text-warmwhite/50 font-sans mr-0.5">Rs.</span>
                        {rate}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Main Cockpit Layout: Left telemetry + Right SeatMap */}
              <div className="flex items-center gap-4">
                {/* Left column: seat count + depart time */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <p className="font-mono text-xs text-warmwhite/60 bg-chrome/5 py-1.5 px-3 rounded-full border border-chrome/10 text-center">
                    {trip ? (seatsOpen === 0 ? 'No Seats' : `${seatsOpen} / ${seatsTotal} open`) : 'No Seats'}
                  </p>
                  {trip && (
                    <div className="text-center">
                      <p className="font-mono text-[9px] tracking-widest text-warmwhite/50 uppercase mb-1">
                        Departure Schedule
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
              <p className="text-sm text-warmwhite/70 font-medium">No upcoming trips currently scheduled.</p>
              <p className="mt-1 text-xs text-warmwhite/40">Check back soon or open the sidebar to view other scheduled rides.</p>
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
                category={tripCategory}
                onConfirm={handleBook}
                onCancel={() => setSelectedSeat(null)}
              />
            )}
          </AnimatePresence>

          {/* ── WhatsApp Modal (Direct Option B) ─────────────────── */}
          {!isAdmin && isWhatsAppModalOpen && (
            <WhatsAppModal
              initialNumber={whatsAppNumber}
              onSave={handleSaveWhatsApp}
              onCancel={() => setIsWhatsAppModalOpen(false)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
