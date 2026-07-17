import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, consultationScheduledEmail, adminConsultationEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const {
      bookingId, clientEmail, clientName, serviceName,
      consultationDate, consultationTime, consultationType, zoomLink, consultationNotes, updated, migrated,
    } = await req.json();

    if (!bookingId || !clientEmail || !consultationDate || !consultationTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store notes — prefix with link so it's parseable in the UI
    const storedNotes = [
      consultationType === 'Zoom' && zoomLink ? `Link: ${zoomLink}` : null,
      consultationNotes || null,
    ].filter(Boolean).join('\n') || null;

    const { error: dbErr } = await supabase
      .from('bookings')
      .update({
        consultation_date: consultationDate,
        consultation_time: consultationTime,
        consultation_type: consultationType,
        consultation_notes: storedNotes,
      })
      .eq('id', bookingId);

    if (dbErr) throw dbErr;

    const firstName = (clientName || '').split(' ')[0] || 'there';

    // Client email
    await sendEmail({
      to: clientEmail,
      subject: migrated
        ? `Makeup by Roko has a new home ✦ your consultation on ${consultationDate}`
        : updated
        ? `Updated consultation time: ${consultationDate} at ${consultationTime}`
        : `Your consultation is scheduled for ${consultationDate} at ${consultationTime}`,
      html: consultationScheduledEmail({ firstName, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes, updated, migrated }),
    });

    // Admin notification (fire-and-forget, don't fail the request if this errors)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';
    sendEmail({
      to: adminEmail,
      subject: `📋 Consultation Scheduled — ${clientName || clientEmail} · ${consultationDate} at ${consultationTime}`,
      html: adminConsultationEmail({ clientName, clientEmail, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes }),
    }).catch(err => console.error('admin consultation email error:', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-consultation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
