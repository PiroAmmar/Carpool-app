'use client';

import { motion } from 'framer-motion';

interface HudBarProps {
  rate: number | null;
}

export function HudBar({}: HudBarProps) {
  return (
    <header className="relative flex items-center justify-between px-4 py-3.5 border-b border-chrome/10 w-full">
      {/* Left counterweight slot matching the fixed sidebar hamburger button */}
      <div className="w-9 h-9 flex-shrink-0" aria-hidden="true" />

      {/* Symmetrically centered brand title */}
      <span className="text-sm font-semibold text-chrome tracking-tight truncate text-center mx-auto px-2">
        Ammar FAST carpool
      </span>

      {/* Right telemetry status indicator balanced with left slot */}
      <div className="w-9 flex items-center justify-end flex-shrink-0">
        <motion.span
          className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1, 0.85] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
          title="Online"
        />
      </div>
    </header>
  );
}
