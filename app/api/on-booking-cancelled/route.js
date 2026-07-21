import { NextResponse } from 'next/server';
import { sendEmail, bookingCancelledEmail } from '../../../src/lib/email';
import { requireAdmin } from '../../../src/lib/requireAdmin';

// Admin-only. This route takes the recipient straight from the request body,
// so without an auth gate anyone could POST arbitrary {to, name, service, date}
// and have Roko's verified sending domain deliver attacker-written text to any
// address. It is only ever called from the admin client card, where a session
// already exists, so requiring admin costs nothing and closes the relay.
export async function POST(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
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
