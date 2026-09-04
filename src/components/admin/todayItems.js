import { parseMeetingId, meetingIdFromUrl } from '@/lib/zoomHost';
import { classesOfReg } from '@/lib/classCatalog';
import { timeToMinutes } from './timeline';

// Everything happening today that ISN'T a plain appointment: the consultations
// and the class lessons.
//
// This used to be the job of the Today card sitting under the calendar, which
// meant today was described in two places — that card on the left and the
// timeline on the right — with the Zoom link only in one of them. Now the
// appointments timeline owns the whole day and this feeds it the rest, so a
// 9 AM consultation, a noon wedding and a 5 PM class read as one run in time
// order rather than as three lists you have to merge in your head.

// Local calendar date "YYYY-MM-DD" (NOT UTC). toISOString() would roll to
// tomorrow after ~5pm Pacific and make "today" disagree with the calendar's
// selected day, which uses local dates.
export function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Roko writes the meeting link into the notes as a "Link: …" line.
function linkFromNotes(notes) {
  return notes?.match(/^Link: (https?:\/\/\S+)/m)?.[1] || '';
}

// A consultation on the books for `dateKey`, ready to render as a row.
function consultItem(b, dateKey) {
  if (b.consultation_date !== dateKey || b.status === 'cancelled') return null;
  const isZoom = (b.consultation_type || 'Zoom') === 'Zoom';
  const joinUrl = linkFromNotes(b.consultation_notes);
  return {
    id: `consult-${b.id}`,
    kind: 'consult',
    sort: timeToMinutes(b.consultation_time),
    time: b.consultation_time || '',
    label: `${b.consultation_type || 'Zoom'} · ${b.service || 'Consultation'}`,
    // Shaped like a booking so the row can render it with the same avatar,
    // name and status it gives everything else.
    booking: { id: b.id, name: b.name, service: b.service, status: b.status || 'pending', email: b.email, phone: b.phone },
    join: isZoom ? { url: joinUrl, meetingId: parseMeetingId(b.consultation_notes) || meetingIdFromUrl(joinUrl) } : null,
    raw: b,
  };
}

// A class lesson on the books for `dateKey`.
function classItem(r, dateKey) {
  if (r.appointment_date !== dateKey || r.status === 'cancelled') return null;
  const isZoom = r.class_format !== 'in_person';
  const joinUrl = linkFromNotes(r.lesson_notes);
  const names = classesOfReg(r).map(c => c.name).filter(Boolean).join(' + ');
  const where = r.class_format === 'in_person' ? 'Studio' : 'Zoom';
  return {
    id: `class-${r.id}`,
    kind: 'class',
    sort: timeToMinutes(r.appointment_time),
    time: r.appointment_time || '',
    label: `${names || 'Makeup class'} · ${where}`,
    booking: { id: r.id, name: r.full_name, service: names || 'Makeup class', status: r.status || 'pending' },
    join: isZoom ? { url: joinUrl, meetingId: parseMeetingId(r.lesson_notes) || meetingIdFromUrl(joinUrl) } : null,
    raw: r,
  };
}

// Consultations + classes for one day, in time order. Appointments are left to
// the caller: they're already in the list being grouped.
export function todayItems(bookings, classRegs, dateKey) {
  const items = [
    ...(bookings || []).map(b => consultItem(b, dateKey)),
    ...(classRegs || []).map(r => classItem(r, dateKey)),
  ].filter(Boolean);
  return items.sort((a, b) => a.sort - b.sort);
}
