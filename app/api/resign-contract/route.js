import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, adminContractResignedEmail } from '../../../src/lib/email';
import { CONTRACT_VERSION } from '../../../src/lib/contract';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

// Client-facing (token-gated) re-sign of the service agreement after Roko
// changed the appointment time. Verifies the upload_token, records the new
// signature, flips the booking back to pending (needs re-confirm), and pings Roko.
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

    const { error: updErr } = await supabase
      .from('bookings')
      .update({
        contract_signed_name: name,
        contract_signed_at: signedAt || new Date().toISOString(),
        contract_photo_consent: photoConsent === true,
        contract_version: version || CONTRACT_VERSION,
        status: 'pending',
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('resign-contract:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
