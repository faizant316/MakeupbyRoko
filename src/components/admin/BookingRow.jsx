import StatusBadge from './StatusBadge';
import { relativeDate } from './timeline';
import { depositState } from './depositState';
import { openZoomRoom } from '@/lib/zoomHost';
import { bookingOccasion } from './bookingNotes';
import { displayLocation, isStudioLocation } from '@/lib/location';
import { Tag, cx } from './ui';

// A consultation or a class rendered in the same list as the appointments. The
// tag is what tells them apart; everything else about the row stays identical,
// so today reads as one run down the page instead of three lists.
const AGENDA_META = {
  consult: { label: 'Consultation', cls: 'bg-tone-consult/10 text-tone-consult' },
  class: { label: 'Class', cls: 'bg-rose/10 text-rose' },
};

// Where the deposit stands, in the status tones: blue for money that just
// landed and hasn't been looked at, amber for money that hasn't come, quiet
// for settled history.
const DEPOSIT_TONE = {
  new: 'text-tone-confirmed font-semibold',
  waiting: 'text-tone-pending',
  in: 'text-ink-muted',
};

// One line in the appointments list. The rich detail lives in the client card
// it opens, so the row only carries what helps you scan: who, when, what,
// where, and status. Rows sit in a group panel on hairlines; bridal rows wear
// the rose wash so a month of weddings sorts itself at a glance.
export default function BookingRow({
  booking, onClick, bridal, dimmed, selectable, selected, hideDate,
  // Set when the row is a consultation or a class rather than an appointment.
  agendaKind, agendaTime, agendaLabel, join,
}) {
  // Consult-only bookings have no appointment date: show their consultation
  // date and time so they read as scheduled, not "No date".
  const consultOnly = !booking.date && !!booking.consultation_date;
  const rel = relativeDate(booking.date || booking.consultation_date);
  const rowTime = agendaKind ? agendaTime : (booking.date ? booking.time : booking.consultation_time);
  const agenda = agendaKind ? AGENDA_META[agendaKind] : null;
  const canJoin = !!(join && (join.url || join.meetingId));
  // A row you're about to join doesn't need a chip saying it's confirmed. The
  // badge earns its place only while something is still unresolved.
  const unresolved = ['pending', 'cancelled', 'new', 'contacted', 'declined'].includes(booking.status);
  const showStatus = !canJoin || unresolved;
  const initial = (booking.name || '?').trim().charAt(0).toUpperCase() || '?';

  const deposit = depositState(booking);

  const dateClass = consultOnly
    ? 'text-tone-consult'
    : rel.tone === 'accent' ? 'text-rose' : rel.tone === 'past' ? 'text-tone-alert' : 'text-ink-muted';

  // City first, then the street, so scanning a day tells her where she is
  // going before it tells her the house number. The studio says so and stops.
  const occasion = bookingOccasion(booking.notes);
  const place = displayLocation(booking.location);
  const atStudio = isStudioLocation(booking.location);
  const locationCity = booking.location_city;
  const locationStreet = atStudio ? null : place.split(',')[0]?.trim();
  const locationLine = atStudio
    ? place
    : locationCity && locationStreet && locationStreet !== locationCity
      ? `${locationCity} · ${locationStreet}`
      : locationCity || locationStreet || null;

  // A div, not a <button>: the row carries interactive children of its own
  // (a Join button on today's Zoom rows), and a button inside a button is
  // invalid HTML.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className={cx(
        'group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors duration-200 sm:gap-3.5 sm:px-5',
        selected
          ? 'bg-tone-confirmed/[0.07]'
          : bridal && !agenda ? 'bg-rose-wash hover:bg-rose-soft/20 active:bg-rose-soft/25' : 'bg-paper hover:bg-canvas/60 active:bg-canvas',
        dimmed && 'opacity-60',
      )}
    >
      {/* iOS-style selection circle: an empty ring that fills with a check. */}
      {selectable && (
        <span className={cx(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors duration-150',
          selected ? 'bg-tone-confirmed' : 'border-2 border-line-strong',
        )}>
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
      )}

      <span className={cx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.86rem] font-medium',
        bridal && !agenda ? 'bg-paper text-rose shadow-[0_0_0_1px_rgb(var(--c-rose)/0.35)]' : 'bg-canvas text-ink-muted',
      )}>
        {initial}
      </span>

      {/* Name never truncates (Roko needs full names on a phone); the tags
          wrap to the next line instead of squeezing it to an initial. */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 break-words text-[0.9rem] font-semibold leading-snug text-ink">{booking.name || 'Unnamed'}</p>
          {agenda && <Tag className={agenda.cls}>{agenda.label}</Tag>}
          {bridal && !agenda && <Tag className="bg-rose/10 text-rose">Bridal</Tag>}
          {booking.contract_signed && (
            <Tag className="text-ink-muted" title={`Agreement signed${booking.contract_signed_name ? ` by ${booking.contract_signed_name}` : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-2 w-2" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
              Signed
            </Tag>
          )}
          {booking.source === 'booksy' && <Tag className="text-ink-muted shadow-[inset_0_0_0_1px_rgb(var(--c-line-strong))]" title="Imported from Booksy">Booksy</Tag>}
        </div>
        {/* Service, then what it's for: the occasion is what separates a
            deliberate two-event booking from an accidental double submit. */}
        <p className="mt-0.5 truncate text-[0.76rem] text-ink-muted">
          {agendaLabel || booking.service || 'Service not set'}
          {!agenda && occasion && <span className="font-medium text-rose">{' · '}{occasion}</span>}
        </p>
        {!agenda && locationLine && (
          <p className="mt-1 flex items-start gap-1.5 text-[0.74rem] text-ink-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-[3px] h-2.5 w-2.5 shrink-0" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{locationLine}</span>
          </p>
        )}
        {!agenda && deposit.kind !== 'none' && deposit.label && (
          <p className={cx('mt-1 flex items-center gap-1.5 text-[0.74rem]', DEPOSIT_TONE[deposit.kind] || 'text-ink-muted')}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span className="truncate">{deposit.label}</span>
          </p>
        )}
      </div>

      {/* Time and status, with the date only when it adds something. Under a
          day heading the time takes the top line; the coarse groups (Later,
          Past Due) still carry the date, because there it's the answer. */}
      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        {!hideDate && <span className={cx('whitespace-nowrap text-[0.74rem] font-semibold', dateClass)}>{rel.label}</span>}
        {rowTime && (
          <span className={cx('whitespace-nowrap tabular-nums', hideDate ? 'text-[0.8rem] font-semibold text-ink' : '-mt-0.5 text-[0.7rem] text-ink-muted')}>
            {rowTime}
          </span>
        )}
        {hideDate && !rowTime && <span className="whitespace-nowrap text-[0.72rem] text-ink-muted">No time set</span>}
        {/* Only ever on today's rows: the one day the link is any use. */}
        {canJoin && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); openZoomRoom(join.url, join.meetingId); }}
            className="press inline-flex h-8 items-center gap-1.5 rounded bg-rose px-3 text-[0.72rem] font-semibold text-paper hover:bg-rose/90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0" aria-hidden>
              <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
            </svg>
            Join
          </button>
        )}
        {showStatus && <StatusBadge status={booking.status} />}
      </div>
    </div>
  );
}
