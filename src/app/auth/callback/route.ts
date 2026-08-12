import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// This is the URL Supabase redirects to after Google finishes the OAuth
// handshake. It exchanges the auth code for a session, THEN checks the
// email domain — if it doesn't match, the session is immediately revoked
// rather than trusting the client to enforce this.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    // Surface the real reason in dev/logs so failures are diagnosable —
    // "auth_failed" alone hides whether this was a PKCE mismatch, an
    // expired code, a config issue, etc.
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
    const reason = encodeURIComponent(error?.message ?? "unknown");
    return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=${reason}`);
  }

  const user = data.session.user;
  const email = user.email ?? "";
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "nu.edu.pk";

  if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
    // Reject: sign the user back out so no session persists, then bounce
    // them to login with an explanatory error.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=wrong_domain`);
  }

  // Upsert the user into the public.users table.
  // This is required because the bookings table has a foreign key to public.users.
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const { error: upsertError } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: email,
      full_name: fullName,
      role: 'passenger' // Default role
    }, { onConflict: 'id' });

  if (upsertError) {
    console.error("[auth/callback] user upsert failed:", upsertError.message);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
