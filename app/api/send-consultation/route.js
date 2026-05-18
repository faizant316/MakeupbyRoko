import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, consultationScheduledEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const {
      bookingId, clientEmail, clientName, serviceName,
      consultationDate, consultationTime, consultationType, consultationNotes,
    } = await req.json();

    if (!bookingId || !clientEmail || !consultationDate || !consultationTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save to DB
    const { error: dbErr } = await supabase
      .from('bookings')
      .update({ consultation_date: consultationDate, consultation_time: consultationTime, consultation_type: consultationType, consultation_notes: consultationNotes || null })
      .eq('id', bookingId);

    if (dbErr) throw dbErr;

    // Send email to client
    const firstName = (clientName || '').split(' ')[0] || 'there';
    await sendEmail({
      to: clientEmail,
      subject: `Your consultation is scheduled — ${consultationDate} at ${consultationTime}`,
      html: consultationScheduledEmail({ firstName, serviceName, consultationDate, consultationTime, consultationType, consultationNotes }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-consultation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
