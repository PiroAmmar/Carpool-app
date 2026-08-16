'use client';

import { motion } from 'framer-motion';

interface HudBarProps {
  rate: number | null;
}

export function HudBar({}: HudBarProps) {
  return (
    <header className="flex items-center justify-center gap-2 pl-16 pr-4 py-3 border-b border-chrome/10 md:justify-between md:pl-6 md:pr-6">
      {/* Sidebar toggle is fixed top-left and floats above this bar; pl-16 keeps the brand label clear of it on mobile, centered in the remaining space. Desktop spreads brand/status apart. */}
      <span className="text-sm font-semibold text-chrome tracking-tight truncate">
        Ammar FAST carpool
      </span>
      <div className="flex items-center gap-3">
        <motion.span
          className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1, 0.85] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
          title="Online"
        />
      </div>
    </header>
  );
}
