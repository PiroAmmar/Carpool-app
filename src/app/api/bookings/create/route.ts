import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/serverAuth";
import { resolveBookingRate } from "@/lib/rates";
import { isValidBookingPayload } from "@/lib/bookings/validation";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/create
 *
 * Handles the initial (non-rebook) booking creation with server-side rate
 * resolution: trip.rate > users.custom_rate > settings.rate
 *
 * The rate is frozen on rate_applied at insert time so later custom_rate
 * edits never rewrite the passenger's historical booking amount.
 */
export async function POST(request: Request) {
  try {
    const { user, unauthorizedResponse } = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse;

    const body = await request.json();
    const { tripId, seatNumber, pickupLocation, dropoffLocation, freeByTime } = body;

    if (!isValidBookingPayload({ tripId, seatNumber, pickupLocation, dropoffLocation, freeByTime })) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    const userId = user.id;
    const client = createAdminClient();

    // Snapshot the rate at booking time: trip override > passenger custom rate > global rate.
    // Uses admin client so we can safely read users.custom_rate server-side
    // without ever exposing it to the passenger's browser session.
    const rateApplied = await resolveBookingRate(client, tripId, userId);

    const { data: newBooking, error: insertErr } = await client
      .from("bookings")
      .insert({
        trip_id: tripId,
        user_id: userId,
        seat_number: seatNumber,
        pickup_location: pickupLocation ?? null,
        dropoff_location: dropoffLocation ?? null,
        free_by_time: freeByTime ?? null,
        status: "pending",
        rate_applied: rateApplied,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[bookings/create] Insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message, code: insertErr.code }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: unknown) {
    console.error("[bookings/create] Exception:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
