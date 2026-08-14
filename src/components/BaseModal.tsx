'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BaseModalProps {
  onCancel: () => void;
  isSubmitting?: boolean;
  badgeText?: string;
  badgeColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string;
  ariaLabel: string;
  children: React.ReactNode;
}

export function BaseModal({
  onCancel,
  isSubmitting = false,
  badgeText,
  badgeColor = 'text-warmwhite/40 font-bold',
  title,
  subtitle,
  maxWidth = 'max-w-sm',
  ariaLabel,
  children,
}: BaseModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, isSubmitting]);

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={() => !isSubmitting && onCancel()}
        className="fixed inset-0 z-40 bg-asphalt/80"
        style={{ willChange: 'opacity' }}
        aria-hidden
      />

      <motion.div
        key="modal-shell"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: 'transform, opacity' }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal
        aria-label={ariaLabel}
      >
        <div className={`w-full ${maxWidth} bezel-shell shadow-2xl my-auto`}>
          <div className="bezel-core px-6 py-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                {badgeText && (
                  <p className={`font-mono text-[10px] tracking-widest uppercase mb-0.5 ${badgeColor}`}>
                    {badgeText}
                  </p>
                )}
                <h2 className="text-base font-semibold text-warmwhite">
                  {title}
                </h2>
                {subtitle && (
                  <div className="text-xs text-warmwhite/60 mt-0.5 font-mono">
                    {subtitle}
                  </div>
                )}
              </div>
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="text-warmwhite/30 hover:text-warmwhite/60 transition-colors text-2xl leading-none mt-0.5 disabled:opacity-30"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {children}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
