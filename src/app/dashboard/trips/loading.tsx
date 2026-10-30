// Shown instantly on navigation while the server fetches bookings.
// Mirrors TripsClient's layout so nothing jumps when data arrives.
function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-white/[0.06] animate-pulse ${className}`} />;
}

export default function MyTripsLoading() {
  return (
    <main className="min-h-screen bg-asphalt flex flex-col items-center" aria-busy="true" aria-label="Loading trips">
      <div className="w-full max-w-sm flex-1 flex flex-col">
        <header className="flex items-center justify-between px-4 py-3.5 border-b border-chrome/10 w-full">
          <div className="w-9 h-9" />
          <span className="text-sm font-semibold text-chrome tracking-tight mx-auto px-2">
            My Trips &amp; Payments
          </span>
          <div className="w-9" />
        </header>

        <div className="px-6 py-6 flex flex-col gap-6">
          <div className="rounded-xl border border-chrome/10 bg-panel p-5">
            <Bar className="h-2.5 w-28" />
            <Bar className="h-8 w-36 mt-2.5" />
            <Bar className="h-3 w-24 mt-2" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-chrome/10 bg-panel px-3 py-2.5">
                <Bar className="h-4 w-16" />
                <Bar className="h-2.5 w-12 mt-1.5" />
              </div>
            ))}
          </div>

          <div>
            <Bar className="h-2.5 w-24 mb-3" />
            <div className="flex gap-1.5 mb-3">
              {[0, 1, 2, 3].map((i) => (
                <Bar key={i} className="h-6 w-14 rounded-full" />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-chrome/10 bg-panel px-3.5 py-3">
                  <Bar className="h-3 w-40" />
                  <Bar className="h-2.5 w-28 mt-2" />
                  <Bar className="h-2.5 w-20 mt-3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
