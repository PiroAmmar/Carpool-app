import type { Booking, Trip } from '@/types';

/**
 * Amount owed for a booking. Reads the rate frozen on the booking at
 * creation time — never recomputed live, so editing a custom rate later
 * can't rewrite past paid/waived/pending amounts. Falls back to the trip
 * or global rate only for rows that predate rate_applied.
 */
export function fareFor(b: Booking, trip: Trip | null | undefined, globalRate: number | null): number {
  return Number(b.rate_applied ?? trip?.rate ?? globalRate ?? 0);
}

/** A trip that hasn't happened yet (and wasn't closed/completed early). */
export function isTripUpcoming(trip: Trip, now = new Date()): boolean {
  if (trip.status === 'completed' || trip.status === 'closed') return false;
  const start = new Date(`${trip.trip_date}T${trip.trip_time}`);
  return Number.isNaN(start.getTime()) ? false : start > now;
}
