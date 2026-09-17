import { Fragment, useState } from 'react';
import StatusBadge from './StatusBadge';
import { shortDate } from './depositState';
import { localDateKey } from './todayItems';
import { bookingOccasion, isBooksyImport } from './bookingNotes';
import { STATUS_COLORS } from './statusColors';
import { isBookingUnseen } from './bookingSeen';
import { displayLocation } from '@/lib/location';

// "Did anyone book?" and "who booked a couple of days ago?" are the same
// question asked at two different distances, so this answers both.
//
// It used to answer only the first. Anything older than 24 hours dropped off
// the rail and became genuinely unfindable, because every other list in this
// admin is ordered by when the APPOINTMENT is, never by when it was booked. A
// bride who booked on Tuesday for next June sorts under "Later", months down a
// list, with nothing anywhere marking her as new.
//
// So it holds 30 days. There was once a rose "New booking" state for the first
// 24 hours and it went: an alert that fires on every booking for a day is the
// furniture wearing a costume. What replaced it was a dot and a grey line of
// type on a white page, and that went too far the other way. A booking landed
// while the admin was open and nobody noticed it for six minutes.
//
// So it is a card now, always, with the latest booking laid out in full on its
// face instead of squeezed into a subline. And it has exactly one loud state:
// a booking Roko has not opened yet (bookingSeen.js). That is an
// acknowledgment, not a timer. It lights up when a client books, it goes quiet
// the moment she opens that client's card, and it waits for her if she's away.
// It is ink, not rose, the same black as Add Client and the confirm dialog, so
// it reads as "this needs you" rather than as decoration.
//
// What it is NOT is a flat run of rows in booking order. Statuses landed
// interleaved (a pending, two confirmed, a pending again), so a month of
// bookings read as one undifferentiated column and "what still needs me?"
// could only be answered by reading every badge in turn. The day is still the
// spine, but inside each day the rows now cluster by status, pending first
// because it is the only one asking for anything; the day header counts what
// it holds; and a filter row at the top drops the panel to one status.
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

// Pending leads because it is the only status asking her for something. Then
// confirmed (settled), completed (history), cancelled (off).
const STATUS_ORDER = ['pending', 'confirmed', 'completed'];
const STATUS_RANK = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 };
const STATUS_WORD = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

const ink = (dm) => ({
  hover:   dm ? 'rgba(255,255,255,0.045)' : 'rgba(24,24,27,0.025)',
  title:   dm ? '#f4f4f5' : '#18181b',
  sub:     dm ? '#8b8b95' : '#9c9ca6',
  action:  dm ? '#a1a1aa' : '#83838d',
  stamp:   dm ? '#7a7a84' : '#a8a8b2',
  line:    dm ? '#34343d' : '#EDEDF1',
  edge:    dm ? '#3f3f46' : '#E6E6EB',
  focus:   dm ? '#5c4450' : '#E3C6D1',
  panel:   dm ? '#27272a' : '#fff',
  pill:    dm ? 'rgba(255,255,255,0.08)' : '#F1F1F5',
  meta:    dm ? '#83838d' : '#9a9aa4',
  place:   dm ? '#8fb3d9' : '#6a7f99',
  amber:   dm ? '#F5B83C' : '#B26A04',
  // The unopened state, and the only colour on the card that isn't a status.
  fresh:     dm ? '#f4f4f5' : '#18181b',
  onFresh:   dm ? '#18181b' : '#fff',
  freshEdge: dm ? 'rgba(244,244,245,0.55)' : '#18181b',
});

// The appointment's own date, carrying the year whenever it isn't this one. A
// booking made today for April 2027 is the exact case that has gone wrong
// before, and "Sat, Apr 3" alone cannot tell you which April it means.
const apptDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (dt.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return dt.toLocaleDateString('en-US', opts);
};

// Where Roko is going, in full.
//
// This used to print `location_city` alone, which answered "roughly where" when
// the question she opens the rail to answer is "where do I have to be". Worse,
// for a bride getting ready at the studio the stored value is the bracketed
// label "Roko's Studio (Mountain House, CA)", and deriving a city off that gave
// a chip reading "CA)" — a fragment of a state, printed where an address goes.
// The whole address now, tidied by displayLocation, with the city kept as the
// fallback for a Booksy row that only ever had one.
const placeOf = (b) => displayLocation(b.location) || (b.location_city || '').trim();

