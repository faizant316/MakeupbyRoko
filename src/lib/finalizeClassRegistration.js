import { randomUUID } from 'crypto';
import { sendEmailPair, classPaymentEmail, adminClassPaymentEmail } from './email';
import { CLASS_KEYS, CLASS_FORMATS, classMeta, DEFAULT_FORMAT } from './classCatalog';
import { createZoomMeeting } from './zoomMeeting';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'makeupbyroko22@gmail.com';
const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';

// "2026-07-15" → "Wednesday, July 15, 2026"
function formatClassDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

// Single source of truth for confirming a paid class registration.
//
// Both the Stripe webhook and the on-site /payment-success confirm route can
// fire for the same checkout, so this atomically CLAIMS the row (pending →
// paid/confirmed) and only sends the one client + one admin email if THIS
// caller won the claim. The loser's conditional update matches 0 rows and
// no-ops, which is what keeps sign-ups to exactly one email each.
//
// Since clients now choose their Wednesday AND time window at checkout, the
// winner also finishes the booking on the spot:
//   - copies the chosen date/time into appointment_date/appointment_time
//   - online: creates the Zoom meeting and emails the join link immediately
//   - in person: emails the Mountain House studio address instead
//
// `sessionMeta` is the Stripe session metadata; it carries class_format /
// preferred_date / preferred_time as a fallback for rows created before
// migration 0004 landed, so the right email always goes out.
export async function finalizeClassRegistration(supabase, { registrationId, sessionId, sessionMeta = {} }) {
  const { data: claimed, error } = await supabase
    .from('class_registrations')
    .update({ payment_status: 'paid', status: 'confirmed' })
    .eq('id', registrationId)
    .eq('payment_status', 'pending') // the lock — only the first caller matches
    .select('*');

  if (error) throw error;
  if (!claimed || claimed.length === 0) return { alreadyDone: true };

  const reg = claimed[0];
  const bookedClasses = CLASS_KEYS.filter(k => reg[k]);
  const format = CLASS_FORMATS[reg.class_format] ? reg.class_format
    : CLASS_FORMATS[sessionMeta.class_format] ? sessionMeta.class_format
    : null;
  const classDate = reg.preferred_date || sessionMeta.preferred_date || null;
  const classTime = reg.preferred_time || sessionMeta.preferred_time || null;

  const classes = bookedClasses.map(k => classMeta(k, format || DEFAULT_FORMAT)).filter(Boolean);
  const totalPaid = reg.amount_paid ?? classes.reduce((s, c) => s + (c.price || 0), 0);
  const firstName = (reg.full_name || '').split(' ')[0] || 'there';
  const dateFormatted = formatClassDate(classDate);

  // ── Auto-schedule: the client already picked their Wednesday + window ──────
  // For online classes, spin up the Zoom meeting now so the link rides in the
  // confirmation email ("once they schedule and pay, the link goes out").
  let zoomLink = '';
  if (format === 'online' && classes.length > 0) {
    try {
      const meeting = await createZoomMeeting({
        topic: `Makeup by Roko · ${classes[0].title}`,
        duration: classes[0].durationMinutes || 180,
        date: classDate || undefined,
        time: classTime || undefined,
      });
      zoomLink = meeting.join_url || '';
      if (zoomLink) {
        const lessonNotes = [`Link: ${zoomLink}`, meeting.meeting_id ? `MeetingId: ${meeting.meeting_id}` : null]
          .filter(Boolean).join('\n');
        const { error: notesErr } = await supabase
          .from('class_registrations')
          .update({ lesson_notes: lessonNotes })
          .eq('id', registrationId);
        if (notesErr) console.error('class zoom notes write skipped:', notesErr.message);
      }
    } catch (e) {
      // Never let a Zoom hiccup block the confirmation email; Roko can
      // generate a link from the admin scheduler instead.
      console.error('auto zoom link failed:', e?.message);
    }
  }

  if (classDate) {
    const { error: schedErr } = await supabase
      .from('class_registrations')
      .update({ appointment_date: classDate, appointment_time: classTime || null })
      .eq('id', registrationId);
    if (schedErr) console.error('class auto-schedule write skipped:', schedErr.message);
  }
  if (format) {
    // Separate best-effort write: the legacy check constraint only allowed
    // Zoom/Phone until migration 0004, so 'In-Person' must never take the
    // schedule write down with it.
    const { error: typeErr } = await supabase
      .from('class_registrations')
      .update({ consultation_type: format === 'online' ? 'Zoom' : 'In-Person' })
      .eq('id', registrationId);
    if (typeErr) console.error('class consultation_type write skipped:', typeErr.message);
  }

  const formatLabel = format ? CLASS_FORMATS[format].label : '';

  // Ensure the row has a cancel token so the confirmation email can carry a
  // "need to cancel?" link (mirrors bookings' upload_token). Best-effort: if the
  // column isn't there yet (migration 0012), the link is simply omitted.
  let cancelToken = reg.upload_token;
  if (!cancelToken) {
    cancelToken = randomUUID().replace(/-/g, '');
    const { error: tokErr } = await supabase
      .from('class_registrations')
      .update({ upload_token: cancelToken })
      .eq('id', registrationId);
    if (tokErr) { console.error('class cancel token write skipped:', tokErr.message); cancelToken = ''; }
  }
  const cancelUrl = cancelToken ? `${SITE_BASE}/cancel-booking?token=${cancelToken}` : '';

  await sendEmailPair([
    {
      to: reg.email,
      subject: dateFormatted
        ? `You're booked! ${classes[0]?.title || 'Your class'} on ${dateFormatted}`
        : "You're officially booked! Your class is confirmed.",
      html: classPaymentEmail({ firstName, classes, totalPaid, format, formatLabel, dateFormatted, classTime, zoomLink, cancelUrl }),
    },
    {
      to: ADMIN_EMAIL,
      subject: `New Class Booking · ${reg.full_name} · ${formatLabel || 'Class'} ($${totalPaid.toLocaleString()})`,
      html: adminClassPaymentEmail({ reg, classes, totalPaid, formatLabel, dateFormatted, classTime, zoomLink, sessionId }),
    },
  ]);

  return { sent: true, reg };
}
