import { Fragment, useState } from 'react';
import StatusBadge from './StatusBadge';
import { timeAgo, shortDate } from './depositState';
import { localDateKey } from './todayItems';

// "Did anyone book?" and "who booked a couple of days ago?" are the same
// question asked at two different distances, so this answers both.
//
// It used to answer only the first. Anything older than 24 hours dropped off
// the rail and became genuinely unfindable, because every other list in this
// admin is ordered by when the APPOINTMENT is, never by when it was booked. A
// bride who booked on Tuesday for next June sorts under "Later", months down a
// list, with nothing anywhere marking her as new.
//
// So it holds 30 days, and it holds them the same way all month. There was a
// rose "New booking" state for the first 24 hours and it's gone: an alert that
// fires on every single booking is not an alert, it's the furniture wearing a
// costume for a day, and it made the rail read as two different components
// depending on the hour. One row, always the same, and the subline's "3h ago"
// is the whole signal that something just landed.
//
// Its own component because it renders in two places and only ever one of them
// shows: inside the Appointments list on a laptop, where it sits with the rest
// of that workspace, and at the very top of the page on a phone, above the
// calendar. On a phone the appointments list is three scrolls down, which meant
// the one thing she opens the admin to check was the one thing she had to go
// looking for.

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

// Grouped by the day each one was BOOKED. "Past week" is the rolling stretch
// between yesterday and seven days back rather than a calendar week, because
// "a couple of days ago" is a distance from now, not a Monday.
const GROUPS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'Past week'],
  ['earlier', 'Earlier'],
];

// Chrome-less, like the deposit rail it stacks with: no tint, no border, just a
// hover wash. Nothing here is urgent, so nothing here should be coloured.
const ink = (dm) => ({
  hover:  dm ? 'rgba(255,255,255,0.045)' : 'rgba(24,24,27,0.03)',
  dot:    dm ? '#52525b' : '#D6D6DE',
  label:  dm ? '#e4e4e7' : '#2e2e35',
  sub:    dm ? '#8b8b95' : '#9c9ca6',
  action: dm ? '#a1a1aa' : '#83838d',
  stamp:  dm ? '#7a7a84' : '#a8a8b2',
  line:   dm ? '#34343d' : '#EDEDF1',
  focus:  dm ? '#5c4450' : '#E3C6D1',
});

