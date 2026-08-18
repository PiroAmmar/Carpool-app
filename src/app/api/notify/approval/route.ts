import { NextResponse } from 'next/server';
import { bookingApprovedEmail } from '@/lib/email/templates';
import { notifyUser } from '@/lib/notify/notifyAll';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, passengerName, passengerEmail, approvedTime, adminMessage, tripDate, pickupLocation, dropoffLocation } = body;

    const timeLine = approvedTime || 'See message below';
    const locationLine = pickupLocation || dropoffLocation || 'TBD';

    if (!userId || !passengerName || !passengerEmail || !tripDate || (!approvedTime && !adminMessage)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { subject, html } = bookingApprovedEmail({
      passengerName,
      approvedTime: adminMessage ? `${timeLine} — ${adminMessage}` : timeLine,
      tripDate,
      pickupLocation: locationLine,
    });

    const result = await notifyUser({
      userId,
      userEmail: passengerEmail,
      title: 'Ride confirmed',
      body: `Pickup at ${approvedTime} — ${locationLine}`,
      url: '/dashboard',
      tag: 'booking-approved',
      emailSubject: subject,
      emailHtml: html,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/approval] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
