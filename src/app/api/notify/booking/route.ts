import { NextResponse } from 'next/server';
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/mailer';
import { newBookingEmail } from '@/lib/email/templates';
import { formatNotificationDate, formatNotificationTime } from '@/lib/formatNotification';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passengerName, passengerEmail, pickupLocation, dropoffLocation, freeByTime, seatNumber, tripDate, tripTime } = body;

    const locationLine = pickupLocation
      ? pickupLocation
      : dropoffLocation
        ? `Dropoff: ${dropoffLocation} (free by ${freeByTime || 'TBD'})`
        : null;

    if (!passengerName || !passengerEmail || !locationLine || !seatNumber || !tripDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formattedDate = formatNotificationDate(tripDate);
    const formattedTime = formatNotificationTime(tripTime) || 'TBD';

    const { subject, html } = newBookingEmail({
      passengerName,
      passengerEmail,
      pickupLocation: locationLine,
      seatNumber,
      tripDate: formattedDate,
      tripTime: formattedTime,
    });

    const { error } = await sendEmail({ to: ADMIN_EMAIL, subject, html });

    if (error) {
      console.error('[notify/booking] smtp error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/booking] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
