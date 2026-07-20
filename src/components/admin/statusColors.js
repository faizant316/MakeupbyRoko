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

export const STATUS_LABELS = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Filter-chip tints (soft background + readable text) per theme.
export const STATUS_CHIP = {
  pending:   { light: { bg: 'rgba(245,158,11,0.13)',  txt: '#B26A04' }, dark: { bg: 'rgba(245,158,11,0.18)',  txt: '#F5B83C' } },
  confirmed: { light: { bg: 'rgba(37,99,235,0.12)',   txt: '#1D4ED8' }, dark: { bg: 'rgba(59,130,246,0.20)',   txt: '#93B4F7' } },
  completed: { light: { bg: 'rgba(100,116,139,0.14)', txt: '#475569' }, dark: { bg: 'rgba(148,163,184,0.16)', txt: '#A7B2C4' } },
  cancelled: { light: { bg: 'rgba(239,68,68,0.12)',   txt: '#DC2626' }, dark: { bg: 'rgba(239,68,68,0.18)',   txt: '#F87171' } },
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

export const EVENT_LABELS = {
  bridal:  'Bridal',
  appt:    'Appointment',
  class:   'Makeup Class',
  consult: 'Consultation',
};

export function isBridalService(service) {
  const s = (service || '').toLowerCase();
  if (s.includes('non-bridal') || s.includes('non bridal')) return false;
  return ['bridal', 'bride', 'wedding', 'full day'].some(kw => s.includes(kw));
}
