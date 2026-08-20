import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Server-side route handler authentication helper.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase,
      unauthorizedResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return {
    user,
    supabase,
    unauthorizedResponse: null,
  };
}
