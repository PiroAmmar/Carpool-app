'use client';

import { useEffect, useRef } from 'react';

const THRESHOLD = 72;
const HOLD = 56;
const MAX_PULL = 120;
const DAMPING = 0.5;
const PILL_HEIGHT = 40;
const TRACK = 62;
const MIN_VISIBLE_MS = 600;

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done' | 'error';

const LABELS: Record<Phase, string> = {
  idle: 'Pull to refresh',
  pulling: 'Pull to refresh',
  ready: 'Release to sync',
  refreshing: 'Syncing',
  done: 'Up to date',
  error: "Couldn't sync",
};

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
}

function hasScrolledAncestor(start: HTMLElement | null): boolean {
  for (let n = start; n && n !== document.body; n = n.parentElement) {
    if (n.scrollTop > 0) return true;
  }
  return false;
}

/* Touch-only pull-down refresh. All per-frame work goes through refs and
   direct style writes; there is no React state, so a drag never re-renders. */
export function PullToRefresh({ onRefresh }: PullToRefreshProps) {
  const pillRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const pill = pillRef.current;
    const fill = fillRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!pill || !fill || !dot || !label) return;

    let phase: Phase = 'idle';
    let armed = false;
    let decided = false;
    let startX = 0;
    let startY = 0;
    let pull = 0;
    let raf = 0;
    let busy = false;

    const setPhase = (next: Phase) => {
      if (phase === next) return;
      phase = next;
      pill.dataset.phase = next;
      label.textContent = LABELS[next];
    };

    const paint = (y: number, animate: boolean) => {
      const progress = Math.min(y / THRESHOLD, 1);
      pill.style.transition = animate
        ? 'transform 220ms var(--ease-out-strong), opacity 220ms var(--ease-out-strong)'
        : 'none';
      pill.style.transform = `translate3d(-50%, ${y - PILL_HEIGHT - 8}px, 0)`;
      pill.style.opacity = y <= 0 ? '0' : String(Math.min(1, y / 36));
      if (phase !== 'refreshing') {
        fill.style.transform = `scaleX(${progress})`;
        dot.style.transform = `translate3d(${progress * TRACK}px, 0, 0)`;
      }
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint(pull, false);
      });
    };

    const collapse = () => {
      pull = 0;
      paint(0, true);
      setPhase('idle');
    };

    const runRefresh = async () => {
      busy = true;
      setPhase('refreshing');
      fill.style.transform = 'scaleX(1)';
      dot.style.transform = '';
      paint(HOLD, true);

      const minWait = new Promise<void>((r) => setTimeout(r, MIN_VISIBLE_MS));
      let failed = !navigator.onLine;
      try {
        if (!failed) await onRefreshRef.current();
      } catch {
        failed = true;
      }
      await minWait;

      setPhase(failed ? 'error' : 'done');
      await new Promise<void>((r) => setTimeout(r, failed ? 900 : 500));
      collapse();
      busy = false;
    };

    const onStart = (e: TouchEvent) => {
      armed = false;
      decided = false;
      if (busy || e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (window.scrollY > 0 || hasScrolledAncestor(target)) return;
      if (target?.closest('.fixed, [role="dialog"]')) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      armed = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!armed) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!decided) {
        if (dy < -4 || (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8)) {
          armed = false;
          return;
        }
        if (dy < 6) return;
        decided = true;
      }
      if (window.scrollY > 0) {
        armed = false;
        collapse();
        return;
      }

      pull = Math.min(MAX_PULL, Math.max(0, dy * DAMPING));
      const next: Phase = pull >= THRESHOLD ? 'ready' : 'pulling';
      if (next === 'ready' && phase !== 'ready') navigator.vibrate?.(8);
      setPhase(next);
      schedule();
    };

    const onEnd = () => {
      if (!armed || !decided) {
        armed = false;
        return;
      }
      armed = false;
      decided = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (phase === 'ready') void runRefresh();
      else collapse();
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={pillRef}
      data-phase="idle"
      aria-live="polite"
      className="ptr-pill pointer-events-none fixed left-1/2 z-[35] flex items-center gap-3 rounded-full border border-chrome/15 bg-panel px-4 shadow-xl"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        height: PILL_HEIGHT,
        opacity: 0,
        transform: `translate3d(-50%, ${-PILL_HEIGHT - 8}px, 0)`,
        willChange: 'transform, opacity',
      }}
    >
      <div className="relative h-4 flex-shrink-0" style={{ width: TRACK + 10 }} aria-hidden="true">
        <div className="absolute left-[5px] right-[5px] top-1/2 -translate-y-1/2 border-t-2 border-dashed border-chrome/25" />
        <div
          ref={fillRef}
          className="ptr-fill absolute left-[5px] top-1/2 h-0.5 -translate-y-1/2 origin-left rounded-full"
          style={{ width: TRACK, transform: 'scaleX(0)' }}
        />
        <div
          ref={dotRef}
          className="ptr-dot absolute left-0 top-1/2 -mt-[5px] h-2.5 w-2.5 rounded-full"
        />
      </div>
      <span
        ref={labelRef}
        className="ptr-label font-mono text-[11px] font-medium uppercase tracking-wider whitespace-nowrap"
      >
        {LABELS.idle}
      </span>
    </div>
  );
}
