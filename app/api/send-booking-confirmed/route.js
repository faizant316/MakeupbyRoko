import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { sendEmail, bookingConfirmedEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { to, firstName, serviceName, dateFormatted, time } = await req.json();
    await sendEmail({
      to,
      subject: `Your ${serviceName} appointment is confirmed ✦`,
      html: bookingConfirmedEmail({ firstName, serviceName, dateFormatted, time }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-booking-confirmed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
