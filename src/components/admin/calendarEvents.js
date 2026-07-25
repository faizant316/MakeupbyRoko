import { isBridalService } from './statusColors';
import { timeToMinutes } from './timeline';

const startTime = (t) => (t ? String(t).split(/[–-]/)[0].trim() : '');

// Every admin calendar derives its days from this, so the Home picker, the
// Calendar tab and the All Appointments overlay can never disagree about what
// is on a given day.
//
// A booking lands on its appointment date, or on its consultation date when
// it is consult-only, so nothing is listed twice.
export function buildEventMap(bookings = [], classRegs = []) {
  const evMap = {};
  const push = (key, ev) => { if (!key) return; (evMap[key] ||= []).push(ev); };

  (bookings || []).forEach(b => {
    const key = b.date || b.consultation_date;
    if (!key) return;
    const consultOnly = !b.date && !!b.consultation_date;
    push(key, {
      id: b.id,
      kind: consultOnly ? 'consult' : 'appt',
      name: b.name || 'Client',
      time: consultOnly ? b.consultation_time : b.time,
      detail: consultOnly ? `${b.consultation_type || 'Zoom'} consultation` : (b.service || 'Appointment'),
      status: b.status,
      bridal: isBridalService(b.service),
      source: b.source,
      raw: b,
    });
    // A booking with its own consultation on a different day shows up on both,
    // otherwise a consult-only dot appears with nothing behind it.
    if (b.date && b.consultation_date && b.consultation_date !== b.date) {
      push(b.consultation_date, {
        id: `consult-${b.id}`,
        kind: 'consult',
        name: b.name || 'Client',
        time: b.consultation_time,
        detail: `${b.consultation_type || 'Zoom'} consultation`,
        status: b.status,
        bridal: isBridalService(b.service),
        source: b.source,
        raw: b,
      });
    }
  });

  (classRegs || []).forEach(r => {
    if (!r.appointment_date) return;
    push(r.appointment_date, {
      id: `class-${r.id}`,
      kind: 'class',
      name: r.full_name || 'Client',
      time: r.appointment_time,
      detail: 'Makeup Class',
      status: r.status,
      raw: r,
    });
  });

  Object.values(evMap).forEach(list =>
    list.sort((a, b) => timeToMinutes(startTime(a.time)) - timeToMinutes(startTime(b.time))));
  return evMap;
}

// Bookings that eat a slot. Consultations and classes deliberately excluded:
// capacity is about how many faces she does that day.
export function buildBookedMap(bookings = []) {
  const m = {};
  (bookings || []).forEach(b => {
    if (!b.date || !['confirmed', 'pending'].includes(b.status)) return;
    m[b.date] = (m[b.date] || 0) + 1;
  });
  return m;
}
