import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * True when this account may hold several bookings on one trip
 * (see supabase/migrations/10_multi_seat_bookers.sql).
 *
 * Must be called with the service-role client: the allowlist table has
 * RLS on and no policies. Pass the email from the verified auth session,
 * never from public.users (passengers can edit that row).
 */
export async function canBookMultipleSeats(
  adminClient: SupabaseClient,
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await adminClient
    .from("multi_seat_bookers")
    .select("email")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) {
    // Table missing (migration 10 not run yet) → fall back to single-seat.
    console.error("[multiSeat] lookup failed:", error.message);
    return false;
  }
  return Boolean(data);
}
