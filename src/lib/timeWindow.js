// ── Appointment / consultation time WINDOW helpers ───────────────────────────
// A time window is stored as a single string ("1:00 PM – 2:30 PM") so every
// consumer (card header, calendar, agenda, emails, contract) keeps working
// unchanged. A single time is just "1:00 PM". Shared by the admin pickers.

// Visual range separator (en dash, NOT an em dash — matches brand copy rules).
export const RANGE_SEP = ' – ';

// "1:00 PM" → minutes since midnight, so a second tap can be ordered after the
// first (and an earlier tap resets the start).
export function apptToMin(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3] && m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// Split a stored value into { start, end }. Accepts en/em dash, hyphen, or "to".
export function parseRange(val) {
  if (!val) return { start: '', end: '' };
  const parts = String(val).split(/\s*(?:–|—|-|to)\s*/i).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { start: parts[0], end: parts[1] };
  return { start: parts[0] || '', end: '' };
}

// Build the stored/displayed value from a start (+ optional end).
export function formatRange(start, end) {
  if (start && end) return `${start}${RANGE_SEP}${end}`;
  return start || '';
}

// "9:30 AM" → "09:30"  (for <input type="time"> value)
export function to24h(val) {
  if (!val) return '';
  const isPM = /pm/i.test(val) && !/^\s*12/.test(val);
  const isAM12 = /^\s*12/.test(val) && /am/i.test(val);
  const clean = val.replace(/\s?(AM|PM)/i, '').trim();
  const [hStr, mStr = '00'] = clean.split(':');
  let h = parseInt(hStr, 10);
  if (isPM) h += 12;
  if (isAM12) h = 0;
  return `${String(h).padStart(2, '0')}:${mStr}`;
}

// "09:30" → "9:30 AM"
export function from24h(val) {
  if (!val) return '';
  const [hStr, mStr = '00'] = val.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}
