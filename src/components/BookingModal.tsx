'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingModalProps {
  seatNumber: number;
  onConfirm: (seatNumber: number, pickupLocation: string) => void;
  onCancel: () => void;
}

export function BookingModal({ seatNumber, onConfirm, onCancel }: BookingModalProps) {
  const [pickup, setPickup] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Small delay so the modal entrance animation finishes first
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup.trim()) return;
    onConfirm(seatNumber, pickup.trim());
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
        className="fixed inset-0 z-40 bg-asphalt/75 backdrop-blur-sm"
        aria-hidden
      />

      {/* Centered modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal
        aria-label={`Book seat ${seatNumber}`}
      >
        <div className="w-full max-w-sm rounded-2xl border border-chrome/15 bg-panel px-6 py-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-warmwhite/35 uppercase mb-0.5">
                Booking
              </p>
              <h2 className="text-base font-semibold text-warmwhite">
                Seat {seatNumber}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="text-warmwhite/30 hover:text-warmwhite/60 transition-colors text-2xl leading-none mt-0.5"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="pickup-location"
              className="block mb-1.5 text-xs text-warmwhite/50"
            >
              Pickup location
            </label>
            <input
              ref={inputRef}
              id="pickup-location"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              placeholder="e.g. Fivestar"
              autoComplete="off"
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-4 py-3 text-sm text-warmwhite placeholder:text-warmwhite/25 outline-none focus:border-chrome/35 transition-colors"
            />

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-lg border border-chrome/15 px-4 py-2.5 text-sm text-warmwhite/55 hover:text-warmwhite/80 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={!pickup.trim()}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 rounded-lg bg-accent-red/90 px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-red transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Confirm →
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
