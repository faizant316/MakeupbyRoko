import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, adminContractResignedEmail, bookingConfirmedEmail } from '../../../src/lib/email';
import { CONTRACT_VERSION } from '../../../src/lib/contract';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

// Client-facing (token-gated) re-sign of the service agreement after Roko
// changed a detail (time / date / service). Verifies the upload_token and records
// the new signature. The booking KEEPS its status: Roko set the change in motion
// and already agreed to it, so a confirmed booking stays confirmed (no bounce
// back to pending). It pings Roko, and if the booking is confirmed it sends the
// client a short confirmation of the (possibly new) details so they have closure.
export async function POST(req) {
  try {
    const supabase = createClient();
    const { token, id, name, photoConsent, signedAt, version } = await req.json();
    if (!token || !name) {
      return NextResponse.json({ error: 'token and name are required' }, { status: 400 });
    }

    const { data: booking, error: findErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('upload_token', token)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!booking || (id && String(booking.id) !== String(id))) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    }

    // Record the new signature only — the booking's status is deliberately left
    // untouched so a confirmed booking stays confirmed through the re-sign.
    const { error: updErr } = await supabase
      .from('bookings')
      .update({
        contract_signed_name: name,
        contract_signed_at: signedAt || new Date().toISOString(),
        contract_photo_consent: photoConsent === true,
        contract_version: version || CONTRACT_VERSION,
      })
      .eq('id', booking.id);
    if (updErr) throw updErr;

    const dateFormatted = booking.date
      ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    // Notify Roko — never block the client's success on this.
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `Agreement re-signed — ${booking.name || 'Client'} · ${booking.time || 'new time'}`,
      html: adminContractResignedEmail({
        name: booking.name,
        service: booking.service,
        date: dateFormatted,
        time: booking.time,
        signedName: name,
        photoConsent: photoConsent === true,
      }),
    }).catch(err => console.error('resign admin notify:', err));

    // The client just agreed to the updated details by re-signing, so if their
    // booking is confirmed, close the loop with a fresh confirmation of the new
    // time/date. (Pending bookings wait for Roko to confirm, as before.)
    if (booking.status === 'confirmed' && booking.email) {
      sendEmail({
        to: booking.email,
        subject: `You're confirmed for ${booking.service || 'your appointment'}${booking.time ? ` · ${booking.time}` : ''}`,
        html: bookingConfirmedEmail({
          firstName: (booking.name || '').split(' ')[0] || 'there',
          serviceName: booking.service,
          dateFormatted,
          time: booking.time,
        }),
      }).catch(err => console.error('resign client confirm:', err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('resign-contract:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
