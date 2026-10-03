'use client';

import {
  CAR_OUTLINE_PATH,
  CAR_OUTLINE_TRANSFORM,
  SEATS,
} from '@/components/SeatMap';

/* Route-level loading shell shared by /dashboard and /admin. Mirrors the
   passenger layout so the swap to real content does not shift. */
export function AppSkeleton() {
  return (
    <main
      className="min-h-screen bg-asphalt flex flex-col items-center relative overflow-hidden"
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className="fixed top-4 left-4 z-30 h-9 w-9 rounded-md bg-panel border border-chrome/10"
        aria-hidden="true"
      />

      <div className="w-full max-w-sm flex-1 flex flex-col relative z-0">
        <header className="flex items-center justify-between px-4 py-3.5 border-b border-chrome/10 w-full">
          <div className="w-9 h-9 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-chrome tracking-tight truncate text-center mx-auto px-2">
            Ammar FAST carpool
          </span>
          <div className="w-9 flex items-center justify-end flex-shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          </div>
        </header>

        <div className="px-6 py-6 flex flex-col flex-1">
          <div className="mt-2 bezel-shell">
            <div className="bezel-core p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-white/5">
                <div className="skeleton h-3.5 w-24 rounded" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>

              <div className="flex flex-col items-center">
                <div className="skeleton h-3 w-24 rounded mb-1.5" />
                <div className="skeleton h-3 w-16 rounded mb-2" />
                <svg
                  viewBox="400 50 1200 1900"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-[140px] h-auto"
                  aria-hidden="true"
                >
                  <g
                    transform={CAR_OUTLINE_TRANSFORM}
                    fill="var(--color-chrome)"
                    fillOpacity="0.35"
                    stroke="none"
                  >
                    <path d={CAR_OUTLINE_PATH} />
                  </g>
                  {SEATS.map(({ num, x, y, w, h }) => (
                    <rect
                      key={num}
                      className="skeleton-seat"
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={28}
                      fill="rgba(201,205,211,0.12)"
                      stroke="rgba(201,205,211,0.25)"
                      strokeWidth={6}
                    />
                  ))}
                </svg>
              </div>

              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="w-full border-t-2 border-dashed border-chrome/15 my-2" />
                <div className="skeleton h-4 w-48 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-11 w-full rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
