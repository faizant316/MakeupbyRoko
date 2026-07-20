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

// ── Native <input type="time"> reducers (the mobile pickers) ─────────────────
// Both take the current window string plus the raw 24h value the input emitted,
// and return the next window string (+ an error to show, if the edit was
// rejected). Pure on purpose: a native time wheel is the one input we cannot
// test by hand on every device, so the rules live here where they can be.

// Editing the start keeps the end only while the end is still after it.
export function applyStartInput(current, raw24) {
  const { end } = parseRange(current);
  const s = from24h(raw24);
  if (!s) return { value: '', error: '' };
  const keepEnd = end && apptToMin(end) > apptToMin(s);
  return { value: formatRange(s, keepEnd ? end : ''), error: '' };
}

// Editing the end must NEVER reassign the start. iOS seeds an empty time wheel
// with the current clock time and fires a change as soon as the field opens, so
// treating an out-of-order end as "restart from here" (which is correct for a
// deliberate tap on the desktop grid) silently replaced a start Roko had already
// set with whatever time it happened to be. An end that is not after the start
// is rejected instead, leaving the start untouched.
export function applyEndInput(current, raw24) {
  const { start } = parseRange(current);
  const e = from24h(raw24);
  if (!e) return { value: formatRange(start, ''), error: '' };
  if (!start) return { value: formatRange(e, ''), error: '' };
  if (apptToMin(e) > apptToMin(start)) return { value: formatRange(start, e), error: '' };
  return { value: formatRange(start, ''), error: `End needs to be after ${start}` };
}
