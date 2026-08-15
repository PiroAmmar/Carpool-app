import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/mailer';
import { bookingRejectedEmail } from '@/lib/email/templates';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passengerName, passengerEmail, tripDate, seatNumber } = body;

    if (!passengerName || !passengerEmail || !tripDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { subject, html } = bookingRejectedEmail({
      passengerName,
      tripDate,
      seatNumber: seatNumber || 1,
    });

    const { error } = await sendEmail({ to: passengerEmail, subject, html });

    if (error) {
      console.error('[notify/rejection] smtp error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/rejection] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
