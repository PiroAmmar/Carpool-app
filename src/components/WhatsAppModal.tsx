'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';

interface WhatsAppModalProps {
  initialNumber?: string | null;
  onSave: (number: string) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Extracts pure 10-digit local number without country code or leading zero.
 * e.g. "+923342121401" → "3342121401"
 * e.g. "03342121401"   → "3342121401"
 */
function extractLocalDigits(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function WhatsAppModal({
  initialNumber = '',
  onSave,
  onCancel,
}: WhatsAppModalProps) {
  const [digits, setDigits] = useState(() => extractLocalDigits(initialNumber));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    let clean = raw.replace(/\D/g, '');

    if (clean.startsWith('92')) {
      clean = clean.slice(2);
    }
    if (clean.startsWith('0')) {
      clean = clean.slice(1);
    }

    const trimmed = clean.slice(0, 10);
    setDigits(trimmed);
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit Pakistani mobile number (e.g., 3342121401).');
      return;
    }

    const fullFormattedNumber = `+92${digits}`;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(fullFormattedNumber);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save number.');
      setIsSubmitting(false);
    }
  }

  const isValid = digits.length === 10;

  return (
    <BaseModal
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      badgeText="Contact Settings"
      badgeColor="text-emerald-400 font-bold"
      title="WhatsApp Number"
      ariaLabel="Configure WhatsApp Number"
    >
      <p className="text-xs text-warmwhite/60 mb-4 leading-relaxed">
        Enter your 10-digit WhatsApp number. <span className="font-mono text-emerald-400 font-semibold">+92</span> prefix is added automatically.
      </p>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="whatsapp-input"
          className="block mb-1.5 text-xs font-medium text-warmwhite/70"
        >
          WhatsApp Mobile Number
        </label>

        {/* Input container with fixed +92 prefix badge */}
        <div className="relative flex items-center rounded-lg border border-chrome/15 bg-asphalt focus-within:border-emerald-500/50 transition-[border-color] duration-160">
          <span className="pl-3.5 pr-2 font-mono text-sm font-bold text-emerald-400 select-none">
            +92
          </span>
          <input
            autoFocus
            id="whatsapp-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={digits}
            onChange={handleInputChange}
            placeholder="3342121401"
            maxLength={10}
            disabled={isSubmitting}
            className="w-full bg-transparent py-3 pr-4 font-mono text-sm text-warmwhite placeholder:text-warmwhite/25 outline-none disabled:opacity-50"
          />
        </div>

        {/* Real-time status */}
        <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
          {error ? (
            <span className="text-accent-red font-medium">{error}</span>
          ) : (
            <span className="text-warmwhite/40">
              {isValid ? '✓ Ready to save' : 'Enter 10 digits (no zero)'}
            </span>
          )}
          <span className={`${isValid ? 'text-emerald-400 font-bold' : 'text-warmwhite/30'}`}>
            {digits.length}/10
          </span>
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
            disabled={!isValid || isSubmitting}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 rounded-full bg-emerald-500/90 hover:bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Number'}
          </motion.button>
        </div>
      </form>
    </BaseModal>
  );
}
