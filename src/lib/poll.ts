// Backstop polling for realtime subscriptions. Skips ticks while the tab is
// hidden or a previous fetch is still in flight, so a slow database never
// gets a pile-up of overlapping requests from every open tab.
export const POLL_MS = 30_000;

export function startPolling(fn: () => Promise<unknown>, ms = POLL_MS): () => void {
  let inFlight = false;

  const tick = async () => {
    if (inFlight || document.visibilityState !== 'visible') return;
    inFlight = true;
    try {
      await fn();
    } finally {
      inFlight = false;
    }
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') void tick();
  };

  const interval = setInterval(tick, ms);
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
