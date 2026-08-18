import { NextResponse } from 'next/server';
import { tripCreatedEmail } from '@/lib/email/templates';
import { notifyAll } from '@/lib/notify/notifyAll';
import { formatNotificationDate, formatNotificationTime } from '@/lib/formatNotification';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tripDate, tripTime, category } = body;

    if (!tripDate || !tripTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formattedDate = formatNotificationDate(tripDate);
    const formattedTime = formatNotificationTime(tripTime);
    const tripCategory = category || 'Campus Carpool';

    const { subject, html } = tripCreatedEmail({
      tripDate: formattedDate,
      tripTime: formattedTime,
      category: tripCategory,
    });

    const result = await notifyAll({
      title: 'New trip scheduled',
      body: `${formattedDate} · ${formattedTime} — ${tripCategory}`,
      url: '/dashboard',
      tag: 'trip-created',
      emailSubject: subject,
      emailHtml: html,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notify/trip-created] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
