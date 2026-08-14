import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { seatNumber, pickupLocation, bookingId } = body;
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

    if (!tripId || !seatNumber || !pickupLocation) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    const userId = authData.user.id;

    // Use admin service role client if key available to bypass RLS restrictions
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = serviceKey
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : supabase;

    // If bookingId was provided, update that booking row directly
    if (bookingId) {
      const { data: updatedBooking, error: updateErr } = await client
        .from("bookings")
        .update({
          seat_number: seatNumber,
          pickup_location: pickupLocation,
          status: "pending",
          approved_time: null,
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
        pickup_location: pickupLocation,
        status: "pending",
        approved_time: null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[rebook api] Insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: any) {
    console.error("[rebook api] Exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
