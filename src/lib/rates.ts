import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves the booking rate according to the priority hierarchy:
 * 1. Passenger custom rate (users.custom_rate)
 * 2. Trip rate override (trips.rate)
 * 3. Global default rate (settings.rate)
 */
export async function resolveBookingRate(
  client: SupabaseClient,
  tripId: string,
  userId: string
): Promise<number | null> {
  const [{ data: tripRow }, { data: userRow }, { data: settingsRow }] = await Promise.all([
    client.from('trips').select('rate').eq('id', tripId).maybeSingle(),
    client.from('users').select('custom_rate').eq('id', userId).maybeSingle(),
    client.from('settings').select('rate').eq('id', 1).maybeSingle(),
  ]);

  return userRow?.custom_rate ?? tripRow?.rate ?? settingsRow?.rate ?? null;
}
