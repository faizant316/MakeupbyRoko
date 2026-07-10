import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, bridalConfirmedEmail, adminConsultationEmail } from '../../../src/lib/email';

// Bridal-only: confirms the booking AND schedules the consultation in one shot,
// then sends a single combined email (confirmation + consultation + Zelle/photo
// upload link) instead of the separate confirmed + consultation emails.
export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const {
      bookingId, clientEmail, clientName, serviceName, dateFormatted, time,
      consultationDate, consultationTime, consultationType, zoomLink, consultationNotes, updated,
    } = await req.json();

    if (!bookingId || !clientEmail || !consultationDate || !consultationTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Pull the upload token + deposit state straight from the row so we never
    // trust client-passed values (and never build links from window.location).
    const { data: booking } = await supabase
      .from('bookings')
      .select('upload_token, deposit_received')
      .eq('id', bookingId)
      .single();

    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
    const uploadUrl = booking?.upload_token
      ? `${siteBase}/upload-zelle?id=${bookingId}&token=${booking.upload_token}&bridal=1`
      : '';

    // Store notes — prefix with link so it's parseable in the UI (matches send-consultation)
    const storedNotes = [
      consultationType === 'Zoom' && zoomLink ? `Link: ${zoomLink}` : null,
      consultationNotes || null,
    ].filter(Boolean).join('\n') || null;

    const { error: dbErr } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        consultation_date: consultationDate,
        consultation_time: consultationTime,
        consultation_type: consultationType,
        consultation_notes: storedNotes,
      })
      .eq('id', bookingId);

    if (dbErr) throw dbErr;

    const firstName = (clientName || '').split(' ')[0] || 'there';

    // Single client email: confirmation + consultation + upload link
    await sendEmail({
      to: clientEmail,
      subject: updated
        ? `Your consultation time has been updated ✦ ${serviceName}${dateFormatted ? ` on ${dateFormatted}` : ''}`
        : `You're confirmed for ${serviceName}${dateFormatted ? ` ✦ ${dateFormatted}` : ''}`,
      html: bridalConfirmedEmail({
        firstName, serviceName, dateFormatted, time,
        consultationDate, consultationTime, consultationType, zoomLink, consultationNotes,
        uploadUrl, depositReceived: booking?.deposit_received, updated,
      }),
    });

    // Admin notification (fire-and-forget, don't fail the request if this errors)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';
    sendEmail({
      to: adminEmail,
      subject: `✅ Bridal Confirmed + Consultation — ${clientName || clientEmail} · ${consultationDate} at ${consultationTime}`,
      html: adminConsultationEmail({ clientName, clientEmail, serviceName, consultationDate, consultationTime, consultationType, zoomLink, consultationNotes }),
    }).catch(err => console.error('admin confirm-bridal email error:', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('confirm-bridal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
