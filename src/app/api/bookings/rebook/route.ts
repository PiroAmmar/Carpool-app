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

    const { tripId, seatNumber, pickupLocation } = await request.json();

    if (!tripId || !seatNumber || !pickupLocation) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    const userId = authData.user.id;

    // Use admin service role client if key available to bypass RLS restrictions on rejected rows
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = serviceKey
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : supabase;

    // Perform upsert with explicit onConflict on trip_id,user_id
    const { data: newBooking, error: upsertErr } = await client
      .from("bookings")
      .upsert(
        {
          trip_id: tripId,
          user_id: userId,
          seat_number: seatNumber,
          pickup_location: pickupLocation,
          status: "pending",
          approved_time: null,
        },
        { onConflict: "trip_id,user_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      console.error("[rebook api] Upsert error:", upsertErr.message);

      // Fallback: Delete old rows and insert
      await client.from("bookings").delete().eq("trip_id", tripId).eq("user_id", userId);
      const { data: fallbackBooking, error: fallbackErr } = await client
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

      if (fallbackErr) {
        console.error("[rebook api] Fallback insert error:", fallbackErr.message);
        return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, booking: fallbackBooking });
    }

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: any) {
    console.error("[rebook api] Exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
