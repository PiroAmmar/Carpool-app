interface RouteDisplayProps {
  stops: string[];
}

export function RouteDisplay({ stops }: RouteDisplayProps) {
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

      <p className="text-center font-mono text-[10px] tracking-widest text-warmwhite/30 uppercase mb-2">
        Current Route
      </p>

      <div className="flex items-center justify-center gap-1.5 flex-wrap text-sm text-warmwhite/60">
        {stops.map((stop, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span>{stop}</span>
            {i < stops.length - 1 && (
              <span className="text-chrome/25 text-xs">→</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
