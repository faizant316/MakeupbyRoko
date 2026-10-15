import { Fragment, useState } from 'react';
import StatusBadge from './StatusBadge';
import { shortDate } from './depositState';
import { localDateKey } from './todayItems';
import { bookingOccasion, isBooksyImport } from './bookingNotes';
import { STATUS_COLORS } from './statusColors';
import { isBookingUnseen } from './bookingSeen';
import { displayLocation } from '@/lib/location';
import { Chevron, Fold, SearchLine, cx } from './ui';

// "Did anyone book?" and "who booked a couple of days ago?" are the same
// question asked at two different distances, so this answers both.
//
// It holds 30 days. Every other list in this admin is ordered by when the
// APPOINTMENT is, so a bride who booked on Tuesday for next June would sort
// months down a list with nothing marking her as new.
//
// It is a card, always, with the latest booking laid out in full on its face.
// It has exactly one loud state: a booking Roko has not opened yet
// (bookingSeen.js). That is an acknowledgment, not a timer: it lights up when a
// client books and goes quiet the moment she opens that client's card. It is
// ink, not rose, the same black as Add Client, so it reads as "this needs you"
// rather than as decoration.
//
// Inside the open panel the day is the spine and the rows cluster by status,
// pending first because it is the only one asking for anything.
//
// Rendered in two places, only ever one showing: inside the Appointments list
// on a laptop, and at the very top of the page on a phone, where the list is
// three scrolls down.

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

// Grouped by the day each one was BOOKED. "Past week" is the rolling stretch
// between yesterday and seven days back, because "a couple of days ago" is a
// distance from now, not a Monday.
const GROUPS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'Past week'],
  ['earlier', 'Earlier'],
];

const STATUS_ORDER = ['pending', 'confirmed', 'completed'];
const STATUS_RANK = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 };
const STATUS_WORD = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

// The appointment's own date, carrying the year whenever it isn't this one. A
// booking made today for April 2027 is the exact case that has gone wrong
// before.
const apptDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (dt.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return dt.toLocaleDateString('en-US', opts);
};

// Where Roko is going, in full, tidied by displayLocation, with the city as
// the fallback for a Booksy row that only ever had one.
const placeOf = (b) => displayLocation(b.location) || (b.location_city || '').trim();

// A booking that is still live with no working window on it is the exact gap
// that let a bride reach Confirmed on a day with no time set.
const needsTime = (b) => !b.time && ['pending', 'confirmed'].includes(b.status || 'pending');

