import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import {
  sendEmail,
  clientCancelledEmail,
  bridalCancelRequestEmail,
  adminClientCancelledEmail,
  adminBridalCancelRequestEmail,
} from '../../../src/lib/email';

// PUBLIC, token-gated. The client's random upload_token is the only key needed
// (same trust model as /api/zelle-upload): a valid token may cancel THAT booking
// and nothing else. Mirrors the admin cancel, but stamps cancelled_by:'client'.

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';

// Same bridal test the admin card uses: bridal is a REQUEST, never an instant
// cancel, so it must be detected identically here.
const isBridalService = (service) =>
  /bridal|bride|wedding|full day/i.test(service || '') && !/non-bridal/i.test(service || '');

function formatDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return raw; }
}

export async function POST(req) {
  try {
    const supabase = createClient();
    let { token, reason } = await req.json();
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
    reason = (reason || '').toString().trim().slice(0, 500) || null;
    const nowIso = new Date().toISOString();

    // ── Appointment (bridal or non-bridal live in `bookings`) ─────────────────
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('upload_token', token)
      .maybeSingle();

    if (booking) {
      if (booking.status === 'completed') {
        return NextResponse.json({ error: 'This appointment is already complete and can no longer be cancelled online. Please reply to your email.' }, { status: 409 });
      }
      const firstName = (booking.name || '').split(' ')[0] || booking.name || 'there';
      const dateFmt = formatDate(booking.date);

      // Bridal → a REQUEST. Nothing is cancelled, the date stays held.
      if (isBridalService(booking.service)) {
        if (booking.status === 'cancelled') {
          return NextResponse.json({ type: 'cancelled', alreadyDone: true });
        }
        if (booking.cancel_requested_at) {
          return NextResponse.json({ type: 'bridal_request', alreadyDone: true });
        }
        const { error: reqErr } = await supabase
          .from('bookings')
          .update({ cancel_requested_at: nowIso, cancel_request_message: reason })
          .eq('id', booking.id);
        if (reqErr) throw reqErr;

        if (booking.email) {
          await sendEmail({
            to: booking.email,
            subject: `We've received your request — ${booking.service}`,
            html: bridalCancelRequestEmail({ name: firstName, service: booking.service, date: dateFmt }),
          });
        }
        sendEmail({
          to: ADMIN_EMAIL,
          subject: `⚠️ Bridal cancellation REQUESTED — ${booking.name || booking.email} · call her`,
          html: adminBridalCancelRequestEmail({ name: booking.name, service: booking.service, date: dateFmt, reason, email: booking.email, phone: booking.phone }),
        }).catch((e) => console.error('admin bridal-request email:', e));

        return NextResponse.json({ type: 'bridal_request' });
      }

      // Non-bridal → self-serve cancel.
      if (booking.status === 'cancelled') {
        return NextResponse.json({ type: 'cancelled', alreadyDone: true });
      }
      const { error: cancErr } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_by: 'client', cancelled_at: nowIso, cancel_reason: reason })
        .eq('id', booking.id);
      if (cancErr) throw cancErr;

      if (booking.email) {
        await sendEmail({
          to: booking.email,
          subject: `Your ${booking.service} cancellation is confirmed`,
          html: clientCancelledEmail({ name: firstName, service: booking.service, date: dateFmt, kind: 'appointment' }),
        });
      }
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Client cancelled — ${booking.name || booking.email} · ${booking.service}`,
        html: adminClientCancelledEmail({ name: booking.name, service: booking.service, date: dateFmt, reason, kind: 'appointment', email: booking.email, phone: booking.phone }),
      }).catch((e) => console.error('admin cancel email:', e));

      return NextResponse.json({ type: 'cancelled' });
    }

    // ── Class registration ────────────────────────────────────────────────────
    const { data: reg } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('upload_token', token)
      .maybeSingle();

    if (reg) {
      if (reg.status === 'cancelled') {
        return NextResponse.json({ type: 'cancelled', alreadyDone: true });
      }
      const firstName = (reg.full_name || '').split(' ')[0] || reg.full_name || 'there';
      const dateFmt = formatDate(reg.appointment_date);
      const serviceLabel = 'your makeup class';

      const { error: cancErr } = await supabase
        .from('class_registrations')
        .update({ status: 'cancelled', cancelled_by: 'client', cancelled_at: nowIso, cancel_reason: reason })
        .eq('id', reg.id);
      if (cancErr) throw cancErr;

      if (reg.email) {
        await sendEmail({
          to: reg.email,
          subject: `Your class cancellation is confirmed`,
          html: clientCancelledEmail({ name: firstName, service: serviceLabel, date: dateFmt, kind: 'class' }),
        });
      }
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Client cancelled a class — ${reg.full_name || reg.email}`,
        html: adminClientCancelledEmail({ name: reg.full_name, service: 'Makeup Class', date: dateFmt, reason, kind: 'class', email: reg.email, phone: reg.phone }),
      }).catch((e) => console.error('admin class-cancel email:', e));

      return NextResponse.json({ type: 'cancelled' });
    }

    return NextResponse.json({ error: 'We could not find a booking for this link.' }, { status: 404 });
  } catch (err) {
    console.error('cancel-booking:', err);
    return NextResponse.json({ error: err.message || 'Cancellation failed' }, { status: 500 });
  }
}
