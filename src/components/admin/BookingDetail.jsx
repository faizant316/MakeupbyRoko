import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StatusBadge from './StatusBadge';
import EditBookingModal from './EditBookingModal';
import BookingReferencePhotos from './BookingReferencePhotos';
import { lenisScrollTo } from '@/lib/lenis';
import { openZoomRoom, meetingIdFromUrl } from '@/lib/zoomHost';
import confetti from 'canvas-confetti';
import { buildContract } from '@/lib/contract';
import { useContractOverrides } from '@/lib/useContractOverrides';
import { AdminDatePicker } from './SchedulePicker';
import TimeWindowPicker from './TimeWindowPicker';
import ScheduleView from './ScheduleView';
import { parseRange, apptToMin } from '@/lib/timeWindow';
import { formatPhone, phoneHref } from '@/lib/phone';
import { STATUS_COLORS, EVENT_COLORS, CONSULT_INK, isBridalService } from './statusColors';
import { isDepositUnseen, daysSince, shortDateTime } from './depositState';

// The whole Zelle deposit section, deliberately one line.
//
// It used to be three stacked elements (a status sentence, a screenshot strip,
// and a pair of Received / Not Yet buttons) all restating the same fact. Since
// the upload marks the deposit received on its own, none of that needs to be a
// decision on the page: it's one collapsed line that opens to the screenshot,
// with the manual override tucked underneath for the rare cases the automatic
// path can't cover (cash, Venmo, a screenshot that's clearly wrong).
function DepositStrip({ booking, onUpdateBooking, dm }) {
  const [expanded, setExpanded] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
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

  const tone = isIn
    ? { fg: dm ? '#86efac' : '#16a34a', bg: dm ? 'rgba(34,197,94,0.10)' : '#F4FBF6', line: dm ? 'rgba(34,197,94,0.24)' : '#DCEFE3', key: '#22c55e' }
    : { fg: dm ? '#F5B83C' : '#A9660B', bg: dm ? 'rgba(245,158,11,0.10)' : '#FDF8EF', line: dm ? 'rgba(245,158,11,0.24)' : '#F0E3C9', key: '#F59E0B' };

  const headline = isIn
    ? (hasProof ? 'Zelle screenshot received' : 'Deposit received')
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
    if (next && hasProof && !signedUrl) {
      setLoadingUrl(true);
      try {
        const res = await fetch('/api/screenshot-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: booking.id, table: 'bookings' }),
        });
        const data = await res.json();
        setSignedUrl(data.url);
      } finally {
        setLoadingUrl(false);
      }
    }
  };

  const overrideCls = 'text-[0.72rem] font-medium px-3 py-1.5 rounded-lg transition-colors';

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${tone.line}` }}>
      <button
        onClick={handleExpand}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors"
        style={{ background: tone.bg }}
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: dm ? 'rgba(255,255,255,0.08)' : '#fff' }}>
          {isIn ? (
            <svg viewBox="0 0 24 24" fill="none" stroke={tone.key} strokeWidth="2.8" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.key }} />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="text-[0.78rem] font-semibold" style={{ color: tone.fg }}>{headline}</span>
          {detail && (
            <span className="text-[0.72rem] ml-1.5" style={{ color: dm ? '#8b8b95' : '#8a8a93' }}>· {detail}</span>
          )}
        </span>

        <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#71717a' : '#aaa'} strokeWidth="2"
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div className="p-3 flex flex-col gap-3" style={{ background: dm ? '#1e1e24' : '#fff' }}>
          {hasProof && loadingUrl && (
            <p className="text-[0.72rem] text-center py-4" style={{ color: dm ? '#71717a' : '#aaa' }}>Loading…</p>
          )}
          {hasProof && signedUrl && (
            <div>
              <img
                src={signedUrl}
                alt="Zelle screenshot"
                className="w-full rounded-lg object-contain max-h-[400px] cursor-pointer"
                onClick={() => window.open(signedUrl, '_blank')}
                title="Click to open full size"
              />
              <p className="text-[0.62rem] text-center mt-2" style={{ color: dm ? '#52525b' : '#bbb' }}>Click image to open full size</p>
            </div>
          )}

          {/* The escape hatches. Out of the way because the automatic path
              covers almost every deposit. */}
          <div className="flex items-center gap-2 flex-wrap">
            {isIn ? (
              <button
                type="button"
                onClick={() => onUpdateBooking({ deposit_received: false, deposit_confirmed_at: null })}
                className={overrideCls}
                style={{ color: dm ? '#fca5a5' : '#b91c1c', border: `1px solid ${dm ? 'rgba(185,28,28,0.4)' : 'rgba(239,68,68,0.25)'}` }}
              >
                Mark as not received
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onUpdateBooking({ deposit_received: true, deposit_confirmed_at: new Date().toISOString() })}
                className={overrideCls}
                style={{ color: dm ? '#86efac' : '#16a34a', border: `1px solid ${dm ? 'rgba(34,197,94,0.35)' : 'rgba(22,163,74,0.25)'}` }}
              >
                {hasProof ? 'Mark received after all' : 'Paid another way? Mark received'}
              </button>
            )}
            <span className="text-[0.68rem]" style={{ color: dm ? '#52525b' : '#b0b0b8' }}>
              {isIn ? 'Only if the screenshot turned out to be wrong.' : 'For cash, Venmo, or anything paid outside the site.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

function CopyableAddress({ address, dm }) {
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
      className="text-left w-full group"
      title="Tap to copy address"
    >
      <p className="text-[0.85rem] font-medium leading-snug" style={{ color: dm ? '#e4e4e7' : '#111' }}>
        {address}
      </p>
      <span className="text-[0.62rem] mt-0.5 inline-flex items-center gap-1 transition-colors"
        style={{ color: copied ? '#22c55e' : dm ? '#52525b' : '#bbb' }}>
        {copied ? (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
        ) : (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Tap to copy</>
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
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM',
];

// Booksy-style hero gradients per status (banner behind CONFIRMED / PENDING...)
const HERO_GRADIENTS = {
  pending:   'linear-gradient(150deg, #D97706, #F59E0B)',
  confirmed: 'linear-gradient(150deg, #1D4ED8, #3B82F6)',
  completed: 'linear-gradient(150deg, #475569, #64748B)',
  cancelled: 'linear-gradient(150deg, #DC2626, #EF4444)',
};

// Brand plum (matches the front-end bridal cards)
const PLUM = '#C4849A';

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

// "2026-09-23" → "Wednesday, September 23, 2026" / "Wed, Sep 23"
function fmtLong(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
}
function fmtShort(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
}

// One label/value pair in the bridal details "spec sheet" grid.
function BField({ label, value, dm, accent = false, href }) {
  if (value === null || value === undefined || value === '') return null;
  const valueColor = accent ? PLUM : (dm ? '#e4e4e7' : '#1E1E27');
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1" style={{ color: dm ? '#8f8a93' : '#A89098' }}>{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-[0.86rem] font-medium leading-snug break-words transition-opacity hover:opacity-70"
          style={{ color: valueColor }}>{value}</a>
      ) : (
        <p className="text-[0.86rem] font-medium leading-snug break-words" style={{ color: valueColor }}>{value}</p>
      )}
    </div>
  );
}

const CONSULT_COLOR = CONSULT_INK.light;
const CONSULT_DM = CONSULT_INK.dark;
const CONSULT_BG = 'rgba(107,90,147,0.09)';
const CONSULT_BORDER = 'rgba(107,90,147,0.24)';

// Numbered step marker for the bridal pipeline (1 = time, 2 = confirm+consult).
// done = green check, active = filled number, warn = amber, todo = hollow gray.
function StepDot({ n, state, dm, color = '#C4849A' }) {
  const styles = {
    done: { background: '#22c55e', color: '#fff' },
    active: { background: color, color: '#fff' },
    warn: { background: '#D97706', color: '#fff' },
    todo: { background: 'transparent', color: dm ? '#71717a' : '#b6aeb2', border: `1.5px solid ${dm ? '#3f3f46' : '#D4D4DD'}` },
  }[state] || {};
  return (
    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[0.62rem] font-bold" style={styles}>
      {state === 'done'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
        : n}
    </span>
  );
}

// The notes field mashes several things into one string, in two formats:
//   bridal:      "Ready by: 11 AM. <free-text comment>"
//   non-bridal:  "<comment> | ⏰ surcharge | Ready by: 9 AM | ✈️ travel"
// Split it back out so each piece can be laid out (and labeled) on its own.
function parseBookingNotes(raw) {
  const empty = { readyBy: '', comment: '', flags: [] };
  if (!raw) return empty;
  const text = raw.replace(/^\s*\|\s*/, '').trim();
  if (!text) return empty;

  if (text.includes('|')) {
    let readyBy = '';
    const flags = [];
    const rest = [];
    for (const seg of text.split('|').map(s => s.trim()).filter(Boolean)) {
      const m = seg.match(/^Ready by:\s*(.+)$/i);
      if (m) readyBy = /not specified/i.test(m[1]) ? '' : m[1].trim();
      // The signed-agreement chip has its own "Service Agreement" section below,
      // so it must never leak into the free-text comment.
      else if (/^✍️/.test(seg) || /Agreement\s+\S+\s+signed by/i.test(seg)) continue;
      else if (/early arrival|⏰/i.test(seg)) flags.push(seg.replace(/^⏰\s*/, '').trim());
      else if (/travel/i.test(seg) || seg.includes('✈️')) flags.push(seg.replace(/^✈️\s*/, '').trim());
      else rest.push(seg);
    }
    return { readyBy, comment: rest.join(' ').trim(), flags };
  }

  // bridal / plain: "Ready by: X. <comment>" — greedy [^.]+ stops at the first
  // period (ready-by times never contain one), so the time and the free-text
  // comment land in separate groups.
  const m = text.match(/^Ready by:\s*([^.]+)\.?\s*([\s\S]*)$/i);
  if (m) {
    const readyBy = /not specified/i.test(m[1]) ? '' : m[1].trim();
    return { readyBy, comment: (m[2] || '').trim(), flags: [] };
  }
  return { readyBy: '', comment: text, flags: [] };
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

function DayPeek({ dateKey, bookings = [], classRegs = [], dm, excludeConsultOf, draftTime, onOpenFull }) {
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
  const railBg = dm ? '#23232b' : '#F4F1F3';
  const muted = dm ? '#8b8b95' : '#9c9ca6';

  return (
    <div className="mt-2.5">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[0.8rem] font-medium tabular-nums" style={{ color: dm ? '#ECEDF1' : '#1a1a1f' }}>
          {weekday} {d.getDate()}
        </span>
        <span className="text-[0.68rem]" style={{ color: muted }}>
          {timed.length + untimed.length === 0 ? 'open' : `${timed.length + untimed.length} booked`}
        </span>
        <span className="flex-1" />
        {onOpenFull && (
          <button type="button" onClick={onOpenFull} title="Open full schedule"
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: muted, background: dm ? '#26262e' : '#F4F1F3' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        )}
      </div>

      {/* The rail */}
      <div className="relative rounded-[5px] overflow-hidden" style={{ height: 26, background: railBg }}>
        {timed.map(ev => (
          <span key={ev.id} title={ev.name} className="absolute top-0 bottom-0"
            style={{ left: `${pct(ev.start)}%`, width: `${Math.max(pct(ev.end) - pct(ev.start), 1.5)}%`, background: ev.color }} />
        ))}
        {draft && (
          <span className="absolute top-0 bottom-0 rounded-[3px]"
            style={{
              left: `${pct(draft.start)}%`,
              width: `${Math.max(pct(draft.end) - pct(draft.start), 1.5)}%`,
              background: `${CONSULT_COLOR}2e`,
              border: `1.5px dashed ${CONSULT_COLOR}`,
            }} />
        )}
      </div>

      {/* Hour ticks */}
      <div className="relative h-3 mt-0.5">
        {RAIL_TICKS.map(h => (
          <span key={h} className="absolute text-[0.68rem] tabular-nums -translate-x-1/2"
            style={{ left: `${pct(h * 60)}%`, color: muted }}>
            {h > 12 ? h - 12 : h}
          </span>
        ))}
      </div>

      {untimed.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {untimed.map(ev => (
            <span key={ev.id} className="flex items-center gap-1.5 text-[0.68rem]" style={{ color: muted }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }} />
              {ev.name}, no time set
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ConsultationScheduler({ booking, onUpdateBooking, dm, onSent, bridal, confirmed, dateFormatted, expanded, setExpanded, onDraftChange, renderDayPeek }) {
  const hasConsult = !!booking.consultation_date;
  // Bridal booking already confirmed (via "confirm now, schedule later") but
  // with no consultation yet: send just the consultation email, don't re-send
  // the confirmation or touch status.
  const consultOnly = bridal && confirmed && !hasConsult;
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
          topic: `Makeup by Roko — Consultation with ${booking.name || 'Client'}`,
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

  const border = dm ? '#3a3a48' : '#e5e5e5';
  const inputBg = dm ? '#1c1c28' : '#fafafa';
  const inputColor = dm ? '#e4e4e7' : '#111';
  const textMuted = dm ? '#71717a' : '#999';
  const inputStyle = { border: `1px solid ${border}`, background: inputBg, color: inputColor, fontSize: '16px' };

  return (
    <div className={bridal ? '' : 'mb-6'}>
      {!bridal && (
        <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-3">Consultation</p>
      )}

      {/* Scheduled state */}
      {hasConsult && !expanded && (
        <div className="flex items-center justify-between px-4 py-4 rounded-2xl transition-all"
          style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#E5E5EC'}`, borderLeft: `3px solid ${CONSULT_COLOR}`, boxShadow: dm ? 'none' : '0 2px 10px rgba(30, 30, 40,0.05)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CONSULT_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[0.78rem] font-semibold" style={{ color: dm ? CONSULT_DM : CONSULT_COLOR }}>
                {booking.consultation_type} · {booking.consultation_time}
              </p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#71717a' : '#999' }}>
                {booking.consultation_date && new Date(booking.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {(meetingId || parsed.meetingId) ? (
                <button type="button"
                  onClick={() => openZoomRoom(meetLink || parsed.link, meetingId || parsed.meetingId)}
                  className="text-[0.65rem] mt-1.5 inline-flex items-center gap-1.5 font-semibold"
                  style={{ color: dm ? CONSULT_DM : CONSULT_COLOR }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                  </svg>
                  Join
                </button>
              ) : parsed.link ? (
                <a href={parsed.link} target="_blank" rel="noopener noreferrer"
                  className="text-[0.65rem] mt-1 block truncate underline underline-offset-2"
                  style={{ color: dm ? '#71717a' : '#999' }}>
                  {parsed.link}
                </a>
              ) : null}
              {parsed.notes && (
                <p className="text-[0.65rem] mt-0.5" style={{ color: dm ? '#52525b' : '#bbb' }}>{parsed.notes}</p>
              )}
            </div>
          </div>
          <button onClick={() => { setExpanded(true); setSent(false); }}
            className="ml-3 flex-shrink-0 px-3.5 py-1.5 rounded-full text-[0.68rem] font-medium tracking-[0.06em] uppercase transition-all active:scale-95"
            style={{ background: CONSULT_BG, color: dm ? CONSULT_DM : CONSULT_COLOR, border: `1px solid ${CONSULT_BORDER}` }}>
            Reschedule
          </button>
        </div>
      )}

      {/* Empty state */}
      {!hasConsult && !expanded && (
        <button onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all touch-manipulation hover:opacity-90"
          style={{ background: dm ? '#27272a' : '#fff', border: `1px dashed ${dm ? '#4a4a58' : '#d9cfe8'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CONSULT_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="text-left">
              <p className="text-[0.82rem] font-semibold" style={{ color: dm ? CONSULT_DM : CONSULT_COLOR }}>{bridal && !confirmed ? 'Confirm & Schedule Consultation' : 'Schedule Consultation'}</p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#52525b' : '#bbb' }}>
                {bridal && !confirmed ? 'Sends one email: confirmation + consultation + upload link'
                  : bridal ? 'Sends the consultation details, with a Zoom link if you add one'
                  : 'Set date, time & meeting type'}
              </p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="2" className="w-3.5 h-3.5 opacity-40">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {/* Picker */}
      {expanded && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${dm ? '#3a3a48' : '#E5E5EC'}`, boxShadow: dm ? 'none' : '0 2px 10px rgba(30, 30, 40,0.05)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5"
            style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#EDEDF3'}` }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CONSULT_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>{hasConsult ? 'Reschedule Consultation' : 'Schedule Consultation'}</p>
              <p className="text-[0.68rem] mt-0.5 truncate" style={{ color: dm ? '#a1a1aa' : '#9A9AA3' }}>
                {hasConsult
                  ? 'Client gets an updated email'
                  : (bridal && !confirmed ? 'One email: confirmation, details, upload link' : 'Date, time and meeting type')}
              </p>
            </div>
            <button onClick={() => { setExpanded(false); setShowConfirmSend(false); }} aria-label="Close scheduler"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 flex-shrink-0"
              style={{ background: dm ? '#3f3f46' : '#EDEDF3', color: dm ? '#a1a1aa' : '#83838d' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="p-5 flex flex-col gap-5" style={{ background: dm ? '#27272a' : '#fff' }}>
            {/* Date + Time window */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-2" style={{ color: textMuted }}>Date</label>
                <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent={CONSULT_COLOR} />
                {/* What that day already holds, so picking a time never means
                    leaving the card to go check the schedule. */}
                {renderDayPeek?.(form.date, form.time)}
              </div>
              <div>
                <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-2" style={{ color: textMuted }}>
                  Time <span style={{ textTransform: 'none', letterSpacing: 0, color: dm ? '#52525b' : '#c4b8bf' }}>— 30 min meeting</span>
                </label>
                <TimeWindowPicker value={form.time} onChange={v => set('time', v)} slots={TIME_SLOTS} dm={dm} accent={CONSULT_COLOR} />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-2" style={{ color: textMuted }}>Meeting Type</label>
              <div className="flex gap-2">
                {['Zoom', 'Phone'].map(key => (
                  <button key={key} type="button" onClick={() => set('type', key)}
                    className="flex-1 py-3 rounded-[6px] text-[0.68rem] font-medium tracking-[0.06em] uppercase transition-all touch-manipulation"
                    style={form.type === key
                      ? { background: '#111', color: '#fff', border: '1px solid #111' }
                      : { background: inputBg, color: dm ? '#71717a' : '#888', border: `1px solid ${border}` }
                    }>
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom meeting link */}
            {form.type === 'Zoom' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: textMuted }}>Zoom Link</label>
                  {meetLink && (
                    <button type="button" onClick={generateZoomLink} disabled={generatingLink}
                      className="flex items-center gap-1 text-[0.65rem] font-semibold px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: dm ? '#2a2a32' : '#f7f2f6', color: CONSULT_COLOR, border: `1px solid ${border}` }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      New Link
                    </button>
                  )}
                </div>

                {!meetLink ? (
                  <button type="button" onClick={generateZoomLink} disabled={generatingLink}
                    className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation active:scale-[0.99]"
                    style={{ minHeight: '48px', fontSize: '14px', background: generatingLink ? (dm ? '#1c1c28' : '#EDEDF3') : CONSULT_COLOR, color: generatingLink ? (dm ? '#52525b' : '#bbb') : '#fff', border: 'none', boxShadow: 'none' }}>
                    {generatingLink ? (
                      <><div className="w-4 h-4 rounded-full animate-spin border-2" style={{ borderColor: `${CONSULT_COLOR}30`, borderTopColor: CONSULT_COLOR }} /> Generating…</>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                        </svg>
                        Generate Zoom Link
                      </>
                    )}
                  </button>
                ) : (
                  <button type="button" onClick={copyMeetLink}
                    className="w-full px-4 rounded-xl text-left transition-all flex items-center justify-between gap-3 touch-manipulation"
                    style={{ minHeight: '48px', background: linkCopied ? (dm ? '#14532d' : '#f0fdf4') : inputBg, border: `1.5px solid ${linkCopied ? '#22c55e' : CONSULT_COLOR}` }}>
                    <span className="text-[0.73rem] font-medium truncate" style={{ color: linkCopied ? '#16a34a' : (dm ? CONSULT_DM : CONSULT_COLOR) }}>
                      {meetLink}
                    </span>
                    <span className="text-[0.65rem] font-semibold flex-shrink-0 px-2.5 py-1 rounded-lg"
                      style={{ background: linkCopied ? '#22c55e' : CONSULT_COLOR, color: '#fff' }}>
                      {linkCopied ? '✓ Copied' : 'Copy'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-2" style={{ color: textMuted }}>
                Notes <span style={{ color: dm ? '#52525b' : '#C9C9D2', textTransform: 'none', letterSpacing: 0 }}>— optional</span>
              </label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                placeholder="Any extra info for the client…"
                className="w-full px-4 py-3 rounded-[10px] outline-none resize-none transition-shadow focus:ring-2 focus:ring-[#6B5A93]/25"
                style={{ ...inputStyle, minHeight: '80px' }} />
            </div>

            {/* CTA */}
            {!showConfirmSend ? (
              <button onClick={() => { if (form.date && form.time) setShowConfirmSend(true); }} disabled={!form.date}
                className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation active:scale-[0.99]"
                style={{
                  minHeight: '50px', fontSize: '14px',
                  ...(!form.date
                    ? { background: dm ? '#2e2e38' : '#ECECF0', color: dm ? '#52525b' : '#bbb', cursor: 'not-allowed' }
                    : { background: '#111', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }),
                }}>
                {migrated ? 'Send Welcome + Notify Client' : hasConsult ? 'Reschedule & Notify Client' : consultOnly ? 'Schedule & Notify Client' : 'Confirm & Notify Client'}
              </button>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#E0E0E8'}` }}>
                <div className="px-4 py-4" style={{ background: dm ? '#1c1c28' : '#FBF9F7' }}>
                  <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-3" style={{ color: dm ? CONSULT_DM : CONSULT_COLOR }}>{migrated ? 'Send Welcome Email?' : hasConsult ? 'Send Updated Time?' : consultOnly ? 'Send Consultation Details?' : 'Confirm & Send Email?'}</p>
                  <div className="flex flex-col gap-1.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.72rem]" style={{ color: dm ? '#71717a' : '#999' }}>Date</span>
                      <span className="text-[0.82rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>{form.date ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.72rem]" style={{ color: dm ? '#71717a' : '#999' }}>Time</span>
                      <span className="text-[0.82rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>{form.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.72rem]" style={{ color: dm ? '#71717a' : '#999' }}>Type</span>
                      <span className="text-[0.82rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>{form.type}</span>
                    </div>
                  </div>
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
                      <div className="mb-4">
                        <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-2" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>
                          One email to <span style={{ color: dm ? CONSULT_DM : CONSULT_COLOR, textTransform: 'none', letterSpacing: 0 }}>{booking.email}</span> with:
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {items.map((it, i) => (
                            <p key={i} className="flex items-start gap-2 text-[0.72rem] leading-snug" style={{ color: dm ? '#a1a1aa' : '#666' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" className="w-3 h-3 mt-[2px] flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                              <span className="min-w-0">{it}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex gap-2">
                    <button onClick={() => setShowConfirmSend(false)}
                      className="flex-1 py-3 rounded-[6px] text-[0.75rem] font-semibold transition-all touch-manipulation"
                      style={{ background: dm ? '#27272a' : '#fff', color: dm ? '#71717a' : '#888', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                      Cancel
                    </button>
                    <button onClick={() => { setShowConfirmSend(false); handleSend(); }} disabled={saving}
                      className="flex-1 py-3 rounded-[6px] text-[0.75rem] font-semibold transition-all touch-manipulation flex items-center justify-center gap-2"
                      style={{ background: '#111', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
                      {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</> : 'Yes, Send Email'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {sent && (
              <div className="flex items-center justify-center gap-1.5 py-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-blue-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-[0.75rem] font-medium text-blue-600">{migrated ? 'Welcome email sent, client notified.' : hasConsult ? 'Consultation rescheduled, client notified.' : 'Consultation scheduled, client notified.'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// One appointment line in the client profile panel's Upcoming / Past lists.
function ApptRow({ b, isCurrent, last, dm }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5"
      style={{ borderBottom: last ? 'none' : `1px solid ${dm ? '#2a2a32' : '#ECECF2'}` }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[b.status] || '#999' }} />
        <div className="min-w-0">
          <p className="text-[0.85rem] font-medium flex items-center gap-2 min-w-0" style={{ color: dm ? '#ECEDF1' : '#111' }}>
            <span className="truncate">{b.service || 'Appointment'}</span>
            {isCurrent && <span className="flex-shrink-0 text-[0.68rem] font-medium tracking-[0.06em] uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(196,132,154,0.15)', color: '#C4849A' }}>This one</span>}
          </p>
          <p className="text-[0.72rem] mt-0.5" style={{ color: dm ? '#71717a' : '#aaa' }}>
            {b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
            {b.time ? ` · ${b.time}` : ''}
          </p>
        </div>
      </div>
      <StatusBadge status={b.status} />
    </div>
  );
}

export default function BookingDetail({ booking, onBack, onUpdateStatus, onUpdateBooking, onDelete, allBookings, classRegs = [], darkMode: dm }) {
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
  const openSchedule = () => {
    setScheduleDay(
      (consultExpanded && consultDraft?.date) ? consultDraft.date
        : (showTimePicker && pendingDate) ? pendingDate
        : (booking.date || scheduleDay)
    );
    setShowSchedule(true);
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
  // The card only slides aside for the drawer on very wide screens (2xl).
  const [wide2xl, setWide2xl] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1536px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1536px)');
    const fn = (ev) => setWide2xl(ev.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  // Roko's own private notes on this booking (never shown to the client). Seeded
  // from the row; re-synced whenever a different booking is opened.
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes || '');
  const [notesEditing, setNotesEditing] = useState(false);
  useEffect(() => { setAdminNotes(booking.admin_notes || ''); setNotesEditing(false); }, [booking.id, booking.admin_notes]);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
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

    // Wedding-day bridal: keep the inquiry's wedding date in step with the appt.
    if (dateChanged && isWeddingDayService && bridalInquiry?.id) {
      api.entities.BridalInquiry.update(bridalInquiry.id, { wedding_date: pendingDate })
        .then(() => queryClient.invalidateQueries({ queryKey: ['bridal-inquiry'] }))
        .catch(err => console.error('wedding_date sync:', err));
    }

    if (!willEmail) {
      setShowTimePicker(false);
      showToast(changed ? 'Appointment updated' : 'No changes made', '#888');
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
      showToast(panelAttach ? `Update sent, awaiting re-sign` : `Update emailed to ${firstName}`, '#22c55e');
    } catch (err) {
      alert(`The change was saved, but the email didn't send (${err?.message || 'unknown error'}). You can message ${firstName} from the card.`);
      setShowTimePicker(false);
    } finally {
      setPanelSending(false);
    }
  };

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
      showToast(attachContract ? 'Update sent, awaiting re-sign' : 'Email sent to client', '#22c55e');
    } catch (err) {
      alert(err?.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };
  const [consultExpanded, setConsultExpanded] = useState(false);
  const consultRef = useRef(null);
  const composeRef = useRef(null);
  const timeSectionRef = useRef(null);

  const showToast = (msg, color) => {
    setToast({ message: msg, color });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2200);
  };

  const saveAdminNotes = () => {
    const v = adminNotes.trim();
    onUpdateBooking({ admin_notes: v || null });
    setNotesEditing(false);
    showToast('Notes saved', '#888');
  };

  // Travel is recorded as a note flag by the booking form. The confirmation
  // email uses it to decide whether to print the studio address, which would
  // send a travel client to entirely the wrong place.
  const travels = /travel|✈/i.test(booking.notes || '');

  const handleStatusChange = (s) => {
    if (booking.status === s) return;
    // Bridal: confirming happens by scheduling the consultation, which sends one
    // combined email. Tapping "Confirmed" just opens the scheduler — no status
    // change and no email until "Confirm & Notify Client" is pressed.
    if (isBridal && s === 'confirmed') {
      setConsultExpanded(true);
      setTimeout(() => { if (consultRef.current) lenisScrollTo(consultRef.current, { offset: -80 }); }, 60);
      return;
    }
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
      showToast(isReconfirm ? 'Reconfirmed, client notified' : 'Appointment confirmed', '#2563EB');
      // Bridal confirmations go out through the combined consultation email, so
      // never fire the standalone confirmation email for them.
      if (booking.email && !isBridal) {
        fetch('/api/send-booking-confirmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, firstName: booking.name?.split(' ')[0] || 'there', serviceName: booking.service, dateFormatted, time: booking.time, travels }),
        }).catch(err => console.error('confirmed email error:', err));
      }
    } else if (s === 'cancelled') {
      showToast('Appointment cancelled', '#ef4444');
      if (booking.email) {
        fetch('/api/on-booking-cancelled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, name: booking.name?.split(' ')[0] || booking.name || 'there', service: booking.service, date: dateFormatted }),
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

  const { data: bridalInquiry } = useQuery({
    queryKey: ['bridal-inquiry', booking.upload_token, booking.email],
    queryFn: async () => {
      // The inquiry and its booking share an upload_token — the exact 1:1 link.
      // Fall back to email in case an older booking has no token.
      if (booking.upload_token) {
        const byToken = await api.entities.BridalInquiry.filter({ upload_token: booking.upload_token });
        if (byToken[0]) return byToken[0];
      }
      if (booking.email) {
        const byEmail = await api.entities.BridalInquiry.filter({ email: booking.email });
        if (byEmail[0]) return byEmail[0];
      }
      return null;
    },
    enabled: isBridal && (!!booking.upload_token || !!booking.email),
  });

  // Derived bridal values for the redesigned details block
  const biWedding = bridalInquiry?.wedding_date && bridalInquiry.wedding_date !== 'partial'
    ? new Date(bridalInquiry.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
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

  // "Confirm now, schedule the consultation later": sends the confirmation
  // email (minus the consultation panel) so Roko can lock the date before a
  // consult time is agreed. The hub keeps a standing reminder until it's set.
  const [confirmLaterOpen, setConfirmLaterOpen] = useState(false);
  const [confirmLaterSending, setConfirmLaterSending] = useState(false);
  const confirmNowScheduleLater = async () => {
    if (confirmLaterSending) return;
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
      showToast('Confirmed, client notified', '#2563EB');
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
      renderDayPeek={(d, t) => (!showSchedule && d ? (
        <DayPeek
          dateKey={d}
          bookings={allBookings}
          classRegs={classRegs}
          dm={dm}
          excludeConsultOf={booking.id}
          draftTime={t}
          onOpenFull={() => { setScheduleDay(d); setShowSchedule(true); }}
        />
      ) : null)}
      onSent={() => showToast(
        booking.consultation_date ? 'Rescheduled, client notified'
          : isBridal && booking.status !== 'confirmed' ? 'Confirmed, client notified'
          : 'Consultation scheduled, client notified',
        '#22c55e')}
    />
  );

  // Signed service agreement (contract) shown on the booking.
  const contractOverrides = useContractOverrides();
  const contractSignedAt = booking.contract_signed_at
    ? new Date(booking.contract_signed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Service Agreement — ${esc(booking.name)}</title>
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
  }, []);

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
        showToast('Appointment confirmed', '#2563EB');
        fetch('/api/send-booking-confirmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, firstName: (data.name || booking.name)?.split(' ')[0] || 'there', serviceName: data.service || booking.service, dateFormatted: editDate, time: data.time || booking.time, travels }),
        }).catch(err => console.error('confirmed email error:', err));
      } else if (newStatus === 'cancelled') {
        showToast('Appointment cancelled', '#ef4444');
        fetch('/api/on-booking-cancelled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, name: (data.name || booking.name)?.split(' ')[0] || 'there', service: data.service || booking.service, date: editDate }),
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

  const heroStart = parseRange(booking.time || '').start;
  const heroEnd = parseRange(booking.time || '').end;
  const heroDate = booking.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date set';
  const bookedOn = booking.created_date
    ? new Date(booking.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="max-w-[1100px] mx-auto transition-[margin] duration-300"
      style={{ marginRight: showSchedule && wide2xl ? scheduleW + 20 : undefined }}>
      {/* ── Booksy-style status hero ── */}
      <div className="relative mb-6">
        <div className="rounded-2xl px-5 pt-4 pb-14 text-center"
          style={{ background: HERO_GRADIENTS[booking.status] || HERO_GRADIENTS.pending }}>
          <div className="flex items-center justify-between">
            <button onClick={onBack} aria-label="Back to list"
              className="w-10 h-10 -ml-1.5 rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-white/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div className="min-w-0 px-2">
              <p className="text-white font-bold tracking-[0.16em] uppercase text-[1.25rem] leading-none">{booking.status || 'pending'}</p>
              <p className="text-white/70 text-[0.64rem] mt-1.5 truncate tabular-nums">
                ID: {String(booking.id || '').slice(0, 8).toUpperCase()}{bookedOn ? ` · Booked ${bookedOn}` : ''}
              </p>
            </div>
            <button onClick={() => setShowEdit(true)}
              className="px-3 py-2 -mr-1 rounded-lg text-[0.8rem] font-semibold text-white transition-all active:scale-95 hover:bg-white/10">
              Edit
            </button>
          </div>
        </div>

        {/* START | DATE card, overlapping the banner like Booksy */}
        <button type="button"
          onClick={() => {
            openTimePicker();
            setTimeout(() => { if (timeSectionRef.current) lenisScrollTo(timeSectionRef.current, { offset: -80 }); }, 60);
          }}
          className="relative w-[calc(100%-24px)] sm:w-[calc(100%-40px)] mx-auto -mt-10 grid grid-cols-[1fr_auto_1fr] items-center rounded-xl px-1 py-3.5 text-left transition-all active:scale-[0.995]"
          style={{
            background: dm ? '#27272a' : '#fff',
            border: `1px solid ${dm ? '#3f3f46' : '#eee'}`,
            boxShadow: dm ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(28, 28, 38,0.12)',
          }}>
          <div className="px-4 min-w-0">
            <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#71717a' : '#A2A2AA' }}>Start</p>
            <p className="text-[1.05rem] font-semibold mt-0.5 truncate tabular-nums" style={{ color: dm ? '#ECEDF1' : '#111' }}>
              {heroStart || 'Set time'}
            </p>
            {heroEnd && <p className="text-[0.64rem] tabular-nums" style={{ color: dm ? '#71717a' : '#a8a8b1' }}>until {heroEnd}</p>}
          </div>
          <div className="w-px self-stretch" style={{ background: dm ? '#3a3a44' : '#EAEAF0' }} />
          <div className="px-4 min-w-0 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#71717a' : '#A2A2AA' }}>Date</p>
              <p className="text-[1.05rem] font-semibold mt-0.5 truncate" style={{ color: dm ? '#ECEDF1' : '#111' }}>{heroDate}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#bcbcc4'} strokeWidth="2" className="w-4 h-4 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      </div>

      <div className="rounded-[6px] p-6 sm:p-8 mb-6" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#e5e5e5'}` }}>
        {/* Header. No status chip here: the hero above already states it in
            colour, at size, a few hundred pixels up the same screen. */}
        <div className="flex items-start mb-6 gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar + name both open the full client profile screen. */}
            <button type="button" onClick={() => setShowClientPanel(true)} aria-label={`View ${booking.name || 'client'} profile`}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[1rem] transition-all active:scale-95"
              style={{ background: dm ? 'rgba(212,160,176,0.16)' : '#F5E6EC', color: dm ? '#e7c9d5' : '#8A4A63' }}>
              {(booking.name || '?').trim().charAt(0).toUpperCase()}
            </button>
            <div className="min-w-0">
              {booking.service && (
                <span className="inline-block mb-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-[0.04em] text-[0.82rem] leading-none"
                  style={{ background: dm ? 'rgba(196,132,154,0.20)' : '#F7E4EC', color: dm ? '#EDB8CB' : '#B0587A' }}>
                  {booking.service}
                </span>
              )}
              {booking.source === 'booksy' && (
                <span className="inline-block mb-1.5 ml-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-[0.08em] text-[0.6rem] leading-none align-middle"
                  style={{ background: dm ? 'rgba(14,165,175,0.18)' : '#E0F5F6', color: dm ? '#5EEAD4' : '#0E8F98' }}
                  title="Imported from Booksy">
                  Booksy import
                </span>
              )}
              <button onClick={() => setShowClientPanel(true)}
                className="group font-serif text-[1.5rem] leading-tight transition-colors text-left flex items-center gap-1.5 max-w-full"
                style={{ color: dm ? '#e4e4e7' : '#111' }}>
                <span className="truncate">{booking.name}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#5b5560' : '#c9bcc3'} strokeWidth="2.4" className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-active:translate-x-0.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {booking.phone && (
                <p className="text-[0.8rem] mt-0.5 truncate tabular-nums" style={{ color: dm ? '#71717a' : '#999' }}>
                  {formatPhone(booking.phone)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-1">Date & Time</p>
            <p className="text-[0.9rem] font-medium" style={{ color: dm ? '#ECEDF1' : '#111' }}>{dateFormatted}</p>
            {booking.time && <p className="text-[0.85rem]" style={{ color: dm ? '#D4A0B0' : '#888' }}>{booking.time}</p>}
          </div>
          <div>
            <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-1">Contact</p>
            {booking.email && <a href={`mailto:${booking.email}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block" style={{ color: dm ? '#e4e4e7' : '#111' }}>{booking.email}</a>}
            {booking.phone && <a href={`sms:${phoneHref(booking.phone)}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block mt-0.5 tabular-nums" style={{ color: dm ? '#71717a' : '#999' }}>{formatPhone(booking.phone)}</a>}
            {booking.email && !showCompose && (
              <button
                type="button"
                onClick={openCompose}
                className="mt-2.5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[0.68rem] font-medium tracking-[0.06em] uppercase transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: '#C4849A', color: '#fff' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
                Message client
              </button>
            )}
          </div>
        </div>

        {/* Contact composer — Roko's personal email, sent as roko@makeupbyroko.org */}
        {showCompose && (
          <div ref={composeRef} className="mb-6 rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${dm ? '#3a3a48' : '#E5E5EC'}`, boxShadow: dm ? 'none' : '0 2px 10px rgba(30, 30, 40,0.05)' }}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#EDEDF3'}` }}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: dm ? 'rgba(212,160,176,0.14)' : 'rgba(212,160,176,0.16)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>Message Client</p>
                <p className="text-[0.68rem] mt-0.5 truncate" style={{ color: dm ? '#a1a1aa' : '#9A9AA3' }}>
                  To <span style={{ color: dm ? '#e7c9d5' : '#8A4A63', fontWeight: 600 }}>{booking.email}</span> · sends from roko@makeupbyroko.org
                </p>
              </div>
              <button type="button" onClick={() => setShowCompose(false)} aria-label="Close composer"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 flex-shrink-0"
                style={{ background: dm ? '#3f3f46' : '#EDEDF3', color: dm ? '#a1a1aa' : '#83838d' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3" style={{ background: dm ? '#1e1e24' : '#fff' }}>
              {/* Date/time changes don't live here — route her to the one panel. */}
              <button type="button" onClick={() => { setShowCompose(false); openTimePicker(); }}
                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.64rem] font-semibold transition-all hover:opacity-85"
                style={{ background: dm ? '#2e2e38' : '#FBF5F7', color: dm ? '#e7c9d5' : '#8A4A63', border: `1px solid ${dm ? '#3a3a48' : '#EFDFE6'}` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Changing the date or time? Do it here →
              </button>

              <div>
                <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>Subject</label>
                <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] outline-none transition-shadow focus:ring-2 focus:ring-[#D4A0B0]/30"
                  style={{ fontSize: '15px', border: `1px solid ${dm ? '#3a3a48' : '#E3E3EA'}`, background: dm ? '#27272a' : '#FBF9F7', color: dm ? '#e4e4e7' : '#111' }} />
              </div>

              <div>
                <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>Message</label>
                <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={7}
                  placeholder="Write your message…"
                  className="w-full px-3.5 py-2.5 rounded-[10px] outline-none resize-y transition-shadow focus:ring-2 focus:ring-[#D4A0B0]/30"
                  style={{ fontSize: '15px', minHeight: '150px', lineHeight: 1.6, border: `1px solid ${dm ? '#3a3a48' : '#E3E3EA'}`, background: dm ? '#27272a' : '#FBF9F7', color: dm ? '#e4e4e7' : '#111' }} />
                <p className="text-[0.62rem] mt-1.5" style={{ color: dm ? '#52525b' : '#b6b6bf' }}>Sent on your branded template. Line breaks are kept.</p>
              </div>

              {/* Attach updated agreement — for scope changes that aren't date or
                  time (a date/time change re-signs from the Appointment panel). */}
              <button type="button" onClick={() => setAttachContract(a => !a)}
                className="flex items-start gap-3 text-left px-3 py-3 rounded-[6px] transition-all"
                style={{ background: attachContract ? (dm ? 'rgba(196,132,154,0.12)' : '#FBF5F7') : (dm ? '#27272a' : '#fafafa'), border: `1px solid ${attachContract ? '#D4A0B0' : (dm ? '#3a3a48' : '#e5e5e5')}` }}>
                <span className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={attachContract ? { background: '#D4A0B0', border: '1px solid #D4A0B0' } : { background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#52525b' : '#ccc'}` }}>
                  {attachContract && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <span>
                  <span className="block text-[0.76rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>Attach updated Service Agreement</span>
                  <span className="block text-[0.66rem] mt-0.5 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#888' }}>
                    For a service, location, or price change — adds a Review &amp; Sign link so their agreement matches. (Date or time changes re-sign from the Appointment panel above.)
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => setShowCompose(false)}
                  className="px-5 py-3 rounded-xl text-[0.72rem] font-semibold transition-all active:scale-[0.98]"
                  style={{ background: 'transparent', color: dm ? '#a1a1aa' : '#83838d', border: `1px solid ${dm ? '#3a3a48' : '#E0E0E8'}` }}>
                  Cancel
                </button>
                <button type="button" onClick={sendCompose} disabled={sending}
                  className="flex-1 py-3 rounded-xl text-[0.75rem] font-semibold tracking-[0.04em] transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                  style={{ background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', opacity: sending ? 0.7 : 1 }}>
                  {sending
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                    : <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        {attachContract ? 'Send email + agreement' : 'Send email'}
                      </>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update-sent indicator — the booking stays confirmed the whole time.
            The fresh signature appears in the Service Agreement panel once the
            client re-signs; no bounce back to pending. */}
        {updateNoticeSent && !showCompose && (
          <div className="mb-6 flex items-start gap-2.5 px-4 py-3 rounded-[8px]"
            style={{ background: dm ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.28)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 mt-0.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <p className="text-[0.75rem] leading-[1.5] font-medium" style={{ color: dm ? '#93b4f5' : '#2563EB' }}>
              Update sent to {firstName}, awaiting their quick re-sign. Their booking stays confirmed the whole time, the new signature will appear below once they sign.
            </p>
          </div>
        )}

        {/* ── Appointment & Notes hub ───────────────────────────────────────────
            One always-visible place for everything about timing: the appointment
            window, what the client asked to be ready by, and Roko's own private
            notes. Changing the time and opening the day schedule both live here,
            so there's no separate time section further down the card. */}
        <div ref={timeSectionRef} className="mb-6 flex flex-col gap-3">
          {/* Appointment / ready-by card */}
          <div className="rounded-[14px] overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#E5E5EC'}`, background: dm ? '#1e1e24' : '#fff' }}>
            {/* Narrow screens stack the label above the buttons: side by side,
                the label plus two pills overflow and the pill text wraps mid
                word. Stacked, each pill gets a full-width tap target. */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#EDEDF3'}` }}>
              <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: '#C4849A' }}>Appointment</p>
              <div className="flex items-center gap-2 sm:gap-1.5">
                {/* Secondary. Only one button in this row gets to be filled, so
                    "Change time" reads as the action and this reads as a peek. */}
                <button type="button" onClick={openSchedule} title="See your day side by side"
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-[0.8rem] font-medium whitespace-nowrap transition-colors"
                  style={{
                    background: 'transparent',
                    color: dm ? '#b9b9c2' : '#6a6a74',
                    border: `1px solid ${dm ? '#3a3a48' : '#e4dee1'}`,
                  }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  My Schedule
                </button>
                {!showTimePicker && !(readyByMin != null && !booking.time) && (
                  <button type="button" onClick={() => openTimePicker()}
                    className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-[0.8rem] font-medium whitespace-nowrap transition-opacity hover:opacity-90"
                    style={{ background: '#C4849A', color: '#fff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {booking.time ? 'Change time' : 'Set time'}
                  </button>
                )}
                {showTimePicker && (
                  <button type="button" onClick={() => setShowTimePicker(false)} aria-label="Close"
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all active:scale-90"
                    style={{ background: dm ? '#3f3f46' : '#EDEDF3', color: dm ? '#a1a1aa' : '#83838d' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>

            {!showTimePicker ? (
              readyByMin != null && !booking.time ? (
                /* ── Decision row: no time yet, but the client said when they
                   want to be ready. Lead with the question, not two neutral
                   facts — "does that work?" is the actual decision. ── */
                <div className="px-4 py-4">
                  {showSteps && (
                    <div className="flex items-center gap-2 mb-3">
                      <StepDot n={1} state="active" dm={dm} />
                      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: '#C4849A' }}>Set the time</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: dm ? '#2e2e38' : 'rgba(212,160,176,0.12)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-5 h-5"><path d="M12 8v4l3 2"/><circle cx="12" cy="14" r="8"/><path d="M5 3 2 6M22 6l-3-3"/></svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[1.08rem] font-semibold leading-snug" style={{ color: dm ? '#ECEDF1' : '#1E1E27' }}>
                        {firstName} wants to be ready by <span style={{ color: '#C4849A', fontSize: '1.18rem' }} className="tabular-nums">{notes.readyBy}</span>
                      </p>
                      {booking.date && (
                        <p className="text-[0.7rem] mt-0.5 tabular-nums" style={{ color: dm ? '#8f8a93' : '#9A9AA3' }}>{fmtLong(booking.date)}</p>
                      )}
                      <p className="text-[0.95rem] font-semibold leading-snug mt-1.5" style={{ color: dm ? '#c9c9d1' : '#4a3c42' }}>Does that work for you?</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3.5">
                    <button type="button" onClick={() => openTimePicker('', { allowNotify: false })}
                      className="flex-1 py-3 px-4 rounded-[10px] text-[0.78rem] font-semibold tracking-[0.02em] transition-all touch-manipulation active:scale-[0.99]"
                      style={{ background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                      Yes
                    </button>
                    <button type="button" onClick={() => openTimePicker('', { notify: true })}
                      className="flex-1 py-3 px-4 rounded-[10px] text-[0.78rem] font-semibold transition-all touch-manipulation active:scale-[0.99]"
                      style={{ background: dm ? '#27272a' : '#fff', color: dm ? '#e4e4e7' : '#6B4055', border: `1px solid ${dm ? '#3a3a48' : '#e2cdd6'}` }}>
                      No, pick another time
                    </button>
                  </div>
                  {showSteps && (
                    <div className="flex items-center gap-2 mt-3.5 pt-3" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#EDEDF3'}` }}>
                      <StepDot n={2} state="todo" dm={dm} />
                      <span className="text-[0.68rem]" style={{ color: dm ? '#71717a' : '#b6aeb2' }}>
                        {isBridal ? <>Then: confirm &amp; schedule the consultation</> : <>Then: confirm &amp; notify {firstName}</>}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
              <>
                {railReady ? (
                  /* ── Step 1 done: her working window as a simple start→done
                     rail. The ready-by sits beside the header as the client's
                     ask — context, not part of Roko's working time. ── */
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      {showSteps && <StepDot n={1} state="done" dm={dm} />}
                      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Your time</p>
                    </div>
                    {/* Compact start→done rail tucked left; the client's ask gets
                        its own clear spot on the right instead of a tiny caption. */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.95rem] font-semibold leading-tight tabular-nums" style={{ color: dm ? '#ECEDF1' : '#1E1E27' }}>{parseRange(booking.time).start}</p>
                          <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mt-0.5" style={{ color: dm ? '#8f8a93' : '#A89098' }}>You start</p>
                        </div>
                        <div className="flex items-center flex-shrink-0" aria-hidden="true">
                          <span className="w-2 h-2 rounded-full" style={{ background: '#C4849A' }} />
                          <span className="w-10 h-[2.5px] mx-1 rounded-full" style={{ background: '#C4849A' }} />
                          <span className="w-2 h-2 rounded-full" style={{ background: '#C4849A' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[0.95rem] font-semibold leading-tight tabular-nums" style={{ color: dm ? '#ECEDF1' : '#1E1E27' }}>{parseRange(booking.time).end}</p>
                          <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mt-0.5" style={{ color: dm ? '#8f8a93' : '#A89098' }}>You're done</p>
                        </div>
                      </div>
                      <div className="sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0" style={{ borderColor: dm ? '#2e2e38' : '#EDEDF3' }}>
                        <p className="text-[1.05rem] font-semibold leading-tight tabular-nums" style={{ color: runsPastReady ? (dm ? '#F5B83C' : '#B26A04') : '#C4849A' }}>Ready by {notes.readyBy}</p>
                        <p className="text-[0.62rem] mt-0.5" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>what {firstName} asked for</p>
                      </div>
                    </div>
                    {runsPastReady && (
                      <p className="mt-2 text-[0.68rem] font-medium" style={{ color: dm ? '#F5B83C' : '#B26A04' }}>
                        Heads up: this ends after the {notes.readyBy} ready-by.
                      </p>
                    )}
                  </div>
                ) : (
                <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
                  {/* Appointment window */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: dm ? '#2e2e38' : 'rgba(196,132,154,0.12)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.6" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Appointment</p>
                      <p className="text-[1.02rem] font-semibold leading-tight tabular-nums" style={{ color: booking.time ? (dm ? '#ECEDF1' : '#1E1E27') : (dm ? '#71717a' : '#b6aeb2') }}>
                        {booking.time || 'Not set yet'}
                      </p>
                    </div>
                  </div>

                  {/* Ready-by — beside the appointment so the two read together */}
                  {notes.readyBy ? (
                    <>
                      <div className="hidden sm:block w-px self-stretch" style={{ background: dm ? '#2e2e38' : '#EAEAF0' }} />
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: dm ? '#2e2e38' : 'rgba(212,160,176,0.12)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-4 h-4"><path d="M12 8v4l3 2"/><circle cx="12" cy="14" r="8"/><path d="M5 3 2 6M22 6l-3-3"/></svg>
                        </span>
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Wants to be ready by</p>
                          <p className="text-[1.02rem] font-semibold leading-tight tabular-nums" style={{ color: dm ? '#ECEDF1' : '#1E1E27' }}>{notes.readyBy}</p>
                        </div>
                      </div>
                    </>
                  ) : <span className="hidden sm:block" />}
                </div>
                )}

                {/* Travel / early-arrival flags */}
                {notes.flags.length > 0 && (
                  <div className="px-4 pb-4 -mt-1 flex flex-wrap gap-2">
                    {notes.flags.map((f, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-[0.72rem] font-medium"
                        style={{ background: dm ? 'rgba(240,194,122,0.12)' : '#FBF3E8', border: `1px solid ${dm ? 'rgba(240,194,122,0.25)' : '#F0E0C8'}`, color: dm ? '#e8c89a' : '#C76BA6' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </>
              )
            ) : (
              /* ── The ONE reschedule panel: pick the date + window, optionally
                 notify the client (note + agreement) — one CTA does it all. ── */
              <div className="px-4 py-4">
                {notes.readyBy && (
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: dm ? '#2e2e38' : 'rgba(212,160,176,0.12)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-4 h-4"><path d="M12 8v4l3 2"/><circle cx="12" cy="14" r="8"/><path d="M5 3 2 6M22 6l-3-3"/></svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.92rem] font-semibold leading-tight" style={{ color: dm ? '#ECEDF1' : '#1E1E27' }}>
                        {firstName} wants to be ready by <span className="tabular-nums" style={{ color: '#C4849A' }}>{notes.readyBy}</span>
                      </p>
                      {booking.date && (
                        <p className="text-[0.68rem] mt-0.5 tabular-nums" style={{ color: dm ? '#8f8a93' : '#9A9AA3' }}>{fmtLong(booking.date)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Date — quiet by default; most reschedules are time-only */}
                <div className="mb-4">
                  <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>
                    Date {pendingDate && pendingDate !== booking.date && <span className="tabular-nums" style={{ textTransform: 'none', letterSpacing: 0, color: '#C4849A' }}>— moving to {fmtShort(pendingDate)}</span>}
                  </label>
                  <AdminDatePicker value={pendingDate} onChange={onPickDate} dm={dm} accent="#C4849A" />
                </div>

                <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>Time</label>
                <TimeWindowPicker value={pendingWindow} onChange={onPickWindow} slots={APPT_TIMES} dm={dm} accent="#D4A0B0" />

                {/* Notify the client — hidden on the "yes, that works" path (nothing
                    to tell them); pre-flipped for everything else. */}
                {allowNotify && (
                <div className="mt-4 rounded-[10px] overflow-hidden" style={{ border: `1px solid ${notifyClient ? '#D4A0B0' : (dm ? '#3a3a48' : '#E0E0E8')}` }}>
                  <button type="button" onClick={() => booking.email && setNotifyClient(v => !v)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left transition-all"
                    style={{ background: notifyClient ? (dm ? 'rgba(196,132,154,0.1)' : '#FBF5F7') : (dm ? '#27272a' : '#fafafa'), cursor: booking.email ? 'pointer' : 'default' }}>
                    <span className="min-w-0">
                      <span className="block text-[0.76rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>Email {firstName} about this change</span>
                      <span className="block text-[0.64rem] mt-0.5" style={{ color: dm ? '#8f8a93' : '#9A9AA3' }}>
                        {!booking.email ? 'No email on file — it just updates quietly.'
                          : notifyClient ? 'They get your note below with the new date & time.'
                          : 'Off — it updates quietly, no email.'}
                      </span>
                    </span>
                    <span className="w-10 h-6 rounded-full flex-shrink-0 relative transition-all"
                      style={{ background: notifyClient ? '#C4849A' : (dm ? '#3f3f46' : '#ddd'), opacity: booking.email ? 1 : 0.4 }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: notifyClient ? 18 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                    </span>
                  </button>

                  {notifyClient && booking.email && (
                    <div className="px-3.5 py-3.5 flex flex-col gap-3" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0e8ec'}`, background: dm ? '#1e1e24' : '#fff' }}>
                      <div>
                        <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>Subject</label>
                        <input value={panelSubject} onChange={e => { setPanelSubject(e.target.value); setPanelEdited(true); }}
                          className="w-full px-3.5 py-2.5 rounded-[10px] outline-none transition-shadow focus:ring-2 focus:ring-[#D4A0B0]/30"
                          style={{ fontSize: '15px', border: `1px solid ${dm ? '#3a3a48' : '#E3E3EA'}`, background: dm ? '#27272a' : '#FBF9F7', color: dm ? '#e4e4e7' : '#111' }} />
                      </div>
                      <div>
                        <label className="block text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#9A9AA3' }}>
                          Message <span style={{ textTransform: 'none', letterSpacing: 0, color: dm ? '#52525b' : '#c4b8bf' }}>— written for you, edit freely</span>
                        </label>
                        <textarea value={panelBody} onChange={e => { setPanelBody(e.target.value); setPanelEdited(true); }} rows={6}
                          className="w-full px-3.5 py-2.5 rounded-[10px] outline-none resize-y transition-shadow focus:ring-2 focus:ring-[#D4A0B0]/30"
                          style={{ fontSize: '15px', minHeight: '130px', lineHeight: 1.6, border: `1px solid ${dm ? '#3a3a48' : '#E3E3EA'}`, background: dm ? '#27272a' : '#FBF9F7', color: dm ? '#e4e4e7' : '#111' }} />
                      </div>
                      <button type="button" onClick={togglePanelAttach}
                        className="flex items-start gap-3 text-left px-3 py-3 rounded-[6px] transition-all"
                        style={{ background: panelAttach ? (dm ? 'rgba(196,132,154,0.12)' : '#FBF5F7') : (dm ? '#27272a' : '#fafafa'), border: `1px solid ${panelAttach ? '#D4A0B0' : (dm ? '#3a3a48' : '#e5e5e5')}` }}>
                        <span className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                          style={panelAttach ? { background: '#D4A0B0', border: '1px solid #D4A0B0' } : { background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#52525b' : '#ccc'}` }}>
                          {panelAttach && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </span>
                        <span>
                          <span className="block text-[0.76rem] font-semibold" style={{ color: dm ? '#ECEDF1' : '#111' }}>Attach updated Service Agreement</span>
                          <span className="block text-[0.66rem] mt-0.5 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#888' }}>
                            They review &amp; sign with the new date &amp; time — everything stays confirmed.
                          </span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                )}

                <button
                  type="button"
                  disabled={!pendingStart || panelSending}
                  onClick={commitChange}
                  className="w-full mt-4 py-3.5 rounded-[8px] text-[0.78rem] font-semibold tracking-[0.02em] transition-all touch-manipulation flex items-center justify-center gap-2"
                  style={pendingStart
                    ? { background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', opacity: panelSending ? 0.7 : 1 }
                    : { background: dm ? '#27272a' : '#f5f5f5', color: dm ? '#52525b' : '#bbb', cursor: 'not-allowed' }
                  }
                >
                  {panelSending
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                    : !pendingStart
                      ? 'Tap a start time above'
                      : (() => {
                          const dateMoved = pendingDate && pendingDate !== booking.date;
                          const willEmail = allowNotify && notifyClient && booking.email && (dateMoved || pendingWindow !== booking.time);
                          return <>Set to <span className="tabular-nums">{dateMoved ? `${fmtShort(pendingDate)} · ` : ''}{pendingWindow}</span>{willEmail ? <>&nbsp;&amp; email {firstName}</> : ''}</>;
                        })()}
                </button>
              </div>
            )}

            {/* ── Step 2, non-bridal ────────────────────────────────────────
                Same shape as bridal's next-step block, one stop shorter: no
                consultation to book, so the time leads straight to confirming.
                One tap here does what the status pills at the bottom did, via
                the same code path, so the email and toast stay identical. ── */}
            {confirmInHub && !showTimePicker && (
              <div className="px-4 pb-4 pt-3.5" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#EDEDF3'}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <StepDot n={2} state="active" dm={dm} />
                  <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: '#C4849A' }}>Confirm</p>
                </div>
                <p className="text-[0.8rem] mb-3" style={{ color: dm ? '#a1a1aa' : '#8a8087' }}>
                  {booking.email
                    ? <>Time's set. Confirming emails {firstName} the details and locks it in.</>
                    : <>Time's set. No email on file, so confirming just locks it in here.</>}
                </p>
                <button
                  type="button"
                  onClick={() => setPendingStatus('confirmed')}
                  className="w-full py-3 px-4 rounded-[10px] text-[0.78rem] font-semibold tracking-[0.02em] transition-all touch-manipulation active:scale-[0.99]"
                  style={{ background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
                >
                  {booking.email ? <>Confirm &amp; Notify {firstName}</> : 'Confirm Appointment'}
                </button>
              </div>
            )}

            {/* ── Next step, right in the flow ──────────────────────────────
                Bridal with a working window set: confirming + the consultation
                live HERE, so finishing the time leads straight into the next
                thing instead of a scroll hunt to the bottom of the card. ── */}
            {schedulerInHub && !showTimePicker && (
              <div ref={consultRef} className="px-4 pb-4 pt-3.5" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#EDEDF3'}` }}>
                {booking.status === 'pending' ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <StepDot n={2} state="active" dm={dm} color={CONSULT_COLOR} />
                      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? CONSULT_DM : CONSULT_COLOR }}>Confirm &amp; consultation</p>
                    </div>
                    <p className="text-[0.8rem] mb-3" style={{ color: dm ? '#a1a1aa' : '#8a8087' }}>
                      Time's set. Confirm with {firstName} and set up the consultation.
                    </p>
                    {consultScheduler}
                    {!consultExpanded && booking.email && !confirmLaterOpen && (
                      <button type="button" onClick={() => setConfirmLaterOpen(true)}
                        className="mt-2.5 text-[0.72rem] font-medium underline underline-offset-4 transition-opacity hover:opacity-75"
                        style={{ color: dm ? '#8f8a93' : '#9A9AA3' }}>
                        or confirm now and schedule the consultation later
                      </button>
                    )}
                    {!consultExpanded && confirmLaterOpen && (
                      <div className="mt-3 rounded-xl px-4 py-4" style={{ border: `1px solid ${dm ? '#3a3a48' : '#E0E0E8'}`, background: dm ? '#1c1c28' : '#FBF9F7' }}>
                        <p className="text-[0.78rem] font-semibold mb-1" style={{ color: dm ? '#ECEDF1' : '#111' }}>Confirm without a consultation time?</p>
                        <p className="text-[0.7rem] leading-relaxed mb-3.5" style={{ color: dm ? '#71717a' : '#888' }}>
                          One email goes to <span style={{ color: '#C4849A' }}>{booking.email}</span> right now with the confirmation and photo upload link. This card will keep reminding you to schedule the consultation.
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setConfirmLaterOpen(false)}
                            className="flex-1 py-3 rounded-[6px] text-[0.75rem] font-semibold transition-all touch-manipulation"
                            style={{ background: dm ? '#27272a' : '#fff', color: dm ? '#71717a' : '#888', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                            Cancel
                          </button>
                          <button type="button" onClick={confirmNowScheduleLater} disabled={confirmLaterSending}
                            className="flex-1 py-3 rounded-[6px] text-[0.75rem] font-semibold transition-all touch-manipulation flex items-center justify-center gap-2"
                            style={{ background: '#111', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', opacity: confirmLaterSending ? 0.7 : 1 }}>
                            {confirmLaterSending ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</> : 'Yes, Confirm & Send'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : !booking.consultation_date ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <StepDot n={2} state="warn" dm={dm} />
                      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#F5B83C' : '#B26A04' }}>Consultation not scheduled yet</p>
                    </div>
                    <p className="text-[0.8rem] mb-3" style={{ color: dm ? '#a1a1aa' : '#8a8087' }}>
                      {firstName} is confirmed. Schedule the consultation once you two settle on a time.
                    </p>
                    {consultScheduler}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <StepDot n={2} state="done" dm={dm} />
                      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? CONSULT_DM : CONSULT_COLOR }}>Confirmed &amp; consultation set</p>
                    </div>
                    {consultScheduler}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reconfirm banner — appears when the time changes on a confirmed booking */}
          {showReconfirmBanner && booking.status === 'confirmed' && (
            <div className="flex items-center justify-between px-4 py-3 rounded-[10px]"
              style={{
                background: dm ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.3)',
                animation: 'fadeSlideDown 0.3s ease-out',
              }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-semibold" style={{ color: '#2563EB' }}>Booking updated</p>
                  <p className="text-[0.65rem]" style={{ color: dm ? '#71717a' : '#999' }}>Review &amp; send {firstName} the update to re-sign</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={() => openChangeNotice()}
                  className="px-3 py-1.5 rounded-lg text-[0.68rem] font-semibold text-white transition-all"
                  style={{ background: '#2563EB' }}>
                  Message {firstName} →
                </button>
                <button
                  onClick={() => setShowReconfirmBanner(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.06)', color: dm ? '#71717a' : '#aaa' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* Notes card — the client's own comment, plus Roko's private notes */}
          <div className="rounded-[14px] overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#E5E5EC'}`, background: dm ? '#1e1e24' : '#fff' }}>
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#EDEDF3'}` }}>
              <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Notes</p>
            </div>
            <div className="px-4 py-4 flex flex-col gap-4">
              {/* Client's additional comments */}
              {notes.comment && (
                <div>
                  <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: PLUM }}>From the client</p>
                  <div className="px-4 py-3" style={{ borderRadius: 10, background: dm ? 'rgba(196,132,154,0.08)' : '#FBF5F7', borderLeft: '2px solid #C4849A' }}>
                    <p className="text-[0.85rem] leading-relaxed whitespace-pre-wrap" style={{ color: dm ? '#cbb3bf' : '#6B4055' }}>{notes.comment}</p>
                  </div>
                </div>
              )}

              {/* Roko's private notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#8f8a93' : '#A89098' }}>
                    My Notes <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: dm ? '#52525b' : '#c4b8bf' }}>· private, only you</span>
                  </p>
                  {!notesEditing && (
                    <button type="button" onClick={() => setNotesEditing(true)}
                      className="inline-flex items-center gap-1 text-[0.62rem] font-semibold transition-opacity hover:opacity-75" style={{ color: '#C4849A' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      {adminNotes ? 'Edit' : 'Add'}
                    </button>
                  )}
                </div>

                {notesEditing ? (
                  <div>
                    <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} autoFocus
                      placeholder="Jot anything just for you — allergies, skin notes, reminders…"
                      className="w-full px-3.5 py-3 rounded-[10px] outline-none resize-y transition-shadow focus:ring-2 focus:ring-[#D4A0B0]/30"
                      style={{ fontSize: '15px', minHeight: '84px', lineHeight: 1.6, border: `1px solid ${dm ? '#3a3a48' : '#E3E3EA'}`, background: dm ? '#27272a' : '#FBF9F7', color: dm ? '#e4e4e7' : '#111' }} />
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => { setAdminNotes(booking.admin_notes || ''); setNotesEditing(false); }}
                        className="px-4 py-2.5 rounded-[8px] text-[0.72rem] font-semibold transition-all"
                        style={{ background: 'transparent', color: dm ? '#a1a1aa' : '#83838d', border: `1px solid ${dm ? '#3a3a48' : '#E0E0E8'}` }}>
                        Cancel
                      </button>
                      <button type="button" onClick={saveAdminNotes}
                        className="flex-1 py-2.5 rounded-[8px] text-[0.73rem] font-semibold tracking-[0.04em] transition-all"
                        style={{ background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                        Save note
                      </button>
                    </div>
                  </div>
                ) : adminNotes ? (
                  <button type="button" onClick={() => setNotesEditing(true)}
                    className="w-full text-left px-4 py-3 rounded-[10px] transition-all hover:opacity-90"
                    style={{ background: dm ? '#27272a' : '#FBF9F7', border: `1px solid ${dm ? '#3a3a48' : '#eee'}` }}>
                    <p className="text-[0.85rem] leading-relaxed whitespace-pre-wrap" style={{ color: dm ? '#d4d4d8' : '#4a4a52' }}>{adminNotes}</p>
                  </button>
                ) : (
                  <button type="button" onClick={() => setNotesEditing(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-[10px] transition-all hover:opacity-90"
                    style={{ background: dm ? '#1e1e24' : '#fafafa', border: `1px dashed ${dm ? '#3a3a48' : '#D2D2D9'}`, color: dm ? '#71717a' : '#A1A1A9' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span className="text-[0.78rem] font-medium">Add a private note…</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bridal Inquiry Details */}
        {isBridal && bridalInquiry && (
          <div className="mb-6 overflow-hidden" style={{ borderRadius: 6, border: `1px solid ${dm ? '#3a3a48' : '#E2E2E8'}` }}>
            {/* Section header */}
            <div className="px-5 py-3.5" style={{ background: dm ? 'rgba(196,132,154,0.12)' : '#FBF5F7', borderBottom: `1px solid ${dm ? '#3a3a48' : '#F0E0E9'}` }}>
              <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: PLUM }}>Bridal Inquiry Details</p>
            </div>

            <div className="px-5 py-5" style={{ background: dm ? '#1e1e24' : '#fff' }}>
              {/* Wedding timeline */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5">
                <BField dm={dm} label="Wedding Date" value={biWedding} />
                {/* Preferred Appt only when it actually differs from the wedding
                    date — otherwise it just repeats the same day (redundant). */}
                {bridalInquiry.preferred_date && bridalInquiry.preferred_date !== bridalInquiry.wedding_date && (
                  <BField dm={dm} label="Preferred Appt" value={biPreferred} />
                )}
                {/* The requested ready-by sometimes lives only in the booking
                    notes, but it's still an inquiry answer — always show it here. */}
                <BField dm={dm} label="Ready By (Requested)" value={bridalInquiry.makeup_ready_by_time || notes.readyBy} accent />
                <BField dm={dm} label="Venue Access" value={bridalInquiry.venue_access_time} />
                <BField dm={dm} label="Hairstylist Arrive By" value={bridalInquiry.ready_by_time} />
                <BField dm={dm} label="Photographer Arrives" value={bridalInquiry.photographer_arrival_time} />
              </div>

              {/* Event Location */}
              {bridalInquiry.event_location && (
                <div className="mt-5 pt-5 flex items-start justify-between gap-3" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#F0E8EC'}` }}>
                  <div className="flex items-start gap-2.5 min-w-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.5" className="w-4 h-4 flex-shrink-0 mt-0.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Event Location</p>
                      <CopyableAddress address={bridalInquiry.event_location} dm={dm} />
                    </div>
                  </div>
                  <a href={mapsUrl(bridalInquiry.event_location)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[0.68rem] font-medium tracking-[0.06em] uppercase transition-opacity hover:opacity-80 flex-shrink-0"
                    style={{ borderRadius: 2, border: `1px solid ${dm ? '#5a4750' : '#E2C4D2'}`, color: PLUM, background: dm ? 'rgba(196,132,154,0.1)' : '#FBF5F7' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Maps
                  </a>
                </div>
              )}

              {/* Vendors */}
              {(bridalInquiry.photographer || bridalInquiry.hairstylist) && (
                <div className="mt-5 pt-5 grid grid-cols-2 gap-x-4 gap-y-5" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#F0E8EC'}` }}>
                  <BField dm={dm} label="Photographer" value={bridalInquiry.photographer}
                    href={bridalInquiry.photographer ? `https://instagram.com/${bridalInquiry.photographer.replace('@','')}` : undefined} />
                  <BField dm={dm} label="Hairstylist" value={bridalInquiry.hairstylist}
                    href={bridalInquiry.hairstylist ? `https://instagram.com/${bridalInquiry.hairstylist.replace('@','')}` : undefined} />
                </div>
              )}

              {/* Details */}
              <div className="mt-5 pt-5 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#F0E8EC'}` }}>
                <BField dm={dm} label="Bride" value={biBrideName} />
                <BField dm={dm} label="People Needing Glam" value={bridalInquiry.num_people_glam} />
                <BField dm={dm} label="Out of State" value={biOosLabel} accent={biOos} />
                <BField dm={dm} label="Instagram / TikTok" value={bridalInquiry.instagram_handle}
                  href={bridalInquiry.instagram_handle ? `https://instagram.com/${bridalInquiry.instagram_handle.replace('@','')}` : undefined} />
                <BField dm={dm} label="How They Heard" value={bridalInquiry.how_heard} />
              </div>

              {/* Makeup vision note */}
              {bridalInquiry.additional_details && (
                <div className="mt-5 px-4 py-3.5" style={{ borderRadius: 4, background: dm ? 'rgba(196,132,154,0.08)' : '#FBF5F7', borderLeft: '2px solid #C4849A' }}>
                  <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase mb-1.5" style={{ color: PLUM }}>Makeup Vision &amp; Additional Details</p>
                  <p className="text-[0.84rem] leading-[1.7]" style={{ color: dm ? '#cbb3bf' : '#6B4055' }}>{bridalInquiry.additional_details}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signed Service Agreement (contract) */}
        {(
          <div className="mb-6">
            <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-3">Service Agreement</p>
            {booking.contract_signed ? (
              <div className="rounded-[6px] p-4" style={{ background: dm ? 'rgba(59,130,246,0.08)' : '#f3faf5', border: `1px solid ${dm ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.25)'}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-[0.8rem] font-semibold" style={{ color: dm ? '#60A5FA' : '#15803d' }}>Signed</span>
                  <span className="text-[0.62rem] ml-auto" style={{ color: dm ? '#71717a' : '#9ca3af' }}>Agreement {booking.contract_version || 'v1'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <BField dm={dm} label="Signed By" value={booking.contract_signed_name} />
                  <BField dm={dm} label="Signed On" value={contractSignedAt} />
                  <BField dm={dm} label="Photo Permission"
                    value={booking.contract_photo_consent === true ? 'Yes — may post' : booking.contract_photo_consent === false ? 'No — keep private' : null}
                    accent={booking.contract_photo_consent === false} />
                </div>
                <button onClick={printAgreement}
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-lg text-[0.72rem] font-medium transition-all hover:opacity-80"
                  style={{ background: dm ? '#2e2e38' : '#fff', color: dm ? '#e4e4e7' : '#111', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  View / Print Agreement (Save as PDF)
                </button>
              </div>
            ) : (
              <div className="rounded-[6px] p-4 flex items-center gap-2.5" style={{ background: dm ? '#27272a' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: dm ? '#3a3a48' : '#e5e5e5' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#a1a1aa' : '#9ca3af'} strokeWidth="2" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span className="text-[0.76rem]" style={{ color: dm ? '#a1a1aa' : '#9ca3af' }}>No signed agreement on file (booked before the contract was added).</span>
              </div>
            )}
          </div>
        )}

        {/* Zelle Deposit — one line that opens to the screenshot. */}
        <div className="mb-6">
          <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-3">Zelle Deposit</p>
          <DepositStrip booking={booking} onUpdateBooking={onUpdateBooking} dm={dm} />
        </div>

        {/* Reference Photos */}
        <BookingReferencePhotos booking={booking} onUpdateBooking={onUpdateBooking} dm={dm} />

        {/* Status — the consultation scheduler renders here only when it isn't
            already living in the Appointment hub above (bridal with a set time). */}
        <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
          <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-3">
            {isBridal && !schedulerInHub ? 'Status & Consultation' : 'Update Status'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUSES.map(s => {
              const isActive = booking.status === s;
              return (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className="py-2.5 px-3 text-[0.68rem] font-medium tracking-[0.06em] uppercase rounded-[6px] transition-all hover:opacity-90 truncate"
                  style={isActive
                    ? { background: STATUS_COLORS[s], color: '#fff' }
                    : { background: dm ? '#2e2e38' : '#f5f5f5', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#E8E9EE'}` }
                  }
                >{s}</button>
              );
            })}
          </div>

          {isBridal && !schedulerInHub && booking.status !== 'confirmed' && !booking.consultation_date && (
            <p className="text-[0.68rem] mt-3 leading-relaxed" style={{ color: dm ? '#71717a' : '#999' }}>
              Tap <span className="font-semibold" style={{ color: '#2563EB' }}>Confirmed</span> or schedule below. One email goes out with their confirmation, consultation details &amp; upload link.
            </p>
          )}
          {isBridal && schedulerInHub && booking.status === 'pending' && (
            <p className="text-[0.68rem] mt-3 leading-relaxed" style={{ color: dm ? '#71717a' : '#999' }}>
              Confirming lives in the <span className="font-semibold" style={{ color: '#C4849A' }}>Appointment</span> panel above. One email goes out with the confirmation, consultation details &amp; upload link.
            </p>
          )}
          {confirmInHub && (
            <p className="text-[0.68rem] mt-3 leading-relaxed" style={{ color: dm ? '#71717a' : '#999' }}>
              Step 2 is waiting in the <span className="font-semibold" style={{ color: '#C4849A' }}>Appointment</span> panel above. These pills do the same thing, for when you need to jump straight to completed or cancelled.
            </p>
          )}

          {/* Consultation scheduler lives under status only when not in the hub.
              Bridal-only: consultations are part of the bridal pipeline, and the
              isBridal check was missing here, so every non-bridal card offered
              to schedule one it would never have. */}
          {isBridal && !schedulerInHub && (
            <div ref={consultRef} className="mt-5 pt-5" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#ECECF0'}` }}>
              {consultScheduler}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 text-[0.68rem] font-medium tracking-[0.06em] uppercase rounded-lg transition-all"
              style={{ color: dm ? '#f87171' : '#dc2626', border: `1px solid ${dm ? 'rgba(185,28,28,0.3)' : 'rgba(239,68,68,0.25)'}` }}
              onMouseEnter={e => { e.currentTarget.style.background = dm ? 'rgba(120,20,20,0.2)' : 'rgba(244,63,63,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete Appointment
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[0.75rem] text-red-400">Are you sure?</span>
              <button onClick={onDelete} className="px-4 py-2 text-[0.68rem] font-medium uppercase bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all">Yes, Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-[0.68rem] font-medium uppercase rounded-lg transition-all"
                style={{ color: dm ? '#71717a' : '#999', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Client history */}
      {clientBookings.length > 0 && (
        <div className="rounded-[6px] p-6 sm:p-8" style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-4">Appointment History</p>
          <div className="flex flex-col">
            {clientBookings.map((b, idx) => (
              <div key={b.id} className="flex items-center justify-between py-3"
                style={{ borderBottom: idx < clientBookings.length - 1 ? `1px solid ${dm ? '#2e2e38' : '#F1F1F5'}` : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[b.status] || '#999' }} />
                  <div>
                    <p className="text-[0.85rem] font-medium" style={{ color: dm ? '#ECEDF1' : '#111' }}>{b.service}</p>
                    <p className="text-[0.72rem] mt-0.5" style={{ color: dm ? '#71717a' : '#aaa' }}>
                      {b.date
                        ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'No date set'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Client profile panel ──────────────────────────────────────────────
          Tapping the client's name/avatar on the card opens this full screen.
          Its own back button returns to the booking card (just closes it), so on
          mobile it reads as a proper client screen ↔ booking-card navigation. */}
      {showClientPanel && (
        <div className="fixed inset-0 z-[9997] overflow-y-auto overscroll-contain"
          style={{ background: dm ? '#141418' : '#F3F3F6', animation: 'fadeSlideDown 0.2s ease-out' }}>
          {/* Sticky header with back */}
          <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
            style={{ background: dm ? 'rgba(20,20,24,0.92)' : 'rgba(243, 243, 246,0.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${dm ? '#2a2a32' : '#eadfe4'}` }}>
            <button type="button" onClick={() => setShowClientPanel(false)} aria-label="Back to appointment"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#eadfe4'}` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#e4e4e7' : '#111'} strokeWidth="2.2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Client Profile</p>
          </div>

          <div className="max-w-[640px] mx-auto px-5 py-7 flex flex-col gap-6">
            {/* Hero */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-full flex items-center justify-center font-serif text-[2rem]"
                style={{ background: dm ? 'rgba(212,160,176,0.16)' : '#F5E6EC', color: dm ? '#e7c9d5' : '#8A4A63' }}>
                {(booking.name || '?').trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[1.7rem] leading-tight" style={{ color: dm ? '#f4f4f5' : '#111' }}>{booking.name || 'Client'}</h2>
                {booking.phone && <p className="text-[0.85rem] mt-1 tabular-nums" style={{ color: dm ? '#a1a1aa' : '#8a8a92' }}>{formatPhone(booking.phone)}</p>}
                {booking.email && <p className="text-[0.8rem] mt-0.5 break-all" style={{ color: dm ? '#71717a' : '#a0969c' }}>{booking.email}</p>}
              </div>
            </div>

            {/* Contact actions: Call / Text / Email */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Call', href: booking.phone ? `tel:${phoneHref(booking.phone)}` : null, icon: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/> },
                { label: 'Text', href: booking.phone ? `sms:${phoneHref(booking.phone)}` : null, icon: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/> },
                { label: 'Email', href: booking.email ? `mailto:${booking.email}` : null, icon: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></> },
              ].map(({ label, href, icon }) => {
                const inner = (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">{icon}</svg>
                    <span className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#d4d4d8' : '#6B4055' }}>{label}</span>
                  </>
                );
                const cardStyle = { background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#E5E5EC'}` };
                return href ? (
                  <a key={label} href={href} className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all active:scale-95" style={cardStyle}>{inner}</a>
                ) : (
                  <div key={label} className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl opacity-40" style={cardStyle}>{inner}</div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl" style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#2a2a32' : '#E5E5EC'}` }}>
              {[['Total', totalVisits], ['Completed', completedVisits], ['Upcoming', upcomingBookings.length]].map(([label, n]) => (
                <div key={label} className="text-center">
                  <div className="font-serif text-[1.6rem]" style={{ color: dm ? '#ECEDF1' : '#111' }}>{n}</div>
                  <div className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Upcoming */}
            {upcomingBookings.length > 0 && (
              <div>
                <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-2.5">Upcoming</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#2a2a32' : '#E5E5EC'}` }}>
                  {upcomingBookings.map((b, idx) => (
                    <ApptRow key={b.id} b={b} isCurrent={b.id === booking.id} last={idx === upcomingBookings.length - 1} dm={dm} />
                  ))}
                </div>
              </div>
            )}

            {/* Past & Completed */}
            {pastBookings.length > 0 && (
              <div>
                <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#A89098] mb-2.5">Past &amp; Completed</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#2a2a32' : '#E5E5EC'}` }}>
                  {pastBookings.map((b, idx) => (
                    <ApptRow key={b.id} b={b} isCurrent={b.id === booking.id} last={idx === pastBookings.length - 1} dm={dm} />
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setShowClientPanel(false)}
              className="mt-1 w-full py-3.5 rounded-xl text-[0.78rem] font-semibold transition-all active:scale-[0.99]"
              style={{ background: dm ? '#27272a' : '#fff', color: dm ? '#a1a1aa' : '#6B4055', border: `1px solid ${dm ? '#3a3a48' : '#E0E0E8'}` }}>
              Back to appointment
            </button>
          </div>
        </div>
      )}

      {/* ── Day schedule drawer ───────────────────────────────────────────────
          Roko's real day, docked to the right so she can eyeball conflicts while
          proposing a new time. On wide screens it sits beside the card (no
          backdrop); on smaller screens it's a dimmed sheet. The proposed window
          shows as a pending (dashed) block so she can see exactly where it lands. */}
      {showSchedule && (
        <div className="fixed inset-0 z-[9995] 2xl:hidden" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowSchedule(false)} aria-hidden="true" />
      )}
      <aside
        aria-hidden={!showSchedule}
        className="fixed inset-y-0 right-0 z-[9996] flex flex-col"
        style={{
          width: `min(${scheduleW}px, 92vw)`,
          transform: showSchedule ? 'translateX(0)' : 'translateX(105%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          background: dm ? '#141418' : '#fff',
          borderLeft: `1px solid ${dm ? '#2a2a32' : '#eadfe4'}`,
          boxShadow: showSchedule ? '-16px 0 40px rgba(30,20,25,0.16)' : 'none',
          pointerEvents: showSchedule ? 'auto' : 'none',
        }}
      >
        {/* Drag the left edge to make the calendar wider or narrower */}
        <div
          className="hidden sm:flex absolute inset-y-0 left-0 w-3.5 -ml-1.5 z-10 items-center justify-center"
          style={{ cursor: 'ew-resize', touchAction: 'none' }}
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={resizeSchedule}
          onPointerUp={persistScheduleW}
          title="Drag to resize"
        >
          <span className="w-[3px] h-10 rounded-full" style={{ background: dm ? '#3a3a48' : '#e2d6dc' }} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: `1px solid ${dm ? '#2a2a32' : '#f0e8ec'}` }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: dm ? '#27272a' : 'rgba(212,160,176,0.14)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.7" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] font-medium" style={{ color: dm ? '#ECEDF1' : '#111' }}>My Schedule</p>
          </div>
          <button type="button" onClick={() => setShowSchedule(false)} aria-label="Close schedule"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 flex-shrink-0"
            style={{ background: dm ? '#27272a' : '#EDEDF3', color: dm ? '#a1a1aa' : '#83838d' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3.5 py-4" data-lenis-prevent>
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
            dm={dm}
            withViews
          />
        </div>
      </aside>

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          style={{
            transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
            opacity: toastVisible ? 1 : 0,
            transform: `translateX(-50%) translateY(${toastVisible ? '0px' : '-16px'})`,
          }}
        >
          <div
            className="flex items-center gap-3 rounded-2xl"
            style={{
              background: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
              border: `1.5px solid ${toast.color}28`,
              padding: '12px 20px',
              minWidth: '220px',
              maxWidth: '360px',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${toast.color}18` }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: toast.color }} />
            </div>
            <p className="text-[0.8rem] font-semibold text-[#111] leading-snug whitespace-nowrap">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Status change confirmation */}
      {pendingStatus && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-[6px] shadow-2xl p-7 max-w-[340px] w-full text-center"
            style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#e5e5e5'}`, animation: 'fadeSlideDown 0.25s ease-out' }}>
            {(() => {
              const isReconfirm = pendingStatus === 'reconfirm';
              const statusKey = isReconfirm ? 'confirmed' : pendingStatus;
              return (
                <>
                  <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ background: STATUS_COLORS[statusKey] + '22', border: `1.5px solid ${STATUS_COLORS[statusKey]}44` }}>
                    <span style={{ color: STATUS_COLORS[statusKey], fontSize: '16px', fontWeight: 700 }}>
                      {statusKey === 'cancelled' ? '✕' : statusKey === 'completed' ? '✓' : '✓'}
                    </span>
                  </div>
                  <p className="text-[1.05rem] font-serif mb-1.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                    {isReconfirm ? 'Reconfirm appointment?' : statusKey === 'cancelled' ? 'Cancel this appointment?' : `Mark as ${statusKey}?`}
                  </p>
                  <p className="text-[0.78rem] mb-6" style={{ color: dm ? '#71717a' : '#999' }}>
                    {isReconfirm ? "The client's time has changed. A new confirmation email will be sent."
                     : statusKey === 'confirmed' ? 'A confirmation email will be sent to the client.'
                     : statusKey === 'cancelled' ? 'A cancellation email will be sent to the client.'
                     : statusKey === 'completed' ? 'This will archive the appointment as complete.'
                     : 'This will update the appointment status.'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setPendingStatus(null)}
                      className="px-5 py-2 text-[0.75rem] font-medium rounded-lg transition-all"
                      style={{ color: dm ? '#a1a1aa' : '#777', border: `1px solid ${dm ? '#3f3f46' : '#e5e5e5'}` }}>
                      Never Mind
                    </button>
                    <button onClick={executeStatusChange}
                      className="px-5 py-2 text-[0.75rem] font-semibold text-white rounded-lg transition-all"
                      style={{ background: STATUS_COLORS[statusKey] }}>
                      {isReconfirm ? 'Yes, Reconfirm' : statusKey === 'cancelled' ? 'Yes, Cancel' : 'Yes, Update'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Celebration confetti only */}

      {/* Edit modal */}
      {showEdit && (
        <EditBookingModal booking={booking} onSave={handleSaveEdit} onClose={() => setShowEdit(false)} darkMode={dm} />
      )}
    </div>
  );
}