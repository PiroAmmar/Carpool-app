'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';
import { LocationIcon } from './LocationBadge';
import type { TripCategory } from '@/lib/tripCategory';
import type { BookingSubmission } from '@/types';

interface BookingModalProps {
  seatNumber: number;
  category: TripCategory;
  onConfirm: (seatNumber: number, submission: BookingSubmission) => void;
  onCancel: () => void;
}

export function BookingModal({ seatNumber, category, onConfirm, onCancel }: BookingModalProps) {
  const isCampusToHome = category === 'campus_to_home';
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [freeByTime, setFreeByTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Small delay so the modal entrance animation finishes first
    const t = setTimeout(() => firstInputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const canSubmit = isCampusToHome
    ? dropoff.trim().length > 0 && freeByTime.trim().length > 0
    : pickup.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    onConfirm(
      seatNumber,
      isCampusToHome
        ? { dropoff_location: dropoff.trim(), free_by_time: freeByTime.trim() }
        : { pickup_location: pickup.trim() }
    );
  }

  return (
    <BaseModal
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      badgeText="Booking"
      badgeColor="text-warmwhite/35 font-bold"
      title={`Seat ${seatNumber}`}
      ariaLabel={`Book seat ${seatNumber}`}
    >
      <form onSubmit={handleSubmit}>
        {isCampusToHome ? (
          <>
            <label
              htmlFor="dropoff-location"
              className="flex items-center gap-1.5 mb-1.5 text-xs text-warmwhite/70 font-medium"
            >
              <LocationIcon className="w-3.5 h-3.5 text-accent-red" />
              <span>Dropoff Location</span>
            </label>
            <input
              ref={firstInputRef}
              id="dropoff-location"
              value={dropoff}
              onChange={e => setDropoff(e.target.value)}
              placeholder="e.g. Fivestar, Waterpump, Gulshan"
              maxLength={60}
              autoComplete="off"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-4 py-3 text-sm text-warmwhite placeholder:text-warmwhite/25 outline-none transition-[border-color] duration-160 focus:border-accent-red/50 disabled:opacity-50 font-mono"
            />

            <label
              htmlFor="free-by-time"
              className="block mt-3.5 mb-1.5 text-xs text-warmwhite/70 font-medium"
            >
              Free By (Time)
            </label>
            <input
              id="free-by-time"
              value={freeByTime}
              onChange={e => setFreeByTime(e.target.value)}
              placeholder="e.g. 5:30 PM"
              maxLength={20}
              autoComplete="off"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-4 py-3 text-sm font-mono text-warmwhite placeholder:text-warmwhite/25 outline-none transition-[border-color] duration-160 focus:border-accent-red/50 disabled:opacity-50"
            />
          </>
        ) : (
          <>
            <label
              htmlFor="pickup-location"
              className="flex items-center gap-1.5 mb-1.5 text-xs text-warmwhite/70 font-medium"
            >
              <LocationIcon className="w-3.5 h-3.5 text-accent-red" />
              <span>Pickup Location</span>
            </label>
            <input
              ref={firstInputRef}
              id="pickup-location"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              placeholder="e.g. Fivestar, Waterpump, Gulshan"
              maxLength={60}
              autoComplete="off"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-4 py-3 text-sm text-warmwhite placeholder:text-warmwhite/25 outline-none transition-[border-color] duration-160 focus:border-accent-red/50 disabled:opacity-50 font-mono"
            />
          </>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-full border border-chrome/15 px-4 py-2.5 text-sm text-warmwhite/55 hover:text-warmwhite/80 transition-colors duration-160 active:scale-[0.97] disabled:opacity-40"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="group flex-1 flex items-center justify-between rounded-full bg-accent-red/90 pl-4 pr-1.5 py-1.5 text-sm font-bold text-white hover:bg-accent-red transition-colors disabled:opacity-35 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            {isSubmitting ? 'Booking...' : 'Confirm'}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 transition-transform duration-160 ease-out group-hover:translate-x-0.5">
              →
            </span>
          </motion.button>
        </div>
      </form>
    </BaseModal>
  );
}
