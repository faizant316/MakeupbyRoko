import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StatusBadge from './StatusBadge';
import EditBookingModal from './EditBookingModal';
import BookingReferencePhotos from './BookingReferencePhotos';
import EmailLogPanel from './EmailLogPanel';
import { lenisScrollTo } from '@/lib/lenis';
import { openZoomRoom, meetingIdFromUrl } from '@/lib/zoomHost';
import confetti from 'canvas-confetti';
import { buildContract } from '@/lib/contract';
import { useContractOverrides } from '@/lib/useContractOverrides';
import { AdminDatePicker } from './SchedulePicker';
import TimeWindowPicker from './TimeWindowPicker';
import { Cross } from './Glyphs';
import ConfirmDialog from './ConfirmDialog';
import ScheduleView from './ScheduleView';
import { parseRange, apptToMin } from '@/lib/timeWindow';
import { formatPhone, phoneHref } from '@/lib/phone';
import { EVENT_COLORS, CONSULT_INK, isBridalService } from './statusColors';
import { isDepositUnseen, daysSince, shortDateTime } from './depositState';
import { isBookingUnseen } from './bookingSeen';
import { STUDIO_TOWN } from '@/lib/studio';
import { cx, Button, buttonClass, IconButton, Panel, Tag, Label, inputClass, Fold, Chevron, Sheet } from './ui';

// ---- small parts -------------------------------------------------------------------

// The icons this card uses more than once. 1.7 strokes, the weight of the rest
// of the dashboard's line icons.
const ICON = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  pencil: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  video: <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></>,
  send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  right: <path d="m9 18 6-6-6-6" />,
  up: <path d="m18 15-6-6-6 6" />,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></>,
  refresh: <><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  gift: <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />,
  clear: <><circle cx="12" cy="12" r="9" /><path d="m8.6 8.6 6.8 6.8" /></>,
};

function Icon({ name, className = 'h-4 w-4', strokeWidth = 1.7 }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cx('shrink-0', className)}>
      {ICON[name]}
    </svg>
  );
}

// Button-shaped icons for <Button icon={...}>, which passes a className.
const iconOf = (name) => function ButtonIcon({ className }) { return <Icon name={name} className={className} />; };
const CalendarIcon = iconOf('calendar');
const PencilIcon = iconOf('pencil');
const MailIcon = iconOf('mail');
const SendIcon = iconOf('send');
const DownloadIcon = iconOf('download');
const ExternalIcon = iconOf('external');
const VideoIcon = iconOf('video');
const TrashIcon = iconOf('trash');
const RefreshIcon = iconOf('refresh');

// A small text button for the corner of a section (New link, Edit a note).
const MINI = 'press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-ctl px-2.5 text-[0.74rem] font-medium text-ink-soft hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40';
// A square, icon-only partner for the quiet buttons beside it.
const SQUARE = 'press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl border border-line-strong bg-paper text-ink-muted hover:border-ink/50 hover:text-ink max-sm:h-11 max-sm:w-11';

// A small spinner for the buttons that wait on a send.
function Spinner({ className }) {
  return <span aria-hidden className={cx('h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent', className)} />;
}

// Label/value rows on hairlines, the way Mission Paradise lays out a booking's
// facts. Two to a row where there's room (`two`), one otherwise. The wrapper
// clips the top hairline of the first row in each column, so a list never opens
// with a line sitting under the panel's own.
function Specs({ two = false, className, children }) {
  return (
    <div className={cx('overflow-hidden', className)}>
      <dl className={cx('-mt-px grid text-[0.86rem]', two && 'sm:grid-cols-2 sm:gap-x-10')}>{children}</dl>
    </div>
  );
}

// One row of Specs. Rows with nothing to say drop out entirely, so a sparse
// booking stays short instead of listing a column of blanks. `accent` is for
// the answers worth catching the eye (their ready-by, a no on photos).
function Spec({ label, value, accent = false, href, children }) {
  if (children == null && (value === null || value === undefined || value === '')) return null;
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-6 border-t border-line py-3">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className={cx('min-w-0 break-words text-right', accent ? 'font-medium text-rose' : 'text-ink')}>
        {children ?? (href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">{value}</a>
        ) : value)}
      </dd>
    </div>
  );
}

// Status as a dot, in the same tones as the badge, for the history lists.
const STATUS_DOT = {
  pending: 'bg-tone-pending',
  confirmed: 'bg-tone-confirmed',
  completed: 'bg-tone-done',
  cancelled: 'bg-tone-alert',
};

// The status buttons' chosen state: the badge's tint, at button size.
const STATUS_ON = {
  pending: 'border-tone-pending/40 bg-tone-pending/10 font-semibold text-tone-pending',
  confirmed: 'border-tone-confirmed/40 bg-tone-confirmed/10 font-semibold text-tone-confirmed',
  completed: 'border-tone-done/40 bg-tone-done/10 font-semibold text-tone-done',
  cancelled: 'border-tone-alert/40 bg-tone-alert/10 font-semibold text-tone-alert',
};

// The toast's dot. Plain "done" gets the soft rose; a status change gets its
// own tone.
const TOAST_DOT = {
  ink: 'bg-rose-soft',
  confirmed: 'bg-tone-confirmed',
  pending: 'bg-tone-pending',
  alert: 'bg-tone-alert',
};

// An on/off switch, iOS-shaped. Drawn only: the row around it is the control.
// The knob stays white in both themes, the way a system switch does.
function Switch({ on, disabled = false }) {
  return (
    <span aria-hidden className={cx('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-rose' : 'bg-line-strong', disabled && 'opacity-40')}>
      <span className={cx('absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-300 ease-quint', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </span>
  );
}

// A whole-row checkbox with a title and a line saying what ticking it does.
function CheckRow({ checked, onClick, title, children }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onClick}
      className={cx(
        'flex w-full items-start gap-3 rounded-ctl border px-3.5 py-3 text-left transition-colors duration-200',
        checked ? 'border-ink/30 bg-canvas' : 'border-line bg-paper hover:border-line-strong',
      )}>
      <span className={cx(
        'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-ctl border transition-colors duration-150',
        checked ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-paper',
      )}>
        {checked && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.86rem] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.74rem] leading-relaxed text-ink-muted">{children}</span>
      </span>
    </button>
  );
}

// The rose, as the hex the date and time pickers still take for their accent.
// The same two values as --c-rose in admin.css.
const ROSE_HEX = { light: '#A0607A', dark: '#E2AFC2' };

