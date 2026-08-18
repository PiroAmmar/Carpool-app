'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';
import { LocationBadge } from './LocationBadge';
import type { TripCategory } from '@/lib/tripCategory';
import type { ApprovalSubmission } from '@/types';

interface AdminApprovalModalProps {
  passengerName: string;
  seatNumber: number;
  category: TripCategory;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  freeByTime?: string | null;
  defaultTime?: string;
  onConfirm: (submission: ApprovalSubmission) => void;
  onCancel: () => void;
}

export function AdminApprovalModal({
  passengerName,
  seatNumber,
  category,
  pickupLocation,
  dropoffLocation,
  freeByTime,
  defaultTime = '07:45 AM',
  onConfirm,
  onCancel,
}: AdminApprovalModalProps) {
  const isCampusToHome = category === 'campus_to_home';
  const [time, setTime] = useState(defaultTime);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isCampusToHome ? message.trim().length > 0 : time.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    onConfirm(isCampusToHome ? { admin_message: message.trim() } : { approved_time: time.trim() });
  }

  return (
    <BaseModal
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      badgeText="Approve Request"
      badgeColor="text-emerald-400 font-bold"
      title={`Seat ${seatNumber} — ${passengerName}`}
      subtitle={
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {isCampusToHome ? (
            <>
              <LocationBadge location={dropoffLocation ?? null} size="sm" />
              {freeByTime && (
                <span className="inline-flex items-center rounded-lg bg-signal-amber/10 border border-signal-amber/25 px-2 py-0.5 text-[11px] font-mono text-signal-amber">
                  Free by {freeByTime}
                </span>
              )}
            </>
          ) : (
            <LocationBadge location={pickupLocation ?? null} size="sm" />
          )}
        </div>
      }
      ariaLabel="Approve Booking"
    >
      <form onSubmit={handleSubmit}>
        {isCampusToHome ? (
          <>
            <label
              htmlFor="admin-message"
              className="block mb-1.5 text-xs text-warmwhite/60 font-medium"
            >
              Message to Passenger
            </label>
            <textarea
              autoFocus
              id="admin-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Leaving at 5:45 PM, come to the main gate"
              maxLength={280}
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-4 py-3 text-sm text-warmwhite placeholder:text-warmwhite/25 outline-none transition-[border-color] duration-160 focus:border-emerald-500/50 disabled:opacity-50 resize-none"
            />
          </>
        ) : (
          <>
            <label
              htmlFor="approval-time"
              className="block mb-1.5 text-xs text-warmwhite/60 font-medium"
            >
              Set Pickup / Arrival Time
            </label>
            <input
              autoFocus
              id="approval-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 07:45 AM"
              maxLength={20}
              autoComplete="off"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-4 py-3 text-sm font-mono text-warmwhite placeholder:text-warmwhite/25 outline-none transition-[border-color] duration-160 focus:border-emerald-500/50 disabled:opacity-50"
            />
          </>
        )}

        <div className="flex gap-3 mt-5">
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
            className="flex-1 rounded-full bg-emerald-500/90 hover:bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Approving...' : 'Approve'}
          </motion.button>
        </div>
      </form>
    </BaseModal>
  );
}
