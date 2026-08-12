'use client';

import { motion } from 'framer-motion';

interface HudBarProps {
  rate: number | null;
}

export function HudBar({ rate }: HudBarProps) {
  return (
    <header className="flex items-center justify-end px-6 py-3 border-b border-chrome/10 md:justify-between">
      {/* On mobile, sidebar toggle is on the left, so we right-align this. On desktop, justify-between handles it. */}
      <span className="hidden md:block text-sm font-semibold text-chrome tracking-tight">
        Ammar FAST carpool
      </span>
      <div className="flex items-center gap-3">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-accent-red"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
      </div>
    </header>
  );
}
