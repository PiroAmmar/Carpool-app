'use client';

import { useState } from 'react';
import { BaseModal } from './BaseModal';
import { LocationBadge } from './LocationBadge';
import { categoryOf } from '@/lib/tripCategory';
import type { Trip, Booking, Route } from '@/types';

interface PassengerDetailsModalProps {
  passengerName: string;
  passengerEmail: string;
  bookings: Booking[];
  trips: Trip[];
  routes: Route[];
  globalRate: number | null;
  customRate: number | null;
  onClose: () => void;
  onSaveCustomRate: (rate: number | null) => Promise<void> | void;
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
  customRate,
  onClose,
  onSaveCustomRate,
}: PassengerDetailsModalProps) {
  const approved = bookings.filter((b) => b.status === 'approved');

  const paid = approved.filter((b) => b.payment_status === 'paid');
  const waived = approved.filter((b) => b.payment_status === 'waived');
  const pending = approved.filter((b) => b.payment_status === 'pending');

  // Historical totals read the rate frozen on the booking at creation
  // time — never recomputed live, so editing custom_rate later can't
  // rewrite a passenger's past paid/waived/pending amounts.
  const rateFor = (b: Booking) => {
    if (b.rate_applied !== null && b.rate_applied !== undefined) return b.rate_applied;
    const trip = trips.find((t) => t.id === b.trip_id);
    return trip?.rate ?? globalRate ?? 0;
  };

  const sumRate = (list: Booking[]) =>
    list.reduce((sum, b) => sum + rateFor(b), 0);

  // Normalize: column may not exist pre-migration, treat undefined same as null
  const safeCustomRate = customRate ?? null;
  const [rateInput, setRateInput] = useState(safeCustomRate !== null ? String(safeCustomRate) : '');
  const [savingRate, setSavingRate] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSaveRate = async () => {
    if (typeof onSaveCustomRate !== 'function') {
      console.warn('[PassengerDetailsModal] onSaveCustomRate is not a function');
      return;
    }
    setSavingRate(true);
    try {
      const trimmed = rateInput.trim();
      const parsed = trimmed === '' ? null : Number(trimmed);
      await onSaveCustomRate(parsed !== null && !Number.isNaN(parsed) ? parsed : null);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      console.error('[PassengerDetailsModal] Error saving custom rate:', err);
    } finally {
      setSavingRate(false);
    }
  };

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
      {/* Custom rate override — clean & minimal design system pattern */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-mono text-[10px] tracking-widest uppercase text-warmwhite/50 font-medium">
            Custom Fare Override
          </label>
          {safeCustomRate !== null && (
            <span className="font-mono text-[10px] text-amber-400 font-semibold">
              Active: Rs. {safeCustomRate}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Input container with integrated Rs. prefix (flex sibling, zero overlap) */}
          <div className="flex-1 flex items-center rounded-lg border border-white/10 bg-asphalt focus-within:border-white/25 transition-colors duration-160">
            <span className="pl-3.5 pr-2 font-mono text-xs font-semibold text-warmwhite/40 select-none">
              Rs.
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder={globalRate !== null ? `${globalRate} (default)` : 'default'}
              className="w-full bg-transparent py-2.5 pr-3 font-mono text-xs text-warmwhite placeholder:text-warmwhite/25 outline-none"
            />
          </div>

          <button
            onClick={handleSaveRate}
            disabled={savingRate}
            className={`flex-shrink-0 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-all duration-160 active:scale-[0.97] disabled:opacity-40 ${
              justSaved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-warmwhite text-asphalt hover:bg-warmwhite/90'
            }`}
          >
            {savingRate ? 'Saving…' : justSaved ? 'Saved ✓' : 'Save'}
          </button>

          {rateInput && (
            <button
              onClick={() => {
                setRateInput('');
                onSaveCustomRate?.(null);
                setJustSaved(true);
                setTimeout(() => setJustSaved(false), 2000);
              }}
              title="Reset to default rate"
              className="flex-shrink-0 px-2.5 py-2.5 text-xs font-mono text-warmwhite/40 hover:text-warmwhite transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <p className="text-[10px] text-warmwhite/30 font-mono mt-1.5">
          Overrides default rate for this passenger. Leave blank to reset.
        </p>
      </div>

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
                    <LocationBadge
                      location={categoryOf(trip?.direction) === 'campus_to_home' ? b.dropoff_location : b.pickup_location}
                      size="sm"
                    />
                    <span className="text-[11px] font-mono text-warmwhite/40 flex-shrink-0">
                      Seat {b.seat_number} · Rs. {rateFor(b)}
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
