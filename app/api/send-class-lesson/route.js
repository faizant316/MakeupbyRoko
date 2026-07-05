import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createClient } from '../../../src/lib/supabase/server';
import { sendEmail, enrolledLessonEmail, adminLessonEmail } from '../../../src/lib/email';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = createClient();
    const { registrationId, clientEmail, clientName, clientPhone, className, lessonDate, lessonTime, meetingType, zoomLink, notes } = await req.json();

    if (!registrationId || !clientEmail || !lessonDate || !lessonTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const storedNotes = [
      meetingType === 'Zoom' && zoomLink ? `Link: ${zoomLink}` : null,
      notes || null,
    ].filter(Boolean).join('\n') || null;

    const { error: dbErr } = await supabase
      .from('class_registrations')
      .update({ appointment_date: lessonDate, appointment_time: lessonTime, lesson_notes: storedNotes, status: 'enrolled' })
      .eq('id', registrationId);

    if (dbErr) throw dbErr;

    // Separate best-effort write: 'In-Person' is only legal once migration 0004
    // relaxes the old Zoom/Phone check constraint, and a stale constraint must
    // never take the whole scheduling call down.
    const { error: typeErr } = await supabase
      .from('class_registrations')
      .update({ consultation_type: meetingType })
      .eq('id', registrationId);
    if (typeErr) console.error('send-class-lesson consultation_type skipped:', typeErr.message);

    const firstName = (clientName || '').split(' ')[0] || 'there';
    const dateFormatted = new Date(lessonDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    await sendEmail({
      to: clientEmail,
      subject: `You're enrolled! Your ${className} is scheduled`,
      html: enrolledLessonEmail({
        firstName,
        className,
        lessonDate: dateFormatted,
        lessonTime,
        meetingType,
        zoomLink: meetingType === 'Zoom' ? zoomLink : '',
        clientPhone,
        notes,
      }),
    });

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';
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
