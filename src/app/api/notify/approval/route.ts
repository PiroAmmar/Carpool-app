import { NextResponse } from 'next/server';
import { bookingApprovedEmail } from '@/lib/email/templates';
import { notifyUser } from '@/lib/notify/notifyAll';
import { formatNotificationDate, formatNotificationTime } from '@/lib/formatNotification';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, passengerName, passengerEmail, approvedTime, adminMessage, tripDate, pickupLocation, dropoffLocation } = body;

    if (!userId || !passengerName || !passengerEmail || !tripDate || (!approvedTime && !adminMessage)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formattedDate = formatNotificationDate(tripDate);
    const formattedTime = approvedTime ? formatNotificationTime(approvedTime) : null;
    const timeLine = formattedTime || 'See message below';
    const locationLine = pickupLocation || dropoffLocation || 'TBD';

    const { subject, html } = bookingApprovedEmail({
      passengerName,
      approvedTime: adminMessage ? (formattedTime ? `${formattedTime} — ${adminMessage}` : adminMessage) : timeLine,
      tripDate: formattedDate,
      pickupLocation: locationLine,
    });

    const pushBody = adminMessage
      ? `${formattedDate} — ${adminMessage}`
      : `Pickup at ${formattedTime || approvedTime} (${formattedDate}) — ${locationLine}`;

    const result = await notifyUser({
      userId,
      userEmail: passengerEmail,
      title: 'Ride confirmed',
      body: pushBody,
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
