'use client';

import { motion } from 'framer-motion';
import type { SeatStatus } from '@/types';

/* ─── Seat fill / stroke by status ─────────────────────────────── */
const FILL: Record<SeatStatus, string> = {
  available: '#1E2228',
  pending: '#E0A526',
  'mine-pending': '#E0A526',
  approved: '#5EA829',
};
const STROKE: Record<SeatStatus, string> = {
  available: 'rgba(201,205,211,0.10)',
  pending: 'rgba(224,165,38,0.50)',
  'mine-pending': 'rgba(224,165,38,0.85)',
  approved: 'rgba(94,168,41,0.55)',
};
const TEXT_COLOR: Record<SeatStatus, string> = {
  available: 'rgba(242,241,237,0.20)',
  pending: 'rgba(11,13,16,0.85)',
  'mine-pending': 'rgba(11,13,16,0.85)',
  approved: 'rgba(11,13,16,0.90)',
};

/* ─── Individual seat ───────────────────────────────────────────── */
interface SeatProps {
  num: number;
  x: number;
  y: number;
  w: number;
  h: number;
  status: SeatStatus;
  isBookingMode: boolean;
  onClick: () => void;
}

function Seat({ num, x, y, w, h, status, isBookingMode, onClick }: SeatProps) {
  const isClickable = status === 'available' && isBookingMode;
  const cx = x + w / 2;
  const cy = y + h / 2;

  return (
    <motion.g
      onClick={isClickable ? onClick : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
      whileHover={isClickable ? { scale: 1.05 } : undefined}
      whileTap={isClickable ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Booking-mode selection ring — pulses on available seats */}
      {isClickable && (
        <motion.rect
          x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={11}
          fill="none"
          stroke="rgba(201,205,211,0.35)"
          strokeWidth={1}
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Seat body */}
      <motion.rect
        x={x} y={y} width={w} height={h} rx={8}
        fill={FILL[status]}
        stroke={STROKE[status]}
        strokeWidth={1.5}
        animate={
          status === 'available'
            ? { opacity: [0.55, 1, 0.55] }
            : { opacity: 1 }
        }
        transition={
          status === 'available'
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
        }
      />

      {/* Seat number */}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="15"
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="500"
        fill={TEXT_COLOR[status]}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {num}
      </text>
    </motion.g>
  );
}

/* ─── Seat positions (2 front + 2 back) ────────────────────────── */
const SEATS = [
  { num: 1, x: 21, y: 72, w: 62, h: 74 },  // front-left
  { num: 2, x: 117, y: 72, w: 62, h: 74 }, // front-right
  { num: 3, x: 21, y: 158, w: 62, h: 62 }, // back-left
  { num: 4, x: 117, y: 158, w: 62, h: 62 },// back-right
];

/* ─── SeatMap ───────────────────────────────────────────────────── */
interface SeatMapProps {
  bookings: Array<{ seat_number: number; status: string; user_id: string }>;
  currentUserId: string;
  seatsTotal?: number;
  onSeatClick: (seatNumber: number) => void;
  isBookingMode: boolean;
}

export function SeatMap({
  bookings,
  currentUserId,
  seatsTotal = 4,
  onSeatClick,
  isBookingMode,
}: SeatMapProps) {
  function getSeatStatus(num: number): SeatStatus {
    const b = bookings.find(b => b.seat_number === num);
    if (!b) return 'available';
    if (b.status === 'approved') return 'approved';
    if (b.user_id === currentUserId) return 'mine-pending';
    return 'pending';
  }

  return (
    <div className="relative w-full max-w-[220px] mx-auto select-none" role="img" aria-label="Car seat map">
      <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ── Car body ── */}
        <rect x="12" y="10" width="176" height="280" rx="32"
              fill="#16191D" stroke="rgba(201,205,211,0.18)" strokeWidth="2" />

        {/* Windshield */}
        <rect x="28" y="16" width="144" height="50" rx="18"
              fill="rgba(11,13,16,0.85)" stroke="rgba(201,205,211,0.09)" strokeWidth="1.5" />

        {/* Rear window */}
        <rect x="28" y="234" width="144" height="46" rx="18"
              fill="rgba(11,13,16,0.85)" stroke="rgba(201,205,211,0.09)" strokeWidth="1.5" />

        {/* Left mirror */}
        <rect x="0" y="60" width="13" height="26" rx="4"
              fill="#16191D" stroke="rgba(201,205,211,0.14)" strokeWidth="1" />

        {/* Right mirror */}
        <rect x="187" y="60" width="13" height="26" rx="4"
              fill="#16191D" stroke="rgba(201,205,211,0.14)" strokeWidth="1" />

        {/* Center console */}
        <rect x="92" y="72" width="16" height="148" rx="3"
              fill="rgba(11,13,16,0.55)" stroke="rgba(201,205,211,0.06)" strokeWidth="1" />

        {/* ── Seats ── */}
        {SEATS.slice(0, seatsTotal).map(({ num, x, y, w, h }) => (
          <Seat
            key={num}
            num={num} x={x} y={y} w={w} h={h}
            status={getSeatStatus(num)}
            isBookingMode={isBookingMode}
            onClick={() => onSeatClick(num)}
          />
        ))}
      </svg>
    </div>
  );
}
