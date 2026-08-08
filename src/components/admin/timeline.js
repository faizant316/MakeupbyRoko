// Shared timeline helpers for the admin lists (appointments + class sign-ups),
// so both bucket and label dates the same way.

export function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86400000);
}

// The date a booking is scheduled by: its appointment date, or its consultation
// date when it's consult-only. The appointment date always wins, and that
// ordering is the whole point — a bride whose consultation was last week but
// whose wedding is in March is scheduled for March, not overdue.
//
// Anything that decides whether a booking is past due has to date it THIS way.
// Past Due already did; auto-complete didn't, and read b.date alone, so a
// Booksy consultation with no appointment date sat in Past Due forever.
export function scheduledDate(b) {
  return b.date || b.consultation_date || '';
}

// Human, relative label: Today / Tomorrow / Sat, Jun 27.
export function relativeDate(dateStr) {
  if (!dateStr) return { label: 'No date', tone: 'muted' };
  const diff = daysUntil(dateStr);
  if (diff === 0) return { label: 'Today', tone: 'accent' };
  if (diff === 1) return { label: 'Tomorrow', tone: 'accent' };
  if (diff === -1) return { label: 'Yesterday', tone: 'past' };
  const formatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return { label: formatted, tone: diff < 0 ? 'past' : 'normal' };
}

// Group definitions in display order. Empty groups are dropped before render.
export const GROUP_META = [
  { key: 'pastdue', label: 'Past Due', accent: '#E0795B' },
  { key: 'today', label: 'Today', accent: '#A0607A' },
  { key: 'week', label: 'This Week', accent: null },
  { key: 'month', label: 'This Month', accent: null },
  { key: 'later', label: 'Later', accent: null },
  { key: 'unscheduled', label: 'Unscheduled', accent: null },
];

// Parse "10:00 AM" / "1:30 PM" (or the start of a "11:00 AM – 12:30 PM"
// range) into minutes since midnight, so single times sort chronologically —
// lexical sorting would otherwise put "10:00 AM" before "9:00 AM".
export function timeToMinutes(t) {
  if (!t) return 9999;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 9999;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3] && m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// Bucket a list by how soon each item is. `getDate` pulls the date string.
export function groupByTime(items, getDate) {
  const buckets = { pastdue: [], today: [], week: [], month: [], later: [], unscheduled: [] };
  items.forEach(it => {
    const ds = getDate(it);
    if (!ds) { buckets.unscheduled.push(it); return; }
    const d = daysUntil(ds);
    if (d < 0) buckets.pastdue.push(it);
    else if (d === 0) buckets.today.push(it);
    else if (d <= 7) buckets.week.push(it);
    else if (d <= 30) buckets.month.push(it);
    else buckets.later.push(it);
  });
  return GROUP_META
    .map(g => ({ ...g, items: buckets[g.key] }))
    .filter(g => g.items.length > 0);
}
