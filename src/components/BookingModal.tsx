'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';
import { LocationIcon } from './LocationBadge';

interface BookingModalProps {
  seatNumber: number;
  onConfirm: (seatNumber: number, pickupLocation: string) => void;
  onCancel: () => void;
}

export function BookingModal({ seatNumber, onConfirm, onCancel }: BookingModalProps) {
  const [pickup, setPickup] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Small delay so the modal entrance animation finishes first
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onConfirm(seatNumber, pickup.trim());
  }

  return (
    <BaseModal
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      badgeText="Booking"
      badgeColor="text-warmwhite/35"
      title={`Seat ${seatNumber}`}
      ariaLabel={`Book seat ${seatNumber}`}
    >
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="pickup-location"
          className="flex items-center gap-1.5 mb-1.5 text-xs text-warmwhite/70 font-medium"
        >
          <LocationIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pickup / Dropoff Location</span>
        </label>
        <input
          ref={inputRef}
          id="pickup-location"
          value={pickup}
          onChange={e => setPickup(e.target.value)}
          placeholder="e.g. Fivestar, Waterpump, Gulshan"
          maxLength={60}
          autoComplete="off"
          disabled={isSubmitting}
          className="w-full rounded-lg border border-chrome/15 bg-asphalt px-4 py-3 text-sm text-warmwhite placeholder:text-warmwhite/25 outline-none transition-[border-color] duration-160 focus:border-emerald-500/50 disabled:opacity-50 font-mono"
        />

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
            disabled={!pickup.trim() || isSubmitting}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="group flex-1 flex items-center justify-between rounded-full bg-accent-red/90 pl-4 pr-1.5 py-1.5 text-sm font-bold text-white hover:bg-accent-red transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
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
