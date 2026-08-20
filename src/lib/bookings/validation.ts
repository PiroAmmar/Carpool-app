/**
 * Validates whether booking location requirements are satisfied.
 */
export function hasValidBookingLocation(
  pickupLocation?: string | null,
  dropoffLocation?: string | null,
  freeByTime?: string | null
): boolean {
  return Boolean(pickupLocation) || Boolean(dropoffLocation && freeByTime);
}

export function isValidBookingPayload(params: {
  tripId?: string;
  seatNumber?: number;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  freeByTime?: string | null;
}): boolean {
  const { tripId, seatNumber, pickupLocation, dropoffLocation, freeByTime } = params;
  return Boolean(tripId && seatNumber && hasValidBookingLocation(pickupLocation, dropoffLocation, freeByTime));
}
