import { NextResponse } from 'next/server';
import { bookingRejectedEmail } from '@/lib/email/templates';
import { notifyUser } from '@/lib/notify/notifyAll';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, passengerName, passengerEmail, tripDate, seatNumber } = body;

    if (!userId || !passengerName || !passengerEmail || !tripDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { subject, html } = bookingRejectedEmail({
      passengerName,
      tripDate,
      seatNumber: seatNumber || 1,
    });

    const result = await notifyUser({
      userId,
      userEmail: passengerEmail,
      title: 'Request declined',
      body: `Seat ${seatNumber || 1} for ${tripDate} couldn't be confirmed`,
      url: '/dashboard',
      tag: 'booking-rejected',
      emailSubject: subject,
      emailHtml: html,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/rejection] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
