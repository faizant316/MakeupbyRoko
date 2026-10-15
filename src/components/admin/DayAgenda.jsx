import { blockHatch } from './statusColors';
import { dotOf } from './MonthCalendar';
import { depositState } from './depositState';
import { daysUntil } from './timeline';
import { bookingOccasion } from './bookingNotes';
import { displayLocation, isStudioLocation } from '@/lib/location';
import { openZoomRoom } from '@/lib/zoomHost';
import { cx } from './ui';

// One picked day, read out the way the Mission Paradise dashboard reads one:
// how far away it is, the date large enough to be the heading, then each thing
// on it as a row you can scan in a second (when, who, what, where it stands).
//
// The Calendar tab's day panel and the Home list both use this, so a day looks
// the same whichever side of the admin you picked it from. Events are the
// calendarEvents shape: { id, kind, name, time, detail, status, bridal, raw }.

// "Today", "Tomorrow", "In 9 days", "3 weeks ago".
export function relWords(key) {
  const n = daysUntil(key);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 0) return n < 14 ? `In ${n} days` : n < 60 ? `In ${Math.round(n / 7)} weeks` : `In ${Math.round(n / 30)} months`;
  return -n < 14 ? `${-n} days ago` : -n < 60 ? `${Math.round(-n / 7)} weeks ago` : `${Math.round(-n / 30)} months ago`;
}

export function longDay(key) {
  const d = new Date(key + 'T00:00:00');
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

// "12:00 PM – 2:00 PM" into its two ends. A single time has no end.
const ends = (t) => {
  const [start = '', end = ''] = String(t || '').split(/\s*[–—-]\s*/);
  return { start: start.trim(), end: end.trim() };
};

const placeOf = (b) => {
  if (!b?.location) return '';
  if (isStudioLocation(b.location)) return displayLocation(b.location);
  return b.location_city || displayLocation(b.location).split(',')[0]?.trim() || '';
};

// The status word and its colour, side by side so they can't drift apart.
const STATUS = {
  pending: { text: 'Pending', cls: 'text-tone-pending' },
  confirmed: { text: 'Confirmed', cls: 'text-tone-confirmed' },
  completed: { text: 'Completed', cls: 'text-ink-muted' },
  cancelled: { text: 'Cancelled', cls: 'text-tone-alert' },
};

// Everything a row says about one event, worked out once for both layouts.
function describe(ev) {
  const b = ev.raw || {};
  const { start, end } = ends(ev.time);

  if (ev.kind === 'block') {
    return { start: start || 'All day', end, kicker: 'Blocked time', sub: start ? '' : 'Blocked all day', status: null };
  }
  if (ev.kind === 'consult') {
    return {
      start, end,
      kicker: 'Consultation',
      sub: b.service || '',
      status: { text: ev.detail || 'Consultation', cls: 'text-tone-consult' },
    };
  }
  if (ev.kind === 'class') {
    const enrolled = ev.status === 'enrolled' || ev.status === 'confirmed';
    return {
      start, end,
      kicker: 'Makeup class',
      sub: b.consultation_type === 'In-Person' ? 'In person · Studio' : (b.consultation_type || ''),
      status: { text: enrolled ? 'Enrolled' : 'Pending', cls: enrolled ? 'text-tone-confirmed' : 'text-tone-pending' },
    };
  }

  // An appointment: what she's doing, what it's for, where she's going.
  const occasion = bookingOccasion(b.notes);
  const place = placeOf(b);
  const deposit = depositState(b);
  // One more fact after the status, whichever matters most: no time beats the
  // deposit, because a booking without a time can't be confirmed at all.
  const extra = !start && ev.status !== 'completed' ? 'Needs a time'
    : deposit.kind !== 'none' && deposit.label ? deposit.label
    : '';
  return {
    start, end,
    kicker: ev.detail || 'Appointment',
    occasion,
    place,
    status: { ...(STATUS[ev.status] || STATUS.pending), extra },
  };
}

function StatusLine({ ev, d, dm, className }) {
  if (!d.status) return null;
  return (
    // Top-aligned with the dot set on the first line, so a deposit note that
    // wraps on a phone doesn't drag the dot down to the middle of two lines.
    <span className={cx('flex min-w-0 items-start gap-1.5 text-[0.76rem] leading-[18px]', className)}>
      <span className={cx('mt-[6px] h-1.5 w-1.5 shrink-0', ev.kind !== 'block' && 'rounded-full')} style={{ background: dotOf(ev, dm) }} />
      <span className={cx('shrink-0 font-medium', d.status.cls)}>{d.status.text}</span>
      {d.status.extra && (
        <>
          <span className="shrink-0 text-ink-muted" aria-hidden>·</span>
          <span className={cx('min-w-0 sm:truncate', d.status.extra === 'Needs a time' ? 'text-tone-pending' : 'text-ink-muted')}>
            {d.status.extra}
          </span>
        </>
      )}
    </span>
  );
}

const Arrow = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={cx('h-4 w-4 shrink-0 text-ink-muted/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink', className)} aria-hidden>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

// The day's heading: how far off it is in rose, the date itself large.
export function DayHead({ dateKey, action, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <p className="text-[0.76rem] font-medium text-rose">{relWords(dateKey)}</p>
        <h2 className="mt-1 text-[1.3rem] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[1.4rem]">{longDay(dateKey)}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// A row with the time in its own column, for the Home list. Start over end, so
// the day reads down the left edge like a schedule.
export function AgendaRow({ ev, onOpen, dm }) {
  const d = describe(ev);
  const isBlock = ev.kind === 'block';
  const appt = ev.kind === 'appt';
  const join = ev.join && (ev.join.url || ev.join.meetingId) ? ev.join : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(ev)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen?.(ev); } }}
      className={cx(
        'group flex w-full cursor-pointer items-stretch gap-3.5 px-4 py-3.5 text-left outline-none transition-colors duration-200 sm:px-5',
        ev.bridal && appt ? 'bg-rose-wash hover:bg-rose-soft/20' : 'bg-paper hover:bg-canvas/60',
        ev.status === 'cancelled' && 'opacity-60',
      )}
      style={isBlock ? { backgroundImage: blockHatch(dm) } : undefined}
    >
      <span className="w-[64px] shrink-0 pt-px">
        <span className={cx('block text-[0.84rem] font-medium tabular-nums', d.start ? 'text-ink' : 'text-ink-muted')}>{d.start || 'No time'}</span>
        {d.end && <span className="mt-0.5 block text-[0.74rem] tabular-nums text-ink-muted">{d.end}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[0.92rem] font-medium leading-snug', isBlock ? 'text-ink-soft' : 'text-ink')}>{ev.name}</span>
        <span className="mt-0.5 block text-[0.76rem] text-ink-muted sm:truncate">
          {appt
            ? [d.kicker, d.occasion, d.place].filter(Boolean).join(' · ')
            : [d.kicker, d.sub].filter(Boolean).join(' · ')}
        </span>
        <StatusLine ev={ev} d={d} dm={dm} className="mt-1.5" />
      </span>
      {join ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openZoomRoom(join.url, join.meetingId); }}
          className="press inline-flex h-8 shrink-0 items-center gap-1.5 self-center rounded-ctl bg-rose px-3 text-[0.72rem] font-semibold text-paper hover:bg-rose/90"
        >
          Join
        </button>
      ) : (
        <Arrow className="self-center" />
      )}
    </div>
  );
}

