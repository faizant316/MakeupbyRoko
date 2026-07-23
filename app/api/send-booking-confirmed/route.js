import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, bookingConfirmedEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { to, firstName, serviceName, dateFormatted, time, travels, bookingId } = await req.json();

    // Look up the cancel token server-side (never trust a client-passed one) so
    // the confirmation email can carry a "need to cancel?" link.
    let cancelUrl = '';
    if (bookingId) {
      const supabase = createClient();
      const { data: booking } = await supabase
        .from('bookings')
        .select('upload_token')
        .eq('id', bookingId)
        .maybeSingle();
      if (booking?.upload_token) {
        const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
        cancelUrl = `${siteBase}/cancel-booking?token=${booking.upload_token}`;
      }
    }

    await sendEmail({
      to,
      subject: `Your ${serviceName} appointment is confirmed ✦`,
      html: bookingConfirmedEmail({ firstName, serviceName, dateFormatted, time, travels: !!travels, cancelUrl }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-booking-confirmed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
