import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/serverAuth";
import { resolveBookingRate } from "@/lib/rates";
import { isValidBookingPayload } from "@/lib/bookings/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { user, supabase, unauthorizedResponse } = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse;

    const body = await request.json();
    const { seatNumber, pickupLocation, dropoffLocation, freeByTime, bookingId } = body;
    let tripId = body.tripId;

    if (!tripId && bookingId) {
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("trip_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (existingBooking?.trip_id) {
        tripId = existingBooking.trip_id;
      }
    }

    if (!isValidBookingPayload({ tripId, seatNumber, pickupLocation, dropoffLocation, freeByTime })) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    const userId = user.id;
    const client = createAdminClient();

    // Snapshot the rate at booking time: trip override > passenger
    // custom rate > global rate. Frozen on the row so later custom_rate
    // edits never rewrite this booking's historical amount.
    const rateApplied = await resolveBookingRate(client, tripId, userId);

    // If bookingId was provided, update that booking row directly
    if (bookingId) {
      const { data: updatedBooking, error: updateErr } = await client
        .from("bookings")
        .update({
          seat_number: seatNumber,
          pickup_location: pickupLocation ?? null,
          dropoff_location: dropoffLocation ?? null,
          free_by_time: freeByTime ?? null,
          status: "pending",
          approved_time: null,
          admin_message: null,
          rate_applied: rateApplied,
        })
        .eq("id", bookingId)
        .eq("user_id", userId)
        .select()
        .single();

      if (!updateErr && updatedBooking) {
        return NextResponse.json({ success: true, booking: updatedBooking });
      }
    }

    // Delete any old/rejected bookings for this user on this trip and insert fresh
    await client.from("bookings").delete().eq("trip_id", tripId).eq("user_id", userId);

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
        approved_time: null,
        rate_applied: rateApplied,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[rebook api] Insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: unknown) {
    console.error("[rebook api] Exception:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
