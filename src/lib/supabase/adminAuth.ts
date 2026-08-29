import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/serverAuth';
import { isAdminEmail } from '@/lib/admin';

/**
 * Admin-gated route handler helper. Use for endpoints that trigger
 * admin-only actions (approval/rejection emails, trip broadcasts) —
 * these must never be callable by an arbitrary passenger or anon client.
 */
export async function getAuthenticatedAdmin() {
  const { user, supabase, unauthorizedResponse } = await getAuthenticatedUser();

  if (!user) {
    return { user: null, isAdmin: false, unauthorizedResponse };
  }

  let isAdmin = isAdminEmail(user.email);

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin';
  }

  if (!isAdmin) {
    return {
      user,
      isAdmin: false,
      unauthorizedResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user, isAdmin: true, unauthorizedResponse: null };
}
