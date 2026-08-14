'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { AdminApprovalModal } from '@/components/AdminApprovalModal';
import { TripSchedulerModal } from '@/components/TripSchedulerModal';
import { RoutePresetModal } from '@/components/RoutePresetModal';
import { LocationBadge } from '@/components/LocationBadge';
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

interface AdminClientProps {
  initialTrips: Trip[];
  initialBookings: Booking[];
  initialRoutes: Route[];
  initialUsers: UserRecord[];
  initialRate: number | null;
  currentUserId: string;
}

type Tab = 'bookings' | 'trips' | 'presets' | 'passengers' | 'settings';

type TripStatusFilterType = 'all' | 'scheduled' | 'completed' | 'cancelled';

function formatDirection(dir?: string | null): string {
  if (!dir) return '';
  return dir.replace(/->/g, '→');
}

interface TripFilterToggleProps {
  scheduledCount: number;
  completedCount: number;
  totalCount: number;
  currentFilter: TripStatusFilterType;
  onSelectFilter: (filter: TripStatusFilterType) => void;
}

function TripFilterToggle({
  scheduledCount,
  completedCount,
  totalCount,
  currentFilter,
  onSelectFilter,
}: TripFilterToggleProps) {
  const options: { id: TripStatusFilterType; label: string }[] = [
    { id: 'scheduled', label: `Scheduled (${scheduledCount})` },
    { id: 'completed', label: `Completed (${completedCount})` },
    { id: 'all', label: `All (${totalCount})` },
  ];

  return (
    <div className="flex items-center gap-1 bg-asphalt/60 p-0.5 rounded-lg border border-chrome/10">
      {options.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onSelectFilter(filter.id)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
            currentFilter === filter.id
              ? 'bg-accent-red/20 text-accent-red font-bold'
              : 'text-warmwhite/40 hover:text-warmwhite/70'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

export function AdminClient({
  initialTrips,
  initialBookings,
  initialRoutes,
  initialUsers,
  initialRate,
}: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [globalRate, setGlobalRate] = useState<number | null>(initialRate);

  const [selectedTripId, setSelectedTripId] = useState<string>(
    trips.length > 0 ? trips[0].id : ''
  );
  const [tripStatusFilter, setTripStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const [tripSearchQuery, setTripSearchQuery] = useState('');

  // Cap per-group render count once trip volume grows — dropdown stays scannable
  // instead of dumping 100+ <option> rows in at once. Search bypasses the cap.
  const TRIP_GROUP_CAP = 25;

  const matchesTripSearch = (t: Trip, q: string) => {
    if (!q) return true;
    const hay = `${t.trip_date} ${t.trip_time} ${t.direction ?? ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const searchedTrips = useMemo(
    () => trips.filter((t) => matchesTripSearch(t, tripSearchQuery)),
    [trips, tripSearchQuery]
  );

  const scheduledTrips = useMemo(() => searchedTrips.filter((t) => t.status === 'scheduled'), [searchedTrips]);
  const completedTrips = useMemo(() => searchedTrips.filter((t) => t.status === 'completed'), [searchedTrips]);
  const cancelledTrips = useMemo(() => searchedTrips.filter((t) => t.status === 'cancelled'), [searchedTrips]);

  const cap = (arr: Trip[]) => (tripSearchQuery ? arr : arr.slice(0, TRIP_GROUP_CAP));
  const overflow = (arr: Trip[]) => (tripSearchQuery ? 0 : Math.max(0, arr.length - TRIP_GROUP_CAP));

  const filteredTripsForDropdown = useMemo(() => {
    if (tripStatusFilter === 'all') return searchedTrips;
    return searchedTrips.filter((t) => t.status === tripStatusFilter);
  }, [searchedTrips, tripStatusFilter]);

  // Keep selectedTripId valid when status filter changes
  if (filteredTripsForDropdown.length > 0 && !filteredTripsForDropdown.some((t) => t.id === selectedTripId)) {
    setSelectedTripId(filteredTripsForDropdown[0].id);
  }

  // Modals state
  const [approvingBooking, setApprovingBooking] = useState<Booking | null>(null);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [presetModalState, setPresetModalState] = useState<{ isOpen: boolean; preset: Route | null }>({
    isOpen: false,
    preset: null,
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || filteredTripsForDropdown[0] || trips[0] || null,
    [trips, selectedTripId, filteredTripsForDropdown]
  );

  const activeTripBookings = useMemo(
    () => (activeTrip ? bookings.filter((b) => b.trip_id === activeTrip.id) : []),
    [bookings, activeTrip]
  );

  const routePresets = useMemo(
    () => routes.filter((r) => r.is_preset),
    [routes]
  );

  /* ── Realtime & Periodic Sync (Bookings, Trips, Users) ──────── */
  useEffect(() => {
    const fetchLatestData = async () => {
      const [bRes, tRes, uRes] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('trips').select('*').order('trip_date', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false }),
      ]);
      if (bRes.data) setBookings(bRes.data as Booking[]);
      if (tRes.data) setTrips(tRes.data as Trip[]);
      if (uRes.data) setUsers(uRes.data as UserRecord[]);
    };

    const interval = setInterval(fetchLatestData, 2500);

    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedB = payload.new as Booking;
            setBookings((prev) => {
              const filtered = prev.filter(
                (b) => b.id !== updatedB.id && !(b.user_id?.toLowerCase() === updatedB.user_id?.toLowerCase() && b.trip_id === updatedB.trip_id)
              );
              return [updatedB, ...filtered];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<Booking>).id;
            setBookings((prev) => prev.filter((b) => b.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedTrip = payload.new as Trip;
            setTrips((prev) => {
              const filtered = prev.filter((t) => t.id !== updatedTrip.id);
              return [updatedTrip, ...filtered];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<Trip>).id;
            setTrips((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedUser = payload.new as UserRecord;
            setUsers((prev) => {
              const filtered = prev.filter((u) => u.id !== updatedUser.id);
              return [updatedUser, ...filtered];
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  function showNotification(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  }

  /* ── Booking Actions ───────────────────────────────────── */
  async function handleApproveConfirm(approvedTime: string) {
    if (!approvingBooking) return;
    const targetId = approvingBooking.id;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === targetId
          ? { ...b, status: 'approved', approved_time: approvedTime }
          : b
      )
    );
    setApprovingBooking(null);

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'approved', approved_time: approvedTime })
      .eq('id', targetId);

    if (error) {
      console.error('[admin] approve failed:', error.message);
      showNotification(`Failed to approve: ${error.message}`);
    } else {
      showNotification('Booking approved successfully');
    }
  }

  async function handleRejectBooking(bookingId: string) {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'rejected', approved_time: null } : b))
    );

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected', approved_time: null })
      .eq('id', bookingId);

    if (error) {
      console.error('[admin] reject failed:', error.message);
      showNotification(`Failed to decline: ${error.message}`);
    } else {
      showNotification('Booking request declined');
    }
  }

  /* ── Seat Capacity Editor ───────────────────────────────── */
  async function handleSeatsTotalChange(newTotal: number) {
    if (!activeTrip || newTotal < 1) return;

    setTrips((prev) =>
      prev.map((t) => (t.id === activeTrip.id ? { ...t, seats_total: newTotal } : t))
    );

    const { error } = await supabase
      .from('trips')
      .update({ seats_total: newTotal })
      .eq('id', activeTrip.id);

    if (error) {
      console.error('[admin] seats update failed:', error.message);
      showNotification(`Failed to update seats: ${error.message}`);
    } else {
      showNotification(`Trip seats updated to ${newTotal}`);
    }
  }

  /* ── Trip Status Actions ───────────────────────────────── */
  async function handleUpdateTripStatus(tripId: string, status: 'scheduled' | 'cancelled' | 'completed') {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status } : t))
    );

    const { error } = await supabase
      .from('trips')
      .update({ status })
      .eq('id', tripId);

    if (error) {
      console.error('[admin] trip status failed:', error.message);
      showNotification(`Failed to update trip status: ${error.message}`);
    } else {
      showNotification(`Trip marked as ${status}`);
    }
  }

  /* ── Reset Trip Rate to Global Default ─────────────────── */
  async function handleResetTripRate(tripId: string) {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, rate: null } : t))
    );

    const { error } = await supabase
      .from('trips')
      .update({ rate: null })
      .eq('id', tripId);

    if (error) {
      console.error('[admin] trip rate reset failed:', error.message);
      showNotification(`Failed to reset rate: ${error.message}`);
    } else {
      showNotification('Trip rate reset to global default');
    }
  }

  /* ── Schedule Trip Handler ─────────────────────────────── */
  async function handleScheduleTrip(data: {
    trip_date: string;
    trip_time: string;
    seats_total: number;
    direction: string;
    route_id: string | null;
    rate: number | null;
  }) {
    const { data: newTrip, error } = await supabase
      .from('trips')
      .insert({
        trip_date: data.trip_date,
        trip_time: data.trip_time,
        seats_total: data.seats_total,
        direction: data.direction,
        route_id: data.route_id,
        rate: data.rate,
        status: 'scheduled',
      })
      .select()
      .single();

    setIsSchedulerOpen(false);

    if (error) {
      console.error('[admin] trip insert failed:', error.message);
      showNotification(`Failed to schedule trip: ${error.message}`);
    } else if (newTrip) {
      setTrips((prev) => [newTrip as Trip, ...prev]);
      setSelectedTripId(newTrip.id);
      showNotification('New trip scheduled successfully!');
    }
  }

  /* ── Route Preset Handlers ─────────────────────────────── */
  async function handleSavePreset(data: { name: string; stops: string[] }): Promise<boolean> {
    const preset = presetModalState.preset;
    const normStops = (stops: string[]) => stops.map((s) => s.trim().toLowerCase()).join('|');
    const newStopsKey = normStops(data.stops);

    const nameDupe = routePresets.some(
      (r) => r.id !== preset?.id && r.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (nameDupe) {
      showNotification(`Preset "${data.name.trim()}" already exists`);
      return false;
    }

    const routeDupe = routePresets.find(
      (r) => r.id !== preset?.id && normStops(r.stops) === newStopsKey
    );
    if (routeDupe) {
      showNotification(`Same route already saved as "${routeDupe.name}"`);
      return false;
    }

    if (preset) {
      // Edit
      setRoutes((prev) =>
        prev.map((r) => (r.id === preset.id ? { ...r, ...data } : r))
      );

      const { error } = await supabase
        .from('routes')
        .update({ name: data.name, stops: data.stops })
        .eq('id', preset.id);

      if (error) {
        showNotification(
          error.code === '23505' ? `Preset "${data.name}" already exists` : `Failed to update preset: ${error.message}`
        );
        return false;
      }
      setPresetModalState({ isOpen: false, preset: null });
      showNotification('Route preset updated');
      return true;
    } else {
      // Create
      const { data: newPreset, error } = await supabase
        .from('routes')
        .insert({ name: data.name, stops: data.stops, is_preset: true })
        .select()
        .single();

      if (error) {
        showNotification(
          error.code === '23505' ? `Preset "${data.name}" already exists` : `Failed to create preset: ${error.message}`
        );
        return false;
      }
      setPresetModalState({ isOpen: false, preset: null });
      if (newPreset) {
        setRoutes((prev) => [...prev, newPreset as Route]);
        showNotification('New route preset created');
      }
      return true;
    }
  }

  async function handleDeletePreset(id: string) {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) showNotification(`Failed to delete preset: ${error.message}`);
    else showNotification('Route preset deleted');
  }

  /* ── Global Rate Settings Handler ──────────────────────── */
  async function handleSaveGlobalRate(newRate: number) {
    setGlobalRate(newRate);

    // Try UPDATE first (satisfies RLS UPDATE policy on settings table)
    const { error: updateErr } = await supabase
      .from('settings')
      .update({ rate: newRate })
      .eq('id', 1);

    let settingsOk = !updateErr;

    if (updateErr) {
      // Fallback INSERT if row id=1 did not exist yet
      const { error: insertErr } = await supabase
        .from('settings')
        .insert({ id: 1, rate: newRate });

      if (insertErr) {
        console.error('[admin] rate update error:', updateErr?.message, insertErr?.message);
        showNotification(`Failed to update rate: ${updateErr?.message || insertErr?.message}`);
        return;
      }
      settingsOk = true;
    }

    // Clear any per-trip rate overrides on scheduled trips so they
    // immediately inherit the new global rate instead of a stale one.
    setTrips((prev) =>
      prev.map((t) => (t.status === 'scheduled' ? { ...t, rate: null } : t))
    );

    const { error: clearErr } = await supabase
      .from('trips')
      .update({ rate: null })
      .eq('status', 'scheduled');

    if (clearErr) {
      console.error('[admin] trip rate clear failed:', clearErr.message);
      showNotification('Global rate saved, but failed to clear trip overrides');
      return;
    }

    if (settingsOk) showNotification('Global rate updated for all active trips!');
  }

  return (
    <div className="flex flex-col flex-1 pb-10 max-w-2xl mx-auto w-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg bg-panel border border-accent-red/40 text-xs font-mono text-warmwhite shadow-2xl"
          >
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 border-b border-chrome/10 custom-scrollbar">
        {[
          { id: 'bookings', label: 'Bookings & Trip' },
          { id: 'trips', label: 'Trip Directory' },
          { id: 'presets', label: 'Route Presets' },
          { id: 'passengers', label: 'Passengers' },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-accent-red/10 text-accent-red border border-accent-red/30'
                  : 'text-warmwhite/60 hover:text-warmwhite hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: BOOKINGS & ACTIVE TRIP */}
      {activeTab === 'bookings' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-6"
        >
          {/* Active Trip Selector & Seat Capacity Bar */}
          <div className="bezel-shell">
            <div className="bezel-core p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-warmwhite/40 uppercase">
                      Active Trip Selection
                    </span>
                    <TripFilterToggle
                      scheduledCount={scheduledTrips.length}
                      completedCount={completedTrips.length}
                      totalCount={trips.length}
                      currentFilter={tripStatusFilter}
                      onSelectFilter={setTripStatusFilter}
                    />
                  </div>

                  {trips.length > TRIP_GROUP_CAP && (
                    <input
                      type="text"
                      value={tripSearchQuery}
                      onChange={(e) => setTripSearchQuery(e.target.value)}
                      placeholder="Search trips by date, time or direction…"
                      className="bg-asphalt text-warmwhite border border-chrome/15 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-chrome/40 w-full placeholder:text-warmwhite/30"
                    />
                  )}

                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="bg-asphalt text-warmwhite border border-chrome/15 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-chrome/40 w-full truncate"
                  >
                    {filteredTripsForDropdown.length === 0 ? (
                      <option value="">No trips match filter ({tripStatusFilter})</option>
                    ) : (
                      <>
                        {scheduledTrips.length > 0 && (tripStatusFilter === 'all' || tripStatusFilter === 'scheduled') && (
                          <optgroup label={`— SCHEDULED TRIPS —${overflow(scheduledTrips) ? ` (showing ${TRIP_GROUP_CAP} of ${scheduledTrips.length}, search to see more)` : ''}`}>
                            {cap(scheduledTrips).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.trip_date} · {t.trip_time} ({formatDirection(t.direction) || 'No direction'})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {completedTrips.length > 0 && (tripStatusFilter === 'all' || tripStatusFilter === 'completed') && (
                          <optgroup label={`— COMPLETED TRIPS —${overflow(completedTrips) ? ` (showing ${TRIP_GROUP_CAP} of ${completedTrips.length}, search to see more)` : ''}`}>
                            {cap(completedTrips).map((t) => (
                              <option key={t.id} value={t.id}>
                                [COMPLETED] {t.trip_date} · {t.trip_time} ({formatDirection(t.direction) || 'No direction'})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {cancelledTrips.length > 0 && (tripStatusFilter === 'all' || tripStatusFilter === 'cancelled') && (
                          <optgroup label={`— CANCELLED TRIPS —${overflow(cancelledTrips) ? ` (showing ${TRIP_GROUP_CAP} of ${cancelledTrips.length}, search to see more)` : ''}`}>
                            {cap(cancelledTrips).map((t) => (
                              <option key={t.id} value={t.id}>
                                [CANCELLED] {t.trip_date} · {t.trip_time} ({formatDirection(t.direction) || 'No direction'})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>
                </div>

                <button
                  onClick={() => setIsSchedulerOpen(true)}
                  className="flex-shrink-0 px-3.5 py-2 rounded-full bg-accent-red text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-red/90 transition-colors self-start sm:self-auto"
                >
                  + New Trip
                </button>
              </div>

              {activeTrip && (
                <div className="pt-3 border-t border-chrome/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-warmwhite/60">Seats Capacity:</span>
                    <span className="font-mono font-bold text-warmwhite">
                      {activeTrip.seats_total}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleSeatsTotalChange(activeTrip.seats_total - 1)}
                        disabled={activeTrip.seats_total <= 1}
                        className="px-2 py-0.5 rounded bg-chrome/10 hover:bg-chrome/20 font-mono text-warmwhite disabled:opacity-30"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleSeatsTotalChange(activeTrip.seats_total + 1)}
                        disabled={activeTrip.seats_total >= 8}
                        className="px-2 py-0.5 rounded bg-chrome/10 hover:bg-chrome/20 font-mono text-warmwhite disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="font-mono text-warmwhite/60">
                    Status: <span className="text-emerald-400 font-bold uppercase">{activeTrip.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bookings List */}
          <div>
            <h3 className="font-mono text-xs font-semibold tracking-widest text-warmwhite/80 uppercase mb-3">
              Passenger Requests ({activeTripBookings.length})
            </h3>

            {activeTripBookings.length === 0 ? (
              <div className="bezel-shell">
                <div className="bezel-core p-6 text-center text-xs text-warmwhite/40">
                  No booking requests for this trip yet.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeTripBookings.map((b) => {
                  const passenger = users.find((u) => u.id === b.user_id);
                  const passengerName = passenger?.full_name || passenger?.email?.split('@')[0] || 'Passenger';

                  return (
                    <div
                      key={b.id}
                      className="bezel-shell"
                    >
                      <div className="bezel-core p-4 flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-chrome/10 text-warmwhite px-2 py-0.5 rounded">
                              Seat {b.seat_number}
                            </span>
                            <span className="text-sm font-semibold text-warmwhite truncate">
                              {passengerName}
                            </span>
                          </div>
                          <div className="my-0.5">
                            <LocationBadge location={b.pickup_location} size="sm" />
                          </div>
                          {passenger?.whatsapp || passenger?.phone ? (
                            <a
                              href={`https://wa.me/${(passenger.whatsapp || passenger.phone || '').replace(/[^\d+]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-400 hover:underline font-mono flex items-center gap-1 w-max"
                            >
                              <span>WhatsApp:</span>
                              <span className="font-bold">{passenger.whatsapp || passenger.phone}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-warmwhite/35 font-mono">No WhatsApp set</span>
                          )}
                          {b.approved_time && (
                            <p className="text-[11px] text-emerald-400 font-mono">
                              Approved Time: {b.approved_time}
                            </p>
                          )}
                        </div>

                        {/* Status / Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setApprovingBooking(b)}
                                className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectBooking(b.id)}
                                className="px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-semibold hover:bg-rose-500/30 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {b.status === 'approved' && (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase">
                              Approved
                            </span>
                          )}

                          {b.status === 'rejected' && (
                            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold uppercase">
                              Declined
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 2: TRIP DIRECTORY */}
      {activeTab === 'trips' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-xs font-semibold tracking-widest text-warmwhite/80 uppercase">
                Trip Directory ({filteredTripsForDropdown.length})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <TripFilterToggle
                scheduledCount={scheduledTrips.length}
                completedCount={completedTrips.length}
                totalCount={trips.length}
                currentFilter={tripStatusFilter}
                onSelectFilter={setTripStatusFilter}
              />
              <button
                onClick={() => setIsSchedulerOpen(true)}
                className="px-3 py-1.5 rounded-full bg-accent-red text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-red/90 transition-colors"
              >
                + Schedule Trip
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filteredTripsForDropdown.length === 0 ? (
              <div className="bezel-shell">
                <div className="bezel-core p-8 text-center text-xs font-mono text-warmwhite/40">
                  No trips match current status filter ({tripStatusFilter})
                </div>
              </div>
            ) : (
              filteredTripsForDropdown.map((t) => (
                <div key={t.id} className="bezel-shell">
                  <div className="bezel-core p-4 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-warmwhite font-bold">
                          {t.trip_date} · {t.trip_time}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          t.status === 'scheduled' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-chrome/10 text-warmwhite/50'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-accent-red font-medium truncate">
                        {formatDirection(t.direction) || 'No direction'}
                      </p>
                      <p className="text-[11px] font-mono text-warmwhite/50">
                        Seats: {t.seats_total} · Rate: {t.rate ? `Rs. ${t.rate}` : 'Default'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {t.status === 'scheduled' && t.rate !== null && t.rate !== undefined && (
                        <button
                          onClick={() => handleResetTripRate(t.id)}
                          className="px-2.5 py-1 rounded text-xs bg-chrome/10 text-warmwhite/60 hover:bg-chrome/20"
                        >
                          Reset Rate
                        </button>
                      )}
                      {t.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleUpdateTripStatus(t.id, 'completed')}
                            className="px-2.5 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleUpdateTripStatus(t.id, 'cancelled')}
                            className="px-2.5 py-1 rounded text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 3: ROUTE PRESETS */}
      {activeTab === 'presets' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-xs font-semibold tracking-widest text-warmwhite/80 uppercase">
              Route Presets ({routePresets.length})
            </h3>
            <button
              onClick={() => setPresetModalState({ isOpen: true, preset: null })}
              className="px-3 py-1.5 rounded-full bg-warmwhite text-asphalt text-xs font-bold uppercase tracking-wide hover:bg-warmwhite/90 transition-colors"
            >
              + Create Preset
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {routePresets.map((r) => (
              <div key={r.id} className="bezel-shell">
                <div className="bezel-core p-4 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-semibold text-warmwhite">
                      {r.name}
                    </span>
                    <p className="text-xs text-warmwhite/60 font-mono break-words">
                      {r.stops.join(' → ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPresetModalState({ isOpen: true, preset: r })}
                      className="px-2.5 py-1 rounded text-xs bg-chrome/15 text-warmwhite hover:bg-chrome/25"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePreset(r.id)}
                      className="px-2.5 py-1 rounded text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 4: PASSENGER DIRECTORY */}
      {activeTab === 'passengers' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <h3 className="font-mono text-xs font-semibold tracking-widest text-warmwhite/80 uppercase mb-2">
            Registered Users & Passengers ({users.length})
          </h3>

          <div className="flex flex-col gap-3">
            {users.map((u) => {
              const userBookings = bookings.filter((b) => b.user_id === u.id);

              return (
                <div key={u.id} className="bezel-shell">
                  <div className="bezel-core p-4 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-warmwhite">
                          {u.full_name || u.email.split('@')[0]}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          u.role === 'admin' ? 'bg-accent-red/20 text-accent-red font-bold' : 'bg-chrome/10 text-warmwhite/50'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs text-warmwhite/50 font-mono truncate">{u.email}</p>
                      {u.whatsapp || u.phone ? (
                        <p className="text-xs text-emerald-400 font-mono font-medium">
                          WA: {u.whatsapp || u.phone}
                        </p>
                      ) : (
                        <p className="text-xs text-warmwhite/35 font-mono">No WhatsApp set</p>
                      )}
                      <p className="text-[11px] text-warmwhite/40 font-mono">
                        Bookings count: {userBookings.length}
                      </p>
                    </div>

                    {u.whatsapp || u.phone ? (
                      <a
                        href={`https://wa.me/${(u.whatsapp || u.phone || '').replace(/[^\d+]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/25 transition-colors flex-shrink-0"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full bg-chrome/5 text-warmwhite/30 text-xs font-mono flex-shrink-0">
                        No WA
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* TAB 5: GLOBAL SETTINGS */}
      {activeTab === 'settings' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bezel-shell"
        >
          <div className="bezel-core p-6 flex flex-col gap-4">
            <h3 className="font-mono text-xs font-semibold tracking-widest text-warmwhite/80 uppercase">
              Global Application Settings
            </h3>

            <div>
              <label className="block text-xs text-warmwhite/60 mb-1">
                Default Trip Rate (Rs.)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={globalRate !== null && globalRate !== undefined ? globalRate : ''}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^\d.]/g, '');
                    setGlobalRate(cleaned === '' ? null : parseFloat(cleaned));
                  }}
                  placeholder="e.g. 200"
                  className="bg-asphalt text-warmwhite font-mono border border-chrome/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-chrome/35 w-40"
                />
                <button
                  onClick={() => globalRate !== null && handleSaveGlobalRate(globalRate)}
                  className="px-4 py-2 rounded-full bg-accent-red text-white text-xs font-bold uppercase hover:bg-accent-red/90 transition-colors"
                >
                  Save Rate
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODALS */}
      {approvingBooking && (
        <AdminApprovalModal
          passengerName={
            users.find((u) => u.id === approvingBooking.user_id)?.full_name || 'Passenger'
          }
          seatNumber={approvingBooking.seat_number}
          pickupLocation={approvingBooking.pickup_location}
          onConfirm={handleApproveConfirm}
          onCancel={() => setApprovingBooking(null)}
        />
      )}

      {isSchedulerOpen && (
        <TripSchedulerModal
          presets={routePresets}
          onConfirm={handleScheduleTrip}
          onCancel={() => setIsSchedulerOpen(false)}
        />
      )}

      {presetModalState.isOpen && (
        <RoutePresetModal
          presetToEdit={presetModalState.preset}
          onConfirm={handleSavePreset}
          onCancel={() => setPresetModalState({ isOpen: false, preset: null })}
        />
      )}
    </div>
  );
}
