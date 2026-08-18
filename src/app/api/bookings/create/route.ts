import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tripId, seatNumber, pickupLocation, dropoffLocation, freeByTime } = body;

    const hasLocation = Boolean(pickupLocation) || Boolean(dropoffLocation && freeByTime);
    if (!tripId || !seatNumber || !hasLocation) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    const userId = authData.user.id;
    const client = createAdminClient();

    // Snapshot the rate at booking time: trip override > passenger custom rate > global rate.
    // Uses admin client so we can safely read users.custom_rate server-side
    // without ever exposing it to the passenger's browser session.
    const [{ data: tripRow }, { data: userRow }, { data: settingsRow }] = await Promise.all([
      client.from("trips").select("rate").eq("id", tripId).maybeSingle(),
      client.from("users").select("custom_rate").eq("id", userId).maybeSingle(),
      client.from("settings").select("rate").eq("id", 1).maybeSingle(),
    ]);
    const rateApplied = userRow?.custom_rate ?? tripRow?.rate ?? settingsRow?.rate ?? null;

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