export default function NewBookingsRail({ bookings, loading = false, onSelect, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusPick, setStatusPick] = useState('all');
  const [showCancelled, setShowCancelled] = useState(false);

  // Booked in the last 30 days, newest first. Booksy imports stay out: 563
  // contacts all carry the same import timestamp, so one afternoon of backfill
  // would bury every real booking here for a month. A Booksy booking she adds
  // by hand from Add Client is a real new booking, so that one shows.
  const now = Date.now();
  const windowStart = now - WINDOW_DAYS * DAY;
  const recent = (bookings || [])
    .filter(b => !isBooksyImport(b) && b.created_date && new Date(b.created_date).getTime() >= windowStart)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // While the bookings are in flight the card holds its own space with a
  // placeholder of the same shape, so the calendar never gets shoved down the
  // moment the fetch lands.
  if (loading) {
    return (
      <div className={className} aria-hidden="true">
        <div className="border border-line bg-paper">
          <div className="px-4 py-4 sm:px-5">
            <span className="block h-4 w-36 bg-line/70" />
            <span className="mt-2.5 block h-2.5 w-44 max-w-full bg-line/50" />
          </div>
          <div className="flex items-start gap-3.5 border-t border-line px-4 py-4 sm:px-5">
            <span className="h-9 w-9 shrink-0 rounded-full bg-line/50" />
            <span className="min-w-0 flex-1 pt-1">
              <span className="block h-3.5 w-28 bg-line/70" />
              <span className="mt-3 block h-2.5 w-32 max-w-full bg-line/50" />
              <span className="mt-3 block h-2.5 w-24 bg-line/50" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (recent.length === 0) return null;

  // A cancelled booking is finished business, so it drops out of the rail the
  // same way it drops out of the appointments list. Not deleted: the count
  // stays reachable at the foot of the panel.
  const cancelled = recent.filter(b => b.status === 'cancelled');
  const live = recent.filter(b => b.status !== 'cancelled');
  const pool = showCancelled ? recent : live;
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

  // Counts come off the search results, so the numbers on the filter row always
  // describe the list underneath it.
  const searched = pool.filter(matches);
  const countOf = (st) => searched.filter(b => (b.status || 'pending') === st).length;
  const freshCount = searched.filter(isBookingUnseen).length;
  const tabs = [
    { key: 'all', label: 'All', dot: null, count: searched.length },
    // "Only what I haven't opened" sits right after All, since it is the
    // question the card's ink state just asked her.
    ...(freshCount > 0 ? [{ key: 'new', label: 'New', dot: 'rgb(var(--c-ink))', count: freshCount }] : []),
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
  // opening it and coming back walks her through the rest one at a time.
  const lead = unseen[0] || live[0] || recent[0];

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
        className={cx(
          'flex w-full items-start gap-3.5 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:px-5',
          !onFace && '[&+&]:border-t [&+&]:border-line',
          status === 'cancelled' && 'opacity-60',
        )}
      >
        <span className="relative mt-0.5 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-wash text-[0.84rem] font-medium text-rose">
            {(b.name || '?').trim().charAt(0).toUpperCase()}
          </span>
          {/* Unopened: the mail app's unread dot, in ink. On the face of the
              card it sends out a ring a few times as it arrives, then holds
              still (.rail-unseen-ping in index.css). */}
          {fresh && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-ink ring-2 ring-paper">
              {onFace && <span className="rail-unseen-ping absolute inset-0 rounded-full bg-ink" />}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-[0.88rem] text-ink', fresh ? 'font-semibold' : 'font-medium')}>{b.name}</span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-ink-muted">
            {b.service}
            {occasion && <span className="text-rose">{' · '}{occasion}</span>}
          </span>
          <span className="mt-1 block truncate text-[0.75rem] tabular-nums text-ink-soft">
            {b.date ? apptDate(b.date) : 'No date'}
            {b.time && <span>{' · '}{b.time}</span>}
          </span>
          {/* Where she has to be, on its own line: the longest thing on the row
              and the one she is most likely to want in full. */}
          {place && (
            <span className="mt-1 flex items-start gap-1.5 text-[0.75rem] text-ink-muted" title={place}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] h-3 w-3 shrink-0" aria-hidden>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="2.6" />
              </svg>
              <span className="min-w-0 flex-1 truncate">{place}</span>
            </span>
          )}
          {noTime && (
            <span className="mt-2 inline-flex items-center gap-1.5 bg-tone-pending/10 px-2 py-0.5 text-[0.66rem] font-semibold text-tone-pending">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              Needs a time
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={cx('whitespace-nowrap text-[0.66rem] tabular-nums', fresh ? 'font-semibold text-ink' : 'text-ink-muted')}>
            {bookedStamp(b.created_date)}
          </span>
          <StatusBadge status={status} />
        </span>
      </button>
    );
  };

  return (
    <div className={className} data-rail>
      {/* Hairline while everything has been seen; an ink edge while something
          hasn't. Nothing else about it changes between the two, so it never
          reads as a different widget, only as the same one asking for her. */}
      <section className={cx('border bg-paper transition-colors duration-300', hasFresh ? 'border-ink' : 'border-line')}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-canvas/50 sm:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="text-[0.98rem] font-semibold tracking-[-0.01em] text-ink">Recent bookings</span>
              {hasFresh && (
                <span className="inline-flex h-[18px] items-center bg-ink px-1.5 text-[0.6rem] font-semibold uppercase leading-none tracking-[0.08em] tabular-nums text-paper">
                  {unseen.length} new
                </span>
              )}
            </span>
            {/* Wraps rather than truncating: on a phone the cut would land on
                "need a time", the one part of the line that asks for action. */}
            <span className="mt-1 block text-[0.76rem] leading-snug text-ink-muted">
              {summary}
              {noTimeCount > 0 && (
                <>
                  {' · '}
                  <span className="text-tone-pending">{noTimeCount} {noTimeCount === 1 ? 'needs' : 'need'} a time</span>
                </>
              )}
            </span>
          </span>
          <span className={cx('flex shrink-0 items-center gap-1.5 text-[0.78rem] font-medium', hasFresh ? 'text-ink' : 'text-ink-muted')}>
            {open ? 'Hide' : 'View all'}
            <Chevron open={open} className="h-3.5 w-3.5" />
          </span>
        </button>

        {/* The face: the booking itself, not a summary of it. Folds away while
            the panel is open, since the panel already holds it. */}
        <Fold open={!open}>
          <div className="border-t border-line">{renderRow(lead, { onFace: true })}</div>
        </Fold>

        <Fold open={open} lazy>
          <div className="flex max-h-[min(68vh,540px)] flex-col border-t border-line">
            {/* One status at a time. Wraps rather than scrolling sideways: a row
                you have to drag to read hides half its own options. */}
            {showTabs && (
              <div className="flex shrink-0 flex-wrap items-center gap-1 px-3 pb-1 pt-3 sm:px-4">
                {tabs.map(t => {
                  const active = t.key === pick;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setStatusPick(t.key)}
                      aria-pressed={active}
                      className={cx(
                        'press inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[0.76rem] font-medium transition-colors',
                        active ? 'bg-canvas text-ink shadow-[0_0_0_1px_rgb(var(--c-line))]' : 'text-ink-muted hover:text-ink',
                      )}
                    >
                      {t.dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.dot }} />}
                      {t.label}
                      <span className="tabular-nums text-ink-muted">{t.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* A search box above a handful of rows is just clutter. */}
            {pool.length > 6 && (
              <div className={cx('shrink-0 px-4 pb-1 sm:px-5', showTabs ? 'pt-2' : 'pt-3.5')}>
                <SearchLine value={search} onChange={setSearch} />
              </div>
            )}

            {/* data-lenis-prevent, or Lenis eats the wheel and scrolls the page
                behind this instead of the list inside it. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
              {grouped.map(group => {
                const tally = [...STATUS_ORDER, 'cancelled']
                  .map(st => ({ st, n: group.rows.filter(b => (b.status || 'pending') === st).length }))
                  .filter(t => t.n > 0);
                return (
                  <Fragment key={group.key}>
                    {/* Sticky, so scrolling back through the month never leaves
                        her looking at a name with no idea when it arrived. */}
                    <div className="sticky top-0 z-[1] flex items-center gap-2 border-b border-line bg-paper px-4 pb-2 pt-3 sm:px-5">
                      <span className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{group.label}</span>
                      <span className="flex-1" />
                      {tally.length > 1 && (
                        <span className="flex shrink-0 items-center gap-2">
                          {tally.map(t => (
                            <span key={t.st} className="inline-flex items-center gap-1 text-[0.64rem] font-medium tabular-nums text-ink-muted">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[t.st] }} />
                              {t.n}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <div>{group.rows.map(b => renderRow(b))}</div>
                  </Fragment>
                );
              })}
              {shown.length === 0 && (
                <p className="py-6 text-center text-[0.8rem] text-ink-muted">
                  {search ? `No results for "${search}"` : 'Nothing here.'}
                </p>
              )}
            </div>

            {/* Cancelled bookings sit behind this line rather than in the list.
                Hidden, not deleted: one tap folds them back in. */}
            {cancelled.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCancelled(v => !v)}
                className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-2.5 text-left transition-colors hover:bg-canvas/60 sm:px-5"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tone-alert/70" />
                <span className="text-[0.74rem] text-ink-muted">{cancelled.length} cancelled</span>
                <span className="flex-1" />
                <span className="text-[0.74rem] font-medium text-ink-soft">{showCancelled ? 'Hide' : 'Show'}</span>
              </button>
            )}
          </div>
        </Fold>
      </section>
    </div>
  );
}
