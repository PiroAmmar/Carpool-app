'use client';

import { BaseModal } from './BaseModal';
import { LocationBadge } from './LocationBadge';
import type { Trip, Booking, Route } from '@/types';

interface PassengerDetailsModalProps {
  passengerName: string;
  passengerEmail: string;
  bookings: Booking[];
  trips: Trip[];
  routes: Route[];
  globalRate: number | null;
  onClose: () => void;
}

function formatDirection(dir?: string | null): string {
  if (!dir) return '';
  return dir.replace(/->/g, '→');
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function PassengerDetailsModal({
  passengerName,
  passengerEmail,
  bookings,
  trips,
  routes,
  globalRate,
  onClose,
}: PassengerDetailsModalProps) {
  const approved = bookings.filter((b) => b.status === 'approved');

  const paid = approved.filter((b) => b.payment_status === 'paid');
  const waived = approved.filter((b) => b.payment_status === 'waived');
  const pending = approved.filter((b) => b.payment_status === 'pending');

  const rateFor = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    return trip?.rate ?? globalRate ?? 0;
  };

  const sumRate = (list: Booking[]) =>
    list.reduce((sum, b) => sum + rateFor(b.trip_id), 0);

  const paidAmount = sumRate(paid);
  const waivedAmount = sumRate(waived);
  const pendingAmount = sumRate(pending);

  const paymentBadgeClass = (status: Booking['payment_status']) => {
    if (status === 'paid') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'waived') return 'bg-chrome/10 text-chrome border-chrome/25';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  return (
    <BaseModal
      onCancel={onClose}
      badgeText="Passenger Details"
      badgeColor="text-chrome font-bold"
      title={passengerName}
      subtitle={passengerEmail}
      maxWidth="max-w-md"
      ariaLabel="Passenger Details"
    >
      {/* Payment breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-center">
          <p className="font-mono text-sm font-bold text-emerald-400">Rs. {paidAmount}</p>
          <p className="text-[10px] text-warmwhite/50 mt-0.5">Paid ({paid.length})</p>
        </div>
        <div className="rounded-lg border border-chrome/20 bg-chrome/5 px-3 py-2.5 text-center">
          <p className="font-mono text-sm font-bold text-chrome">Rs. {waivedAmount}</p>
          <p className="text-[10px] text-warmwhite/50 mt-0.5">Waived ({waived.length})</p>
        </div>
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-center">
          <p className="font-mono text-sm font-bold text-amber-400">Rs. {pendingAmount}</p>
          <p className="text-[10px] text-warmwhite/50 mt-0.5">Pending ({pending.length})</p>
        </div>
      </div>

      {/* Approved trip list */}
      <p className="font-mono text-[10px] tracking-widest uppercase text-warmwhite/40 mb-2">
        Approved Trips ({approved.length})
      </p>

      {approved.length === 0 ? (
        <p className="text-xs text-warmwhite/35 font-mono py-4 text-center">
          No approved trips yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {approved
            .slice()
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .map((b) => {
              const trip = trips.find((t) => t.id === b.trip_id);
              const route = trip ? routes.find((r) => r.id === trip.route_id) : null;
              return (
                <div
                  key={b.id}
                  className="rounded-lg border border-chrome/10 bg-asphalt px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-warmwhite">
                      {trip ? formatDate(trip.trip_date) : 'Trip removed'}
                      {trip?.trip_time ? ` · ${trip.trip_time}` : ''}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase flex-shrink-0 ${paymentBadgeClass(
                        b.payment_status
                      )}`}
                    >
                      {b.payment_status}
                    </span>
                  </div>
                  <p className="text-[11px] text-warmwhite/50 font-mono truncate">
                    {route?.name || formatDirection(trip?.direction) || 'No route set'}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <LocationBadge location={b.pickup_location} size="sm" />
                    <span className="text-[11px] font-mono text-warmwhite/40 flex-shrink-0">
                      Seat {b.seat_number} · Rs. {rateFor(b.trip_id)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full mt-5 rounded-full border border-chrome/15 px-4 py-2.5 text-sm text-warmwhite/55 hover:text-warmwhite/80 transition-colors duration-160 active:scale-[0.97]"
      >
        Close
      </button>
    </BaseModal>
  );
}
