import { NextResponse } from 'next/server';
import { sendEmail, bookingCancelledEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { to, name, service, date } = await req.json();
    await sendEmail({
      to,
      subject: `Your ${service} booking has been cancelled`,
      html: bookingCancelledEmail({ name, service, date }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('on-booking-cancelled:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
