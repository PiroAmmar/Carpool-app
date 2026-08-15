import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/mailer';
import { dailyDigestEmail } from '@/lib/email/templates';

export async function GET(req: Request) {
  // Vercel Cron sends this header automatically in production.
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('seat_number, pickup_location, status, trip:trips(trip_date), user:users(full_name, email)')
    .eq('status', 'pending');

  if (error) {
    console.error('[cron/digest] query failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pending = (bookings || []).map((b) => {
    // Supabase nested selects can return object or array depending on the relation shape.
    const trip = Array.isArray(b.trip) ? b.trip[0] : b.trip;
    const user = Array.isArray(b.user) ? b.user[0] : b.user;
    return {
      passengerName: user?.full_name || user?.email || 'Unknown',
      pickupLocation: b.pickup_location,
      tripDate: trip?.trip_date || 'TBD',
      seatNumber: b.seat_number,
    };
  });

  const { subject, html } = dailyDigestEmail({ pending });

  const { error: sendError } = await sendEmail({ to: ADMIN_EMAIL, subject, html });

  if (sendError) {
    console.error('[cron/digest] smtp error:', sendError.message);
    return NextResponse.json({ error: sendError.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, pendingCount: pending.length });
}
