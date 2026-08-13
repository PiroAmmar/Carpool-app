'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trip } from '@/types';

interface SidebarProps {
  userName: string;
  trips: Trip[];
  activeTripId: string | null; // UUID
  onSelectTrip?: (tripId: string) => void;
}

export function Sidebar({ userName, trips, activeTripId, onSelectTrip }: SidebarProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function formatTripDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return 'TBD';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    } catch {
      return 'TBD';
    }
  }

  function formatTripTime(dateStr: string, timeStr: string) {
    try {
      const d = new Date(`${dateStr}T${timeStr}`);
      if (Number.isNaN(d.getTime())) return timeStr || 'TBD';
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return timeStr || 'TBD';
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-panel w-64 md:w-72 flex-shrink-0 z-40">
      {/* Top Header - User Welcome */}
      <div className="p-6 border-b border-white/5">
        <h1 className="text-lg font-semibold text-warmwhite truncate">
          Welcome back
        </h1>
        <p className="mt-0.5 text-xs text-warmwhite/40 font-mono truncate">
          {userName}
        </p>
      </div>

      {/* Trips List */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <p className="font-mono text-[10px] tracking-widest text-warmwhite/30 uppercase mb-3 px-3">
          Scheduled Trips
        </p>

        {trips.length === 0 ? (
          <div className="px-3 py-4 text-xs text-warmwhite/40">
            No scheduled trips.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {trips.map((trip, i) => {
              const isActive = trip.id === activeTripId;
              return (
                <motion.button
                  key={trip.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: Math.min(i * 0.04, 0.32) }}
                  onClick={() => {
                    if (onSelectTrip) {
                      onSelectTrip(trip.id);
                    } else {
                      router.push(`?tripId=${trip.id}`);
                    }
                    setIsOpen(false);
                  }}
                  className={`relative flex flex-col items-start pl-4 pr-3 py-2.5 rounded-lg transition-colors duration-160 text-left active:scale-[0.98] ${isActive
                      ? 'bg-accent-red/10 text-accent-red'
                      : 'text-warmwhite/60 hover:bg-white/5 hover:text-warmwhite'
                    }`}
                >
                  {/* Active-row accent rail — spatial indicator, not a color-only cue */}
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-rail"
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent-red"
                    />
                  )}
                  <span className={`text-sm font-medium truncate w-full ${isActive ? 'text-accent-red' : 'text-warmwhite/80'}`}>
                    {formatTripDate(trip.trip_date)}
                  </span>
                  <span className="text-xs font-mono opacity-75 mt-0.5">
                    {formatTripTime(trip.trip_date, trip.trip_time)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer - Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-accent-red transition-[background-color,transform] duration-160 hover:bg-accent-red/10 active:scale-[0.97]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Universal Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 rounded-md bg-panel border border-chrome/10 text-warmwhite/80 hover:text-warmwhite shadow-lg transition-transform active:scale-95"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-asphalt/70 z-40"
              style={{ willChange: 'opacity' }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280, mass: 0.8 }}
              className="fixed inset-y-0 left-0 z-50 shadow-2xl"
              style={{ willChange: 'transform' }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
