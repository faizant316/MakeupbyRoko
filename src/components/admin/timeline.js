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

// The far buckets, where naming every single day would be noise. The near ones
// are built per day (see groupByTime) because "This Week" answered the wrong
// question: it told you seven days had something in them without telling you
// what tomorrow holds, which is the thing you actually want to know.
export const GROUP_META = [
  { key: 'pastdue', label: 'Past Due', accent: '#E0795B', order: -10 },
  { key: 'month', label: 'Later This Month', accent: null, order: 50 },
  { key: 'later', label: 'Later', accent: null, order: 60 },
  { key: 'unscheduled', label: 'Unscheduled', accent: null, order: 70 },
];

// How far out the day-by-day view runs before it folds into "Later This Month".
const NAMED_DAYS = 7;

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
//
// The next week gets one group per day — Today, Tomorrow, then Wed, Sep 9 and
// so on — so the list reads as a schedule you can walk forward through. Only
// days that actually hold something appear, so a quiet week is still short.
// Beyond a week it folds back into two coarse buckets; naming the 23rd when
// it's three weeks out tells you nothing you need yet.
export function groupByTime(items, getDate) {
  const groups = new Map();
  const put = (meta, item) => {
    if (!groups.has(meta.key)) groups.set(meta.key, { ...meta, items: [] });
    groups.get(meta.key).items.push(item);
  };
  const far = Object.fromEntries(GROUP_META.map(g => [g.key, g]));

  items.forEach(it => {
    const ds = getDate(it);
    if (!ds) return put(far.unscheduled, it);
    const d = daysUntil(ds);
    if (d < 0) return put(far.pastdue, it);
    if (d <= NAMED_DAYS) {
      return put({
        key: d === 0 ? 'today' : d === 1 ? 'tomorrow' : `day:${ds}`,
        label: d === 0 ? 'Today' : d === 1 ? 'Tomorrow'
          : new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        accent: d <= 1 ? '#A0607A' : null,
        day: true,
        order: d,
      }, it);
    }
    if (d <= 30) return put(far.month, it);
    return put(far.later, it);
  });

  return [...groups.values()].sort((a, b) => a.order - b.order);
}
