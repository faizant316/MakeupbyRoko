// Single source of truth for appointment status + schedule event colors.
// Booksy-style semantics: blue = confirmed (locked in), slate = completed
// (done, archived), amber = pending, red = cancelled. Every admin surface
// (badges, calendar dots, filter chips, detail header) reads from here so a
// status always looks the same wherever it appears.

export const STATUS_COLORS = {
  pending:   '#F59E0B',
  confirmed: '#2563EB',
  completed: '#64748B',
  cancelled: '#EF4444',
};

// Muted versions for dark-mode fills (dots stay readable without glowing).
export const STATUS_COLORS_DM = {
  pending:   '#92660A',
  confirmed: '#1E40AF',
  completed: '#3F4754',
  cancelled: '#991B1B',
};

// Schedule (time-grid) block colors, keyed by what the event is rather than
// its status. Deep enough that white text passes contrast on every one.
export const EVENT_COLORS = {
  bridal:  '#9A5474', // plum, matches the bridal rows in the list
  appt:    '#5B6576', // slate, regular (non-bridal) appointments
  class:   '#C76BA6', // pink, makeup lessons
  consult: '#6B5A93', // muted plum-indigo, Zoom or phone consultations
};

// Consultation ink, per theme. Consultations used to be two different violets
// depending on the surface (#A855F7 in the client card and list, #7C3AED on the
// schedule), and neither sat in the warm pink/plum palette the rest of the admin
// uses. One muted plum-indigo now, imported everywhere instead of redeclared, so
// a consultation is the same color wherever it shows up.
export const CONSULT_INK = { light: '#6B5A93', dark: '#B6A7D9' };

// Blocked time (Roko's own reservations). A warm grey, drawn with diagonal
// hatching wherever there's room, the way Booksy draws a time reservation: the
// time is taken, but not by a client, so it must not wear a client colour.
export const BLOCK_INK = { light: '#857C88', dark: '#ABA3AE' };

export function blockHatch(dm) {
  const a = dm ? 'rgba(171,163,174,0.16)' : 'rgba(133,124,136,0.10)';
  const b = dm ? 'rgba(171,163,174,0.05)' : 'rgba(133,124,136,0.03)';
  return `repeating-linear-gradient(135deg, ${a} 0 6px, ${b} 6px 12px)`;
}

export function isBridalService(service) {
  const s = (service || '').toLowerCase();
  if (s.includes('non-bridal') || s.includes('non bridal')) return false;
  return ['bridal', 'bride', 'wedding', 'full day'].some(kw => s.includes(kw));
}
