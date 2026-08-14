interface RouteDisplayProps {
  stops: string[];
  direction?: string | null;
}

export function RouteDisplay({ stops, direction }: RouteDisplayProps) {
  if (!stops || stops.length === 0) return null;

  return (
    <div className="mt-6">
      {/* Dashed route-line — structural road motif, not decoration */}
      <div
        className="h-px w-full mb-4"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(201,205,211,0.15) 0 8px, transparent 8px 16px)',
        }}
        aria-hidden
      />

      <p className="text-center font-mono text-xs font-semibold tracking-widest text-warmwhite/90 uppercase mb-2">
        {direction ? 'Route Heading' : 'Current Route'}
      </p>

      {direction && (
        <p className="text-center text-sm font-bold text-accent-red mb-3 break-words px-2">
          {/* Arrows rendered as separate white spans — plain text here would
              inherit the red heading color and disappear against the route line. */}
          {direction.split(/->|→/).map((segment, i, arr) => (
            <span key={i}>
              {segment.trim()}
              {i < arr.length - 1 && <span className="text-white mx-1.5">→</span>}
            </span>
          ))}
        </p>
      )}

      {/* flex-wrap and break-words for hardening against extremely long strings */}
      <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-warmwhite/90 px-2 break-words font-medium">
        {stops.map((stop, i) => (
          <span key={i} className="flex items-center gap-2 min-w-0">
            <span className="break-words line-clamp-2">{stop}</span>
            {i < stops.length - 1 && (
              <span className="text-white text-xs flex-shrink-0 opacity-80">→</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