// The whole Zelle deposit section, deliberately one line.
//
// It used to be three stacked elements (a status sentence, a screenshot strip,
// and a pair of Received / Not Yet buttons) all restating the same fact. Since
// the upload marks the deposit received on its own, none of that needs to be a
// decision on the page: it's one collapsed line that opens to the screenshot,
// with the manual override tucked underneath for the rare cases the automatic
// path can't cover (cash, Venmo, a screenshot that's clearly wrong).
function DepositStrip({ booking, onUpdateBooking }) {
  const [expanded, setExpanded] = useState(false);
  const [signedUrls, setSignedUrls] = useState([]);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const hasProof = !!booking.zelle_screenshot;
  const isIn = !!booking.deposit_received;
  const landedAt = booking.zelle_uploaded_at || booking.deposit_confirmed_at;
  const waitingDays = daysSince(booking.created_date || booking.created_at);

  // How many days after booking the money actually turned up. The point of the
  // whole feature is that this is often not zero.
  const gap = booking.zelle_uploaded_at && booking.created_date
    ? daysSince(booking.created_date) - daysSince(booking.zelle_uploaded_at)
    : null;

  // How many screenshots are on file. The list is on the row itself, so the
  // count is right before the strip is ever opened.
  const shotCount = booking.zelle_screenshots?.length || (hasProof ? 1 : 0);

  const headline = isIn
    ? (hasProof ? (shotCount > 1 ? `${shotCount} Zelle screenshots received` : 'Zelle screenshot received') : 'Deposit received')
    : (hasProof ? 'Screenshot on file, marked not received' : 'Waiting on deposit');

  const detail = isIn
    ? [landedAt ? shortDateTime(landedAt) : null, gap >= 1 ? `${gap === 1 ? 'a day' : `${gap} days`} after booking` : null]
        .filter(Boolean).join(' · ')
    : (!hasProof && waitingDays !== null
        ? (waitingDays === 0 ? 'booked today' : waitingDays === 1 ? 'booked 1 day ago' : `booked ${waitingDays} days ago`)
        : '');

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && hasProof && !signedUrls.length) {
      setLoadingUrl(true);
      try {
        const res = await fetch('/api/screenshot-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: booking.id, table: 'bookings' }),
        });
        const data = await res.json();
        setSignedUrls(data.urls?.length ? data.urls : (data.url ? [data.url] : []));
      } finally {
        setLoadingUrl(false);
      }
    }
  };

  // Money that's in is settled history, so it reads in ink. Money that hasn't
  // come is the one state here that wants her, so it alone wears the amber.
  return (
    <div>
      <button
        type="button"
        onClick={handleExpand}
        aria-expanded={expanded}
        className={cx(
          'flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 sm:px-5',
          isIn ? 'hover:bg-canvas/60' : 'bg-tone-pending/[0.05] hover:bg-tone-pending/[0.08]',
        )}
      >
        <span className={cx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          isIn ? 'bg-ink text-paper' : 'border border-tone-pending/40',
        )}>
          {isIn
            ? <Icon name="check" className="h-3 w-3" strokeWidth={3} />
            : <span className="h-1.5 w-1.5 rounded-full bg-tone-pending" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className={cx('block text-[0.86rem] font-semibold leading-snug', isIn ? 'text-ink' : 'text-tone-pending')}>{headline}</span>
          {detail && <span className="mt-0.5 block text-[0.74rem] tabular-nums text-ink-muted">{detail}</span>}
        </span>

        <Chevron open={expanded} className="text-ink-muted" />
      </button>

      <Fold open={expanded}>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:px-5">
          {hasProof && loadingUrl && (
            <p className="py-4 text-center text-[0.8rem] text-ink-muted">Loading…</p>
          )}
          {hasProof && signedUrls.length > 0 && (
            <div>
              {/* One screenshot fills the strip; several sit two to a row. */}
              <div className={signedUrls.length > 1 ? 'grid grid-cols-2 gap-2' : ''}>
                {signedUrls.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Zelle screenshot ${i + 1}`}
                    className={cx('w-full cursor-pointer rounded-ctl border border-line bg-canvas object-contain', signedUrls.length > 1 ? 'max-h-[320px]' : 'max-h-[400px]')}
                    onClick={() => window.open(url, '_blank')}
                    title="Click to open full size"
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-[0.68rem] text-ink-muted">Click {signedUrls.length > 1 ? 'a screenshot' : 'image'} to open full size</p>
            </div>
          )}

          {/* The escape hatches. Out of the way because the automatic path
              covers almost every deposit. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {isIn ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onUpdateBooking({ deposit_received: false, deposit_confirmed_at: null })}
              >
                Mark as not received
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onUpdateBooking({ deposit_received: true, deposit_confirmed_at: new Date().toISOString() })}
              >
                {hasProof ? 'Mark received after all' : 'Paid another way? Mark received'}
              </Button>
            )}
            <span className="text-[0.74rem] text-ink-muted">
              {isIn ? 'Only if the screenshot turned out to be wrong.' : 'For anything paid outside the site.'}
            </span>
          </div>
        </div>
      </Fold>
    </div>
  );
}

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

// Pre-fills the cancel dialog so even a one-click cancel reads warmly instead of
// abruptly. Roko can edit or replace it; whatever's in the box goes to the email.
//
// First person, because the email prints it under "Note from Roko". It used to
// say "Roko's schedule", which put her in the third person inside her own
// signed message.
const DEFAULT_CANCEL_REASON = "Unfortunately, this no longer works with my schedule.";

// " · Jul 22, 4:54 PM" for the client-cancel banners. Empty string when unset.
function fmtCancelStamp(iso) {
  if (!iso) return '';
  try {
    return ' · ' + new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ', ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
}

function CopyableAddress({ address }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group w-full text-left"
      title="Tap to copy address"
    >
      <p className="text-[0.86rem] font-medium leading-snug text-ink">
        {address}
      </p>
      {/* The hint is ink-muted, not anything fainter: a lighter grey sat at
          about 1.9:1 on the dark card and was effectively invisible. */}
      <span className={cx('mt-1 inline-flex items-center gap-1 text-[0.68rem] transition-colors', copied ? 'font-medium text-ink' : 'text-ink-muted group-hover:text-ink-soft')}>
        {copied ? (
          <><Icon name="check" className="h-2.5 w-2.5" strokeWidth={2.6} /> Copied</>
        ) : (
          <><svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-2.5 w-2.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Tap to copy</>
        )}
      </span>
    </button>
  );
}

const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 9; h <= 20; h++) {
    for (let m of [0, 30]) {
      if (h === 20 && m === 30) break;
      const ampm = h < 12 ? 'AM' : 'PM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      slots.push(`${h12}:${m === 0 ? '00' : '30'} ${ampm}`);
    }
  }
  return slots;
})();

const APPT_TIMES = [
  '4:00 AM','4:30 AM','5:00 AM','5:30 AM',
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM',
];

// Universal Google Maps link — works on desktop + mobile, no API key required.
function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// "2:00 PM" / "2 PM" / "11 AM" → minutes since midnight. Ready-by strings come
// from form pickers but older rows can be hour-only, which apptToMin rejects.
// Returns null (never guesses) when there's no AM/PM to anchor the hour.
function clockToMin(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h < 1 || h > 12 || min > 59) return null;
  const pm = m[3].toUpperCase() === 'PM';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h * 60 + min;
}

// ── Undo store for appointment time changes ──────────────────────────────
// The undo has to outlive a refresh: she changes a time, gets pulled away, comes
// back an hour later and only then realises she picked the wrong hour. Kept on
// her own machine (the previous time isn't a fact the booking row records) and
// only offered while it still makes sense: within a day, and only if the
// appointment still holds the values that change put there — if it moved again
// somewhere else, "undo" would be putting back the wrong thing.
const UNDO_KEY = 'admin-time-undo-v1';
const UNDO_TTL = 24 * 60 * 60 * 1000;

function readUndoStore() {
  try { return JSON.parse(localStorage.getItem(UNDO_KEY) || '{}'); } catch { return {}; }
}
function writeUndoStore(store) {
  try { localStorage.setItem(UNDO_KEY, JSON.stringify(store)); } catch { /* private mode */ }
}
function loadUndo(booking) {
  if (typeof window === 'undefined' || !booking?.id) return null;
  const rec = readUndoStore()[booking.id];
  if (!rec) return null;
  const fresh = Date.now() - (rec.at || 0) < UNDO_TTL;
  const stillApplies = (booking.time || null) === (rec.newTime ?? null)
    && (booking.date || null) === (rec.newDate ?? null);
  return fresh && stillApplies ? rec : null;
}
function saveUndo(id, rec) {
  const store = readUndoStore();
  // Drop anyone else's expired entries while we're in here.
  for (const [k, v] of Object.entries(store)) {
    if (Date.now() - (v?.at || 0) > UNDO_TTL) delete store[k];
  }
  store[id] = rec;
  writeUndoStore(store);
}
function clearUndo(id) {
  const store = readUndoStore();
  delete store[id];
  writeUndoStore(store);
}

// "2026-09-23" → "Wednesday, September 23, 2026" / "Wed, Sep 23"
function fmtLong(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
}
function fmtShort(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
}

// The one money figure Roko types by hand, and the only thing that can put a
// number in a travel client's confirmation email. Saved on blur so it behaves
// like every other quiet field on this card; blank clears it back to null,
// which returns the email to "Roko will confirm the exact amount". Laid out as
// one more row of the details list, with the box where the value would be.
function CashDueField({ booking, onUpdateBooking }) {
  const [draft, setDraft] = useState(booking.cash_due == null ? '' : String(booking.cash_due));
  useEffect(() => { setDraft(booking.cash_due == null ? '' : String(booking.cash_due)); }, [booking.id, booking.cash_due]);

  const commit = () => {
    const raw = draft.replace(/[^0-9.]/g, '').trim();
    const next = raw === '' ? null : Number(raw);
    if (next !== null && !Number.isFinite(next)) return;
    if (next === (booking.cash_due == null ? null : Number(booking.cash_due))) return;
    onUpdateBooking({ cash_due: next });
  };

  return (
    <div className="flex items-center justify-between gap-6 border-t border-line py-2.5">
      <div className="min-w-0">
        <dt className="text-ink-muted">Balance on the day</dt>
        <p className="mt-0.5 text-[0.74rem] leading-snug text-ink-muted/80">Goes in their confirmation email</p>
      </div>
      <dd className="shrink-0">
        <label className="flex h-11 w-32 items-center gap-1 rounded-ctl border border-line bg-paper px-3 transition-colors duration-200 focus-within:border-ink/60 sm:h-10">
          <span className="text-ink-muted">$</span>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            inputMode="decimal"
            placeholder="not set"
            aria-label="Balance on the day"
            className="min-w-0 flex-1 bg-transparent text-right text-[16px] font-medium tabular-nums text-ink outline-none placeholder:font-normal placeholder:text-ink-muted/70 sm:text-[0.86rem]"
          />
        </label>
      </dd>
    </div>
  );
}

// Every signature the client has given on this booking, oldest first, on a
// numbered rail. Roko's question when a time changes is "did they actually
// re-sign, and when?", so each row leads with the timestamp and says what
// window that signature covered. `superseded` marks the last row as the one
// currently on file but already replaced by an unsigned request.
function SignatureChain({ chain, fmt, superseded = false }) {
  if (!chain?.length) return null;
  return (
    <ol className="flex flex-col">
      {chain.map((sig, i) => {
        const isLast = i === chain.length - 1;
        const current = isLast && !superseded;
        const label = current ? 'Current' : i === 0 ? 'Original' : `Revision ${i}`;
        return (
          <li key={`${sig.signed_at}-${i}`} className="relative flex items-start gap-3 pb-3 last:pb-0">
            {/* The rail between the numbers, the way a progress track joins its steps. */}
            {!isLast && <span aria-hidden className="absolute bottom-0 left-[9.5px] top-6 w-px bg-line-strong" />}
            <span className={cx(
              'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.62rem] font-semibold tabular-nums',
              current ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-paper text-ink-muted',
            )}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8rem] font-medium leading-snug tabular-nums text-ink">
                {fmt(sig.signed_at)}
                <span className={cx('ml-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em]', current ? 'text-ink' : 'text-ink-muted')}>
                  {label}
                </span>
              </p>
              <p className="mt-0.5 text-[0.74rem] leading-snug text-ink-muted">
                Signed by {sig.name || 'client'}{sig.signed_for ? ` · covers ${sig.signed_for}` : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Numbered step marker for the guided pipeline (1 = time, 2 = confirm, plus
// the consultation for a bride). Drawn like the steps of a progress track: ink
// with a check once done, a rose ring on the step she's on, amber when a step
// was skipped past and still needs doing, a hairline circle for what's next.
function StepDot({ n, state }) {
  return (
    <span className={cx(
      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.68rem] font-semibold tabular-nums',
      state === 'done' ? 'border-ink bg-ink text-paper'
        : state === 'active' ? 'border-rose bg-paper text-rose'
        : state === 'warn' ? 'border-tone-pending bg-tone-pending/10 text-tone-pending'
        : 'border-line-strong bg-paper text-ink-muted',
    )}>
      {state === 'done' ? <Icon name="check" className="h-3 w-3" strokeWidth={2.8} /> : n}
    </span>
  );
}

// A step's marker and its name, the heading of each stage of the pipeline.
function StepHead({ n, state, children, className }) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <StepDot n={n} state={state} />
      <Label className={state === 'warn' ? 'text-tone-pending' : state === 'done' || state === 'todo' ? 'text-ink-muted' : 'text-ink'}>{children}</Label>
    </div>
  );
}

// The notes field mashes several things into one string, in two formats:
//   bridal:      "Ready by: 11 AM. <free-text comment>"
//   non-bridal:  "<comment> | Event: Baby shower | ⏰ surcharge | Ready by: 9 AM | ✈️ travel"
// Split it back out so each piece can be laid out (and labeled) on its own.
function parseBookingNotes(raw) {
  const empty = { readyBy: '', occasion: '', comment: '', flags: [] };
  if (!raw) return empty;
  const text = raw.replace(/^\s*\|\s*/, '').trim();
  if (!text) return empty;

  if (text.includes('|')) {
    let readyBy = '';
    let occasion = '';
    const flags = [];
    const rest = [];
    for (const seg of text.split('|').map(s => s.trim()).filter(Boolean)) {
      const m = seg.match(/^Ready by:\s*(.+)$/i);
      // What the appointment is for. Lifted out so it can be labelled on the
      // card and chipped on the list, which is the whole reason it's collected.
      const ev = seg.match(/^Event:\s*(.+)$/i);
      if (m) readyBy = /not specified/i.test(m[1]) ? '' : m[1].trim();
      else if (ev) occasion = ev[1].trim();
      // The signed-agreement chip has its own "Service Agreement" section below,
      // so it must never leak into the free-text comment.
      else if (/^✍️/.test(seg) || /Agreement\s+\S+\s+signed by/i.test(seg)) continue;
      else if (/early arrival|⏰/i.test(seg)) flags.push(seg.replace(/^⏰\s*/, '').trim());
      else if (/travel/i.test(seg) || seg.includes('✈️')) flags.push(seg.replace(/^✈️\s*/, '').trim());
      else rest.push(seg);
    }
    return { readyBy, occasion, comment: rest.join(' ').trim(), flags };
  }

  // bridal / plain: "Ready by: X. <comment>" — greedy [^.]+ stops at the first
  // period (ready-by times never contain one), so the time and the free-text
  // comment land in separate groups.
  const m = text.match(/^Ready by:\s*([^.]+)\.?\s*([\s\S]*)$/i);
  if (m) {
    const readyBy = /not specified/i.test(m[1]) ? '' : m[1].trim();
    return { readyBy, occasion: '', comment: (m[2] || '').trim(), flags: [] };
  }
  return { readyBy: '', occasion: '', comment: text, flags: [] };
}

function parseConsultNotes(raw) {
  if (!raw) return { link: '', meetingId: '', notes: '' };
  let link = '', meetingId = '';
  const rest = [];
  for (const line of raw.split('\n')) {
    const lm = line.match(/^Link: (https?:\/\/\S+)\s*$/);
    const mm = line.match(/^MeetingId: (\S+)\s*$/);
    if (lm) link = lm[1];
    else if (mm) meetingId = mm[1];
    else rest.push(line);
  }
  // Recover a host-capable id from the join link when none was stored explicitly.
  if (!meetingId) meetingId = meetingIdFromUrl(link);
  return { link, meetingId, notes: rest.join('\n').trim() };
}

// What's already on Roko's plate for a given day, shown inline under the
// consultation date picker (only when the schedule drawer isn't open, so
// there's never a double schedule on screen).
//
// This is a rail, not a list. A free day is an empty bar and a booked day is a
// bar with blocks in it, so "is this day open?" is answered by shape rather than
// by reading a sentence. The time she's currently picking ghosts onto the same
// rail, which makes a collision visible the instant it happens.
const RAIL_START = 8 * 60;  // 8 AM
const RAIL_END = 20 * 60;   // 8 PM
const RAIL_TICKS = [9, 12, 15, 18]; // hours labelled under the rail

function DayPeek({ dateKey, bookings = [], classRegs = [], excludeConsultOf, draftTime, onOpenFull, consultInk }) {
  if (!dateKey) return null;
  const events = [];
  const add = (id, color, time, name) => {
    const { start, end } = parseRange(time || '');
    const s = apptToMin(start);
    const e = apptToMin(end);
    events.push({ id, color, name, timed: s != null, start: s, end: e != null && e > s ? e : (s != null ? s + 60 : null) });
  };
  bookings.forEach(b => {
    if (b.status === 'cancelled') return;
    if (b.date === dateKey) {
      add(`a-${b.id}`, isBridalService(b.service) ? EVENT_COLORS.bridal : EVENT_COLORS.appt, b.time, b.name || 'Client');
    }
    if (b.consultation_date === dateKey && b.id !== excludeConsultOf) {
      add(`c-${b.id}`, EVENT_COLORS.consult, b.consultation_time, b.name || 'Client');
    }
  });
  classRegs.forEach(r => {
    if (r.status === 'cancelled' || r.appointment_date !== dateKey) return;
    add(`l-${r.id}`, EVENT_COLORS.class, r.appointment_time, r.full_name || 'Client');
  });

  const d = new Date(dateKey + 'T00:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const untimed = events.filter(ev => !ev.timed);
  const timed = events.filter(ev => ev.timed);

  // Where the draft consultation lands on the rail, if she's picked a time.
  const draft = (() => {
    const { start, end } = parseRange(draftTime || '');
    const s = apptToMin(start);
    if (s == null) return null;
    const e = apptToMin(end);
    return { start: s, end: e != null && e > s ? e : s + 30 };
  })();

  const pct = (min) => Math.max(0, Math.min(100, ((min - RAIL_START) / (RAIL_END - RAIL_START)) * 100));

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[0.8rem] font-semibold tabular-nums text-ink">
          {weekday} {d.getDate()}
        </span>
        <span className="text-[0.74rem] text-ink-muted">
          {timed.length + untimed.length === 0 ? 'open' : `${timed.length + untimed.length} booked`}
        </span>
        <span className="flex-1" />
        {onOpenFull && (
          <button type="button" onClick={onOpenFull} title="Open full schedule" aria-label="Open full schedule"
            className="press -mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl text-ink-muted hover:bg-canvas hover:text-ink">
            <Icon name="calendar" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* The rail. The blocks are the calendar's own event colours. */}
      <div className="relative h-[26px] overflow-hidden bg-canvas shadow-[inset_0_0_0_1px_rgb(var(--c-line))]">
        {timed.map(ev => (
          <span key={ev.id} title={ev.name} className="absolute bottom-0 top-0"
            style={{ left: `${pct(ev.start)}%`, width: `${Math.max(pct(ev.end) - pct(ev.start), 1.5)}%`, background: ev.color }} />
        ))}
        {draft && (
          <span className="absolute bottom-0 top-0"
            style={{
              left: `${pct(draft.start)}%`,
              width: `${Math.max(pct(draft.end) - pct(draft.start), 1.5)}%`,
              background: `${consultInk}2e`,
              border: `1.5px dashed ${consultInk}`,
            }} />
        )}
      </div>

      {/* Hour ticks */}
      <div className="relative mt-1 h-3.5">
        {RAIL_TICKS.map(h => (
          <span key={h} className="absolute -translate-x-1/2 text-[0.68rem] tabular-nums text-ink-muted"
            style={{ left: `${pct(h * 60)}%` }}>
            {h > 12 ? h - 12 : h}
          </span>
        ))}
      </div>

      {untimed.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {untimed.map(ev => (
            <span key={ev.id} className="flex items-center gap-1.5 text-[0.74rem] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ev.color }} />
              {ev.name}, no time set
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ConsultationScheduler({ booking, onUpdateBooking, dm, onSent, bridal, confirmed, dateFormatted, expanded, setExpanded, onDraftChange, renderDayPeek, onBlockedByTime }) {
  const hasConsult = !!booking.consultation_date;
  // Bridal booking already confirmed (via "confirm now, schedule later") but
  // with no consultation yet: send just the consultation email, don't re-send
  // the confirmation or touch status.
  const consultOnly = bridal && confirmed && !hasConsult;
  // Unconfirmed bridal: this row IS step 2's only action, so it gets filled-
  // button styling instead of the quiet dashed placeholder.
  const leadStep = bridal && !confirmed;
  // Sending this is what confirms an unconfirmed bridal booking, so it can't go
  // out before the appointment has a working window on it.
  const confirmBlocked = bridal && !consultOnly && !booking.time;
  const parsed = parseConsultNotes(booking.consultation_notes);
  // First-ever email to a Booksy-imported client (no link stored yet) is a
  // "welcome to the new site" message, not a "your time changed" one.
  const migrated = booking.source === 'booksy' && !parsed.link;
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [meetLink, setMeetLink] = useState(parsed.link);
  const [meetingId, setMeetingId] = useState(parsed.meetingId);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [form, setForm] = useState({
    date: booking.consultation_date || '',
    time: booking.consultation_time || '',
    type: booking.consultation_type || 'Zoom',
    notes: parsed.notes,
  });

  // The consultation lands about a month before the appointment, so the
  // calendar opens on that month (Apr 4 opens March) with the day itself dotted.
  const consultMonth = (() => {
    if (!booking.date) return undefined;
    const [y, m] = booking.date.split('-').map(Number);
    const d = new Date(y, m - 2, 1); // m is 1-based, so m - 2 is the month before
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();
  const apptFirstName = booking.name?.split(' ')[0];
  const apptMarker = booking.date
    ? { date: booking.date, label: apptFirstName ? `${apptFirstName}'s appointment` : 'Appointment' }
    : undefined;

  const set = (k, v) => {
    const next = { ...form, [k]: v };
    setForm(next);
    // Let the parent mirror the draft (schedule drawer sync + ghost block).
    onDraftChange?.({ date: next.date, time: next.time, type: next.type });
  };

  // Report the draft when the panel opens, clear it when the panel closes, so
  // the ghost consultation only ever exists while she's actually picking.
  useEffect(() => {
    if (expanded) onDraftChange?.({ date: form.date, time: form.time, type: form.type });
    else onDraftChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const generateZoomLink = async () => {
    setGeneratingLink(true);
    setLinkCopied(false);
    try {
      const res = await fetch('/api/create-zoom-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Makeup by Roko · Consultation with ${booking.name || 'Client'}`,
          duration: 30,
          date: form.date || undefined,
          time: form.time || undefined,
        }),
      });
      const data = await res.json();
      if (data.join_url) {
        setMeetLink(data.join_url);
        setMeetingId(data.meeting_id ? String(data.meeting_id) : '');
      } else {
        alert(`Zoom error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyMeetLink = () => {
    if (!meetLink) return;
    navigator.clipboard.writeText(meetLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSend = async () => {
    // This send is also the bridal confirmation (it flips status to confirmed
    // below), so it obeys the same rule the status pills do: not until the
    // appointment itself has a time. Checked here rather than only in the
    // button, because this scheduler renders in two different places.
    if (confirmBlocked) { onBlockedByTime?.(); return; }
    if (!form.date || !form.time) { alert('Please select a date and time.'); return; }
    setSaving(true);
    try {
      const consultDateFormatted = new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const activeLink = form.type === 'Zoom' ? meetLink : '';
      // Bridal merges confirm + consultation into one email (and flips status to
      // confirmed); everyone else — and a bridal booking that was already
      // confirmed without a consultation — uses the standalone consultation email.
      const endpoint = bridal && !consultOnly ? '/api/confirm-bridal' : '/api/send-consultation';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          clientEmail: booking.email,
          clientName: booking.name,
          serviceName: booking.service,
          consultationDate: consultDateFormatted,
          consultationTime: form.time,
          consultationType: form.type,
          zoomLink: activeLink,
          consultationNotes: form.notes,
          updated: hasConsult,
          migrated,
          ...(bridal ? { dateFormatted, time: booking.time } : {}),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const storedNotes = [
        activeLink ? `Link: ${activeLink}` : null,
        form.type === 'Zoom' && meetingId ? `MeetingId: ${meetingId}` : null,
        form.notes || null,
      ].filter(Boolean).join('\n');
      onUpdateBooking({
        consultation_date: form.date, consultation_time: form.time,
        consultation_type: form.type, consultation_notes: storedNotes,
        ...(bridal && !consultOnly ? { status: 'confirmed' } : {}),
      });
      setSent(true);
      setExpanded(false);
      onSent?.();
    } catch {
      alert('Failed to send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const consultInk = CONSULT_INK[dm ? 'dark' : 'light'];
  const sendLabel = migrated ? 'Send welcome + notify client'
    : hasConsult ? 'Reschedule & notify client'
    : consultOnly ? 'Schedule & notify client'
    : 'Confirm & notify client';

  return (
    <div className={bridal ? '' : 'mb-6'}>
      {!bridal && (
        <Label className="mb-3 block">Consultation</Label>
      )}

      {/* Scheduled state */}
      {hasConsult && !expanded && (
        <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-paper px-4 py-3.5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[0.86rem] font-semibold tabular-nums text-tone-consult">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tone-consult" />
              {booking.consultation_type} · {booking.consultation_time}
            </p>
            <div className="pl-3.5">
              <p className="mt-0.5 text-[0.8rem] text-ink-muted">
                {booking.consultation_date && new Date(booking.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {(meetingId || parsed.meetingId) ? (
                <button type="button"
                  onClick={() => openZoomRoom(meetLink || parsed.link, meetingId || parsed.meetingId)}
                  className="press mt-2 inline-flex h-8 items-center gap-1.5 rounded-ctl bg-rose px-3 text-[0.74rem] font-semibold text-paper hover:bg-rose/90">
                  <Icon name="video" className="h-3.5 w-3.5" strokeWidth={2} />
                  Join
                </button>
              ) : parsed.link ? (
                <a href={parsed.link} target="_blank" rel="noopener noreferrer"
                  className="mt-1 block truncate text-[0.74rem] text-ink-muted underline underline-offset-2 hover:text-ink">
                  {parsed.link}
                </a>
              ) : null}
              {parsed.notes && (
                <p className="mt-1 text-[0.74rem] leading-snug text-ink-muted">{parsed.notes}</p>
              )}
            </div>
          </div>
          <Button size="sm" onClick={() => { setExpanded(true); setSent(false); }} className="max-sm:h-11">
            Reschedule
          </Button>
        </div>
      )}

      {/* Empty state. Unconfirmed bridal: this row IS step 2's only action, so
          it's the solid button rather than the quiet dashed placeholder. */}
      {!hasConsult && !expanded && (
        <button type="button" onClick={() => setExpanded(true)}
          className={cx(
            'press flex w-full items-center justify-between gap-3 rounded-ctl px-4 py-3.5 text-left',
            leadStep ? 'bg-ink text-paper hover:bg-ink/85' : 'border border-dashed border-line-strong bg-paper text-ink hover:border-ink/40',
          )}>
          <span className="flex min-w-0 items-center gap-3">
            <Icon name="calendar" className={cx('h-4 w-4', leadStep ? 'text-paper/75' : 'text-tone-consult')} />
            <span className="min-w-0">
              <span className="block text-[0.92rem] font-semibold">{leadStep ? 'Pick a consultation time' : 'Schedule consultation'}</span>
              <span className={cx('mt-0.5 block text-[0.8rem] leading-snug', leadStep ? 'text-paper/70' : 'text-ink-muted')}>
                {leadStep ? 'Then one email sends the confirmation + upload link'
                  : bridal ? 'Sends the consultation details, with a Zoom link if you add one'
                  : 'Set date, time & meeting type'}
              </span>
            </span>
          </span>
          <Icon name="right" className={cx('h-4 w-4', leadStep ? 'text-paper/70' : 'text-ink-muted')} />
        </button>
      )}

      {/* Picker */}
      {expanded && (
        <div className="rounded-card border border-line bg-paper">
          <div className="flex items-center gap-3 border-b border-line py-1.5 pl-4 pr-1.5 sm:pl-5">
            <div className="min-w-0 flex-1 py-1.5">
              <p className="text-[0.92rem] font-semibold tracking-[-0.01em] text-ink">{hasConsult ? 'Reschedule consultation' : 'Schedule consultation'}</p>
              <p className="mt-0.5 truncate text-[0.74rem] text-ink-muted">
                {hasConsult
                  ? 'Client gets an updated email'
                  : (bridal && !confirmed ? 'One email: confirmation, details, upload link' : 'Date, time and meeting type')}
              </p>
            </div>
            <IconButton label="Close scheduler" onClick={() => { setExpanded(false); setShowConfirmSend(false); }} className="text-ink-muted hover:text-ink">
              <Icon name="close" className="h-4 w-4" strokeWidth={1.9} />
            </IconButton>
          </div>

          <div className="flex flex-col gap-5 p-4 sm:p-5">
            {/* Date + Time window */}
            <div>
              <Label className="mb-2 block">Date</Label>
              <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent={consultInk}
                openTo={consultMonth} marker={apptMarker} autoOpen={!hasConsult} />
              {/* What that day already holds, so picking a time never means
                  leaving the card to go check the schedule. */}
              {renderDayPeek?.(form.date, form.time)}
            </div>
            <div>
              <Label className="mb-2 block">
                Time <span className="font-normal normal-case tracking-normal text-ink-muted/80">· 30 min meeting</span>
              </Label>
              <TimeWindowPicker value={form.time} onChange={v => set('time', v)} slots={TIME_SLOTS} dm={dm} accent={consultInk} />
            </div>

            {/* Type */}
            <div>
              <Label className="mb-2 block">Meeting type</Label>
              <div role="radiogroup" aria-label="Meeting type" className="grid grid-cols-2 gap-2">
                {['Zoom', 'Phone'].map(key => (
                  <button key={key} type="button" role="radio" aria-checked={form.type === key} onClick={() => set('type', key)}
                    className={cx(
                      'press h-11 rounded-ctl border text-[0.86rem] font-medium',
                      form.type === key ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-paper text-ink-soft hover:border-ink/50 hover:text-ink',
                    )}>
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom meeting link */}
            {form.type === 'Zoom' && (
              <div>
                <div className="mb-2 flex min-h-[32px] items-center justify-between">
                  <Label>Zoom link</Label>
                  {meetLink && (
                    <button type="button" onClick={generateZoomLink} disabled={generatingLink}
                      className={cx(MINI, '-mr-2')}>
                      <Icon name="refresh" className="h-3 w-3" strokeWidth={2.2} />
                      New link
                    </button>
                  )}
                </div>

                {!meetLink ? (
                  <Button size="lg" icon={generatingLink ? undefined : VideoIcon} onClick={generateZoomLink} disabled={generatingLink} className="w-full">
                    {generatingLink ? <><Spinner /> Generating…</> : 'Generate Zoom link'}
                  </Button>
                ) : (
                  <button type="button" onClick={copyMeetLink}
                    className={cx(
                      'flex min-h-[48px] w-full items-center justify-between gap-3 rounded-ctl border px-3.5 text-left transition-colors duration-200',
                      linkCopied ? 'border-ink bg-canvas' : 'border-line-strong bg-paper hover:border-ink/50',
                    )}>
                    <span className="truncate text-[0.8rem] font-medium text-ink-soft">
                      {meetLink}
                    </span>
                    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-ctl bg-ink px-2.5 text-[0.74rem] font-semibold text-paper">
                      {linkCopied ? <><Icon name="check" className="h-2.5 w-2.5" strokeWidth={3.5} />Copied</> : 'Copy'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="mb-2 block">
                Notes <span className="font-normal normal-case tracking-normal text-ink-muted/80">(optional)</span>
              </Label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                placeholder="Any extra info for the client…"
                aria-label="Consultation notes"
                className={cx(inputClass, 'h-auto min-h-[80px] resize-none py-2.5 leading-relaxed')} />
            </div>

            {/* CTA */}
            {!showConfirmSend ? (
              <button type="button" onClick={() => { if (confirmBlocked) { onBlockedByTime?.(); return; } if (form.date && form.time) setShowConfirmSend(true); }} disabled={!form.date && !confirmBlocked}
                className={cx(
                  'press flex h-12 w-full items-center justify-center gap-2 rounded-ctl text-[0.92rem] font-semibold',
                  confirmBlocked
                    ? 'border border-dashed border-tone-pending/50 bg-tone-pending/[0.06] text-tone-pending'
                    : 'bg-ink text-paper hover:bg-ink/85 disabled:pointer-events-none disabled:opacity-40',
                )}>
                {confirmBlocked ? 'Set the appointment time first' : sendLabel}
              </button>
            ) : (
              <div className="rounded-ctl border border-line bg-canvas/60 p-4">
                <p className="text-[0.92rem] font-semibold text-ink">{migrated ? 'Send welcome email?' : hasConsult ? 'Send updated time?' : consultOnly ? 'Send consultation details?' : 'Confirm & send email?'}</p>
                <Specs className="mt-1.5">
                  <Spec label="Date" value={form.date ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Not set'} />
                  <Spec label="Time" value={form.time} />
                  <Spec label="Type" value={form.type} />
                </Specs>
                {/* Exactly what the one email contains, so there's never a
                    "wait, what am I sending?" moment before the tap. */}
                {(() => {
                  const zoomIncluded = form.type === 'Zoom' && !!meetLink;
                  const items = migrated
                    ? ['A warm welcome to the new booking site', `Their ${booking.service || 'appointment'} details`, 'The consultation details above', ...(zoomIncluded ? ['The Zoom link to join'] : [])]
                    : hasConsult
                    ? ['The updated consultation time', ...(zoomIncluded ? ['The Zoom link to join'] : [])]
                    : bridal && !consultOnly
                    ? [
                        `Their confirmation: ${booking.service || 'appointment'}${dateFormatted ? ` on ${dateFormatted}` : ''}`,
                        'The consultation details above',
                        ...(zoomIncluded ? ['The Zoom link to join'] : []),
                        // Mirrors confirm-bridal: proof already sent counts,
                        // so nobody gets asked for a deposit twice.
                        (booking.deposit_received || booking.zelle_uploaded_at)
                          ? 'Their personal photo upload link'
                          : 'Zelle deposit info + their photo upload link',
                      ]
                    : ['The consultation details above', ...(zoomIncluded ? ['The Zoom link to join'] : [])];
                  return (
                    <div className="mt-1 border-t border-line pt-3">
                      <p className="text-[0.8rem] text-ink-muted">
                        One email to <span className="font-medium text-ink">{booking.email}</span> with:
                      </p>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {items.map((it, i) => (
                          <li key={i} className="flex items-start gap-2 text-[0.8rem] leading-snug text-ink-soft">
                            <Icon name="check" className="mt-[3px] h-3 w-3 text-ink" strokeWidth={2.6} />
                            <span className="min-w-0">{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button size="lg" onClick={() => setShowConfirmSend(false)}>
                    Cancel
                  </Button>
                  <Button variant="solid" size="lg" onClick={() => { setShowConfirmSend(false); handleSend(); }} disabled={saving}>
                    {saving ? <><Spinner /> Sending…</> : 'Yes, send email'}
                  </Button>
                </div>
              </div>
            )}

            {sent && (
              <p className="flex items-center justify-center gap-1.5 py-1 text-[0.8rem] font-medium text-ink-soft">
                <Icon name="check" className="h-3.5 w-3.5 text-ink" strokeWidth={2.6} />
                {migrated ? 'Welcome email sent, client notified.' : hasConsult ? 'Consultation rescheduled, client notified.' : 'Consultation scheduled, client notified.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// One appointment line in the client profile panel's Upcoming / Past lists.
function ApptRow({ b, isCurrent }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cx('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[b.status] || 'bg-ink-muted')} />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 text-[0.86rem] font-medium text-ink">
            <span className="truncate">{b.service || 'Appointment'}</span>
            {isCurrent && <Tag className="bg-rose/10 text-rose">This one</Tag>}
          </p>
          <p className="mt-0.5 text-[0.74rem] tabular-nums text-ink-muted">
            {b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
            {b.time ? ` · ${b.time}` : ''}
          </p>
        </div>
      </div>
      <StatusBadge status={b.status} />
    </div>
  );
}

export default function BookingDetail({ booking, onBack, onUpdateStatus, onUpdateBooking, onDelete, allBookings, classRegs = [], onSelectBooking, onSelectClassReg, darkMode: dm }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showClientPanel, setShowClientPanel] = useState(false);

  // Opening the card is the acknowledgment. There's no Confirm button anywhere
  // because her bank already told her the money landed, so the only thing the
  // alert needs is to know she's looked, which this is.
  //
  // Stamped with the arrival time rather than "now" so the comparison in
  // isDepositUnseen stays exact: a deposit that lands while she has the card
  // open still surfaces on her next visit instead of being marked seen early.
  useEffect(() => {
    if (!isDepositUnseen(booking)) return;
    onUpdateBooking?.({ deposit_seen_at: booking.zelle_uploaded_at });
    // Runs once per unseen arrival: the update clears the condition itself.
  }, [booking.id, booking.zelle_uploaded_at, booking.deposit_seen_at]);

  // Same acknowledgment for the booking itself. Opening the card from anywhere
  // (the Recent bookings rail, the calendar, a client's history) is what takes
  // it off the rail's "new" count.
  useEffect(() => {
    if (!isBookingUnseen(booking)) return;
    onUpdateBooking?.({ admin_seen_at: new Date().toISOString() });
  }, [booking.id, booking.admin_seen_at]);
  // Side-by-side day schedule drawer (so Roko can eyeball her real day while
  // proposing a new time). Defaults to this booking's date, falls back to today.
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDay, setScheduleDay] = useState(() => {
    if (booking.date) return booking.date;
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  });
  // Live mirror of the consultation scheduler's draft (date/time/type) — used
  // to keep the drawer on the day she's picking and to ghost the meeting there.
  const [consultDraft, setConsultDraft] = useState(null);
  const handleConsultDraft = (draft) => {
    setConsultDraft(draft);
    if (draft?.date) setScheduleDay(draft.date);
  };
  // The Appointment box holds the My Schedule button, but she scrolls well past
  // it while working a card. Track when it leaves the viewport so a floating
  // twin can keep the schedule one tap away from anywhere on the page.
  const timeSectionRef = useRef(null);
  // What the appointment looked like before the last time/date change, so a
  // mis-tap is one button away from being put back. Lives as long as she's on
  // this card: an undo that vanishes after two seconds is an undo you can't use.
  const [undoTime, setUndoTime] = useState(null);
  // Only keyed on the booking id: re-reading it whenever booking.time changes
  // would race the save (the prop still holds the old time for a beat) and wipe
  // the undo we just created.
  useEffect(() => { setUndoTime(loadUndo(booking)); }, [booking.id]);
  const [apptOut, setApptOut] = useState(false);
  useEffect(() => {
    const el = timeSectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setApptOut(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const openSchedule = () => {
    setScheduleDay(
      (consultExpanded && consultDraft?.date) ? consultDraft.date
        : (showTimePicker && pendingDate) ? pendingDate
        : (booking.date || scheduleDay)
    );
    setShowSchedule(true);
  };
  // The same button opens and closes it. Having to travel to a small ✕ in the
  // far corner to undo one tap is the kind of thing you only notice when you
  // do it forty times a day.
  const toggleSchedule = () => (showSchedule ? setShowSchedule(false) : openSchedule());
  useEffect(() => {
    if (!showSchedule) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowSchedule(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSchedule]);
  // Tapping an appointment inside the My Schedule drawer opens that client's
  // card. We resolve the id back to the real stored booking so a ghosted draft
  // block (dashed "new time" / "consultation" preview) never navigates to a
  // half-real object — those aren't in allBookings, so they're simply ignored.
  const openFromSchedule = (b) => {
    const real = (allBookings || []).find(x => x.id === b?.id);
    if (!real) return;
    setShowSchedule(false);
    onSelectBooking?.(real);
  };
  const openClassFromSchedule = (r) => {
    setShowSchedule(false);
    onSelectClassReg?.(r);
  };
  // Drag-to-resize drawer width, remembered across sessions.
  const [scheduleW, setScheduleW] = useState(() => {
    try {
      const w = parseInt(localStorage.getItem('admin-schedule-width'), 10);
      return Number.isFinite(w) ? Math.min(Math.max(w, 340), 760) : 400;
    } catch { return 400; }
  });
  const scheduleWRef = useRef(scheduleW);
  const resizeSchedule = (e) => {
    if (e.buttons !== 1) return;
    const w = Math.min(Math.max(window.innerWidth - e.clientX, 340), Math.min(760, Math.round(window.innerWidth * 0.95)));
    scheduleWRef.current = w;
    setScheduleW(w);
  };
  const persistScheduleW = () => {
    try { localStorage.setItem('admin-schedule-width', String(scheduleWRef.current)); } catch { /* private mode */ }
  };
  // The card slides aside for the drawer whenever there's genuinely room for
  // both; only narrow screens fall back to the dimmed sheet. This used to be a
  // hard 1536px cutoff, which put every 1440-class laptop on the sheet even
  // though the two panes fit side by side fine.
  const [viewportW, setViewportW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1600));
  useEffect(() => {
    const fn = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  // 760 = room for the admin sidebar plus a card that's still readable.
  const docked = viewportW - scheduleW >= 760;
  // Roko's own private notes on this booking (never shown to the client). Seeded
  // from the row; re-synced whenever a different booking is opened.
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes || '');
  const [notesEditing, setNotesEditing] = useState(false);
  useEffect(() => { setAdminNotes(booking.admin_notes || ''); setNotesEditing(false); }, [booking.id, booking.admin_notes]);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [cancelReason, setCancelReason] = useState(DEFAULT_CANCEL_REASON);
  const [reasonFocus, setReasonFocus] = useState(false);
  const [includeReason, setIncludeReason] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Set for a few seconds when something was blocked for want of a time, so the
  // Appointment box she's just been scrolled to says which box it meant.
  const [timeHighlight, setTimeHighlight] = useState(false);
  const [pendingWindow, setPendingWindow] = useState(booking.time || '');
  const [showReconfirmBanner, setShowReconfirmBanner] = useState(false);
  // What Roko just changed (time / date / service), so the notify message can
  // describe it. And whether an update+agreement has been sent for re-sign.
  const [lastChange, setLastChange] = useState(null);
  const [updateNoticeSent, setUpdateNoticeSent] = useState(false);

  const firstName = booking.name?.split(' ')[0] || 'there';
  const pendingStart = parseRange(pendingWindow).start;

  // ── The ONE reschedule panel ─────────────────────────────────────────────
  // Every way of changing the date or time (hero card, Appointment card,
  // ready-by decision buttons, the Message Client link) opens this single panel,
  // so there is exactly one copy of the date+window being picked — the note, the
  // email's appointment box, and the re-sign link all read from it and can never
  // disagree. `allowNotify` is false on the "yes, that works" path (nothing to
  // tell the client — they're getting exactly what they asked for).
  const queryClient = useQueryClient();
  const [pendingDate, setPendingDate] = useState(booking.date || '');
  const [allowNotify, setAllowNotify] = useState(true);
  const [notifyClient, setNotifyClient] = useState(false);
  const [panelSubject, setPanelSubject] = useState('Your updated appointment time');
  const [panelBody, setPanelBody] = useState('');
  const [panelEdited, setPanelEdited] = useState(false); // true once Roko types — stop re-drafting
  const [panelAttach, setPanelAttach] = useState(false);
  const [panelSending, setPanelSending] = useState(false);

  // Wedding-day packages (Luxury Bridal, Full Day) hold the appointment ON the
  // wedding day, so moving the date moves the wedding date too. A Bridal Trial
  // is a separate day, so it stays independent.
  const isWeddingDayService = /bridal|bride|wedding|full day/i.test(booking.service || '')
    && !/non-bridal|trial/i.test(booking.service || '');

  // Subject names exactly what changed, so it never reads vague.
  const draftSubject = (newDate) => {
    if (newDate && newDate !== booking.date) return 'Your updated appointment date & time';
    return booking.time ? 'Your updated appointment time' : 'Your appointment time';
  };

  // The auto-drafted note. Tone is firm ("I've moved/updated…") when there was
  // already a time the client knew, softer ("Would … work?") for a first
  // proposal. `attach` swaps the closing line for the re-sign nudge.
  const draftChangeBody = (newDate, newTime, attach) => {
    const dateChanged = !!newDate && newDate !== booking.date;
    const timeChanged = !!newTime && newTime !== booking.time && !!parseRange(newTime).start;
    if (!dateChanged && !timeChanged) return `Hi ${firstName},\n\n`;
    const firm = !!booking.time; // updating a known appointment vs a first offer
    const service = booking.service || 'appointment';
    let sentence;
    if (dateChanged && timeChanged) {
      sentence = firm
        ? `I've moved your appointment to ${fmtLong(newDate)} at ${newTime}.`
        : `Would ${fmtLong(newDate)} at ${newTime} work for your ${service}?`;
    } else if (dateChanged) {
      sentence = firm
        ? `I've moved your appointment to ${fmtLong(newDate)}${booking.time ? ` at ${booking.time}` : ''}.`
        : `Would ${fmtLong(newDate)} work for your ${service}?`;
    } else {
      const on = dateFormatted ? ` on ${dateFormatted}` : '';
      sentence = firm
        ? `I've updated your appointment time to ${newTime}${on}.`
        : `Would ${newTime}${on} work for your ${service}?`;
    }
    const close = attach
      ? `I'm attaching your updated agreement, just give it a quick sign so we can lock everything in.`
      : `Just let me know and I'll lock it in.`;
    return `Hi ${firstName},\n\n` +
      `Thank you so much for booking with me! ${sentence}\n\n` +
      `${close}\n\n` +
      `With love,\nRoko`;
  };

  // Open the panel. `opts.allowNotify:false` hides the email section entirely
  // (the "yes, accept their ready-by" path). Notify default follows what a good
  // human would do: a confirmed client was promised a time, so tell them; a
  // pending one wasn't, so arrange quietly. `opts.notify` forces it on (No path).
  const openTimePicker = (prefill, opts = {}) => {
    const win = typeof prefill === 'string' ? prefill : (booking.time || '');
    const hasEmail = !!booking.email;
    const allow = opts.allowNotify !== false;
    const notify = allow && hasEmail && (opts.notify ?? (booking.status === 'confirmed'));
    const attach = notify && !!booking.contract_signed; // only re-sign a real signed agreement
    setAllowNotify(allow);
    setPendingDate(booking.date || '');
    setPendingWindow(win);
    setNotifyClient(notify);
    setPanelAttach(attach);
    setPanelSubject(draftSubject(booking.date));
    setPanelBody(draftChangeBody(booking.date, win, attach));
    setPanelEdited(false);
    setShowTimePicker(true);
    setShowReconfirmBanner(false);
    setTimeout(() => { if (timeSectionRef.current) lenisScrollTo(timeSectionRef.current, { offset: -80 }); }, 60);
  };

  // Picking a date/window re-drafts the note + subject (only while it's still the
  // auto draft, so we never clobber something Roko has typed).
  const onPickDate = (v) => {
    setPendingDate(v);
    if (!panelEdited) { setPanelBody(draftChangeBody(v, pendingWindow, panelAttach)); setPanelSubject(draftSubject(v)); }
  };
  const onPickWindow = (v) => {
    setPendingWindow(v);
    if (!panelEdited) setPanelBody(draftChangeBody(pendingDate, v, panelAttach));
  };
  const togglePanelAttach = () => {
    setPanelAttach(a => {
      const next = !a;
      if (!panelEdited) setPanelBody(draftChangeBody(pendingDate, pendingWindow, next));
      return next;
    });
  };

  // The panel's single CTA: save the date+window, and (if notifying) send the
  // note + optional agreement in the same tap. The email is built from the
  // pending values directly, so it always matches what was just saved.
  const commitChange = async () => {
    if (!pendingStart || panelSending) return;
    const dateChanged = !!pendingDate && pendingDate !== booking.date;
    const timeChanged = pendingWindow !== booking.time;
    const changed = dateChanged || timeChanged;
    const willEmail = notifyClient && changed && !!booking.email;
    const newDateFormatted = dateChanged ? fmtLong(pendingDate) : dateFormatted;

    const update = {};
    if (timeChanged) update.time = pendingWindow;
    if (dateChanged) update.date = pendingDate;
    if (Object.keys(update).length) onUpdateBooking(update);
    const snapshot = changed
      ? {
          time: booking.time || null, date: booking.date || null,
          newTime: timeChanged ? (pendingWindow || null) : (booking.time || null),
          newDate: dateChanged ? (pendingDate || null) : (booking.date || null),
          changedTime: timeChanged, changedDate: dateChanged, at: Date.now(),
        }
      : null;

    // Wedding-day bridal: keep the inquiry's wedding date in step with the appt.
    if (dateChanged && isWeddingDayService && bridalInquiry?.id) {
      api.entities.BridalInquiry.update(bridalInquiry.id, { wedding_date: pendingDate })
        .then(() => queryClient.invalidateQueries({ queryKey: ['bridal-inquiry'] }))
        .catch(err => console.error('wedding_date sync:', err));
    }

    if (!willEmail) {
      setShowTimePicker(false);
      if (snapshot) { const rec = { ...snapshot, emailed: false }; setUndoTime(rec); saveUndo(booking.id, rec); }
      showToast(changed ? 'Appointment updated' : 'No changes made', 'ink');
      if (changed && booking.status === 'confirmed' && booking.email) {
        // Quiet change on a confirmed booking — leave the reminder banner so the
        // client (who still believes the old details) doesn't get forgotten.
        setUpdateNoticeSent(false);
        setLastChange({ items: [
          ...(dateChanged ? [{ key: 'date', label: 'Date', to: newDateFormatted }] : []),
          ...(timeChanged ? [{ key: 'time', label: 'Appointment time', to: pendingWindow }] : []),
        ] });
        setShowReconfirmBanner(true);
      }
      return;
    }
    setPanelSending(true);
    try {
      const res = await fetch('/api/contact-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          to: booking.email,
          firstName: booking.name?.split(' ')[0] || '',
          subject: panelSubject.trim() || draftSubject(pendingDate),
          message: panelBody.trim() || draftChangeBody(pendingDate, pendingWindow, panelAttach),
          includeContract: panelAttach,
          serviceName: booking.service,
          dateFormatted: newDateFormatted,
          time: pendingWindow,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to send'); }
      setShowTimePicker(false);
      setShowReconfirmBanner(false);
      if (panelAttach) { setUpdateNoticeSent(true); setLastChange(null); }
      if (snapshot) { const rec = { ...snapshot, emailed: true }; setUndoTime(rec); saveUndo(booking.id, rec); }
      showToast(panelAttach ? `Update sent, awaiting re-sign` : `Update emailed to ${firstName}`, 'ink');
    } catch (err) {
      alert(`The change was saved, but the email didn't send (${err?.message || 'unknown error'}). You can message ${firstName} from the card.`);
      setShowTimePicker(false);
    } finally {
      setPanelSending(false);
    }
  };

  // Take the time back off the appointment entirely, so the card reads as though
  // one was never set — for bridal that means falling straight back to "wants to
  // be ready by 3:00 PM, does that work?", which is the state she wants when a
  // time went on by mistake. Recorded like any other change, so clearing is
  // itself undoable.
  const clearTime = () => {
    if (!booking.time) return;
    const rec = {
      time: booking.time, date: booking.date || null,
      newTime: null, newDate: booking.date || null,
      changedTime: true, changedDate: false, emailed: false, at: Date.now(),
    };
    onUpdateBooking({ time: null });
    setUndoTime(rec);
    saveUndo(booking.id, rec);
    setShowTimePicker(false);
    if (booking.status === 'confirmed' && booking.email) {
      // They were promised a time that no longer exists — keep the standing
      // reminder up rather than letting it go quiet.
      setUpdateNoticeSent(false);
      setLastChange({ items: [{ key: 'time', label: 'Appointment time', to: 'not set yet' }] });
      setShowReconfirmBanner(true);
    }
    showToast('Time cleared', 'ink');
  };

  // Put the appointment back the way it was. If the client was already emailed
  // the new time, undoing leaves them holding the wrong details, so the standing
  // "tell them" banner comes back rather than the change silently reverting.
  const undoTimeChange = () => {
    if (!undoTime) return;
    const back = {};
    if (undoTime.changedTime) back.time = undoTime.time;
    if (undoTime.changedDate) back.date = undoTime.date;
    if (Object.keys(back).length) onUpdateBooking(back);

    if (undoTime.changedDate && isWeddingDayService && bridalInquiry?.id && undoTime.date) {
      api.entities.BridalInquiry.update(bridalInquiry.id, { wedding_date: undoTime.date })
        .then(() => queryClient.invalidateQueries({ queryKey: ['bridal-inquiry'] }))
        .catch(err => console.error('wedding_date sync:', err));
    }

    if (undoTime.emailed && booking.email) {
      setUpdateNoticeSent(false);
      setLastChange({ items: [
        ...(undoTime.changedDate ? [{ key: 'date', label: 'Date', to: fmtLong(undoTime.date) }] : []),
        ...(undoTime.changedTime ? [{ key: 'time', label: 'Appointment time', to: undoTime.time || 'not set' }] : []),
      ] });
      setShowReconfirmBanner(true);
    } else {
      setShowReconfirmBanner(false);
      setLastChange(null);
    }
    setUndoTime(null);
    clearUndo(booking.id);
    showToast('Change undone', 'ink');
  };

  // What the appointment was before that change, in one short phrase.
  const undoWasLabel = (() => {
    if (!undoTime) return '';
    const t = undoTime.changedTime ? (undoTime.time || 'no time set') : null;
    const d = undoTime.changedDate ? (fmtShort(undoTime.date) || 'no date') : null;
    return [d, t].filter(Boolean).join(', ');
  })();

  // ── In-admin Contact composer ────────────────────────────────────────────
  // Roko writes the client a personal email straight from the card (sent as
  // roko@makeupbyroko.org). Plain messages only — time changes live in the
  // Appointment panel above, which handles its own notify email.
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachContract, setAttachContract] = useState(false);
  const [sending, setSending] = useState(false);

  const openCompose = () => {
    if (!composeSubject) setComposeSubject(`Your ${booking.service || 'appointment'} with Makeup by Roko`);
    if (!composeBody) setComposeBody(`Hi ${firstName},\n\n`);
    setShowCompose(true);
    setTimeout(() => { if (composeRef.current) lenisScrollTo(composeRef.current, { offset: -80 }); }, 60);
  };

  // A human sentence for a single changed field, used to pre-fill the notice.
  const changeSentence = (it) => {
    switch (it.key) {
      case 'time': return `I've updated your appointment time to ${it.to}${dateFormatted ? ` on ${dateFormatted}` : ''}.`;
      case 'date': return `I've moved your appointment to ${it.to}${booking.time ? ` at ${booking.time}` : ''}.`;
      case 'service': return `I've updated your service to ${it.to}.`;
      default: return `I've updated your ${String(it.label || 'details').toLowerCase()} to ${it.to}.`;
    }
  };

  // The unified "something changed, tell the client" starter. Opens the Message
  // Client composer pre-filled with a note describing exactly what changed, with
  // the updated agreement attached for a quick re-sign. Works for any change
  // (time, date, service, or several at once) — not just time.
  const openChangeNotice = (change) => {
    const items = change?.items || lastChange?.items || [];
    let detail;
    if (items.length === 1) {
      detail = changeSentence(items[0]);
    } else if (items.length > 1) {
      detail = `I've updated a few details on your booking:\n` + items.map(it => `• ${it.label}: ${it.to}`).join('\n');
    } else {
      detail = `I wanted to reach out with a quick update about your ${booking.service || 'appointment'}.`;
    }
    setComposeSubject('An update on your appointment');
    setComposeBody(
      `Hi ${firstName},\n\n` +
      `Thank you so much for booking with me! ${detail}\n\n` +
      `I'm attaching the updated agreement, just give it a quick sign so we can lock everything in.\n\n` +
      `With love,\nRoko`
    );
    setAttachContract(true);
    setShowReconfirmBanner(false);
    setShowCompose(true);
    setTimeout(() => { if (composeRef.current) lenisScrollTo(composeRef.current, { offset: -80 }); }, 60);
  };

  const sendCompose = async () => {
    if (!booking.email) { alert('This client has no email on file.'); return; }
    if (!composeSubject.trim() || !composeBody.trim()) { alert('Add a subject and a message first.'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/contact-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          to: booking.email,
          firstName: booking.name?.split(' ')[0] || '',
          subject: composeSubject.trim(),
          message: composeBody.trim(),
          includeContract: attachContract,
          serviceName: booking.service,
          dateFormatted,
          time: booking.time,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to send'); }
      setShowCompose(false);
      setShowReconfirmBanner(false);
      if (attachContract) { setUpdateNoticeSent(true); setLastChange(null); }
      showToast(attachContract ? 'Update sent, awaiting re-sign' : 'Email sent to client', 'ink');
    } catch (err) {
      alert(err?.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };
  const [consultExpanded, setConsultExpanded] = useState(false);
  const consultRef = useRef(null);
  const composeRef = useRef(null);

  // `tone` colours the toast's dot: 'ink' for done, or a status tone.
  const showToast = (msg, tone = 'ink') => {
    setToast({ message: msg, tone });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2200);
  };

  const saveAdminNotes = () => {
    const v = adminNotes.trim();
    onUpdateBooking({ admin_notes: v || null });
    setNotesEditing(false);
    showToast('Notes saved', 'ink');
  };

  // Travel is recorded as a note flag by the booking form. The confirmation
  // email uses it to decide whether to print the studio address, which would
  // send a travel client to entirely the wrong place.
  const travels = /travel|✈/i.test(booking.notes || '');

  // The "are you sure?" dialog locks the page behind itself (ConfirmDialog
  // takes the shared scroll lock), so there's no second lock here.

  // ── The one rule the card enforces ────────────────────────────────────────
  // Nothing is confirmed until step 1 is actually finished.
  //
  // Confirming and setting the time were two independent controls that happened
  // to sit near each other, and the status pills at the bottom of the card were
  // reachable without ever answering "does 3:00 PM work?". So a real bride was
  // confirmed on a day with no time on it, and the only copy of that time was
  // in Roko's head. The status pills now refuse, the bridal consultation send
  // refuses, "confirm now, schedule later" refuses, and the bulk bar on the
  // list refuses. Every route to Confirmed runs through a time.
  //
  // Completed and Cancelled stay open: a timeless booking that never happened
  // still has to be closable.
  const refuseConfirm = () => {
    setTimeHighlight(true);
    showToast('Set the appointment time first', 'pending');
    setTimeout(() => { if (timeSectionRef.current) lenisScrollTo(timeSectionRef.current, { offset: -80 }); }, 40);
    setTimeout(() => setTimeHighlight(false), 3000);
  };

  const handleStatusChange = (s) => {
    if (booking.status === s) return;
    if (s === 'confirmed' && !booking.time) { refuseConfirm(); return; }
    // Bridal: confirming happens by scheduling the consultation, which sends one
    // combined email. Tapping "Confirmed" just opens the scheduler — no status
    // change and no email until "Confirm & Notify Client" is pressed.
    if (isBridal && s === 'confirmed') {
      setConsultExpanded(true);
      setTimeout(() => { if (consultRef.current) lenisScrollTo(consultRef.current, { offset: -80 }); }, 60);
      return;
    }
    // Reset the reason (default text, toggle on) each time the cancel dialog opens.
    if (s === 'cancelled') { setCancelReason(DEFAULT_CANCEL_REASON); setIncludeReason(true); }
    setPendingStatus(s);
  };

  const executeStatusChange = () => {
    const s = pendingStatus === 'reconfirm' ? 'confirmed' : pendingStatus;
    const isReconfirm = pendingStatus === 'reconfirm';
    setPendingStatus(null);
    if (!isReconfirm) onUpdateStatus(s);
    if (s === 'completed') {
      setCelebrate(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.3, x: 0.5 }, colors: ['#F0C27A', '#D4A0B0', '#B8A0D4', '#60A5FA'], scalar: 1.0 });
      setTimeout(() => setCelebrate(false), 2200);
    } else if (s === 'confirmed') {
      showToast(isReconfirm ? 'Reconfirmed, client notified' : 'Appointment confirmed', 'confirmed');
      // Bridal confirmations go out through the combined consultation email, so
      // never fire the standalone confirmation email for them.
      if (booking.email && !isBridal) {
        fetch('/api/send-booking-confirmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, firstName: booking.name?.split(' ')[0] || 'there', serviceName: booking.service, dateFormatted, time: booking.time, travels, bookingId: booking.id }),
        }).catch(err => console.error('confirmed email error:', err));
      }
    } else if (s === 'cancelled') {
      showToast('Cancelled and filed away', 'alert');
      // Cancelling is the end of this card, so it closes itself and hands her
      // back the list the appointment has just left. Staying on a red card that
      // no longer appears anywhere else was the half-finished version of this:
      // the booking was gone from the list behind her and nothing said so.
      setTimeout(() => onBack?.(), 1100);
      if (booking.email) {
        // Reason is optional: toggle off sends none (email stays warm, no reason
        // line); toggle on falls back to the friendly default if she cleared it.
        const reason = includeReason ? ((cancelReason || '').trim() || DEFAULT_CANCEL_REASON) : '';
        fetch('/api/on-booking-cancelled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, name: booking.name?.split(' ')[0] || booking.name || 'there', service: booking.service, date: dateFormatted, reason, bookingId: booking.id }),
        }).catch(err => console.error('cancelled email error:', err));
      }
    }
  };

  const dateFormatted = booking.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const notes = parseBookingNotes(booking.notes);

  // ── Ready-by helpers ──────────────────────────────────────────────────────
  // "Yes, that works" opens an EMPTY picker on purpose: Roko decides her own
  // working window (she usually finishes before the ready-by to leave dress
  // time), so the system never pre-fills or assumes a slot for her.
  const readyByMin = clockToMin(notes.readyBy);
  const apptStartMin = clockToMin(parseRange(booking.time || '').start);
  const apptEndMin = clockToMin(parseRange(booking.time || '').end);
  // Amber signal on the timeline rail when the window runs past their ready-by.
  const runsPastReady = readyByMin != null && apptEndMin != null && apptEndMin > readyByMin;
  const railReady = readyByMin != null && apptStartMin != null && apptEndMin != null;

  // Same-client matcher: email when present, else phone. Booksy imports can be
  // phone-only (email null), and matching on a shared null email would lump
  // every emailless client together as one person's visit history.
  const sameClient = (b) => booking.email
    ? b.email === booking.email
    : booking.phone ? b.phone === booking.phone : b.id === booking.id;
  const totalVisits = allBookings.filter(sameClient).length;
  const completedVisits = allBookings.filter(b => sameClient(b) && b.status === 'completed').length;
  // Sort chronologically: earliest date first, undated last
  const clientBookings = allBookings
    .filter(b => sameClient(b) && b.id !== booking.id)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

  // Full appointment list for this client (including the current one), split
  // into upcoming vs past for the tap-through client profile panel. "Today" is
  // computed in local time so an appointment today never falls into the past.
  const localToday = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();
  const allClientBookings = ((booking.email || booking.phone) ? allBookings.filter(sameClient) : [booking])
    .slice()
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  const isUpcomingAppt = (b) => b.status !== 'cancelled' && b.status !== 'completed' && (!b.date || b.date >= localToday);
  const upcomingBookings = allClientBookings.filter(isUpcomingAppt);
  const pastBookings = allClientBookings.filter(b => !isUpcomingAppt(b)).reverse();

  // Fetch bridal inquiry if this is a bridal booking
  const isBridal = /bridal|bride|wedding|full day/i.test(booking.service || '') && !/non-bridal/i.test(booking.service || '');

  const { data: bridalInquiry, isPending: bridalInquiryPending } = useQuery({
    queryKey: ['bridal-inquiry', booking.upload_token, booking.email],
    queryFn: async () => {
      // The inquiry and its booking share an upload_token — the exact 1:1 link.
      // Fall back to email in case an older booking has no token.
      if (booking.upload_token) {
        const byToken = await api.entities.BridalInquiry.filter({ upload_token: booking.upload_token });
        if (byToken[0]) return byToken[0];
      }
      if (booking.email) {
        // One address can carry several inquiries: a bride who enquired twice,
        // or anyone who ever tested the form. Taking whichever came back first
        // attached the wrong wedding. Prefer the one whose wedding date IS this
        // booking's date, and only then fall back to the most recent.
        const byEmail = await api.entities.BridalInquiry.filter({ email: booking.email });
        if (byEmail.length) {
          const exact = booking.date && byEmail.find(q => q.wedding_date === booking.date);
          if (exact) return exact;
          const newest = [...byEmail].sort(
            (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))
          );
          return newest[0];
        }
      }
      return null;
    },
    enabled: isBridal && (!!booking.upload_token || !!booking.email),
  });
  // With nothing to match on, the query never runs and stays `pending` forever —
  // which would silently hide the "no inquiry linked" notice in exactly the case
  // that guarantees there isn't one. Treat that as settled-and-empty.
  const bridalInquiryMissing = isBridal && !bridalInquiry
    && (!bridalInquiryPending || (!booking.upload_token && !booking.email));

  // Derived bridal values for the redesigned details block
  const biWedding = bridalInquiry?.wedding_date && bridalInquiry.wedding_date !== 'partial'
    ? new Date(bridalInquiry.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  // A trial's `wedding_date` is really the TRIAL date (it's whatever she picked
  // on the calendar), so the card labels it honestly rather than calling it the
  // wedding date.
  const isTrialBooking = /trial/i.test(booking.service || '');
  const biPreferred = bridalInquiry?.preferred_date
    ? new Date(bridalInquiry.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })
    : null;
  const biBrideName = bridalInquiry
    ? `${bridalInquiry.bride_name || ''}${bridalInquiry.soon_to_be_last_name ? ` ${bridalInquiry.soon_to_be_last_name}` : ''}`.trim()
    : '';
  const biOos = bridalInquiry?.out_of_state === true || bridalInquiry?.out_of_state === 'true';
  const biOosLabel = bridalInquiry && [true, false, 'true', 'false'].includes(bridalInquiry.out_of_state)
    ? (biOos ? 'Yes, out of state' : 'No, local')
    : null;

  // ── The client's morning, beside Roko's window ────────────────────────────
  // The inquiry answers who else is in the room and when, but that lived only
  // in the emailed copy — so the card showed "5:00 AM – 7:00 AM" with nothing
  // saying why 5:00. Roko's read of her own booking shouldn't require digging
  // up an email. Everything the bride answered about the day's timing goes on
  // one rail right under the window, in the order it happens.
  const dayTimeline = [
    { label: 'Venue access', time: bridalInquiry?.venue_access_time },
    { label: 'Hairstylist arrives', time: bridalInquiry?.ready_by_time },
    { label: isTrialBooking ? 'Preferred time' : 'Event starts', time: bridalInquiry?.event_start_time },
    { label: 'Photographer arrives', time: bridalInquiry?.photographer_arrival_time },
  ]
    .filter(s => s.time)
    .map(s => ({ ...s, min: clockToMin(s.time) }))
    .sort((a, b) => (a.min ?? 1e9) - (b.min ?? 1e9));
  // Roko's own start is the anchor: anything the bride expects BEFORE she's
  // finished is something to work around, and that's the whole point of showing
  // it. `mine` marks her window inline so the rail reads as one morning.
  const dayRail = apptStartMin != null && apptEndMin != null
    ? [...dayTimeline, { label: 'You start', time: parseRange(booking.time).start, min: apptStartMin, mine: true }]
      .sort((a, b) => (a.min ?? 1e9) - (b.min ?? 1e9))
    : dayTimeline;

  // ── Bridal pipeline: where the consultation scheduler lives ───────────────
  // Once a bridal booking has a working window, confirming + the consultation
  // render INSIDE the Appointment hub (right where "what do I do next?" is
  // asked) instead of at the bottom of the card. Completed/cancelled bookings
  // keep the scheduler at the bottom like everything else.
  const schedulerInHub = isBridal && !!booking.time && (booking.status === 'pending' || booking.status === 'confirmed');

  // Non-bridal runs the same guided flow, minus the consultation: step 1 set
  // the time, step 2 confirm. Confirming lived only in the status pills at the
  // bottom of the card, so setting a time left you with "now what?" and a
  // scroll. Putting step 2 in the Appointment panel means finishing one step
  // leads straight into the next, the way bridal already works.
  const confirmInHub = !isBridal && !!booking.time && booking.status === 'pending';

  // Step markers only while a pipeline is actually running. Bridal's continues
  // past confirmation (the consultation still has to be booked); non-bridal's
  // ends there, so numbering a confirmed one would imply unfinished work.
  const showSteps = isBridal || booking.status === 'pending';

  // A booking can reach Confirmed with no time on it: confirming and setting the
  // time are separate steps and nothing ever insisted on the order. It happened
  // on the first real bride, whose time lived in Roko's head rather than on the
  // card. So while a time is still missing, the Appointment box says so in
  // colour rather than looking as settled as every other section. Completed and
  // cancelled are excluded, since there is nothing left to set on either.
  const needsTime = !booking.time
    && booking.status !== 'cancelled' && booking.status !== 'completed';

  // "Confirm now, schedule the consultation later": sends the confirmation
  // email (minus the consultation panel) so Roko can lock the date before a
  // consult time is agreed. The hub keeps a standing reminder until it's set.
  const [confirmLaterOpen, setConfirmLaterOpen] = useState(false);
  const [confirmLaterSending, setConfirmLaterSending] = useState(false);
  const confirmNowScheduleLater = async () => {
    if (confirmLaterSending) return;
    // Same rule as everywhere else: this one confirms too.
    if (!booking.time) { setConfirmLaterOpen(false); refuseConfirm(); return; }
    setConfirmLaterSending(true);
    try {
      const res = await fetch('/api/confirm-bridal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id, clientEmail: booking.email, clientName: booking.name,
          serviceName: booking.service, dateFormatted, time: booking.time, confirmOnly: true,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to send'); }
      onUpdateBooking({ status: 'confirmed' });
      setConfirmLaterOpen(false);
      showToast('Confirmed, client notified', 'confirmed');
    } catch (err) {
      alert(`Couldn't send the confirmation (${err?.message || 'unknown error'}). Please try again.`);
    } finally {
      setConfirmLaterSending(false);
    }
  };

  // One scheduler instance, rendered either in the hub or at the bottom —
  // never both — so its open/closed state survives the move.
  const consultScheduler = (
    <ConsultationScheduler
      booking={booking}
      onUpdateBooking={onUpdateBooking}
      dm={dm}
      bridal={isBridal}
      confirmed={booking.status === 'confirmed'}
      dateFormatted={dateFormatted}
      expanded={consultExpanded}
      setExpanded={setConsultExpanded}
      onDraftChange={handleConsultDraft}
      onBlockedByTime={refuseConfirm}
      renderDayPeek={(d, t) => (!showSchedule && d ? (
        <DayPeek
          dateKey={d}
          bookings={allBookings}
          classRegs={classRegs}
          consultInk={CONSULT_INK[dm ? 'dark' : 'light']}
          excludeConsultOf={booking.id}
          draftTime={t}
          onOpenFull={() => { setScheduleDay(d); setShowSchedule(true); }}
        />
      ) : null)}
      onSent={() => showToast(
        booking.consultation_date ? 'Rescheduled, client notified'
          : isBridal && booking.status !== 'confirmed' ? 'Confirmed, client notified'
          : 'Consultation scheduled, client notified',
        'ink')}
    />
  );

  // Signed service agreement (contract) shown on the booking.
  const contractOverrides = useContractOverrides();
  const fmtSignedAt = (iso) => (iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null);
  const contractSignedAt = fmtSignedAt(booking.contract_signed_at);
  const resignRequestedAt = fmtSignedAt(booking.contract_resign_requested_at);

  // A re-sign is outstanding when the request is newer than the signature on
  // file. Derived rather than a stored flag, so a second request re-opens the
  // waiting state on its own and nothing can get stuck showing "signed".
  // updateNoticeSent flips it the instant she hits send, before the row is
  // refetched, so the panel reacts immediately instead of a beat later.
  const awaitingResign = updateNoticeSent || (!!booking.contract_resign_requested_at
    && (!booking.contract_signed_at
      || new Date(booking.contract_resign_requested_at) > new Date(booking.contract_signed_at)));

  // Every signature oldest-first, with the one on file last, so the panel can
  // lay out the whole chain (original → re-signed) with real timestamps.
  const signatureChain = [
    ...(Array.isArray(booking.contract_signature_history) ? booking.contract_signature_history : []),
    ...(booking.contract_signed_at ? [{
      name: booking.contract_signed_name,
      signed_at: booking.contract_signed_at,
      photo_consent: booking.contract_photo_consent,
      version: booking.contract_version,
      signed_for: booking.contract_signed_for,
    }] : []),
  ];
  const hasResignHistory = signatureChain.length > 1;

  // Re-render the signed agreement in a print window (Save as PDF). Rebuilds the
  // contract from the booking so it always matches the signed version + terms.
  const printAgreement = () => {
    const onLocation = isBridal || /travel|✈️/i.test(booking.notes || '');
    const c = buildContract({
      clientName: booking.contract_signed_name || booking.name,
      serviceName: booking.service,
      dateFormatted,
      time: booking.time || '',
      locationType: onLocation ? 'onlocation' : 'studio',
      kind: 'appointment',
      overrides: contractOverrides,
    });
    const esc = (s) => String(s ?? '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    const sections = c.sections.map((s, i) => `<h3 style="font-size:13px;margin:16px 0 4px;">${i + 1}. ${esc(s.heading)}</h3><p style="font-size:12px;line-height:1.6;color:#333;margin:0;">${esc(s.body)}</p>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Service Agreement · ${esc(booking.name)}</title>
      <style>body{font-family:Georgia,'Times New Roman',serif;max-width:680px;margin:40px auto;padding:0 24px;color:#111;}h1{font-size:22px;} .sig{margin-top:24px;padding:16px;border:1px solid #ddd;border-radius:8px;background:#faf6f8;} .sig p{margin:4px 0;font-size:12px;} .name{font-style:italic;font-size:18px;} @media print{body{margin:0;}}</style></head>
      <body onload="window.print()">
        <h1>Service Agreement</h1>
        <p style="font-size:12px;line-height:1.6;color:#333;">${esc(c.intro)}</p>
        ${sections}
        <div class="sig">
          <p style="text-transform:uppercase;letter-spacing:0.1em;font-size:10px;color:#a06;">Signature</p>
          <p class="name">${esc(booking.contract_signed_name || '')}</p>
          <p>Signed electronically${contractSignedAt ? ` on ${esc(contractSignedAt)}` : ''} · Agreement ${esc(booking.contract_version || c.version)}</p>
          <p>Photo permission: <strong>${booking.contract_photo_consent === true ? 'Yes, may post' : booking.contract_photo_consent === false ? 'No, keep private' : 'Not specified'}</strong></p>
        </div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Scroll to top when detail view mounts. Lenis owns the scroll position
  // site-wide, so we must reset Lenis too — a plain window.scrollTo is ignored.
  useEffect(() => {
    const toTop = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      lenisScrollTo(0, { immediate: true });
    };
    toTop();
    const raf = requestAnimationFrame(toTop);
    const t = setTimeout(toTop, 60); // after the new (shorter) content lays out
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    // Re-run when switching straight to another client's card (e.g. from the My
    // Schedule drawer) so the new card opens at the top, not mid-scroll.
  }, [booking.id]);

  const handleSaveEdit = (data) => {
    // Capture material changes before the booking is overwritten, so the
    // "review & notify" flow can describe exactly what changed.
    const changes = [];
    if (data.date && data.date !== booking.date) {
      changes.push({ key: 'date', label: 'Date', to: new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) });
    }
    if (data.time && data.time !== booking.time) {
      changes.push({ key: 'time', label: 'Appointment time', to: data.time });
    }
    if (data.service && data.service !== booking.service) {
      changes.push({ key: 'service', label: 'Service', to: data.service });
    }
    onUpdateBooking(data);
    setShowEdit(false);
    const newStatus = data.status;
    const oldStatus = booking.status;
    if (newStatus !== oldStatus && booking.email) {
      const editDate = data.date
        ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : dateFormatted;
      if (newStatus === 'confirmed' && !isBridal) {
        showToast('Appointment confirmed', 'confirmed');
        fetch('/api/send-booking-confirmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, firstName: (data.name || booking.name)?.split(' ')[0] || 'there', serviceName: data.service || booking.service, dateFormatted: editDate, time: data.time || booking.time, travels, bookingId: booking.id }),
        }).catch(err => console.error('confirmed email error:', err));
      } else if (newStatus === 'cancelled') {
        showToast('Appointment cancelled', 'alert');
        fetch('/api/on-booking-cancelled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, name: (data.name || booking.name)?.split(' ')[0] || 'there', service: data.service || booking.service, date: editDate, bookingId: booking.id }),
        }).catch(err => console.error('cancelled email error:', err));
      }
    } else if (changes.length && oldStatus === 'confirmed' && booking.email) {
      // Details changed on a confirmed booking (status itself didn't change) →
      // guide Roko into the review & notify flow instead of a silent update.
      setUpdateNoticeSent(false);
      setLastChange({ items: changes });
      setShowReconfirmBanner(true);
      setTimeout(() => { if (timeSectionRef.current) lenisScrollTo(timeSectionRef.current, { offset: -80 }); }, 80);
    }
  };

  const heroDate = booking.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date set';
  const bookedOn = booking.created_date
    ? new Date(booking.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const roseAccent = ROSE_HEX[dm ? 'dark' : 'light'];

  // ── Layout ─────────────────────────────────────────────────────────────────
  // On a wide laptop the card splits the way Mission Paradise's booking page
  // does: the work on the left (the time, the pipeline, notes, status), the
  // file on the right (who she is, the paperwork, the money, the emails).
  // Anything narrower is one column in the card's long-standing order, which
  // puts the contact details first, where a phone wants them: every section
  // carries its place in that order (`slot`), and the two column wrappers step
  // aside (display: contents) so the sections interleave. With the schedule
  // drawer docked the card is too narrow to split, so the columns stack
  // instead, and the Appointment box she just opened the drawer from stays
  // where it was rather than dropping below the contact panel.
  const layout = viewportW < 1280 ? 'one' : (showSchedule && docked ? 'stack' : 'split');
  const column = layout === 'one' ? 'contents' : 'flex min-w-0 flex-col gap-4';
  const slot = (n) => ({ order: n, '--i': Math.min(n, 6) });

  const printButton = (
    <button type="button" onClick={printAgreement}
      className="press inline-flex min-h-[36px] items-center gap-2 rounded-ctl border border-line-strong bg-paper px-3.5 py-2 text-left text-[0.8rem] font-medium text-ink hover:border-ink/50 max-sm:min-h-[44px]">
      <Icon name="download" className="h-3.5 w-3.5" />
      View / print agreement (save as PDF)
    </button>
  );

  const hasContact = !!(booking.email || booking.phone);
  const showClientLocation = !!booking.location && !bridalInquiry?.event_location;

  // No transition on the margin below: the card used to animate its own width
  // for 300ms while the drawer slid in, re-laying out this whole card every
  // frame, and that was the choppiness. The width change lands in one go now
  // and only the drawer animates, on the compositor.
  return (
    <div className="mx-auto max-w-[1100px]"
      style={{ marginRight: showSchedule && docked ? scheduleW + 20 : undefined }}>
      {/* ── The header ────────────────────────────────────────────────────────
          Calm on purpose. The status used to be a full-width banner in its own
          saturated colour, with the start and date on a card floating over it.
          It's the badge now, beside the name, and colour is kept for the parts
          of the card that still want something from her. */}
      <header className="rise-in mb-6 sm:mb-8">
        {/* Back. A phone has Back in its top bar while a card is open, so this
            one is for the laptop, where there is no bar. */}
        <div className="-mx-2 mb-2 hidden lg:flex">
          <button type="button" onClick={onBack} aria-label="Back to list"
            className="group inline-flex h-11 items-center gap-1.5 px-2 text-[0.86rem] text-ink-muted transition-colors duration-200 hover:text-ink">
            <Icon name="back" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={1.8} />
            Back
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <StatusBadge status={booking.status || 'pending'} />
          {isBridal && <Tag className="bg-rose/10 text-rose">Bridal</Tag>}
          {booking.source === 'booksy' && <Tag title="Imported from Booksy">Booksy import</Tag>}
          <span className="text-[0.74rem] tabular-nums text-ink-muted">
            ID {String(booking.id || '').slice(0, 8).toUpperCase()}{bookedOn ? ` · Booked ${bookedOn}` : ''}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            {/* The name opens the client's profile. data-bar-title lets the
                phone's top bar take the name over once it scrolls away. */}
            <h1 data-bar-title={booking.name || 'Client'} className="text-balance text-[clamp(1.6rem,4vw,2.2rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-ink">
              <button type="button" onClick={() => setShowClientPanel(true)} className="group text-left">
                {booking.name || 'Client'}
                <span className="sr-only">, open profile</span>
                <Icon name="right" className="ml-1 inline h-5 w-5 -translate-y-px text-ink-muted/60 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
            </h1>
            {booking.service && <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">{booking.service}</p>}
            <p className={cx('text-[0.92rem] leading-relaxed text-ink-muted', !booking.service && 'mt-2')}>
              {/* The date and time open the Appointment box, the one place
                  either of them is changed. */}
              <button type="button"
                onClick={() => {
                  openTimePicker();
                  setTimeout(() => { if (timeSectionRef.current) lenisScrollTo(timeSectionRef.current, { offset: -80 }); }, 60);
                }}
                className="text-left tabular-nums underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-ink hover:decoration-line-strong">
                {heroDate}{' · '}
                {booking.time ? booking.time : <span className="font-medium text-tone-pending">Set time</span>}
              </button>
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            {booking.email && !showCompose && (
              <Button icon={MailIcon} onClick={openCompose} className="max-sm:h-11">
                Message client
              </Button>
            )}
            <Button icon={PencilIcon} onClick={() => setShowEdit(true)} className={cx('max-sm:h-11', !(booking.email && !showCompose) && 'col-span-2')}>
              Edit
            </Button>
          </div>
        </div>
      </header>

      <div className={layout === 'split'
        ? 'grid grid-cols-[minmax(0,1fr)_320px] items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]'
        : 'flex flex-col gap-4'}>

        {/* ── The work ────────────────────────────────────────────────────── */}
        <div className={column}>

          {/* Contact composer: Roko's personal email, sent as roko@makeupbyroko.org */}
          {showCompose && (
            <section ref={composeRef} className="rise-in rounded-card border border-line bg-paper" style={slot(3)}>
              <header className="flex items-center gap-3 border-b border-line py-1.5 pl-4 pr-1.5 sm:pl-5">
                <div className="min-w-0 flex-1 py-1.5">
                  <h2 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">Message client</h2>
                  <p className="mt-0.5 truncate text-[0.74rem] text-ink-muted">
                    To <span className="font-medium text-ink">{booking.email}</span> · sends from roko@makeupbyroko.org
                  </p>
                </div>
                <IconButton label="Close composer" onClick={() => setShowCompose(false)} className="text-ink-muted hover:text-ink">
                  <Icon name="close" className="h-4 w-4" strokeWidth={1.9} />
                </IconButton>
              </header>

              <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
                {/* Date/time changes don't live here, so route her to the one panel. */}
                <button type="button" onClick={() => { setShowCompose(false); openTimePicker(); }}
                  className="press inline-flex min-h-[36px] items-center gap-2 self-start rounded-ctl bg-canvas px-3 py-2 text-left text-[0.8rem] font-medium text-ink-soft hover:text-ink">
                  <Icon name="calendar" className="h-3.5 w-3.5" />
                  Changing the date or time? Do it here
                  <Icon name="right" className="h-3.5 w-3.5" />
                </button>

                <label className="block">
                  <Label className="mb-1.5 block">Subject</Label>
                  <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} className={inputClass} />
                </label>

                <label className="block">
                  <Label className="mb-1.5 block">Message</Label>
                  <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={7}
                    placeholder="Write your message…"
                    className={cx(inputClass, 'h-auto min-h-[150px] resize-y py-2.5 leading-relaxed')} />
                  <span className="mt-1.5 block text-[0.74rem] text-ink-muted">Sent on your branded template. Line breaks are kept.</span>
                </label>

                {/* Attach updated agreement, for scope changes that aren't date
                    or time (a date/time change re-signs from the Appointment panel). */}
                <CheckRow checked={attachContract} onClick={() => setAttachContract(a => !a)} title="Attach updated Service Agreement">
                  For a service, location, or price change. Adds a Review &amp; Sign link so their agreement matches. (Date or time changes re-sign from the Appointment panel.)
                </CheckRow>

                <div className="flex gap-2 pt-1">
                  <Button size="lg" onClick={() => setShowCompose(false)}>
                    Cancel
                  </Button>
                  <Button variant="solid" size="lg" onClick={sendCompose} disabled={sending} className="flex-1">
                    {sending
                      ? <><Spinner /> Sending…</>
                      : <><Icon name="send" className="h-4 w-4" />{attachContract ? 'Send email + agreement' : 'Send email'}</>}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Update-sent indicator. The booking stays confirmed the whole time.
              Driven by awaitingResign so it survives a refresh: before, this was
              local-only state and the waiting phase vanished on reload. The fresh
              signature appears in the Service Agreement panel once the client
              re-signs; no bounce back to pending. */}
          {awaitingResign && !showCompose && (
            <div className="rise-in flex items-start gap-3 border border-tone-confirmed/25 bg-tone-confirmed/[0.04] px-4 py-3.5 sm:px-5" style={slot(4)}>
              <Icon name="send" className="mt-0.5 h-4 w-4 text-tone-confirmed" />
              <p className="text-[0.86rem] leading-relaxed text-ink-soft">
                Update sent to {firstName}, awaiting their quick re-sign. Their booking stays confirmed the whole time, and the new signature shows up under Service agreement once they sign.
              </p>
            </div>
          )}

          {/* ── Appointment hub ───────────────────────────────────────────────
              One always-visible place for everything about timing: the
              appointment window, what the client asked to be ready by, and the
              next step of the pipeline. Changing the time and opening the day
              schedule both live here, so there's no separate time section
              further down the card.

              While a time is still missing the box wears a pending wash instead
              of looking as settled as every other section. The stronger wash
              only appears for a few seconds, right after something was refused
              for want of a time: she has just been scrolled here from somewhere
              else on the card, so the box has to say "this one" without her
              hunting for it. */}
          <section ref={timeSectionRef} style={slot(5)}
            className={cx(
              'rise-in border bg-paper transition-colors duration-300',
              timeHighlight ? 'border-tone-pending/70' : needsTime ? 'border-tone-pending/30' : 'border-line',
            )}>
            {/* Narrow screens stack the title above the buttons: side by side
                they overflow and the button text wraps mid word. Stacked, each
                gets a full-size tap target. */}
            <header className={cx(
              'flex flex-col gap-3 border-b px-4 py-3 transition-colors duration-300 sm:min-h-[56px] sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-5',
              needsTime || timeHighlight ? 'border-tone-pending/20' : 'border-line',
              timeHighlight ? 'bg-tone-pending/[0.12]' : needsTime ? 'bg-tone-pending/[0.05]' : '',
            )}>
              <h2 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">Appointment</h2>
              <div className="flex items-center gap-2">
                {/* Her day, one tap from the time she's setting. It stays in
                    this same spot in every state of the box (deciding, picking,
                    already set) so it never moves out from under her. */}
                <Button size="sm" icon={CalendarIcon} onClick={toggleSchedule} aria-label="My Schedule" aria-expanded={showSchedule} title="See your day side by side"
                  className={cx('max-sm:h-11', showSchedule && 'bg-canvas')}>
                  My Schedule
                </Button>
                {/* Clear. It stands on its own rather than only existing inside
                    the picker: a time can go on by mistake and the fix is
                    "there shouldn't be one", not "pick another". Icon only, so
                    a small corrective action doesn't read as a third headline
                    button. */}
                {!showTimePicker && booking.time && (
                  <button type="button" onClick={clearTime} aria-label="Clear the time" title="Clear the time"
                    className={SQUARE}>
                    <Icon name="clear" className="h-[15px] w-[15px]" strokeWidth={1.9} />
                  </button>
                )}
                {!showTimePicker && !(readyByMin != null && !booking.time) && (
                  <Button size="sm" variant={booking.time ? 'quiet' : 'solid'} icon={PencilIcon} onClick={() => openTimePicker()} className="flex-1 max-sm:h-11 sm:flex-none">
                    {booking.time ? 'Change time' : 'Set time'}
                  </Button>
                )}
                {showTimePicker && (
                  <IconButton label="Close" onClick={() => setShowTimePicker(false)} className="-my-1 -mr-2.5 ml-auto text-ink-muted hover:text-ink sm:ml-0">
                    <Icon name="close" className="h-4 w-4" strokeWidth={1.9} />
                  </IconButton>
                )}
              </div>
            </header>

            {/* Undo. Sits directly under the header so it's part of the box she
                just changed, not a toast that's already gone by the time she
                realises she picked the wrong hour. */}
            {undoTime && !showTimePicker && (
              <div className="flex items-center gap-2 border-b border-line bg-canvas/60 pl-4 pr-0.5 sm:pl-5">
                <Icon name="undo" className="h-3.5 w-3.5 text-ink-muted" strokeWidth={2} />
                <p className="min-w-0 flex-1 truncate text-[0.8rem] leading-snug text-ink-muted">
                  Was <span className="tabular-nums">{undoWasLabel}</span>
                  {undoTime.emailed && <span> · {firstName} was emailed the new time</span>}
                </p>
                <button type="button" onClick={undoTimeChange}
                  className="press h-9 shrink-0 rounded-ctl px-2.5 text-[0.8rem] font-semibold text-rose hover:bg-rose/10">
                  Undo
                </button>
                {/* Dismiss: she's happy with the change and doesn't want the row
                    sitting there for the rest of the day. */}
                <IconButton label="Dismiss" onClick={() => { setUndoTime(null); clearUndo(booking.id); }} className="text-ink-muted hover:text-ink">
                  <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2} />
                </IconButton>
              </div>
            )}

            {!showTimePicker ? (
              readyByMin != null && !booking.time ? (
                /* ── Decision row: no time yet, but the client said when they
                   want to be ready. Lead with the question, not two neutral
                   facts: "does that work?" is the actual decision. ── */
                <div className="px-4 py-5 sm:px-5">
                  {showSteps && <StepHead n={1} state="active" className="mb-4">Set the time</StepHead>}
                  <p className="text-[1.15rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
                    {firstName} wants to be ready by <span className="tabular-nums text-rose">{notes.readyBy}</span>
                  </p>
                  {booking.date && (
                    <p className="mt-1 text-[0.8rem] tabular-nums text-ink-muted">{fmtLong(booking.date)}</p>
                  )}
                  <p className="mt-3 text-[0.98rem] font-semibold text-ink-soft">Does that work for you?</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button variant="solid" size="lg" onClick={() => openTimePicker('', { allowNotify: false })}>
                      Yes
                    </Button>
                    <Button size="lg" onClick={() => openTimePicker('', { notify: true })}>
                      No, pick another time
                    </Button>
                  </div>
                  {showSteps && (
                    <div className="mt-5 flex items-center gap-2.5 border-t border-line pt-4">
                      <StepDot n={2} state="todo" />
                      <span className="text-[0.8rem] text-ink-muted">
                        {isBridal ? <>Then: confirm &amp; schedule the consultation</> : <>Then: confirm &amp; notify {firstName}</>}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
              <>
                {railReady ? (
                  /* ── Step 1 done: her working window as a simple start to
                     done rail. The ready-by sits beside it as the client's
                     ask: context, not part of Roko's working time. ── */
                  <div className="px-4 py-5 sm:px-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      {showSteps && <StepDot n={1} state="done" />}
                      <Label>Your time</Label>
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <p className="text-[1.05rem] font-semibold leading-tight tabular-nums text-ink">{parseRange(booking.time).start}</p>
                          <p className="mt-1 text-[0.74rem] text-ink-muted">You start</p>
                        </div>
                        <div className="flex shrink-0 items-center" aria-hidden="true">
                          <span className="h-2 w-2 rounded-full bg-rose" />
                          <span className="mx-1 h-px w-10 bg-rose" />
                          <span className="h-2 w-2 rounded-full bg-rose" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[1.05rem] font-semibold leading-tight tabular-nums text-ink">{parseRange(booking.time).end}</p>
                          <p className="mt-1 text-[0.74rem] text-ink-muted">You&apos;re done</p>
                        </div>
                      </div>
                      <div className="border-t border-line pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
                        <p className={cx('text-[1.05rem] font-semibold leading-tight tabular-nums', runsPastReady ? 'text-tone-pending' : 'text-rose')}>Ready by {notes.readyBy}</p>
                        <p className="mt-1 text-[0.74rem] text-ink-muted">what {firstName} asked for</p>
                      </div>
                    </div>
                    {runsPastReady && (
                      <p className="mt-3 text-[0.8rem] font-medium text-tone-pending">
                        Heads up: this ends after the {notes.readyBy} ready-by.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-5">
                    {/* The window, and beside it the ready-by, so the two read together. */}
                    <div className="min-w-0">
                      <Label>Time</Label>
                      <p className={cx('mt-1.5 text-[1.05rem] font-semibold leading-tight tabular-nums', booking.time ? 'text-ink' : 'text-ink-muted')}>
                        {booking.time || 'Not set yet'}
                      </p>
                    </div>
                    {notes.readyBy ? (
                      <div className="min-w-0">
                        <Label>Wants to be ready by</Label>
                        <p className="mt-1.5 text-[1.05rem] font-semibold leading-tight tabular-nums text-ink">{notes.readyBy}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* ── Their morning ────────────────────────────────────────
                    Why the window starts when it does. Roko sets her time
                    around the hairstylist and the venue, so those answers
                    belong beside the window rather than in an email she'd
                    have to go find. Her own start sits in the sequence, in
                    rose, so the whole morning reads in one pass. */}
                {isBridal && dayRail.length > (apptStartMin != null ? 1 : 0) && (
                  <div className="border-t border-line px-4 py-4 sm:px-5">
                    <Label className="mb-3 block">{firstName}&apos;s morning</Label>
                    <ol className="flex flex-wrap gap-x-6 gap-y-3">
                      {dayRail.map((s, i) => (
                        <li key={i} className="flex min-w-0 items-start gap-2">
                          <span className={cx('mt-[0.42rem] h-1.5 w-1.5 shrink-0 rounded-full', s.mine ? 'bg-rose' : 'bg-line-strong')} />
                          <div className="min-w-0">
                            <p className={cx('text-[0.86rem] font-semibold leading-tight tabular-nums', s.mine ? 'text-rose' : 'text-ink')}>{s.time}</p>
                            <p className="mt-0.5 text-[0.74rem] leading-tight text-ink-muted">{s.label}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* What it's for, then travel / early-arrival flags. The
                    occasion is a fact about the booking, not a warning, so it
                    wears the rose rather than the amber: two engagements and a
                    baby shower on the same page should read as three different
                    mornings at a glance. */}
                {(notes.occasion || notes.flags.length > 0) && (
                  <div className={cx('flex flex-wrap gap-2 px-4 pb-5 sm:px-5', isBridal && dayRail.length > (apptStartMin != null ? 1 : 0) ? 'pt-0' : '-mt-1')}>
                    {notes.occasion && (
                      <span className="inline-flex h-7 items-center gap-1.5 bg-rose/10 px-2.5 text-[0.74rem] font-medium text-rose">
                        <Icon name="gift" className="h-3 w-3" />
                        {notes.occasion}
                      </span>
                    )}
                    {notes.flags.map((f, i) => (
                      <span key={i} className="inline-flex h-7 items-center px-2.5 text-[0.74rem] font-medium text-ink-soft shadow-[inset_0_0_0_1px_rgb(var(--c-line-strong))]">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </>
              )
            ) : (
              /* ── The ONE reschedule panel: pick the date + window, optionally
                 notify the client (note + agreement). One button does it all. ── */
              <div className="px-4 py-5 sm:px-5">
                {notes.readyBy && (
                  <div className="mb-5 bg-canvas px-4 py-3">
                    <p className="text-[0.92rem] font-semibold leading-snug text-ink">
                      {firstName} wants to be ready by <span className="tabular-nums text-rose">{notes.readyBy}</span>
                    </p>
                    {booking.date && (
                      <p className="mt-0.5 text-[0.74rem] tabular-nums text-ink-muted">{fmtLong(booking.date)}</p>
                    )}
                  </div>
                )}

                {/* Date: quiet by default; most reschedules are time-only */}
                <div className="mb-5">
                  <Label className="mb-2 block">
                    Date {pendingDate && pendingDate !== booking.date && <span className="font-medium normal-case tracking-normal tabular-nums text-rose">· moving to {fmtShort(pendingDate)}</span>}
                  </Label>
                  <AdminDatePicker value={pendingDate} onChange={onPickDate} dm={dm} accent={roseAccent} />
                </div>

                <Label className="mb-2 block">Time</Label>
                <TimeWindowPicker value={pendingWindow} onChange={onPickWindow} slots={APPT_TIMES} dm={dm} accent={roseAccent} />

                {/* Notify the client. Hidden on the "yes, that works" path
                    (nothing to tell them); pre-flipped for everything else. */}
                {allowNotify && (
                  <div className={cx('mt-5 border transition-colors duration-200', notifyClient && booking.email ? 'border-ink/25' : 'border-line')}>
                    <button type="button" role="switch" aria-checked={notifyClient} onClick={() => booking.email && setNotifyClient(v => !v)}
                      className={cx('flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3 text-left', booking.email ? 'cursor-pointer' : 'cursor-default')}>
                      <span className="min-w-0">
                        <span className="block text-[0.86rem] font-semibold text-ink">Email {firstName} about this change</span>
                        <span className="mt-0.5 block text-[0.74rem] text-ink-muted">
                          {!booking.email ? 'No email on file, so it just updates quietly.'
                            : notifyClient ? 'They get your note below with the new date & time.'
                            : 'Off. It updates quietly, no email.'}
                        </span>
                      </span>
                      <Switch on={notifyClient} disabled={!booking.email} />
                    </button>

                    <Fold open={notifyClient && !!booking.email}>
                      <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
                        <label className="block">
                          <Label className="mb-1.5 block">Subject</Label>
                          <input value={panelSubject} onChange={e => { setPanelSubject(e.target.value); setPanelEdited(true); }} className={inputClass} />
                        </label>
                        <label className="block">
                          <Label className="mb-1.5 block">
                            Message <span className="font-normal normal-case tracking-normal text-ink-muted/80">(written for you, edit freely)</span>
                          </Label>
                          <textarea value={panelBody} onChange={e => { setPanelBody(e.target.value); setPanelEdited(true); }} rows={6}
                            className={cx(inputClass, 'h-auto min-h-[130px] resize-y py-2.5 leading-relaxed')} />
                        </label>
                        <CheckRow checked={panelAttach} onClick={togglePanelAttach} title="Attach updated Service Agreement">
                          They review &amp; sign with the new date &amp; time, and everything stays confirmed.
                        </CheckRow>
                      </div>
                    </Fold>
                  </div>
                )}

                {/* Emptying the window used to dead-end on a disabled button.
                    Now it's the way to say "no time at all", so Clear leads
                    somewhere instead of just undoing your own tap. */}
                <button
                  type="button"
                  disabled={(!pendingStart && !booking.time) || panelSending}
                  onClick={!pendingStart && booking.time ? clearTime : commitChange}
                  className={cx(
                    'press mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-ctl px-4 py-3 text-center text-[0.92rem] font-semibold disabled:pointer-events-none',
                    pendingStart || booking.time ? 'bg-ink text-paper hover:bg-ink/85' : 'bg-canvas text-ink-muted',
                    panelSending && 'opacity-70',
                  )}
                >
                  {panelSending
                    ? <><Spinner /> Sending…</>
                    : !pendingStart
                      ? (booking.time ? 'Leave this appointment with no time' : 'Tap a start time above')
                      : (() => {
                          const dateMoved = pendingDate && pendingDate !== booking.date;
                          const willEmail = allowNotify && notifyClient && booking.email && (dateMoved || pendingWindow !== booking.time);
                          return <span>Set to <span className="tabular-nums">{dateMoved ? `${fmtShort(pendingDate)} · ` : ''}{pendingWindow}</span>{willEmail ? <>&nbsp;&amp; email {firstName}</> : ''}</span>;
                        })()}
                </button>
              </div>
            )}

            {/* ── Step 2, non-bridal ────────────────────────────────────────
                Same shape as bridal's next-step block, one stop shorter: no
                consultation to book, so the time leads straight to confirming.
                One tap here does what the status buttons at the bottom do, via
                the same code path, so the email and toast stay identical. ── */}
            {confirmInHub && !showTimePicker && (
              <div className="border-t border-line px-4 py-5 sm:px-5">
                <StepHead n={2} state="active">Confirm</StepHead>
                <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-muted">
                  {booking.email
                    ? <>Time&apos;s set. Confirming emails {firstName} the details and locks it in.</>
                    : <>Time&apos;s set. No email on file, so confirming just locks it in here.</>}
                </p>
                <Button variant="solid" size="lg" onClick={() => setPendingStatus('confirmed')} className="mt-4 w-full">
                  {booking.email ? <>Confirm &amp; notify {firstName}</> : 'Confirm appointment'}
                </Button>
              </div>
            )}

            {/* ── Next step, right in the flow ──────────────────────────────
                Bridal with a working window set: confirming + the consultation
                live HERE, so finishing the time leads straight into the next
                thing instead of a scroll hunt to the bottom of the card. ── */}
            {schedulerInHub && !showTimePicker && (
              <div ref={consultRef} className="border-t border-line px-4 py-5 sm:px-5">
                {booking.status === 'pending' ? (
                  <>
                    <StepHead n={2} state="active">Confirm &amp; consultation</StepHead>
                    <div className="mt-3">{consultScheduler}</div>
                    {!consultExpanded && booking.email && !confirmLaterOpen && (
                      <button type="button" onClick={() => setConfirmLaterOpen(true)}
                        className="mt-3 min-h-[36px] text-[0.8rem] font-medium text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
                        or confirm now, pick a time later
                      </button>
                    )}
                    <Fold open={!consultExpanded && confirmLaterOpen}>
                      <div className="mt-3 rounded-ctl border border-line bg-canvas/60 p-4">
                        <p className="text-[0.92rem] font-semibold text-ink">Confirm without a consultation time?</p>
                        <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-muted">
                          One email goes to <span className="font-medium text-ink">{booking.email}</span> right now with the confirmation and photo upload link. This card will keep reminding you to schedule the consultation.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button size="lg" onClick={() => setConfirmLaterOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="solid" size="lg" onClick={confirmNowScheduleLater} disabled={confirmLaterSending}>
                            {confirmLaterSending ? <><Spinner /> Sending…</> : 'Yes, confirm & send'}
                          </Button>
                        </div>
                      </div>
                    </Fold>
                  </>
                ) : !booking.consultation_date ? (
                  <>
                    <StepHead n={2} state="warn">Consultation not scheduled yet</StepHead>
                    <p className="mb-3 mt-2 text-[0.86rem] leading-relaxed text-ink-muted">
                      {firstName} is confirmed. Schedule the consultation once you two settle on a time.
                    </p>
                    {consultScheduler}
                  </>
                ) : (
                  <>
                    <StepHead n={2} state="done" className="mb-3">Confirmed &amp; consultation set</StepHead>
                    {consultScheduler}
                  </>
                )}
              </div>
            )}
          </section>

          {/* Reconfirm banner: appears when the time changes on a confirmed booking */}
          {showReconfirmBanner && booking.status === 'confirmed' && (
            <div className="rise-in flex flex-col gap-3 border border-tone-confirmed/25 bg-tone-confirmed/[0.04] py-3 pl-4 pr-2 sm:flex-row sm:items-center sm:justify-between sm:pl-5" style={slot(6)}>
              <div className="flex min-w-0 items-start gap-3">
                <Icon name="info" className="mt-0.5 h-4 w-4 text-tone-confirmed" strokeWidth={1.9} />
                <div className="min-w-0">
                  <p className="text-[0.86rem] font-semibold text-tone-confirmed">Booking updated</p>
                  <p className="mt-0.5 text-[0.8rem] text-ink-muted">Review &amp; send {firstName} the update to re-sign</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="solid" size="sm" onClick={() => openChangeNotice()} className="max-sm:h-11 max-sm:flex-1">
                  Message {firstName}
                </Button>
                <IconButton label="Dismiss" onClick={() => setShowReconfirmBanner(false)} className="text-ink-muted hover:text-ink">
                  <Icon name="close" className="h-4 w-4" strokeWidth={1.9} />
                </IconButton>
              </div>
            </div>
          )}

          {/* Notes: the client's own comment, plus Roko's private notes */}
          <Panel title="Notes" className="rise-in" style={slot(7)} bodyClassName="divide-y divide-line">
            {notes.comment && (
              <div className="px-4 py-4 sm:px-5">
                <Label className="mb-2 block">From the client</Label>
                <p className="whitespace-pre-wrap bg-canvas px-4 py-3 text-[0.86rem] leading-relaxed text-ink-soft">{notes.comment}</p>
              </div>
            )}

            {/* Roko's private notes */}
            <div className="px-4 py-4 sm:px-5">
              <div className="mb-2 flex min-h-[32px] items-center justify-between gap-3">
                <Label>
                  My notes <span className="font-normal normal-case tracking-normal text-ink-muted/80">· private, only you</span>
                </Label>
                {!notesEditing && (
                  <button type="button" onClick={() => setNotesEditing(true)}
                    className={cx(MINI, '-mr-2')}>
                    <Icon name="pencil" className="h-3 w-3" strokeWidth={1.9} />
                    {adminNotes ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>

              {notesEditing ? (
                <div>
                  <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} autoFocus
                    placeholder="Jot anything just for you: allergies, skin notes, reminders…"
                    aria-label="My notes"
                    className={cx(inputClass, 'h-auto min-h-[84px] resize-y py-2.5 leading-relaxed')} />
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => { setAdminNotes(booking.admin_notes || ''); setNotesEditing(false); }} className="max-sm:h-11">
                      Cancel
                    </Button>
                    <Button variant="solid" onClick={saveAdminNotes} className="flex-1 max-sm:h-11">
                      Save note
                    </Button>
                  </div>
                </div>
              ) : adminNotes ? (
                <button type="button" onClick={() => setNotesEditing(true)}
                  className="w-full bg-canvas/70 px-4 py-3 text-left transition-colors duration-200 hover:bg-canvas">
                  <p className="whitespace-pre-wrap text-[0.86rem] leading-relaxed text-ink-soft">{adminNotes}</p>
                </button>
              ) : (
                <button type="button" onClick={() => setNotesEditing(true)}
                  className="press flex min-h-[48px] w-full items-center gap-2 rounded-ctl border border-dashed border-line-strong px-4 text-ink-muted hover:border-ink/40 hover:text-ink-soft">
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                  <span className="text-[0.8rem] font-medium">Add a private note…</span>
                </button>
              )}
            </div>
          </Panel>

          {/* Bridal inquiry details */}
          {isBridal && bridalInquiry && (
            <Panel title="Bridal inquiry details" className="rise-in" style={slot(8)}>
              {/* The day, in the order she'll be asked about it */}
              <Specs two className="px-4 sm:px-5">
                <Spec label={isTrialBooking ? 'Trial date' : 'Wedding date'} value={biWedding} />
                {/* Preferred appt only when it actually differs from the wedding
                    date; otherwise it just repeats the same day. */}
                {bridalInquiry.preferred_date && bridalInquiry.preferred_date !== bridalInquiry.wedding_date && (
                  <Spec label="Preferred appt" value={biPreferred} />
                )}
                {/* The requested ready-by sometimes lives only in the booking
                    notes, but it's still an inquiry answer, so always show it here. */}
                <Spec label="Ready by (requested)" value={bridalInquiry.makeup_ready_by_time || notes.readyBy} accent />
                <Spec label={isTrialBooking ? 'Preferred time' : 'Event starts'} value={bridalInquiry.event_start_time} />
                <Spec label="Venue access" value={bridalInquiry.venue_access_time} />
                <Spec label="Hairstylist arrive by" value={bridalInquiry.ready_by_time} />
                <Spec label="Photographer arrives" value={bridalInquiry.photographer_arrival_time} />
              </Specs>

              {/* Get ready location */}
              {bridalInquiry.event_location && (
                <div className="flex items-start justify-between gap-3 border-t border-line px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <Label className="mb-1.5 block">Get ready location</Label>
                    <CopyableAddress address={bridalInquiry.event_location} />
                  </div>
                  <a href={mapsUrl(bridalInquiry.event_location)} target="_blank" rel="noopener noreferrer"
                    className={buttonClass('quiet', 'sm', 'max-sm:h-11')}>
                    <ExternalIcon className="h-3.5 w-3.5" />
                    Maps
                  </a>
                </div>
              )}

              {/* Vendors */}
              {(bridalInquiry.photographer || bridalInquiry.hairstylist) && (
                <Specs two className="border-t border-line px-4 sm:px-5">
                  <Spec label="Photographer" value={bridalInquiry.photographer}
                    href={bridalInquiry.photographer ? `https://instagram.com/${bridalInquiry.photographer.replace('@','')}` : undefined} />
                  <Spec label="Hairstylist" value={bridalInquiry.hairstylist}
                    href={bridalInquiry.hairstylist ? `https://instagram.com/${bridalInquiry.hairstylist.replace('@','')}` : undefined} />
                </Specs>
              )}

              {/* About her */}
              <Specs two className="border-t border-line px-4 sm:px-5">
                <Spec label="Bride" value={biBrideName} />
                <Spec label="People needing glam" value={bridalInquiry.num_people_glam} />
                <Spec label="Out of state" value={biOosLabel} accent={biOos} />
                {/* Only an out-of-state inquiry has one, so it sits right after the
                    flag it qualifies and disappears for every local bride. */}
                <Spec label="Destination" value={bridalInquiry.destination_location} accent={biOos} />
                <Spec label="Instagram / TikTok" value={bridalInquiry.instagram_handle}
                  href={bridalInquiry.instagram_handle ? `https://instagram.com/${bridalInquiry.instagram_handle.replace('@','')}` : undefined} />
                <Spec label="How they heard" value={bridalInquiry.how_heard} />
              </Specs>

              {/* Makeup vision note */}
              {bridalInquiry.additional_details && (
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  <Label className="mb-2 block">Makeup vision &amp; additional details</Label>
                  <p className="text-[0.86rem] leading-[1.7] text-ink-soft">{bridalInquiry.additional_details}</p>
                </div>
              )}
            </Panel>
          )}

          {/* No inquiry row to show. Rendering nothing here is what made a saving
              bug invisible for a week: the section simply vanished and the card
              read as if the bride had never answered anything. Say it out loud
              instead, and point at the copy that does exist (the inquiry email),
              so a gap always looks like a gap. */}
          {bridalInquiryMissing && (
            <div className="rise-in flex items-start gap-3 border border-tone-pending/25 bg-tone-pending/[0.04] px-4 py-3.5 sm:px-5" style={slot(9)}>
              <Icon name="info" className="mt-0.5 h-4 w-4 text-tone-pending" strokeWidth={1.9} />
              <div className="min-w-0">
                <p className="text-[0.86rem] font-semibold text-tone-pending">No inquiry form linked to this booking</p>
                <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-soft">
                  The wedding details (hairstylist, photographer, venue access, guest count) aren&apos;t on file here.
                  Your &ldquo;New Bridal Inquiry&rdquo; email for {firstName} has the full copy.
                </p>
              </div>
            </div>
          )}

          {/* Reference Photos */}
          <BookingReferencePhotos booking={booking} onUpdateBooking={onUpdateBooking} dm={dm} className="rise-in" style={slot(13)} />

          {/* Status. The consultation scheduler renders here only when it isn't
              already living in the Appointment hub above (bridal with a set time). */}
          <Panel title={isBridal && !schedulerInHub ? 'Status & consultation' : 'Update status'} className="rise-in" style={slot(14)} bodyClassName="px-4 py-4 sm:px-5 sm:py-5">
            {/* Bridal cancel REQUEST: the bride asked to cancel from her email.
                Nothing was changed and her date is still held, so this is a
                call-her prompt. */}
            {booking.cancel_requested_at && booking.status !== 'cancelled' && (
              <div className="mb-4 border border-tone-pending/25 bg-tone-pending/[0.04] px-4 py-3.5">
                <p className="flex items-center gap-2 text-[0.86rem] font-semibold text-tone-pending">
                  <Icon name="clock" className="h-4 w-4" strokeWidth={1.9} />
                  Cancellation requested{fmtCancelStamp(booking.cancel_requested_at)}
                </p>
                {booking.cancel_request_message && (
                  <p className="mt-1.5 text-[0.86rem] italic leading-snug text-ink-soft">
                    &ldquo;{booking.cancel_request_message}&rdquo;
                  </p>
                )}
                <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted">
                  Call the bride before doing anything. Her date is still held.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUSES.map(s => {
                const isActive = booking.status === s;
                // Confirmed is off the table until there's a time on the booking.
                // Still tappable on purpose: tapping it is how she finds out why,
                // and it scrolls her to the box that fixes it.
                const locked = s === 'confirmed' && !booking.time && !isActive;
                return (
                  <button key={s} type="button" onClick={() => handleStatusChange(s)}
                    aria-disabled={locked}
                    aria-pressed={isActive}
                    title={locked ? 'Set the appointment time first' : undefined}
                    className={cx(
                      'press flex h-11 items-center justify-center gap-1.5 rounded-ctl border px-3 text-[0.86rem] capitalize',
                      isActive ? STATUS_ON[s]
                        : locked ? 'border-dashed border-line-strong font-medium text-ink-muted/70'
                        : 'border-line-strong bg-paper font-medium text-ink-soft hover:border-ink/50 hover:text-ink',
                    )}
                  >
                    {locked && <Icon name="lock" className="h-3 w-3" strokeWidth={2} />}
                    <span className="truncate">{s}</span>
                  </button>
                );
              })}
            </div>

            {/* Why Confirmed is locked, said in the same place it's locked. */}
            {!booking.time && booking.status !== 'confirmed' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <button type="button"
                onClick={refuseConfirm}
                className="mt-3 flex w-full items-start gap-2.5 rounded-ctl bg-tone-pending/[0.06] px-3.5 py-3 text-left transition-colors duration-200 hover:bg-tone-pending/10">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-tone-pending" />
                <span className="text-[0.8rem] leading-snug text-tone-pending">
                  No appointment time set yet, so this can&rsquo;t be confirmed.{' '}
                  <span className="font-semibold underline underline-offset-2">Set the time in the Appointment panel</span>, then come back.
                </span>
              </button>
            )}

            {/* The client cancelled this themselves, from their email link. Shows
                who + when + their reason, so a cancelled booking is never a mystery. */}
            {booking.status === 'cancelled' && booking.cancelled_by === 'client' && (
              <div className="mt-3 border border-tone-alert/25 bg-tone-alert/[0.04] px-4 py-3.5">
                <p className="flex items-center gap-2 text-[0.86rem] font-semibold text-tone-alert">
                  <Cross className="h-3 w-3" strokeWidth={3} />
                  Cancelled by client{fmtCancelStamp(booking.cancelled_at)}
                </p>
                {booking.cancel_reason
                  ? <p className="mt-1.5 text-[0.86rem] italic leading-snug text-ink-soft">&ldquo;{booking.cancel_reason}&rdquo;</p>
                  : <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted">No reason given.</p>}
              </div>
            )}

            {isBridal && !schedulerInHub && booking.time && booking.status !== 'confirmed' && !booking.consultation_date && (
              <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-muted">
                Tap <span className="font-semibold text-tone-confirmed">Confirmed</span> or schedule below. One email goes out with their confirmation, consultation details &amp; upload link.
              </p>
            )}
            {isBridal && schedulerInHub && booking.status === 'pending' && (
              <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-muted">
                Confirming lives in the <span className="font-semibold text-ink">Appointment</span> panel above. One email goes out with the confirmation, consultation details &amp; upload link.
              </p>
            )}
            {confirmInHub && (
              <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-muted">
                Step 2 is waiting in the <span className="font-semibold text-ink">Appointment</span> panel above. These buttons do the same thing, for when you need to jump straight to completed or cancelled.
              </p>
            )}

            {/* Consultation scheduler lives under status only when not in the hub.
                Bridal-only: consultations are part of the bridal pipeline, and the
                isBridal check was missing here, so every non-bridal card offered
                to schedule one it would never have.
                An unconfirmed bride with no time gets sent back to step 1 instead,
                because scheduling her consultation is also what confirms her. */}
            {isBridal && !schedulerInHub && (
              <div ref={consultRef} className="mt-5 border-t border-line pt-5">
                {!booking.time && booking.status === 'pending' ? (
                  <button type="button" onClick={refuseConfirm}
                    className="press flex w-full items-center gap-3 rounded-ctl border border-dashed border-line-strong px-4 py-3.5 text-left hover:border-ink/40">
                    <StepDot n={1} state="active" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.92rem] font-semibold text-ink">
                        Set the appointment time first
                      </span>
                      <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-muted">
                        Booking the consultation is what confirms {firstName}, and her email carries the appointment time. It has to exist first.
                      </span>
                    </span>
                    <Icon name="up" className="h-4 w-4 text-ink-muted" strokeWidth={2} />
                  </button>
                ) : consultScheduler}
              </div>
            )}
          </Panel>

          {/* Delete. Cancelling already takes a booking off the calendar and out
              of the list, so this is only for a row that should never have
              existed: a test, a duplicate, a wrong number. The line under it is
              there because the two look like the same action from a distance,
              and only one of them is recoverable. */}
          <section className="rise-in rounded-card border border-line bg-paper px-4 py-4 sm:px-5" style={slot(15)}>
            {!confirmDelete ? (
              <Button variant="danger" icon={TrashIcon} onClick={() => setConfirmDelete(true)} className="max-sm:h-11">
                Delete appointment
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[0.86rem] font-medium text-tone-alert">Are you sure?</span>
                <Button variant="alert" onClick={onDelete} className="max-sm:h-11">
                  Yes, delete
                </Button>
                <Button onClick={() => setConfirmDelete(false)} className="max-sm:h-11">Cancel</Button>
              </div>
            )}
            <p className="mt-3 max-w-[460px] text-[0.8rem] leading-relaxed text-ink-muted">
              Deleting erases this booking for good. To call one off, use{' '}
              <span className="font-semibold text-tone-alert">Cancelled</span>{' '}
              above: it emails the client, takes the day back and files the booking in the archive, where you can still find it.
            </p>
          </section>
        </div>

        {/* ── The file ────────────────────────────────────────────────────── */}
        <div className={column}>
          {/* Who she is and how to reach her. */}
          {(hasContact || showClientLocation) && (
            <Panel title="Contact" className="rise-in" style={slot(1)}>
              {hasContact && (
                <Specs className="px-4 sm:px-5">
                  {booking.phone && (
                    <Spec label="Phone">
                      <a href={`sms:${phoneHref(booking.phone)}`} className="tabular-nums underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
                        {formatPhone(booking.phone)}
                      </a>
                    </Spec>
                  )}
                  {booking.email && (
                    <Spec label="Email">
                      <a href={`mailto:${booking.email}`} className="break-all underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
                        {booking.email}
                      </a>
                    </Spec>
                  )}
                </Specs>
              )}

              {/* Client location (0015). Only shown when there IS one: a blank
                  here means a studio appointment or an import with nothing on
                  file, and an empty "Location" row would read as missing data
                  rather than as "she isn't driving anywhere". Suppressed only
                  when the inquiry's own Get Ready Location is already showing an
                  address, so a bride imported from Booksy (who has no inquiry)
                  still gets one. */}
              {showClientLocation && (
                <div className={cx('flex items-start justify-between gap-3 px-4 py-4 sm:px-5', hasContact && 'border-t border-line')}>
                  <div className="min-w-0">
                    <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
                      <Label>Client location</Label>
                      {booking.travel_fee != null && (
                        <span className="text-[0.74rem] tabular-nums text-ink-muted">
                          travel fee ${Number(booking.travel_fee).toLocaleString()}
                        </span>
                      )}
                    </p>
                    <CopyableAddress address={booking.location} />
                  </div>
                  <a href={mapsUrl(booking.location)} target="_blank" rel="noopener noreferrer"
                    className={buttonClass('quiet', 'sm', 'max-sm:h-11')}>
                    <ExternalIcon className="h-3.5 w-3.5" />
                    Maps
                  </a>
                </div>
              )}
            </Panel>
          )}

          {/* Non-bridal appointment details.
              A bride's card has a whole panel built from her inquiry; a non-bridal
              client had nothing but a service name and a couple of chips buried
              further down, so "what is this booking actually for" was a question
              you answered by reading a notes string. Same shape as the bridal
              panel, built from what a non-bridal booking actually carries.

              The cash figure is editable here because this is where Roko settles
              it. A travel job is priced from $750 and lands wherever the drive
              puts it, so nothing can compute it, and until she writes it down the
              client's confirmation email can only say "Roko will confirm the
              exact amount". Typing it here is what puts a number in that email. */}
          {!isBridal && (
            <Panel title="Appointment details" className="rise-in" style={slot(2)}>
              <Specs className="px-4 sm:px-5">
                <Spec label="Service" value={booking.service} />
                <Spec label="Occasion" value={notes.occasion} accent />
                <Spec label="Ready by (requested)" value={notes.readyBy} accent />
                <Spec label="Where" value={booking.location || `Roko's studio · ${STUDIO_TOWN}`} />
                {notes.flags.map((f, i) => (
                  <Spec key={i} label={/early|⏰/i.test(f) ? 'Early arrival' : 'Travel'} value={f} />
                ))}
                <CashDueField booking={booking} onUpdateBooking={onUpdateBooking} />
              </Specs>
              {notes.comment && (
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  <Label className="mb-1.5 block">What they told you</Label>
                  <p className="whitespace-pre-wrap text-[0.86rem] leading-relaxed text-ink">{notes.comment}</p>
                </div>
              )}
            </Panel>
          )}

          {/* Signed Service Agreement (contract) */}
          <Panel
            title="Service agreement"
            className="rise-in"
            style={slot(10)}
            action={booking.contract_signed && !awaitingResign
              ? <span className="text-[0.74rem] tabular-nums text-ink-muted">Agreement {booking.contract_version || 'v1'}</span>
              : null}
          >
            {awaitingResign ? (
              /* A new agreement went out and the client hasn't signed it yet.
                 Amber: what's on file no longer matches the booking, and that
                 gap is the whole thing Roko needs to see. */
              <>
                <div className="bg-tone-pending/[0.05] px-4 py-4 sm:px-5">
                  <p className="flex items-center gap-2 text-[0.86rem] font-semibold text-tone-pending">
                    <Icon name="clock" className="h-4 w-4" strokeWidth={1.9} />
                    New agreement sent, waiting on signature
                  </p>
                  <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
                    {firstName} was emailed a Review &amp; Sign link{booking.contract_resign_requested_for ? <> for <strong className="font-semibold text-ink">{booking.contract_resign_requested_for}</strong></> : ''}. The booking stays as it is until they sign, and their new signature shows here the moment they do.
                  </p>
                </div>
                <Specs className="border-t border-line px-4 sm:px-5">
                  <Spec label="Sent" value={resignRequestedAt} />
                  <Spec label="Signed so far" value={signatureChain.length ? `${signatureChain.length} ${signatureChain.length === 1 ? 'signature' : 'signatures'}` : 'None yet'} />
                </Specs>
                {/* What's still legally on file while we wait. */}
                {signatureChain.length > 0 && (
                  <div className="border-t border-line px-4 py-4 sm:px-5">
                    <Label className="mb-3 block">On file until they sign</Label>
                    <SignatureChain chain={signatureChain} fmt={fmtSignedAt} superseded />
                    <div className="mt-4">{printButton}</div>
                  </div>
                )}
              </>
            ) : booking.contract_signed ? (
              <>
                <div className="px-4 pt-4 sm:px-5">
                  <p className="flex items-center gap-2 text-[0.86rem] font-semibold text-ink">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                      <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {hasResignHistory ? 'Re-signed' : 'Signed'}
                  </p>
                  {hasResignHistory && (
                    <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-muted">
                      The agreement below is the current one. {firstName} signed {signatureChain.length} times as the details changed, all of them are kept.
                    </p>
                  )}
                </div>
                <Specs className="mt-2 px-4 sm:px-5">
                  <Spec label="Signed by" value={booking.contract_signed_name} />
                  <Spec label={hasResignHistory ? 'Re-signed on' : 'Signed on'} value={contractSignedAt} />
                  <Spec label="Covers" value={booking.contract_signed_for} />
                  <Spec label="Photo permission"
                    value={booking.contract_photo_consent === true ? 'Yes, may post' : booking.contract_photo_consent === false ? 'No, keep private' : null}
                    accent={booking.contract_photo_consent === false} />
                </Specs>
                <div className="px-4 pb-4 pt-1 sm:px-5">{printButton}</div>
                {/* The paper trail, only worth the space once there's more than one. */}
                {hasResignHistory && (
                  <div className="border-t border-line bg-canvas/50 px-4 py-4 sm:px-5">
                    <Label className="mb-3 block">Signature history</Label>
                    <SignatureChain chain={signatureChain} fmt={fmtSignedAt} />
                  </div>
                )}
              </>
            ) : (
              <p className="flex items-start gap-2.5 px-4 py-4 text-[0.86rem] leading-snug text-ink-muted sm:px-5">
                <Icon name="clock" className="mt-px h-4 w-4" />
                No signed agreement on file (booked before the contract was added).
              </p>
            )}
          </Panel>

          {/* Zelle Deposit: one line that opens to the screenshot. */}
          <Panel title="Zelle deposit" className="rise-in" style={slot(11)}>
            <DepositStrip booking={booking} onUpdateBooking={onUpdateBooking} />
          </Panel>

          {/* Emails. Next to the deposit because they answer the same worry:
              has this client actually been told what to do next. */}
          <EmailLogPanel booking={booking} dm={dm} className="rise-in" style={slot(12)} />

          {/* Client history */}
          {clientBookings.length > 0 && (
            <Panel title="Appointment history" className="rise-in" style={slot(16)} bodyClassName="divide-y divide-line">
              {clientBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cx('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[b.status] || 'bg-ink-muted')} />
                    <div className="min-w-0">
                      <p className="truncate text-[0.86rem] font-medium text-ink">{b.service}</p>
                      <p className="mt-0.5 text-[0.74rem] tabular-nums text-ink-muted">
                        {b.date
                          ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'No date set'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </Panel>
          )}
        </div>
      </div>

      {/* ── Client profile ────────────────────────────────────────────────────
          Tapping the client's name opens this: everything she has booked, and
          the three ways to reach her. A sheet like every other pop-up (from
          the bottom on a phone), and closing it is the way back to the card. */}
      <Sheet
        open={showClientPanel}
        onClose={() => setShowClientPanel(false)}
        eyebrow="Client profile"
        title={booking.name || 'Client'}
        closeLabel="Back to appointment"
        bodyClassName="pb-2"
        headerExtra={(booking.phone || booking.email) ? (
          <p className="mt-1 text-[0.86rem] text-ink-muted">
            {booking.phone && <span className="tabular-nums">{formatPhone(booking.phone)}</span>}
            {booking.phone && booking.email && <span aria-hidden> · </span>}
            {booking.email && <span className="break-all">{booking.email}</span>}
          </p>
        ) : null}
        footer={(
          <Button size="lg" onClick={() => setShowClientPanel(false)} className="w-full">
            Back to appointment
          </Button>
        )}
      >
        {/* Contact actions: Call / Text / Email */}
        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {[
            { label: 'Call', href: booking.phone ? `tel:${phoneHref(booking.phone)}` : null, icon: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /> },
            { label: 'Text', href: booking.phone ? `sms:${phoneHref(booking.phone)}` : null, icon: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /> },
            { label: 'Email', href: booking.email ? `mailto:${booking.email}` : null, icon: ICON.mail },
          ].map(({ label, href, icon }) => (
            <a
              key={label}
              href={href || undefined}
              aria-disabled={!href}
              className={cx(
                'flex h-14 items-center justify-center gap-2 text-[0.86rem] font-medium text-ink-soft transition-colors duration-200',
                href ? 'hover:bg-canvas/60 hover:text-ink active:bg-canvas' : 'pointer-events-none opacity-35',
              )}
            >
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{icon}</svg>
              {label}
            </a>
          ))}
        </div>

        {/* Stats */}
        <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {[['Total', totalVisits], ['Completed', completedVisits], ['Upcoming', upcomingBookings.length]].map(([label, n]) => (
            <div key={label} className="px-5 py-4 sm:px-7">
              <dt><Label>{label}</Label></dt>
              <dd className="mt-1.5 text-[1.6rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{n}</dd>
            </div>
          ))}
        </dl>

        {/* Upcoming */}
        {upcomingBookings.length > 0 && (
          <div className="border-b border-line">
            <Label className="block px-5 pb-1 pt-5 sm:px-7">Upcoming</Label>
            <div className="divide-y divide-line">
              {upcomingBookings.map(b => (
                <ApptRow key={b.id} b={b} isCurrent={b.id === booking.id} />
              ))}
            </div>
          </div>
        )}

        {/* Past & Completed */}
        {pastBookings.length > 0 && (
          <div>
            <Label className="block px-5 pb-1 pt-5 sm:px-7">Past &amp; completed</Label>
            <div className="divide-y divide-line">
              {pastBookings.map(b => (
                <ApptRow key={b.id} b={b} isCurrent={b.id === booking.id} />
              ))}
            </div>
          </div>
        )}
      </Sheet>

      {/* Floating twin of the Appointment box's My Schedule. Fades in the moment
          that box scrolls off, so her day is always one tap away no matter how
          far down the card she is. Stays out of the way while the drawer is open. */}
      <button type="button" onClick={toggleSchedule} title="See your day side by side"
        aria-hidden={!(apptOut && !showSchedule)} tabIndex={apptOut && !showSchedule ? 0 : -1}
        className={cx(
          'fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[150] inline-flex h-12 items-center gap-2 rounded-ctl bg-ink px-5 text-[0.86rem] font-semibold text-paper shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-[opacity,transform] duration-300 ease-quint active:scale-[0.97] active:duration-75',
          apptOut && !showSchedule ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        )}>
        <Icon name="calendar" className="h-4 w-4" strokeWidth={1.8} />
        My Schedule
      </button>

      {/* ── Day schedule drawer ───────────────────────────────────────────────
          Roko's real day, docked to the right so she can eyeball conflicts while
          proposing a new time. On wide screens it sits beside the card (no
          backdrop); on smaller screens it's a dimmed sheet. The proposed window
          shows as a pending (dashed) block so she can see exactly where it lands. */}
      {!docked && (
        // Dim only, never a backdrop blur over the whole page: the filter forces
        // everything behind it through a re-raster and text goes soft on
        // ordinary laptop displays. Always mounted so it can fade with the
        // panel instead of appearing fully black on frame one.
        <div
          className={cx('fixed inset-0 z-[340] bg-black/40 transition-opacity duration-200', showSchedule ? 'opacity-100' : 'pointer-events-none opacity-0')}
          onClick={() => setShowSchedule(false)} aria-hidden="true" />
      )}
      {/* Square, on a hairline, frosted. The blur is only the drawer's own
          width, which is cheap; the page under it never repaints for the slide,
          which runs on its own layer. */}
      <aside
        aria-hidden={!showSchedule}
        aria-label="My Schedule"
        className={cx(
          'fixed inset-y-0 right-0 z-[350] flex flex-col border-l border-line bg-paper/95 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 transition-transform duration-[280ms] ease-quint will-change-transform',
          showSchedule ? 'translate-x-0' : 'pointer-events-none translate-x-[calc(100%+64px)]',
        )}
        style={{ width: `min(${scheduleW}px, 92vw)` }}
      >
        {/* Drag the left edge to make the calendar wider or narrower */}
        <div
          className="group absolute inset-y-0 left-0 z-10 -ml-1.5 hidden w-3.5 cursor-ew-resize touch-none items-center justify-center sm:flex"
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={resizeSchedule}
          onPointerUp={persistScheduleW}
          title="Drag to resize"
        >
          <span className="h-10 w-[3px] rounded-full bg-line-strong transition-colors duration-200 group-hover:bg-ink-muted" />
        </div>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line pl-4 pr-1.5 sm:pl-5">
          <Icon name="calendar" className="h-4 w-4 text-ink-muted" />
          <p className="min-w-0 flex-1 text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">My Schedule</p>
          <IconButton label="Close schedule" onClick={() => setShowSchedule(false)} className="text-ink-muted hover:text-ink">
            <Icon name="close" className="h-4 w-4" strokeWidth={1.9} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-4" data-lenis-prevent>
          <ScheduleView
            bookings={(() => {
              // While a picker is open, ghost the draft onto the day as a dashed
              // block so she can see exactly where it lands: the reschedule
              // panel's new window, and/or the consultation being scheduled.
              let list = allBookings;
              if (showTimePicker && pendingStart && (pendingWindow !== booking.time || pendingDate !== booking.date) && scheduleDay === (pendingDate || booking.date)) {
                list = [
                  ...list.filter(b => b.id !== booking.id),
                  { ...booking, date: pendingDate || booking.date, time: pendingWindow, status: 'pending', name: `${firstName} · new time` },
                ];
              }
              if (consultExpanded && consultDraft?.date && consultDraft?.time) {
                list = [
                  ...list.map(b => (b.id === booking.id ? { ...b, consultation_date: null } : b)),
                  {
                    id: `consult-draft-${booking.id}`,
                    name: `${firstName} · consultation`,
                    consultation_date: consultDraft.date,
                    consultation_time: consultDraft.time,
                    consultation_type: consultDraft.type || 'Zoom',
                    status: 'pending',
                  },
                ];
              }
              return list;
            })()}
            classRegs={classRegs}
            dateKey={scheduleDay}
            onChangeDate={setScheduleDay}
            onSelectBooking={openFromSchedule}
            onSelectClassReg={openClassFromSchedule}
            dm={dm}
            withViews
          />
        </div>
      </aside>

      {/* Toast: an ink bar with a small dot in the tone of what happened, the
          same as Mission Paradise's. From the top on a phone, the way iOS
          banners arrive; along the bottom on a laptop. */}
      {toast && (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[9999] flex justify-center px-4 lg:bottom-8 lg:top-auto">
          {/* In and out by animation rather than transition: the toast mounts
              already visible, so there's no earlier frame to transition from. */}
          <style>{'@keyframes bd-toast-in{from{opacity:0;transform:translate3d(0,-8px,0) scale(.98)}}@keyframes bd-toast-out{to{opacity:0;transform:translate3d(0,-6px,0)}}@media (prefers-reduced-motion: reduce){.bd-toast{animation:none!important}}'}</style>
          <div className={cx(
            'bd-toast flex w-full max-w-sm items-start gap-3 bg-ink px-4 py-3 text-paper shadow-[0_12px_32px_rgba(0,0,0,0.12)]',
            toastVisible ? 'animate-[bd-toast-in_380ms_cubic-bezier(0.22,1,0.36,1)_both]' : 'animate-[bd-toast-out_300ms_ease-in_both]',
          )}>
            <span className={cx('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', TOAST_DOT[toast.tone] || TOAST_DOT.ink)} />
            <p className="min-w-0 text-[0.86rem] leading-snug">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Status change confirmation */}
      {pendingStatus && (() => {
        const isReconfirm = pendingStatus === 'reconfirm';
        const statusKey = isReconfirm ? 'confirmed' : pendingStatus;
        const cancelling = statusKey === 'cancelled';
        return (
          <ConfirmDialog
            tone={cancelling ? 'danger' : 'default'}
            title={isReconfirm ? 'Reconfirm appointment?' : cancelling ? 'Cancel this appointment?' : `Mark as ${statusKey}?`}
            body={isReconfirm ? "The client's time has changed. A new confirmation email will be sent."
              : statusKey === 'confirmed' ? 'A confirmation email will be sent to the client.'
              : cancelling ? `${booking.email ? 'A cancellation email goes out, and it' : 'It'} comes off your calendar and out of your appointments straight away. It stays in the archive if you need it back.`
              : statusKey === 'completed' ? 'This will archive the appointment as complete.'
              : 'This will update the appointment status.'}
            confirmLabel={isReconfirm ? 'Yes, reconfirm' : cancelling ? 'Yes, cancel it' : 'Yes, update'}
            onCancel={() => setPendingStatus(null)}
            onConfirm={executeStatusChange}
          >
            {cancelling && (
              <>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <Label>Note from you</Label>
                    <p className="mt-1 text-[0.8rem] text-ink-muted">
                      {includeReason ? 'Optional. On, printed in their email.' : 'Optional. Off, no note sent.'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setIncludeReason(v => !v)}
                    aria-pressed={includeReason}
                    aria-label="Include a note"
                    className="press -m-2 flex h-11 w-14 shrink-0 items-center justify-center">
                    <Switch on={includeReason} />
                  </button>
                </div>
                {includeReason ? (
                  <>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      onFocus={() => setReasonFocus(true)}
                      onBlur={() => setReasonFocus(false)}
                      rows={3}
                      placeholder={DEFAULT_CANCEL_REASON}
                      aria-label="Note from you"
                      className={cx(inputClass, 'h-auto resize-none py-2.5 leading-relaxed')}
                    />
                    <p className="mt-2 text-[0.74rem] leading-snug text-ink-muted">
                      Prints in their email under &ldquo;Note from Roko&rdquo;. Edit it, or leave it as is.
                    </p>
                  </>
                ) : (
                  <p className="rounded-ctl border border-dashed border-line-strong px-3.5 py-3 text-[0.8rem] leading-snug text-ink-muted">
                    No note will be included. The email still reads warmly, it just says the booking is cancelled.
                  </p>
                )}
              </>
            )}
          </ConfirmDialog>
        );
      })()}

      {/* Edit modal */}
      {showEdit && (
        <EditBookingModal booking={booking} onSave={handleSaveEdit} onClose={() => setShowEdit(false)} darkMode={dm} />
      )}
    </div>
  );
}
