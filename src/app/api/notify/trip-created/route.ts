import { NextResponse } from 'next/server';
import { tripCreatedEmail } from '@/lib/email/templates';
import { notifyAll } from '@/lib/notify/notifyAll';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tripDate, tripTime, route } = body;

    if (!tripDate || !tripTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { subject, html } = tripCreatedEmail({ tripDate, tripTime, route });

    const result = await notifyAll({
      title: 'New trip scheduled',
      body: route ? `${tripDate} · ${tripTime} — ${route}` : `${tripDate} · ${tripTime}`,
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
