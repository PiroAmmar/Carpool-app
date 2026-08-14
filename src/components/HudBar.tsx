'use client';

import { motion } from 'framer-motion';

interface HudBarProps {
  rate: number | null;
}

export function HudBar({}: HudBarProps) {
  return (
    <header className="flex items-center justify-end px-6 py-3 border-b border-chrome/10 md:justify-between">
      {/* On mobile, sidebar toggle is on the left, so we right-align this. On desktop, justify-between handles it. */}
      <span className="hidden md:block text-sm font-semibold text-chrome tracking-tight">
        Ammar FAST carpool
      </span>
      <div className="flex items-center gap-3">
        <motion.span
          className="h-2 w-2 rounded-full bg-emerald-400"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1, 0.85] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
          title="Online"
        />
      </div>
    </header>
  );
}
