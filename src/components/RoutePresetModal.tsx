'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Route } from '@/types';

interface RoutePresetModalProps {
  presetToEdit?: Route | null;
  onConfirm: (data: { name: string; stops: string[] }) => void;
  onCancel: () => void;
}

export function RoutePresetModal({
  presetToEdit,
  onConfirm,
  onCancel,
}: RoutePresetModalProps) {
  const [name, setName] = useState(presetToEdit?.name || '');
  const [stopsText, setStopsText] = useState(presetToEdit?.stops?.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, isSubmitting]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !stopsText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const stops = stopsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onConfirm({ name: name.trim(), stops });
  }

  return (
    <AnimatePresence>
      <motion.div
        key="preset-modal-backdrop"
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
        key="preset-modal"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: 'transform, opacity' }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal
        aria-label="Route Preset"
      >
        <div className="w-full max-w-sm bezel-shell shadow-2xl">
          <div className="bezel-core px-6 py-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-warmwhite/40 uppercase font-bold mb-0.5">
                  Route Presets
                </p>
                <h2 className="text-base font-semibold text-warmwhite">
                  {presetToEdit ? 'Edit Route Preset' : 'New Route Preset'}
                </h2>
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

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Campus → Gulshan Route"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-chrome/15 bg-asphalt px-3 py-2.5 text-xs text-warmwhite placeholder:text-warmwhite/25 outline-none focus:border-chrome/35"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Stops (comma-separated)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. FAST main campus, Millenium, Gulshan Chowrangi, Home"
                  value={stopsText}
                  onChange={(e) => setStopsText(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-chrome/15 bg-asphalt px-3 py-2 text-xs text-warmwhite placeholder:text-warmwhite/25 outline-none focus:border-chrome/35 resize-none font-mono"
                />
                <p className="mt-1 text-[10px] text-warmwhite/40">
                  Enter stops in order, separated by commas.
                </p>
              </div>

              <div className="flex gap-3 mt-2">
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
                  disabled={!name.trim() || !stopsText.trim() || isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  className="flex-1 rounded-full bg-warmwhite/90 hover:bg-warmwhite px-4 py-2.5 text-sm font-bold text-asphalt transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Preset'}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