// A booking that is still live with no working window on it is the exact gap
// that let a bride reach Confirmed on a day with no time set.
const needsTime = (b) => !b.time && ['pending', 'confirmed'].includes(b.status || 'pending');

export default function NewBookingsRail({ bookings, loading = false, onSelect, darkMode: dm, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [statusPick, setStatusPick] = useState('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const c = ink(dm);

  // Booked in the last 30 days, newest first. Booksy imports stay out: 563
  // contacts all carry the same import timestamp, so one afternoon of backfill
  // would bury every real booking in here for a month. A Booksy booking she
  // adds by hand from Add Client is a real new booking, so that one shows.
  const now = Date.now();
  const windowStart = now - WINDOW_DAYS * DAY;
  const recent = (bookings || [])
    .filter(b => !isBooksyImport(b) && b.created_date && new Date(b.created_date).getTime() >= windowStart)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // While the bookings are still in flight there's nothing to show and no way
  // to know whether there will be, so the rail holds its own space with a
  // placeholder the same shape as the card. Otherwise the calendar paints first
  // and then gets shoved down the moment the fetch lands, which is the jump she
  // sees on every refresh.
  if (loading) {
    const bar = dm ? 'rgba(255,255,255,0.07)' : '#EFEFF3';
    const faint = dm ? 'rgba(255,255,255,0.05)' : '#F5F5F8';
    return (
      <div className={className} aria-hidden="true">
        <div className="rounded-2xl overflow-hidden" style={{ background: c.panel, border: `1px solid ${c.edge}` }}>
          <div className="px-4 sm:px-5 py-4">
            <span className="block h-4 w-36 rounded-full" style={{ background: bar }} />
            <span className="block h-2.5 w-44 max-w-full rounded-full mt-2.5" style={{ background: faint }} />
          </div>
          <div className="flex items-start gap-3.5 px-5 py-3.5" style={{ borderTop: `1px solid ${c.line}` }}>
            <span className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5" style={{ background: faint }} />
            <span className="min-w-0 flex-1 pt-1">
              <span className="block h-3.5 w-28 rounded-full" style={{ background: bar }} />
              <span className="block h-2.5 w-32 max-w-full rounded-full mt-3" style={{ background: faint }} />
              <span className="block h-2.5 w-24 rounded-full mt-3" style={{ background: faint }} />
              <span className="block h-2.5 w-64 max-w-full rounded-full mt-3" style={{ background: faint }} />
              <span className="block h-4 w-20 rounded-full mt-3" style={{ background: faint }} />
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (recent.length === 0) return null;

  // A cancelled booking is finished business, so it drops out of the rail the
  // same way it drops out of the appointments list. There is no point in the
  // month's news being half made of things that are not happening. It is not
  // deleted, though, so the count stays reachable at the foot of the panel.
  const cancelled = recent.filter(b => b.status === 'cancelled');
  const live = recent.filter(b => b.status !== 'cancelled');
  const pool = showCancelled ? recent : live;
  // Newest first, like everything else here.
  const unseen = live.filter(isBookingUnseen);
  const hasFresh = unseen.length > 0;

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

  const matches = (b) => !search || [b.name, b.service, b.email, bookingOccasion(b.notes)].some(f => f?.toLowerCase().includes(search.toLowerCase()));

  // Counts come off the search results rather than the raw month, so the
  // numbers on the filter row always describe the list underneath it.
  const searched = pool.filter(matches);
  const countOf = (st) => searched.filter(b => (b.status || 'pending') === st).length;
  const freshCount = searched.filter(isBookingUnseen).length;
  const tabs = [
    { key: 'all', label: 'All', dot: null, count: searched.length },
    // "Only what I haven't opened" sits right after All, since it is the
    // question the card's ink state just asked her.
    ...(freshCount > 0 ? [{ key: 'new', label: 'New', dot: c.fresh, count: freshCount }] : []),
    ...STATUS_ORDER
      .map(st => ({ key: st, label: STATUS_WORD[st], dot: STATUS_COLORS[st], count: countOf(st) }))
      .filter(t => t.count > 0),
    ...(showCancelled && countOf('cancelled') > 0
      ? [{ key: 'cancelled', label: STATUS_WORD.cancelled, dot: STATUS_COLORS.cancelled, count: countOf('cancelled') }]
      : []),
  ];
  // A filter row that only ever offers "All" is a label pretending to be a
  // control, so it appears once there is genuinely a choice to make.
  const showTabs = tabs.length > 2;
  const pick = tabs.some(t => t.key === statusPick) ? statusPick : 'all';
  const shown = searched.filter(b =>
    pick === 'all' ? true
      : pick === 'new' ? isBookingUnseen(b)
      : (b.status || 'pending') === pick);

  const grouped = GROUPS
    .map(([key, label]) => ({
      key,
      label,
      // The day is the spine; inside it, statuses sit together. Within one
      // status it stays newest-booked-first, the order the rail has always
      // read in.
      rows: shown
        .filter(b => bucketOf(b) === key)
        .sort((a, b) => {
          const ra = STATUS_RANK[a.status] ?? 0;
          const rb = STATUS_RANK[b.status] ?? 0;
          if (ra !== rb) return ra - rb;
          return new Date(b.created_date) - new Date(a.created_date);
        }),
    }))
    .filter(g => g.rows.length > 0);

  // The face of the closed card. Whatever she hasn't opened comes first, so
  // opening it and coming back walks her through the rest one at a time; with
  // nothing unopened it's simply the latest booking.
  const lead = unseen[0] || live[0] || recent[0];

  // One line of what the month holds, in place of the name-and-service subline
  // the face row now says properly. Only the counts that ask something of her.
  const weekCount = live.filter(b => new Date(b.created_date).getTime() >= weekCutoff).length;
  const pendingCount = live.filter(b => (b.status || 'pending') === 'pending').length;
  const noTimeCount = live.filter(needsTime).length;
  const summary = [
    weekCount > 0 ? `${weekCount} booked this week` : `${live.length} in the last 30 days`,
    pendingCount > 0 ? `${pendingCount} pending` : null,
  ].filter(Boolean).join(' · ');

  // One row, drawn the same on the face of the card and in the panel, so the
  // booking she sees closed is recognisably the booking she finds open.
  const renderRow = (b, { onFace = false } = {}) => {
    const status = b.status || 'pending';
    const place = placeOf(b);
    const occasion = bookingOccasion(b.notes);
    const noTime = needsTime(b);
    const fresh = isBookingUnseen(b);
    return (
      <button
        key={b.id}
        type="button"
        onClick={() => onSelect?.(b)}
        tabIndex={onFace && open ? -1 : undefined}
        className="flex items-start gap-3.5 w-full text-left px-5 py-3.5 transition-colors"
        style={{
          borderBottom: onFace ? 'none' : `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(113, 113, 122,0.08)'}`,
          // No coloured edge down the left of each row. The badge on the right
          // already names the status and the day header tallies them, and a
          // bar down the side is the stock look of generated dashboards.
          opacity: status === 'cancelled' ? 0.6 : 1,
        }}
        onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FAFAFB'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: dm ? '#3a2e35' : '#F6E3EA' }}>
            <span className="font-serif text-[0.85rem]" style={{ color: dm ? '#e7c9d5' : '#A0607A' }}>
              {(b.name || '?').trim().charAt(0).toUpperCase()}
            </span>
          </div>
          {/* Unopened: the mail app's unread dot, in ink. On the face of the
              card it sends out a ring a few times as it arrives, then holds
              still (.rail-unseen-ping in index.css). */}
          {fresh && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{ background: c.fresh, boxShadow: `0 0 0 2px ${c.panel}` }}>
              {onFace && <span className="rail-unseen-ping absolute inset-0 rounded-full" style={{ background: c.fresh }} />}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[0.875rem] truncate ${fresh ? 'font-semibold' : 'font-medium'}`}
            style={{ color: dm ? (fresh ? '#fafafa' : '#e4e4e7') : (fresh ? '#0a0a0a' : '#111') }}>
            {b.name}
          </p>
          <p className="text-[0.72rem] truncate mt-0.5" style={{ color: dm ? '#8e8e99' : '#a3a3ad' }}>
            {b.service}
            {occasion && (
              <span style={{ color: dm ? '#e5aec0' : '#B0708A' }}>{' · '}{occasion}</span>
            )}
          </p>
          {/* When it is and when she starts. */}
          <p className="text-[0.72rem] truncate mt-1 tabular-nums" style={{ color: c.meta }}>
            {b.date ? apptDate(b.date) : 'No date'}
            {b.time && <span>{' · '}{b.time}</span>}
          </p>
          {/* Where she has to be, on its own line. An address is the longest
              thing on the row and the one she is most likely to want in full,
              so it doesn't share a line with the date and get truncated by it.
              The title carries the whole string for a long venue name. */}
          {place && (
            <p className="flex items-start gap-1.5 text-[0.72rem] mt-1" style={{ color: c.place }} title={place}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                className="w-3 h-3 flex-shrink-0 mt-[3px]">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="2.6" />
              </svg>
              <span className="min-w-0 flex-1 truncate">{place}</span>
            </p>
          )}
          {noTime && (
            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-[0.63rem] font-semibold"
              style={{ background: dm ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.13)', color: c.amber }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }} />
              Needs a time
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-[0.6rem] tabular-nums whitespace-nowrap ${fresh ? 'font-semibold' : 'font-medium'}`}
            style={{ color: fresh ? c.fresh : c.stamp }}>
            {bookedStamp(b.created_date)}
          </span>
          <StatusBadge status={status} />
        </div>
      </button>
    );
  };

  return (
    <div className={className}>
      {/* A card, so it holds its own against a white page instead of reading
          as a caption. Hairline and near-flat while everything has been seen;
          an ink edge and a real shadow while something hasn't. Nothing else
          about it changes between the two, so it never reads as a different
          widget, only as the same one asking for her. */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: c.panel,
          border: `1px solid ${hasFresh ? c.freshEdge : c.edge}`,
          boxShadow: dm
            ? 'none'
            : hasFresh
              ? '0 1px 2px rgba(24,24,27,0.06), 0 14px 32px -18px rgba(24,24,27,0.35)'
              : '0 1px 2px rgba(24,24,27,0.04)',
          transition: 'border-color 300ms ease, box-shadow 300ms ease',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = c.hover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="font-serif text-[1.15rem] leading-none" style={{ color: c.title }}>
                Recent bookings
              </span>
              {hasFresh && (
                <span className="inline-flex items-center h-[18px] px-2 rounded-full text-[0.6rem] font-semibold uppercase tracking-[0.08em] tabular-nums leading-none"
                  style={{ background: c.fresh, color: c.onFresh }}>
                  {unseen.length} new
                </span>
              )}
            </span>
            {/* Wraps rather than truncating: on a phone the cut would land on
                "need a time", the one part of the line that asks for action. */}
            <span className="block text-[0.75rem] leading-snug mt-1.5" style={{ color: c.sub }}>
              {summary}
              {noTimeCount > 0 && (
                <>
                  {' · '}
                  <span style={{ color: c.amber }}>{noTimeCount} {noTimeCount === 1 ? 'needs' : 'need'} a time</span>
                </>
              )}
            </span>
          </span>

          <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[0.78rem] font-medium" style={{ color: hasFresh ? c.title : c.action }}>
              {open ? 'Hide' : 'View all'}
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke={hasFresh ? c.title : c.action} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-3.5 h-3.5"
              style={{ transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </button>

        {/* The face: the booking itself, not a summary of it. Folds away while
            the panel is open, since the panel already holds it. Animates
            max-height + opacity only, so it stays smooth on mobile where
            animating height / grid-rows forces per-frame layout + repaint. */}
        <div
          aria-hidden={open}
          style={{
            maxHeight: open ? '0px' : '240px',
            opacity: open ? 0 : 1,
            overflow: 'hidden',
            borderTop: `1px solid ${open ? 'transparent' : c.line}`,
            pointerEvents: open ? 'none' : 'auto',
            transition: 'max-height 320ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease, border-color 200ms ease',
          }}
        >
          {renderRow(lead, { onFace: true })}
        </div>

        <div
          className="flex flex-col overflow-hidden"
          style={{
            maxHeight: open ? 'min(68vh, 520px)' : '0px',
            opacity: open ? 1 : 0,
            borderTop: `1px solid ${open ? c.line : 'transparent'}`,
            pointerEvents: open ? 'auto' : 'none',
            transition: 'max-height 320ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease, border-color 200ms ease',
          }}
        >
          {/* One status at a time. It wraps rather than scrolling sideways: a row
              you have to drag to read hides half its own options, which is the
              mistake the appointments filter row made before it became a list. */}
          {showTabs && (
            <div className="flex flex-wrap items-center gap-1 px-4 pt-3.5 pb-1 flex-shrink-0">
              {tabs.map(t => {
                const active = t.key === pick;
                return (
                  <button key={t.key} type="button" onClick={() => setStatusPick(t.key)}
                    aria-pressed={active}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[0.74rem] font-semibold transition-colors"
                    style={active
                      ? { background: c.pill, color: dm ? '#e4e4e7' : '#3a3a42' }
                      : { background: 'transparent', color: c.sub }}>
                    {t.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.dot }} />}
                    {t.label}
                    <span className="tabular-nums" style={{ opacity: 0.55 }}>{t.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* A search box above a handful of rows is just clutter. */}
          {pool.length > 6 && (
            <div className={`px-5 ${showTabs ? 'pt-2' : 'pt-3.5'} pb-1 flex-shrink-0`}>
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
            {grouped.map(group => {
              // What the day holds, in the order the rows below it run.
              const tally = [...STATUS_ORDER, 'cancelled']
                .map(st => ({ st, n: group.rows.filter(b => (b.status || 'pending') === st).length }))
                .filter(t => t.n > 0);
              return (
                <Fragment key={group.key}>
                  {/* Sticky, so scrolling back through the month never leaves her
                      looking at a name with no idea when it arrived. The tally on
                      the right says what the day is made of before she reads a
                      single row of it. */}
                  <div className="sticky top-0 z-[1] flex items-center gap-2 px-5 pt-3.5 pb-2"
                    style={{ background: c.panel }}>
                    <span className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase flex-shrink-0"
                      style={{ color: dm ? '#6f6f79' : '#b0b0ba' }}>
                      {group.label}
                    </span>
                    <span className="flex-1" />
                    {tally.length > 1 && (
                      <span className="flex items-center gap-2 flex-shrink-0">
                        {tally.map(t => (
                          <span key={t.st} className="inline-flex items-center gap-1 text-[0.62rem] font-medium tabular-nums"
                            style={{ color: dm ? '#7a7a84' : '#a8a8b2' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[t.st] }} />
                            {t.n}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  {group.rows.map(b => renderRow(b))}
                </Fragment>
              );
            })}
            {shown.length === 0 && (
              <div className="py-6 text-center text-[0.78rem]" style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>
                {search ? `No results for "${search}"` : 'Nothing here.'}
              </div>
            )}
          </div>

          {/* Cancelled bookings sit behind this line rather than in the list.
              Hidden, not deleted: the count is always here and one tap folds
              them back in. */}
          {cancelled.length > 0 && (
            <button type="button" onClick={() => setShowCancelled(v => !v)}
              className="flex items-center gap-2 px-5 py-2.5 flex-shrink-0 text-left transition-colors"
              style={{ borderTop: `1px solid ${c.line}`, background: c.panel }}
              onMouseEnter={e => e.currentTarget.style.background = dm ? '#2e2e33' : '#FAFAFB'}
              onMouseLeave={e => e.currentTarget.style.background = c.panel}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS.cancelled, opacity: 0.7 }} />
              <span className="text-[0.72rem]" style={{ color: c.sub }}>
                {cancelled.length} cancelled
              </span>
              <span className="flex-1" />
              <span className="text-[0.72rem] font-semibold" style={{ color: c.action }}>
                {showCancelled ? 'Hide' : 'Show'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
