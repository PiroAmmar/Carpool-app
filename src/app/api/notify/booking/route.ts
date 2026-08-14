import { NextResponse } from 'next/server';
import { resend, FROM_EMAIL, ADMIN_EMAIL } from '@/lib/email/resend';
import { newBookingEmail } from '@/lib/email/templates';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passengerName, passengerEmail, pickupLocation, seatNumber, tripDate, tripTime } = body;

    if (!passengerName || !passengerEmail || !pickupLocation || !seatNumber || !tripDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { subject, html } = newBookingEmail({
      passengerName,
      passengerEmail,
      pickupLocation,
      seatNumber,
      tripDate,
      tripTime: tripTime || 'TBD',
    });

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });

    if (error) {
      console.error('[notify/booking] resend error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/booking] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
