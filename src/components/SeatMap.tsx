'use client';

import { motion } from 'framer-motion';
import type { SeatStatus } from '@/types';

/* ─── Seat fill / stroke by status ─────────────────────────────── */
const FILL: Record<SeatStatus, string> = {
  available: 'transparent',
  pending: '#E0A526',
  'mine-pending': '#E0A526',
  approved: '#5EA829',
};
const STROKE: Record<SeatStatus, string> = {
  available: 'rgba(201,205,211,0.15)',
  pending: 'rgba(224,165,38,0.80)',
  'mine-pending': 'rgba(224,165,38,0.90)',
  approved: 'rgba(94,168,41,0.80)',
};
const TEXT_COLOR: Record<SeatStatus, string> = {
  available: 'rgba(201,205,211,0.40)',
  pending: 'rgba(11,13,16,0.90)',
  'mine-pending': 'rgba(11,13,16,0.95)',
  approved: 'rgba(11,13,16,0.95)',
};

/* ─── Individual seat ───────────────────────────────────────────── */
interface SeatProps {
  num: number;
  x: number;
  y: number;
  w: number;
  h: number;
  status: SeatStatus;
}

function Seat({ num, x, y, w, h, status }: SeatProps) {
  const cx = x + w / 2;
  const cy = y + h / 2;

  return (
    <motion.g>
      {/* Seat body */}
      <motion.rect
        x={x} y={y} width={w} height={h} rx={12}
        fill={FILL[status]}
        stroke={STROKE[status]}
        strokeWidth={1.5}
        animate={
          status === 'available'
            ? { opacity: [0.6, 1, 0.6] }
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
  { num: 1, x: 42, y: 85, w: 48, h: 48 },  // front-left
  { num: 2, x: 110, y: 85, w: 48, h: 48 }, // front-right
  { num: 3, x: 42, y: 155, w: 48, h: 48 }, // back-left
  { num: 4, x: 110, y: 155, w: 48, h: 48 },// back-right
];

/* ─── SeatMap ───────────────────────────────────────────────────── */
interface SeatMapProps {
  bookings: Array<{ seat_number: number; status: string; user_id: string }>;
  currentUserId: string;
  seatsTotal?: number;
}

export function SeatMap({
  bookings,
  currentUserId,
  seatsTotal = 4,
}: SeatMapProps) {
  function getSeatStatus(num: number): SeatStatus {
    const b = bookings.find(b => b.seat_number === num);
    if (!b) return 'available';
    if (b.status === 'approved') return 'approved';
    if (b.user_id === currentUserId) return 'mine-pending';
    return 'pending';
  }

  return (
    <div className="relative w-full max-w-[200px] mx-auto select-none" role="img" aria-label="Car seat map">
      <svg viewBox="0 0 200 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ── Realistic Premium Car Outline ── */}
        
        {/* Wheels */}
        <rect x="22" y="60" width="8" height="35" rx="3" fill="#16191d" stroke="rgba(201,205,211,0.1)" strokeWidth="1" />
        <rect x="170" y="60" width="8" height="35" rx="3" fill="#16191d" stroke="rgba(201,205,211,0.1)" strokeWidth="1" />
        <rect x="22" y="215" width="8" height="35" rx="3" fill="#16191d" stroke="rgba(201,205,211,0.1)" strokeWidth="1" />
        <rect x="170" y="215" width="8" height="35" rx="3" fill="#16191d" stroke="rgba(201,205,211,0.1)" strokeWidth="1" />

        {/* Side Mirrors */}
        <path d="M 28 95 C 18 90, 18 105, 28 102 Z" fill="#0b0d10" stroke="rgba(201,205,211,0.2)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 172 95 C 182 90, 182 105, 172 102 Z" fill="#0b0d10" stroke="rgba(201,205,211,0.2)" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Main Car Body Silhouette */}
        <path
          d="M 50 15 
             C 70 5, 130 5, 150 15
             C 165 25, 172 60, 172 100
             L 172 230
             C 172 270, 165 295, 145 305
             C 125 315, 75 315, 55 305
             C 35 295, 28 270, 28 230
             L 28 100
             C 28 60, 35 25, 50 15 Z"
          fill="transparent"
          stroke="rgba(201,205,211,0.2)"
          strokeWidth="2.5"
        />

        {/* Windshield */}
        <path d="M 45 75 C 100 55, 100 55, 155 75 C 160 85, 160 85, 150 100 C 100 95, 100 95, 50 100 C 40 85, 40 85, 45 75 Z" fill="rgba(201,205,211,0.03)" stroke="rgba(201,205,211,0.15)" strokeWidth="1.5" />

        {/* Roof line */}
        <path d="M 45 120 L 155 120 M 45 200 L 155 200" stroke="rgba(201,205,211,0.05)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Rear Window */}
        <path d="M 55 240 C 100 245, 100 245, 145 240 C 150 225, 150 225, 140 215 C 100 220, 100 220, 60 215 C 50 225, 50 225, 55 240 Z" fill="rgba(201,205,211,0.03)" stroke="rgba(201,205,211,0.15)" strokeWidth="1.5" />

        {/* Headlights */}
        <path d="M 45 20 C 55 15, 55 15, 60 22 C 55 28, 45 25, 45 20 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(201,205,211,0.1)" strokeWidth="1" />
        <path d="M 155 20 C 145 15, 145 15, 140 22 C 145 28, 155 25, 155 20 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(201,205,211,0.1)" strokeWidth="1" />

        {/* Taillights */}
        <path d="M 45 295 C 55 298, 60 295, 65 290 L 40 290 C 40 290, 42 293, 45 295 Z" fill="rgba(224,38,38,0.1)" stroke="rgba(224,38,38,0.2)" strokeWidth="1" />
        <path d="M 155 295 C 145 298, 140 295, 135 290 L 160 290 C 160 290, 158 293, 155 295 Z" fill="rgba(224,38,38,0.1)" stroke="rgba(224,38,38,0.2)" strokeWidth="1" />

        {/* Center console hint */}
        <rect x="96" y="115" width="8" height="85" rx="4"
              fill="transparent" stroke="rgba(201,205,211,0.06)" strokeWidth="1" />

        {/* ── Seats ── */}
        {SEATS.slice(0, seatsTotal).map(({ num, x, y, w, h }) => (
          <Seat
            key={num}
            num={num} x={x} y={y} w={w} h={h}
            status={getSeatStatus(num)}
          />
        ))}
      </svg>
    </div>
  );
}