export default function NewBookingsRail({ bookings, loading = false, onSelect, darkMode: dm, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const c = ink(dm);

  // Booked in the last 30 days, newest first. Booksy imports stay out: 563
  // contacts all carry the same import timestamp, so one afternoon of backfill
  // would bury every real booking in here for a month.
  const now = Date.now();
  const windowStart = now - WINDOW_DAYS * DAY;
  const recent = (bookings || [])
    .filter(b => b.source !== 'booksy' && b.created_date && new Date(b.created_date).getTime() >= windowStart)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // While the bookings are still in flight there's nothing to show and no way
  // to know whether there will be, so the rail holds its own space with a
  // placeholder the same height. Otherwise the calendar paints first and then
  // gets shoved down the moment the fetch lands, which is the jump she sees on
  // every refresh.
  if (loading) {
    return (
      <div className={className} aria-hidden="true">
        <div className="px-2 py-2 -mx-2 flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dm ? '#3f3f46' : '#E4E4EA' }} />
          <span className="min-w-0 flex-1">
            <span className="block h-3.5 w-32 rounded-full" style={{ background: dm ? 'rgba(255,255,255,0.07)' : '#EFEFF3' }} />
            <span className="block h-2.5 w-44 max-w-full rounded-full mt-2" style={{ background: dm ? 'rgba(255,255,255,0.05)' : '#F5F5F8' }} />
          </span>
        </div>
      </div>
    );
  }

  if (recent.length === 0) return null;

  const todayKey = localDateKey();
  const yesterdayKey = localDateKey(new Date(now - DAY));
  // Midnight six days back, since today and yesterday have already taken their
  // share of the rolling seven.
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekCutoff = weekStart.getTime();

  const bucketOf = (b) => {
    const t = new Date(b.created_date);
    const key = localDateKey(t);
    if (key === todayKey) return 'today';
    if (key === yesterdayKey) return 'yesterday';
    return t.getTime() >= weekCutoff ? 'week' : 'earlier';
  };

  // "booked 3h ago" close up, "booked Sep 3" once the hours stop meaning
  // anything. Always prefixed with the word, because the same row also carries
  // the APPOINTMENT date and the two must never be mistaken for each other.
  // Hours are scoped to the calendar day rather than to 24 rolling ones, so a
  // booking made at 11pm never reads "2h ago" at one in the morning.
  const bookedStamp = (iso) => {
    const t = new Date(iso);
    const mins = Math.max(0, Math.round((now - t.getTime()) / 60000));
    if (mins < 1) return 'booked just now';
    if (mins < 60) return `booked ${mins}m ago`;
    const key = localDateKey(t);
    if (key === todayKey) return `booked ${Math.round(mins / 60)}h ago`;
    if (key === yesterdayKey) return 'booked yesterday';
    return `booked ${shortDate(iso)}`;
  };

  const matches = (b) => !search || [b.name, b.service, b.email].some(f => f?.toLowerCase().includes(search.toLowerCase()));
  const shown = recent.filter(matches);
  const grouped = GROUPS
    .map(([key, label]) => ({ key, label, rows: shown.filter(b => bucketOf(b) === key) }))
    .filter(g => g.rows.length > 0);

  return (
    <div className={`relative ${className}`}>
      {/* Written in the list's own language: the same small dot and serif label
          its group headers use, so it reads as the top of the list it
          introduces rather than a widget stapled above one. */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-2 py-2 -mx-2 rounded-[12px] text-left transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = c.hover}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />

        <span className="min-w-0 flex-1">
          <span className="font-serif text-[1.05rem] leading-none block" style={{ color: c.label }}>
            Recent bookings
          </span>
          <span className="block text-[0.75rem] mt-1.5 truncate" style={{ color: c.sub }}>
            {(recent[0].name || 'Someone').split(' ')[0]}
            {recent[0].service ? ` · ${recent[0].service}` : ''}
            {` · ${timeAgo(recent[0].created_date)}`}
          </span>
        </span>

        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[0.78rem] font-medium" style={{ color: c.action }}>
            {open ? 'Hide' : 'View'}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke={c.action} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="w-3.5 h-3.5"
            style={{ transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {/* Animates max-height + opacity only, so it stays smooth on mobile where
          animating height / grid-rows forces per-frame layout + repaint. */}
      <div
        className="mt-2 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: dm ? '#27272a' : '#fff',
          border: `1px solid ${dm ? '#3f3f46' : '#EAEBF0'}`,
          maxHeight: open ? 'min(60vh, 420px)' : '0px',
          opacity: open ? 1 : 0,
          marginTop: open ? undefined : 0,
          borderWidth: open ? '1px' : '0px',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'max-height 320ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease, margin-top 320ms ease',
        }}
      >
        {/* A search box above a handful of rows is just clutter. */}
        {recent.length > 6 && (
          <div className="px-5 pt-3.5 pb-1 flex-shrink-0">
            <div className="relative flex items-center gap-2.5 pb-2"
              style={{ borderBottom: `1px solid ${focused ? c.focus : c.line}`, transition: 'border-color 200ms ease' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={focused ? c.action : c.stamp} strokeWidth="1.4" strokeLinecap="round"
                className="w-4 h-4 flex-shrink-0" style={{ transition: 'stroke 200ms ease' }}>
                <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search"
                className="flex-1 min-w-0 bg-transparent border-0 p-0 text-base sm:text-[0.82rem] outline-none"
                style={{ color: dm ? '#e4e4e7' : '#111' }}
                onClick={e => e.stopPropagation()}
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search"
                  className="flex-shrink-0 transition-opacity hover:opacity-60" style={{ color: c.stamp }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* data-lenis-prevent, or Lenis eats the wheel and scrolls the page
            behind this instead of the list inside it, which reads as a panel
            that simply won't scroll. Same guard every other nested scroller in
            the admin uses. */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-lenis-prevent style={{ WebkitOverflowScrolling: 'touch' }}>
          {grouped.map(group => (
            <Fragment key={group.key}>
              {/* Sticky, so scrolling back through the month never leaves her
                  looking at a name with no idea when it arrived. */}
              <div className="sticky top-0 px-5 pt-3.5 pb-2 text-[0.6rem] font-semibold tracking-[0.12em] uppercase"
                style={{ color: dm ? '#6f6f79' : '#b0b0ba', background: dm ? '#27272a' : '#fff' }}>
                {group.label}
              </div>
              {group.rows.map(b => (
                <button
                  key={b.id}
                  onClick={() => onSelect?.(b)}
                  className="flex items-center gap-3.5 w-full text-left px-5 py-4 transition-colors"
                  style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(113, 113, 122,0.08)'}` }}
                  onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FAFAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: dm ? '#3a2e35' : '#F6E3EA' }}>
                    <span className="font-serif text-[0.85rem]" style={{ color: dm ? '#e7c9d5' : '#A0607A' }}>
                      {(b.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.875rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.name}</p>
                    <p className="text-[0.72rem] truncate mt-0.5" style={{ color: dm ? '#8e8e99' : '#a3a3ad' }}>
                      {b.service}
                      {b.date && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[0.6rem] font-medium tabular-nums whitespace-nowrap" style={{ color: c.stamp }}>
                      {bookedStamp(b.created_date)}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                </button>
              ))}
            </Fragment>
          ))}
          {search && shown.length === 0 && (
            <div className="py-6 text-center text-[0.78rem]" style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>No results for "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
