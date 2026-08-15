import { NextResponse } from 'next/server';
import { resend, FROM_EMAIL, ADMIN_EMAIL } from '@/lib/email/resend';
import { bookingApprovedEmail } from '@/lib/email/templates';

// TEMP: Resend test domain (onboarding@resend.dev) can only deliver to the
// account owner's inbox. Force-sending to ADMIN_EMAIL so the template/flow
// can be verified end-to-end. Revert to `to: passengerEmail` once a real
// domain is verified in Resend.
const USE_TEST_DOMAIN_OVERRIDE = true;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passengerName, passengerEmail, approvedTime, tripDate, pickupLocation } = body;

    if (!passengerName || !passengerEmail || !approvedTime || !tripDate || !pickupLocation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { subject, html } = bookingApprovedEmail({
      passengerName,
      approvedTime,
      tripDate,
      pickupLocation,
    });

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: USE_TEST_DOMAIN_OVERRIDE ? ADMIN_EMAIL : passengerEmail,
      subject: USE_TEST_DOMAIN_OVERRIDE ? `[TEST → ${passengerEmail}] ${subject}` : subject,
      html,
    });

    if (error) {
      console.error('[notify/approval] resend error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/approval] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
