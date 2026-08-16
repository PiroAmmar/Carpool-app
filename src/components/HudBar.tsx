'use client';

import { motion } from 'framer-motion';

interface HudBarProps {
  rate: number | null;
}

export function HudBar({}: HudBarProps) {
  return (
    <header className="flex items-center justify-end px-6 py-3 border-b border-chrome/10 md:justify-between">
      {/* Sidebar toggle floats separately on the left; brand label always shows, right-aligned on mobile, spread on desktop. */}
      <span className="block text-sm font-semibold text-chrome tracking-tight truncate">
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
