import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/mailer';
import { bookingApprovedEmail } from '@/lib/email/templates';

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

    const { error } = await sendEmail({ to: passengerEmail, subject, html });

    if (error) {
      console.error('[notify/approval] smtp error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/approval] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
