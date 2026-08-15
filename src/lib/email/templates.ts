// Plain, readable HTML — no external CSS/fonts, email clients strip most of it anyway.

const wrap = (body: string) => `
  <div style="font-family:sans-serif;background:#0b0d10;color:#f2f1ed;padding:24px;border-radius:8px;">
    ${body}
  </div>
`;

export function newBookingEmail(params: {
  passengerName: string;
  passengerEmail: string;
  pickupLocation: string;
  seatNumber: number;
  tripDate: string;
  tripTime: string;
}) {
  const { passengerName, passengerEmail, pickupLocation, seatNumber, tripDate, tripTime } = params;
  return {
    subject: `New booking request — ${passengerName}`,
    html: wrap(`
      <h2 style="color:#e0a526;margin:0 0 12px;">New seat request</h2>
      <p><b>${passengerName}</b> (${passengerEmail}) requested seat ${seatNumber}.</p>
      <p><b>Pickup:</b> ${pickupLocation}</p>
      <p><b>Trip:</b> ${tripDate} · ${tripTime}</p>
      <p style="color:#c9cdd3;font-size:12px;margin-top:16px;">Approve or decline from the admin dashboard.</p>
    `),
  };
}

export function bookingApprovedEmail(params: {
  passengerName: string;
  approvedTime: string;
  tripDate: string;
  pickupLocation: string;
}) {
  const { passengerName, approvedTime, tripDate, pickupLocation } = params;
  return {
    subject: `Your ride is confirmed — ${tripDate}`,
    html: wrap(`
      <h2 style="color:#5ea829;margin:0 0 12px;">You're in, ${passengerName}!</h2>
      <p>Pickup time: <b>${approvedTime}</b></p>
      <p>Pickup location: <b>${pickupLocation}</b></p>
      <p>Trip date: ${tripDate}</p>
      <p style="color:#c9cdd3;font-size:12px;margin-top:16px;">See you then — reach out on WhatsApp if plans change.</p>
    `),
  };
}

export function bookingRejectedEmail(params: {
  passengerName: string;
  tripDate: string;
  seatNumber: number;
}) {
  const { passengerName, tripDate, seatNumber } = params;
  return {
    subject: `Seat Request Rejected — ${tripDate}`,
    html: wrap(`
      <h2 style="color:#ef4444;margin:0 0 12px;">Requested rejected, ${passengerName}</h2>
      <p>Unfortunately, <b>Seat ${seatNumber}</b> for the <b>${tripDate}</b> trip couldn't be confirmed for you.</p>
      <p>Trip date: <b>${tripDate}</b></p>
      <p>Requested seat: <b>Seat ${seatNumber}</b></p>
      <p style="color:#c9cdd3;font-size:13px;margin-top:16px;line-height:1.5;">
        You can head back to the dashboard to select another open seat or check upcoming rides for other days.
      </p>
      <p style="color:#c9cdd3;font-size:12px;margin-top:16px;">Feel free to reach out on WhatsApp if you have any questions.</p>
    `),
  };
}

export function dailyDigestEmail(params: {
  pending: Array<{ passengerName: string; pickupLocation: string; tripDate: string; seatNumber: number }>;
}) {
  const { pending } = params;
  const rows = pending
    .map(
      (p) =>
        `<tr><td style="padding:6px 12px;">${p.passengerName}</td><td style="padding:6px 12px;">seat ${p.seatNumber}</td><td style="padding:6px 12px;">${p.pickupLocation}</td><td style="padding:6px 12px;">${p.tripDate}</td></tr>`
    )
    .join('');

  return {
    subject: `Daily digest — ${pending.length} pending request${pending.length === 1 ? '' : 's'}`,
    html: wrap(`
      <h2 style="color:#e0a526;margin:0 0 12px;">Pending requests</h2>
      ${pending.length === 0
        ? '<p>Nothing pending — all caught up.</p>'
        : `<table style="border-collapse:collapse;width:100%;font-size:14px;">
              <thead><tr style="color:#c9cdd3;text-align:left;"><th style="padding:6px 12px;">Passenger</th><th style="padding:6px 12px;">Seat</th><th style="padding:6px 12px;">Pickup</th><th style="padding:6px 12px;">Trip</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`
      }
    `),
  };
}
