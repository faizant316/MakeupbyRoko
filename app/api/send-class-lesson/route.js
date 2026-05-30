import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, lessonScheduledEmail, adminLessonEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const { registrationId, clientEmail, clientName, className, lessonDate, lessonTime, meetingType, zoomLink, notes } = await req.json();

    if (!registrationId || !clientEmail || !lessonDate || !lessonTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const storedNotes = [
      meetingType === 'Zoom' && zoomLink ? `Link: ${zoomLink}` : null,
      notes || null,
    ].filter(Boolean).join('\n') || null;

    const { error: dbErr } = await supabase
      .from('class_registrations')
      .update({ appointment_date: lessonDate, appointment_time: lessonTime, consultation_type: meetingType, lesson_notes: storedNotes })
      .eq('id', registrationId);

    if (dbErr) throw dbErr;

    const firstName = (clientName || '').split(' ')[0] || 'there';
    const dateFormatted = new Date(lessonDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    await sendEmail({
      to: clientEmail,
      subject: `Your makeup lesson is scheduled: ${dateFormatted} at ${lessonTime}`,
      html: lessonScheduledEmail({
        firstName,
        className,
        lessonDate: dateFormatted,
        lessonTime,
        meetingType,
        zoomLink: meetingType === 'Zoom' ? zoomLink : '',
        notes,
      }),
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'makeupbyroko22@gmail.com';
    sendEmail({
      to: adminEmail,
      subject: `💄 Lesson Scheduled: ${clientName} · ${dateFormatted} at ${lessonTime}`,
      html: adminLessonEmail({
        clientName, clientEmail, className,
        lessonDate: dateFormatted, lessonTime,
        meetingType,
        zoomLink: meetingType === 'Zoom' ? zoomLink : '',
        notes,
      }),
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-class-lesson:', err);
    return NextResponse.json({ error: 'Failed to schedule lesson' }, { status: 500 });
  }
}
