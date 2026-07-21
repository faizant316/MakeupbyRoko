import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { sendEmail, contactClientEmail } from '../../../src/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';

// Roko's personal "contact this client" email, sent from the admin booking card.
// When includeContract is set (she changed the time), it attaches a Review & Sign
// link that re-signs the agreement against the booking's current time.
export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { bookingId, to, firstName, subject, message, includeContract, serviceName, dateFormatted, time } = await req.json();
    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'to, subject and message are required' }, { status: 400 });
    }

    let resignUrl = '';
    let supabase = null;
    if (includeContract && bookingId) {
      supabase = createClient();
      const { data: booking } = await supabase
        .from('bookings')
        .select('upload_token')
        .eq('id', bookingId)
        .maybeSingle();
      let token = booking?.upload_token;
      // Older bookings may predate upload tokens — mint one so the re-sign link works.
      if (!token) {
        token = uuidv4();
        await supabase.from('bookings').update({ upload_token: token }).eq('id', bookingId);
      }
      resignUrl = `${SITE_URL}/resign-contract?id=${bookingId}&token=${token}`;
    }

    await sendEmail({
      to,
      subject,
      html: contactClientEmail({ firstName, message, serviceName, dateFormatted, time, resignUrl }),
    });

    // Only stamp the request once the email is actually out the door — the card
    // reads this to show "waiting on their signature", and a phantom pending
    // state on an email that never sent would be worse than no state at all.
    if (resignUrl && supabase) {
      await supabase
        .from('bookings')
        .update({
          contract_resign_requested_at: new Date().toISOString(),
          contract_resign_requested_for: [dateFormatted, time].filter(Boolean).join(' · ') || null,
        })
        .eq('id', bookingId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('contact-client:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
