import { NextResponse } from 'next/server';
import { sendEmail, adminBookingEmail } from '../../../src/lib/email';

const ADMIN_EMAIL = 'makeupbyroko22@gmail.com';

export async function POST(req) {
  try {
    const { name, service, date, email, phone, bookingType } = await req.json();
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New ${bookingType === 'bridal' ? 'Bridal Inquiry' : 'Booking'} — ${name} · ${service}`,
      html: adminBookingEmail({ name, service, date, email, phone, bookingType }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('notify-new-booking:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
