// Single source of truth for appointment status + schedule event colors.
// Booksy-style semantics: green = confirmed (locked in), slate = completed
// (done, archived), amber = pending, red = cancelled. Every admin surface
// (badges, calendar dots, filter chips, detail header) reads from here so a
// status always looks the same wherever it appears.

export const STATUS_COLORS = {
  pending:   '#F59E0B',
  confirmed: '#16A34A',
  completed: '#64748B',
  cancelled: '#EF4444',
};

// Muted versions for dark-mode fills (dots stay readable without glowing).
export const STATUS_COLORS_DM = {
  pending:   '#92660A',
  confirmed: '#166534',
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
  confirmed: { light: { bg: 'rgba(22,163,74,0.13)',   txt: '#15803D' }, dark: { bg: 'rgba(34,197,94,0.18)',   txt: '#56D98A' } },
  completed: { light: { bg: 'rgba(100,116,139,0.14)', txt: '#475569' }, dark: { bg: 'rgba(148,163,184,0.16)', txt: '#A7B2C4' } },
  cancelled: { light: { bg: 'rgba(239,68,68,0.12)',   txt: '#DC2626' }, dark: { bg: 'rgba(239,68,68,0.18)',   txt: '#F87171' } },
};

// Schedule (time-grid) block colors, keyed by what the event is rather than
// its status. Deep enough that white text passes contrast on every one.
export const EVENT_COLORS = {
  bridal:  '#9A5474', // plum, matches the bridal rows in the list
  appt:    '#0F766E', // teal, regular (non-bridal) appointments
  class:   '#9A6B2F', // warm bronze, makeup lessons
  consult: '#7C3AED', // violet, Zoom or phone consultations
};

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
