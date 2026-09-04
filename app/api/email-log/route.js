// What this client was actually sent, and a way to send it again.
//
// GET  ?bookingId= | ?registrationId=  → the email history for one card.
// POST { id }                          → replay one client email, as sent.
//
// Admin-only in both directions: the rows carry client addresses and subject
// lines, and the resend is a send.
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail } from '../../../src/lib/email';

export const dynamic = 'force-dynamic';

// Deliberately excludes `html`: it is ~40KB a row and the panel never renders
// it. The resend reads it server-side, from the row, by id.
const FIELDS = 'id, created_at, kind, audience, recipient, subject, status, error, sent_at, delivered_at, last_event, last_event_at, resend_id';

export async function GET(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('bookingId');
  const registrationId = searchParams.get('registrationId');
  if (!bookingId && !registrationId) {
    return NextResponse.json({ error: 'bookingId or registrationId is required' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    let query = supabase.from('email_log').select(FIELDS).order('created_at', { ascending: false }).limit(50);
    query = bookingId ? query.eq('booking_id', bookingId) : query.eq('registration_id', registrationId);
    const { data, error } = await query;
    if (error) throw error;

    // When logging began. Everything booked before this has no rows by
    // definition, and without the date the panel would have to read that as
    // "she was never emailed" and put a red warning on every client Roko has
    // ever had. Same source of truth the scheduled health check uses.
    const { data: mig } = await supabase
      .from('applied_migrations')
      .select('applied_at').eq('version', '0019_email_log.sql').maybeSingle();

    return NextResponse.json({ since: mig?.applied_at || null, rows: data || [] });
  } catch (err) {
    // The panel treats an error as "can't tell", which is honest. It must never
    // be able to claim an email was sent when it doesn't actually know.
    console.error('email-log GET:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const supabase = createClient();
    const { data: row } = await supabase
      .from('email_log')
      .select('id, booking_id, registration_id, kind, audience, recipient, subject, html')
      .eq('id', id).maybeSingle();

    if (!row) return NextResponse.json({ error: 'No such email' }, { status: 404 });
    if (row.audience !== 'client') {
      return NextResponse.json({ error: 'Only client emails can be resent.' }, { status: 400 });
    }
    if (!row.html) {
      // Anything sent before this table stored the rendered copy. Reconstructing
      // it would risk sending different details than the client first agreed to,
      // so we say so plainly instead of guessing.
      return NextResponse.json({
        error: 'This email was sent before copies were kept, so it cannot be replayed. Use Message Client instead.',
      }, { status: 409 });
    }

    // The recipient comes from the row, never from the request. This endpoint
    // can only ever re-send a real email to the address it originally went to,
    // which keeps an admin session from being turned into an open relay.
    await sendEmail({
      to: row.recipient,
      subject: row.subject || 'Makeup by Roko',
      html: row.html,
      log: {
        bookingId: row.booking_id,
        registrationId: row.registration_id,
        kind: row.kind,
        audience: 'client',
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('email-log POST:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
