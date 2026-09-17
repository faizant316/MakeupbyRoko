import { apptToMin, parseRange } from './timeWindow';

// Blocked time on Roko's calendar (migration 0021). Shared by the API routes,
// which validate with it, and the admin panels, which lay blocks out and check
// them for clashes with it.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The one gate every write goes through, so the POST and PATCH routes can't
// disagree about what a block is.
export function cleanTimeBlock(body) {
  const b = body || {};
  if (!DATE_RE.test(String(b.date || ''))) return { error: 'A block needs a date.' };

  const time = typeof b.time === 'string' ? b.time.trim().slice(0, 40) : '';
  if (time) {
    const { start, end } = parseRange(time);
    const s = apptToMin(start);
    const e = apptToMin(end);
    if (s == null) return { error: "That start time doesn't read as a time." };
    if (end && (e == null || e <= s)) return { error: 'The block has to end after it starts.' };
  }

  return {
    row: {
      date: b.date,
      time: time || null,
      reason: typeof b.reason === 'string' ? b.reason.trim().slice(0, 300) : '',
      source: b.source === 'booksy' ? 'booksy' : null,
    },
  };
}

// Minutes since midnight for a stored window. A lone start time gets
// `fallback` minutes, the same way the day grid draws an appointment that only
// has a start. Null when there is no usable time at all.
export function windowMinutes(timeStr, fallback = 60) {
  const { start, end } = parseRange(timeStr);
  const s = apptToMin(start);
  if (s == null) return null;
  let e = apptToMin(end);
  if (e == null || e <= s) e = s + fallback;
  return { start: s, end: e };
}

// True when two stored windows share any minute. Touching ends (1:30 PM end,
// 1:30 PM start) do not count: back to back is how Roko books a day.
export function windowsOverlap(a, b, fallback = 60) {
  const x = windowMinutes(a, fallback);
  const y = windowMinutes(b, fallback);
  return !!(x && y && x.start < y.end && y.start < x.end);
}

export const blockLabel = (block) => (block?.reason || '').trim() || 'Blocked';
