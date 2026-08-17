'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Route } from '@/types';
import { BaseModal } from './BaseModal';

interface TripSchedulerModalProps {
  presets: Route[];
  onConfirm: (data: {
    trip_date: string;
    trip_time: string;
    seats_total: number;
    direction: string;
    route_id: string | null;
    rate: number | null;
  }) => void;
  onCancel: () => void;
}

const DIRECTIONS = ['Home -> Campus', 'Campus -> Home'];

export function TripSchedulerModal({
  presets,
  onConfirm,
  onCancel,
}: TripSchedulerModalProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('07:30');
  const [seatsTotal, setSeatsTotal] = useState(4);
  const [direction, setDirection] = useState(DIRECTIONS[0]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(presets[0]?.id || '');
  const [rateInput, setRateInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time || isSubmitting) return;

    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();

    if (selectedDateTime < now) {
      setError('Cannot schedule a trip in the past. Please select today or a future date and time.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const numericRate = rateInput.trim() ? parseFloat(rateInput.trim()) : null;

    onConfirm({
      trip_date: date,
      trip_time: time,
      seats_total: seatsTotal,
      direction,
      route_id: selectedRouteId || null,
      rate: Number.isNaN(numericRate) ? null : numericRate,
    });
  }

  return (
    <BaseModal
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      badgeText="Trip Management"
      badgeColor="text-accent-red font-bold"
      title="Schedule New Trip"
      maxWidth="max-w-md"
      ariaLabel="Schedule New Trip"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Date</label>
            <input
              type="date"
              min={todayStr}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (error) setError(null);
              }}
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-3 py-2 text-xs font-mono text-warmwhite outline-none focus:border-chrome/35"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                if (error) setError(null);
              }}
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-chrome/15 bg-asphalt px-3 py-2 text-xs font-mono text-warmwhite outline-none focus:border-chrome/35"
            />
          </div>
        </div>

        {/* Direction */}
        <div>
          <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-chrome/15 bg-asphalt px-3 py-2.5 text-xs text-warmwhite outline-none focus:border-chrome/35"
          >
            {DIRECTIONS.map((dir) => (
              <option key={dir} value={dir} className="bg-panel text-warmwhite">
                {dir.replace(/->/g, '→')}
              </option>
            ))}
          </select>
        </div>

        {/* Route Preset Assignment */}
        <div>
          <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Route Preset</label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-chrome/15 bg-asphalt px-3 py-2.5 text-xs text-warmwhite outline-none focus:border-chrome/35"
          >
            <option value="" className="bg-panel text-warmwhite/50">-- None --</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-panel text-warmwhite">
                {preset.name} ({preset.stops.join(' → ')})
              </option>
            ))}
          </select>
        </div>

        {/* Total Seats & Trip Rate */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Total Seats</label>
            <div className="flex items-center rounded-lg border border-chrome/15 bg-asphalt px-2 py-1 justify-between h-[38px]">
              <button
                type="button"
                onClick={() => setSeatsTotal((prev) => Math.max(1, prev - 1))}
                disabled={seatsTotal <= 1 || isSubmitting}
                className="w-7 h-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-warmwhite font-mono font-bold text-sm disabled:opacity-25 active:scale-95 transition-all"
              >
                −
              </button>
              <span className="font-mono text-xs font-bold text-warmwhite select-none">
                {seatsTotal} {seatsTotal === 1 ? 'seat' : 'seats'}
              </span>
              <button
                type="button"
                onClick={() => setSeatsTotal((prev) => Math.min(4, prev + 1))}
                disabled={seatsTotal >= 4 || isSubmitting}
                className="w-7 h-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-warmwhite font-mono font-bold text-sm disabled:opacity-25 active:scale-95 transition-all"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block mb-1 text-xs text-warmwhite/60 font-medium">Trip Rate (Rs.)</label>
            <input
              type="number"
              placeholder="Global default"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-[38px] rounded-lg border border-chrome/15 bg-asphalt px-3 py-2 text-xs font-mono text-warmwhite placeholder:text-warmwhite/30 outline-none focus:border-chrome/35"
            />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-xs text-accent-red text-center font-medium font-mono"
            role="alert"
          >
            {error}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-full border border-chrome/15 px-4 py-2.5 text-sm text-warmwhite/55 hover:text-warmwhite/80 transition-colors duration-160 active:scale-[0.97] disabled:opacity-40"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 rounded-full bg-accent-red/90 hover:bg-accent-red px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-35 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Trip'}
          </motion.button>
        </div>
      </form>
    </BaseModal>
  );
}
