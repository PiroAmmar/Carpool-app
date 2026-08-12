'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface HudBarProps {
  rate: number | null;
}

export function HudBar({ rate }: HudBarProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-chrome/10">
      <span className="text-sm font-semibold text-chrome tracking-tight">
        Ammar FAST carpool
      </span>
      <div className="flex items-center gap-3">
        {rate != null && (
          <span className="font-mono text-sm text-warmwhite/60">
            Rs.&nbsp;{rate}
          </span>
        )}
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-route-green"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
      </div>
      <button
        onClick={handleLogout}
        className="ml-3 rounded-md px-2.5 py-1 text-xs text-warmwhite/35 hover:text-warmwhite/70 hover:bg-white/5 transition-colors active:scale-95"
        aria-label="Sign out"
      >
        Sign out
      </button>
    </header>
  );
}
