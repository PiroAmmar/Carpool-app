'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';

export type PaymentMethod = 'online' | 'cash';

interface PaymentMethodRow {
  bookingId: string;
  passengerName: string;
  amount: number;
}

interface PaymentMethodModalProps {
  rows: PaymentMethodRow[];
  onConfirm: (methods: Record<string, PaymentMethod>) => void;
  onCancel: () => void;
}

export function PaymentMethodModal({ rows, onConfirm, onCancel }: PaymentMethodModalProps) {
  const [methods, setMethods] = useState<Record<string, PaymentMethod>>(
    () => Object.fromEntries(rows.map((r) => [r.bookingId, 'cash' as PaymentMethod]))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBulk = rows.length > 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    onConfirm(methods);
  }

  return (
    <BaseModal
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      badgeText="Payment Method"
      badgeColor="text-emerald-400 font-bold"
      title={isBulk ? `Mark ${rows.length} Bookings Paid` : `Mark Paid — ${rows[0]?.passengerName}`}
      ariaLabel="Select Payment Method"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {rows.map((r) => (
            <div key={r.bookingId} className="flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-warmwhite truncate">{r.passengerName}</span>
                <span className="text-[11px] font-mono text-warmwhite/40">Rs. {r.amount}</span>
              </div>
              <select
                value={methods[r.bookingId]}
                disabled={isSubmitting}
                onChange={(e) =>
                  setMethods((prev) => ({ ...prev, [r.bookingId]: e.target.value as PaymentMethod }))
                }
                className="bg-asphalt text-warmwhite font-mono text-xs border border-chrome/15 rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 disabled:opacity-50"
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
              </select>
            </div>
          ))}
        </div>

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
            disabled={isSubmitting}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 rounded-full bg-emerald-500/90 hover:bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Confirm Paid'}
          </motion.button>
        </div>
      </form>
    </BaseModal>
  );
}