// A whole card per event, for the Calendar tab's side panel, where there's no
// room for a time column but plenty of height: what it is on top, the name
// large, then when and where, then where it stands.
export function AgendaCard({ ev, onOpen, dm }) {
  const d = describe(ev);
  const isBlock = ev.kind === 'block';
  const appt = ev.kind === 'appt';
  // No time says so once, in the status line ("Needs a time"), not here too.
  const when = d.start ? (d.end ? `${d.start} – ${d.end}` : d.start) : (isBlock ? 'All day' : '');
  const whenLine = [when, appt ? d.place : d.sub].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={() => onOpen?.(ev)}
      className={cx(
        'group relative block w-full rounded-card border text-left transition-colors duration-200',
        ev.bridal && appt ? 'border-rose-soft/40 bg-rose-wash hover:border-rose-soft/70' : 'border-line bg-paper hover:border-line-strong hover:bg-canvas/40',
        ev.status === 'cancelled' && 'opacity-60',
      )}
      style={isBlock ? { backgroundImage: blockHatch(dm) } : undefined}
    >
      <span className="block py-3.5 pl-4 pr-10">
        <span className="block truncate text-[0.75rem] text-ink-muted">{d.kicker}{appt && d.occasion ? ` · ${d.occasion}` : ''}</span>
        <span className={cx('mt-0.5 block text-[0.98rem] font-semibold leading-snug', isBlock ? 'text-ink-soft' : 'text-ink')}>{ev.name}</span>
        {whenLine && <span className="mt-1 block truncate text-[0.8rem] tabular-nums text-ink-muted">{whenLine}</span>}
        <StatusLine ev={ev} d={d} dm={dm} className="mt-2.5" />
      </span>
      <Arrow className="absolute right-3 top-4" />
    </button>
  );
}
