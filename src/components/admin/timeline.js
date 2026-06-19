// Shared timeline helpers for the admin lists (appointments + class sign-ups),
// so both bucket and label dates the same way.

export function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86400000);
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
