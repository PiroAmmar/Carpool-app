'use client';

interface LocationIconProps {
  className?: string;
}

export function LocationIcon({ className = 'w-3.5 h-3.5 text-emerald-400 flex-shrink-0' }: LocationIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

interface LocationBadgeProps {
  location: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function LocationBadge({ location, className = '', size = 'md' }: LocationBadgeProps) {
  const isSm = size === 'sm';
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 font-mono shadow-sm transition-colors ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <LocationIcon className={isSm ? 'w-3 h-3 text-emerald-400 flex-shrink-0' : 'w-3.5 h-3.5 text-emerald-400 flex-shrink-0'} />
      <span className="font-semibold text-emerald-300 truncate">{location}</span>
    </div>
  );
}
