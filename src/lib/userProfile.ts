import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Validates and updates a user's WhatsApp number, ensuring uniqueness across users.
 */
export async function saveUserWhatsApp(
  supabase: SupabaseClient,
  userId: string,
  newNum: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'No user ID provided' };

  // Check if number is already connected to another user
  const { data: conflict, error: queryErr } = await supabase
    .from('users')
    .select('id')
    .eq('whatsapp', newNum)
    .neq('id', userId)
    .maybeSingle();

  if (queryErr) {
    console.error('[userProfile] error checking duplicate whatsapp:', queryErr.message);
  }

  if (conflict) {
    return {
      success: false,
      error: 'This WhatsApp number is already connected to a different user.',
    };
  }

  const { error } = await supabase
    .from('users')
    .update({ whatsapp: newNum, phone: newNum })
    .eq('id', userId);

  if (error) {
    console.error('[userProfile] whatsapp update failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
