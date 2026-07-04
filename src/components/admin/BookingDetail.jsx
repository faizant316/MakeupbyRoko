import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from './StatusBadge';
import EditBookingModal from './EditBookingModal';
import BookingReferencePhotos from './BookingReferencePhotos';
import { lenisScrollTo } from '@/lib/lenis';
import { openZoomHost, meetingIdFromUrl } from '@/lib/zoomHost';
import confetti from 'canvas-confetti';
import { buildContract } from '@/lib/contract';
import { useContractOverrides } from '@/lib/useContractOverrides';
import { AdminDatePicker, AdminTimeSelect } from './SchedulePicker';

function ZelleScreenshotViewer({ bookingId, table = 'bookings', dm }) {
  const [expanded, setExpanded] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !signedUrl) {
      setLoadingUrl(true);
      try {
        const res = await fetch('/api/screenshot-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bookingId, table }),
        });
        const data = await res.json();
        setSignedUrl(data.url);
      } finally {
        setLoadingUrl(false);
      }
    }
  };

  return (
    <div className="mb-3 rounded-[6px] overflow-hidden border" style={{ borderColor: dm ? '#3a3a48' : '#e5e5e5' }}>
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: dm ? '#2e2e38' : '#f7f7f7' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span className="text-[0.72rem] font-semibold" style={{ color: dm ? '#86efac' : '#16a34a' }}>Zelle Screenshot Received</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#71717a' : '#aaa'} strokeWidth="2"
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {expanded && (
        <div className="p-3" style={{ background: dm ? '#1e1e24' : '#fff' }}>
          {loadingUrl && <p className="text-[0.72rem] text-center py-4" style={{ color: dm ? '#71717a' : '#aaa' }}>Loading…</p>}
          {signedUrl && (
            <>
              <img
                src={signedUrl}
                alt="Zelle screenshot"
                className="w-full rounded-lg object-contain max-h-[400px] cursor-pointer"
                onClick={() => window.open(signedUrl, '_blank')}
                title="Click to open full size"
              />
              <p className="text-[0.62rem] text-center mt-2" style={{ color: dm ? '#52525b' : '#bbb' }}>Click image to open full size</p>
            </>
          )}
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

const STATUS_COLORS = { pending: '#F59E0B', confirmed: '#3B82F6', completed: '#22C55E', cancelled: '#EF4444' };

// "9:30 AM" → "09:30"  (for <input type="time"> value)
function to24h(val) {
  if (!val) return '';
  const isPM = val.includes('PM') && !val.trim().startsWith('12');
  const isAM12 = val.trim().startsWith('12') && val.includes('AM');
  const clean = val.replace(/\s?(AM|PM)/i, '').trim();
  const [hStr, mStr = '00'] = clean.split(':');
  let h = parseInt(hStr, 10);
  if (isPM) h += 12;
  if (isAM12) h = 0;
  return `${String(h).padStart(2, '0')}:${mStr}`;
}

// "09:30" → "9:30 AM"
function from24h(val) {
  if (!val) return '';
  const [hStr, mStr = '00'] = val.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

// ── Appointment time WINDOW (start → end) helpers ─────────────────────────────
// The appointment time is stored as a single string so every consumer (card
// header, calendar, agenda, emails, contract) keeps working unchanged. A window
// is "11:00 AM – 1:00 PM"; a single time is just "11:00 AM".
const RANGE_SEP = ' – ';

// "11:00 AM" → minutes since midnight, so the second tap can be ordered after
// the first (and an earlier tap resets the start).
function apptToMin(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3] && m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// Split a stored value into { start, end }. Accepts en/em dash, hyphen, or "to".
function parseRange(val) {
  if (!val) return { start: '', end: '' };
  const parts = String(val).split(/\s*(?:–|—|-|to)\s*/i).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { start: parts[0], end: parts[1] };
  return { start: parts[0] || '', end: '' };
}

// Build the stored/displayed value from a start (+ optional end).
function formatRange(start, end) {
  if (start && end) return `${start}${RANGE_SEP}${end}`;
  return start || '';
}

// Brand plum (matches the front-end bridal cards)
const PLUM = '#C4849A';

// Universal Google Maps link — works on desktop + mobile, no API key required.
function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// One label/value pair in the bridal details "spec sheet" grid.
function BField({ label, value, dm, accent = false, href }) {
  if (value === null || value === undefined || value === '') return null;
  const valueColor = accent ? PLUM : (dm ? '#e4e4e7' : '#2C1A14');
  return (
    <div className="min-w-0">
      <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase mb-1" style={{ color: dm ? '#8f8a93' : '#A89098' }}>{label}</p>
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

const CONSULT_COLOR = '#A855F7';
const CONSULT_BG = 'rgba(168,85,247,0.08)';
const CONSULT_BORDER = 'rgba(168,85,247,0.25)';

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
      if (m) readyBy = m[1].trim();
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

function ConsultationScheduler({ booking, onUpdateBooking, dm, onSent, bridal, dateFormatted, expanded, setExpanded }) {
  const hasConsult = !!booking.consultation_date;
  const parsed = parseConsultNotes(booking.consultation_notes);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [meetLink, setMeetLink] = useState(parsed.link);
  const [meetingId, setMeetingId] = useState(parsed.meetingId);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [form, setForm] = useState({
    date: booking.consultation_date || '',
    time: booking.consultation_time || TIME_SLOTS[4],
    type: booking.consultation_type || 'Zoom',
    notes: parsed.notes,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      // confirmed); everyone else uses the standalone consultation email.
      const endpoint = bridal ? '/api/confirm-bridal' : '/api/send-consultation';
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
        ...(bridal ? { status: 'confirmed' } : {}),
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
        <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#A89098] mb-3">Consultation</p>
      )}

      {/* Scheduled state */}
      {hasConsult && !expanded && (
        <div className="flex items-center justify-between px-4 py-4 rounded-[6px] transition-all"
          style={{ background: dm ? '#1c1c28' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: CONSULT_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[0.78rem] font-semibold" style={{ color: dm ? '#C4B5FD' : CONSULT_COLOR }}>
                {booking.consultation_type} · {booking.consultation_time}
              </p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#71717a' : '#999' }}>
                {booking.consultation_date && new Date(booking.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {(meetingId || parsed.meetingId) ? (
                <button type="button"
                  onClick={() => openZoomHost(meetingId || parsed.meetingId, meetLink || parsed.link)}
                  className="text-[0.65rem] mt-1.5 inline-flex items-center gap-1.5 font-semibold"
                  style={{ color: dm ? '#C4B5FD' : CONSULT_COLOR }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                  </svg>
                  Join as host
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
            className="text-[0.65rem] font-semibold tracking-[0.08em] uppercase ml-3 flex-shrink-0"
            style={{ color: dm ? '#C4B5FD' : CONSULT_COLOR }}>
            Edit
          </button>
        </div>
      )}

      {/* Empty state */}
      {!hasConsult && !expanded && (
        <button onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between px-4 py-4 rounded-[6px] transition-all touch-manipulation"
          style={{ background: dm ? '#1c1c28' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: CONSULT_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="text-left">
              <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#C4B5FD' : CONSULT_COLOR }}>{bridal ? 'Confirm & Schedule Consultation' : 'Schedule Consultation'}</p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#52525b' : '#bbb' }}>{bridal ? 'Sends one email: confirmation + consultation + upload link' : 'Set date, time & meeting type'}</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="2" className="w-3.5 h-3.5 opacity-40">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {/* Picker */}
      {expanded && (
        <div className="rounded-[6px] overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.18em] uppercase" style={{ color: CONSULT_COLOR }}>Consultation</p>
              <p className="font-serif text-[1rem] mt-0.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>Schedule a Meeting</p>
            </div>
            <button onClick={() => { setExpanded(false); setShowConfirmSend(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
              style={{ background: dm ? '#3f3f46' : '#f0ece8', color: dm ? '#71717a' : '#888' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="p-5 flex flex-col gap-5" style={{ background: dm ? '#27272a' : '#fff' }}>
            {/* Date + Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>Date</label>
                <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent={CONSULT_COLOR} />
              </div>
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>Time</label>
                <AdminTimeSelect value={form.time} onChange={v => set('time', v)} dm={dm} slots={TIME_SLOTS} accent={CONSULT_COLOR} />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>Meeting Type</label>
              <div className="flex gap-2">
                {['Zoom', 'Phone'].map(key => (
                  <button key={key} type="button" onClick={() => set('type', key)}
                    className="flex-1 py-3 rounded-[6px] text-[0.72rem] font-semibold tracking-[0.04em] uppercase transition-all touch-manipulation"
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
                  <label className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase" style={{ color: textMuted }}>Zoom Link</label>
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
                    className="w-full rounded-[6px] font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation"
                    style={{ minHeight: '48px', fontSize: '14px', background: generatingLink ? (dm ? '#1c1c28' : '#f0ece8') : '#2D8CFF', color: generatingLink ? (dm ? '#52525b' : '#bbb') : '#fff', border: `1px solid ${generatingLink ? border : '#2D8CFF'}` }}>
                    {generatingLink ? (
                      <><div className="w-4 h-4 border-2 border-[#2D8CFF]/30 border-t-[#2D8CFF] rounded-full animate-spin" /> Generating…</>
                    ) : (
                      <>Generate Zoom Link</>
                    )}
                  </button>
                ) : (
                  <button type="button" onClick={copyMeetLink}
                    className="w-full px-4 rounded-[6px] text-left transition-all flex items-center justify-between gap-3 touch-manipulation"
                    style={{ minHeight: '48px', background: linkCopied ? (dm ? '#14532d' : '#f0fdf4') : inputBg, border: `1.5px solid ${linkCopied ? '#22c55e' : '#2D8CFF'}` }}>
                    <span className="text-[0.73rem] font-medium truncate" style={{ color: linkCopied ? '#16a34a' : '#2D8CFF' }}>
                      {meetLink}
                    </span>
                    <span className="text-[0.65rem] font-semibold flex-shrink-0 px-2.5 py-1 rounded-lg"
                      style={{ background: linkCopied ? '#22c55e' : '#2D8CFF', color: '#fff' }}>
                      {linkCopied ? '✓ Copied' : 'Copy'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>
                Notes <span style={{ color: dm ? '#52525b' : '#d4c8c0', textTransform: 'none', letterSpacing: 0 }}>— optional</span>
              </label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                placeholder="Any extra info for the client…"
                className="w-full px-4 py-3 rounded-[6px] outline-none resize-none"
                style={{ ...inputStyle, minHeight: '80px' }} />
            </div>

            {/* CTA */}
            {!showConfirmSend ? (
              <button onClick={() => { if (form.date && form.time) setShowConfirmSend(true); }} disabled={!form.date}
                className="w-full rounded-[6px] font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation"
                style={{
                  minHeight: '50px', fontSize: '14px',
                  ...(!form.date
                    ? { background: dm ? '#2e2e38' : '#f0ece8', color: dm ? '#52525b' : '#bbb', cursor: 'not-allowed' }
                    : { background: '#111', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }),
                }}>
                Confirm & Notify Client
              </button>
            ) : (
              <div className="rounded-[6px] overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                <div className="px-4 py-4" style={{ background: dm ? '#1c1c28' : '#fafafa' }}>
                  <p className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase mb-3" style={{ color: dm ? '#C4B5FD' : CONSULT_COLOR }}>Confirm & Send Email?</p>
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
                  <p className="text-[0.7rem] mb-4" style={{ color: dm ? '#71717a' : '#888' }}>An email will be sent to <span style={{ color: dm ? '#C4B5FD' : CONSULT_COLOR }}>{booking.email}</span>.</p>
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
                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-green-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-[0.75rem] font-medium text-green-600">Consultation scheduled — client notified.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingDetail({ booking, onBack, onUpdateStatus, onUpdateBooking, onDelete, allBookings, darkMode: dm }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showClientStats, setShowClientStats] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const initialRange = parseRange(booking.time || '');
  const [startTime, setStartTime] = useState(initialRange.start);
  const [endTime, setEndTime] = useState(initialRange.end);
  const [showReconfirmBanner, setShowReconfirmBanner] = useState(false);

  // Two-tap window: first tap sets the start, second sets the end. Tapping a
  // time at or before the current start resets it as the new start (no autofill,
  // full manual control per Roko's ask).
  const pickTime = (t) => {
    if (!startTime || endTime) { setStartTime(t); setEndTime(''); return; }
    const s = apptToMin(startTime), n = apptToMin(t);
    if (n != null && s != null && n > s) setEndTime(t);
    else { setStartTime(t); setEndTime(''); }
  };
  const openTimePicker = () => {
    const r = parseRange(booking.time || '');
    setStartTime(r.start); setEndTime(r.end);
    setShowTimePicker(true); setShowReconfirmBanner(false);
  };
  const pendingRange = formatRange(startTime, endTime);

  // ── In-admin Contact composer ────────────────────────────────────────────
  // Roko writes the client a personal email straight from the card (sent as
  // roko@makeupbyroko.org). When she's changed the time she can attach an
  // updated agreement for the client to re-sign.
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachContract, setAttachContract] = useState(false);
  const [sending, setSending] = useState(false);
  const firstName = booking.name?.split(' ')[0] || 'there';

  const openCompose = () => {
    if (!composeSubject) setComposeSubject(`Your ${booking.service || 'appointment'} with Makeup by Roko`);
    if (!composeBody) setComposeBody(`Hi ${firstName},\n\n`);
    setShowCompose(true);
    setTimeout(() => { if (composeRef.current) lenisScrollTo(composeRef.current, { offset: -80 }); }, 60);
  };

  // One-tap starter for the most common case: "your original time isn't open,
  // here's the new one." Pulls in whatever window is currently on the booking.
  const fillProposeTime = () => {
    setComposeSubject('An update on your appointment time');
    setComposeBody(
      `Hi ${firstName},\n\n` +
      `Thank you so much for booking with me! I wanted to reach out about your appointment time.` +
      `${booking.time ? ` I currently have you down for ${booking.time}` : ''}${dateFormatted ? ` on ${dateFormatted}` : ''}. ` +
      `Please let me know if that works for you.\n\n` +
      `Once you confirm, I'll send over the updated agreement to sign so we can lock everything in.\n\n` +
      `With love,\nRoko`
    );
    setAttachContract(true);
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
      showToast(attachContract ? 'Email + agreement sent' : 'Email sent to client', '#22c55e');
    } catch (err) {
      alert(err?.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };
  const [consultExpanded, setConsultExpanded] = useState(false);
  const consultRef = useRef(null);
  const composeRef = useRef(null);

  const showToast = (msg, color) => {
    setToast({ message: msg, color });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2200);
  };

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
      showToast(isReconfirm ? 'Reconfirmed, client notified' : 'Appointment confirmed', '#3b82f6');
      // Bridal confirmations go out through the combined consultation email, so
      // never fire the standalone confirmation email for them.
      if (booking.email && !isBridal) {
        fetch('/api/send-booking-confirmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, firstName: booking.name?.split(' ')[0] || 'there', serviceName: booking.service, dateFormatted, time: booking.time }),
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
  const hasNotes = !!(notes.readyBy || notes.comment || notes.flags.length);

  const totalVisits = allBookings.filter(b => b.email === booking.email).length;
  const completedVisits = allBookings.filter(b => b.email === booking.email && b.status === 'completed').length;
  const cancelledVisits = allBookings.filter(b => b.email === booking.email && b.status === 'cancelled').length;
  // Sort chronologically: earliest date first, undated last
  const clientBookings = allBookings
    .filter(b => b.email === booking.email && b.id !== booking.id)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

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
    onUpdateBooking(data);
    setShowEdit(false);
    const newStatus = data.status;
    const oldStatus = booking.status;
    if (newStatus !== oldStatus && booking.email) {
      const editDate = data.date
        ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : dateFormatted;
      if (newStatus === 'confirmed' && !isBridal) {
        showToast('Appointment confirmed', '#3b82f6');
        fetch('/api/send-booking-confirmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, firstName: (data.name || booking.name)?.split(' ')[0] || 'there', serviceName: data.service || booking.service, dateFormatted: editDate, time: data.time || booking.time }),
        }).catch(err => console.error('confirmed email error:', err));
      } else if (newStatus === 'cancelled') {
        showToast('Appointment cancelled', '#ef4444');
        fetch('/api/on-booking-cancelled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: booking.email, name: (data.name || booking.name)?.split(' ')[0] || 'there', service: data.service || booking.service, date: editDate }),
        }).catch(err => console.error('cancelled email error:', err));
      }
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[#D4A0B0] hover:text-[#b8849a] transition-colors mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to List
      </button>

      <div className="rounded-[6px] p-6 sm:p-8 mb-6" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#e5e5e5'}` }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <button onClick={() => setShowClientStats(!showClientStats)}
                className="font-serif text-[1.75rem] transition-colors text-left"
                style={{ color: dm ? '#e4e4e7' : '#111' }}>
                {booking.name}
              </button>
              <button onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.65rem] font-medium transition-all hover:opacity-80"
                style={{ background: dm ? '#2e2e38' : '#f5f5f5', color: dm ? '#a1a1aa' : '#999', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
            </div>
            <p className="text-[0.8rem] mt-0.5" style={{ color: dm ? '#71717a' : '#999' }}>{booking.service}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Client stats — toggled by name click */}
        {showClientStats && (
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-[6px]" style={{ background: dm ? '#1e1e24' : '#fafafa', border: `1px solid ${dm ? '#2a2420' : '#ebebeb'}`, animation: 'fadeSlideDown 0.3s ease-out' }}>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{totalVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#A89098]">Total Visits</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{completedVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#A89098]">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{cancelledVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#A89098]">Cancelled</div>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#A89098] mb-1">Date & Time</p>
            <p className="text-[0.9rem] font-medium" style={{ color: dm ? '#F0EBE6' : '#111' }}>{dateFormatted}</p>
            {booking.time && <p className="text-[0.85rem]" style={{ color: dm ? '#D4A0B0' : '#888' }}>{booking.time}</p>}
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#A89098] mb-1">Contact</p>
            {booking.email && <a href={`mailto:${booking.email}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block" style={{ color: dm ? '#e4e4e7' : '#111' }}>{booking.email}</a>}
            {booking.phone && <a href={`sms:${booking.phone}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block mt-0.5" style={{ color: dm ? '#71717a' : '#999' }}>{booking.phone}</a>}
            {booking.email && !showCompose && (
              <button
                type="button"
                onClick={openCompose}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.65rem] font-semibold transition-all hover:opacity-85"
                style={{ background: dm ? '#2e2e38' : 'rgba(212,160,176,0.12)', color: '#D4A0B0', border: `1px solid ${dm ? '#3a3a48' : 'rgba(212,160,176,0.3)'}` }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
                Message client
              </button>
            )}
          </div>
        </div>

        {/* Contact composer — Roko's personal email, sent as roko@makeupbyroko.org */}
        {showCompose && (
          <div ref={composeRef} className="mb-6 rounded-[8px] overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#f0f0f0'}` }}>
              <div>
                <p className="text-[0.55rem] font-bold tracking-[0.16em] uppercase" style={{ color: '#D4A0B0' }}>Email Client</p>
                <p className="text-[0.72rem] mt-0.5" style={{ color: dm ? '#a1a1aa' : '#888' }}>To <span style={{ color: dm ? '#F0EBE6' : '#111', fontWeight: 600 }}>{booking.email}</span> · from roko@makeupbyroko.org</p>
              </div>
              <button type="button" onClick={() => setShowCompose(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                style={{ background: dm ? '#3f3f46' : '#f0f0f0', color: dm ? '#71717a' : '#888' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3" style={{ background: dm ? '#1e1e24' : '#fff' }}>
              {/* Quick starter */}
              <button type="button" onClick={fillProposeTime}
                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.64rem] font-semibold transition-all hover:opacity-85"
                style={{ background: dm ? '#2e2e38' : '#FBF3E8', color: dm ? '#e8c89a' : '#9A6B2F', border: `1px solid ${dm ? '#3a3a48' : '#F0E0C8'}` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Propose new time {booking.time ? `(${booking.time})` : ''}
              </button>

              <div>
                <label className="block text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#999' }}>Subject</label>
                <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[6px] outline-none"
                  style={{ fontSize: '15px', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}`, background: dm ? '#27272a' : '#fafafa', color: dm ? '#e4e4e7' : '#111' }} />
              </div>

              <div>
                <label className="block text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#999' }}>Message</label>
                <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={7}
                  placeholder="Write your message…"
                  className="w-full px-3 py-2.5 rounded-[6px] outline-none resize-y"
                  style={{ fontSize: '15px', minHeight: '150px', lineHeight: 1.6, border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}`, background: dm ? '#27272a' : '#fafafa', color: dm ? '#e4e4e7' : '#111' }} />
                <p className="text-[0.62rem] mt-1.5" style={{ color: dm ? '#52525b' : '#bbb' }}>Sent on your branded template. Line breaks are kept.</p>
              </div>

              {/* Attach updated agreement */}
              <button type="button" onClick={() => setAttachContract(a => !a)}
                className="flex items-start gap-3 text-left px-3 py-3 rounded-[6px] transition-all"
                style={{ background: attachContract ? (dm ? 'rgba(196,132,154,0.12)' : '#FBF5F7') : (dm ? '#27272a' : '#fafafa'), border: `1px solid ${attachContract ? '#D4A0B0' : (dm ? '#3a3a48' : '#e5e5e5')}` }}>
                <span className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={attachContract ? { background: '#D4A0B0', border: '1px solid #D4A0B0' } : { background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#52525b' : '#ccc'}` }}>
                  {attachContract && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <span>
                  <span className="block text-[0.76rem] font-semibold" style={{ color: dm ? '#F0EBE6' : '#111' }}>Attach updated Service Agreement</span>
                  <span className="block text-[0.66rem] mt-0.5 leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#888' }}>
                    Adds a Review &amp; Sign link with {booking.time ? <>the current window <strong style={{ color: '#D4A0B0' }}>{booking.time}</strong></> : 'the current appointment time'}. Signing marks it pending again for you to re-confirm.
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => setShowCompose(false)}
                  className="px-4 py-2.5 rounded-[6px] text-[0.72rem] font-semibold transition-all"
                  style={{ background: dm ? '#27272a' : '#fff', color: dm ? '#71717a' : '#888', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                  Cancel
                </button>
                <button type="button" onClick={sendCompose} disabled={sending}
                  className="flex-1 py-2.5 rounded-[6px] text-[0.75rem] font-semibold tracking-[0.04em] transition-all flex items-center justify-center gap-2"
                  style={{ background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', opacity: sending ? 0.7 : 1 }}>
                  {sending ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</> : (attachContract ? 'Send email + agreement' : 'Send email')}
                </button>
              </div>
            </div>
          </div>
        )}

        {hasNotes && (
          <div className="mb-6">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Notes</p>

            {/* Ready-by + flags as their own labeled chips */}
            {(notes.readyBy || notes.flags.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-2.5">
                {notes.readyBy && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: dm ? '#2e2e38' : 'rgba(212,160,176,0.12)', border: `1px solid ${dm ? '#3a3a48' : 'rgba(212,160,176,0.3)'}` }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.8" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span className="text-[0.6rem] font-semibold tracking-[0.1em] uppercase" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Ready by</span>
                    <span className="text-[0.78rem] font-semibold" style={{ color: dm ? '#F0EBE6' : '#2C1A14' }}>{notes.readyBy}</span>
                  </span>
                )}
                {notes.flags.map((f, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-[0.72rem] font-medium"
                    style={{ background: dm ? 'rgba(240,194,122,0.12)' : '#FBF3E8', border: `1px solid ${dm ? 'rgba(240,194,122,0.25)' : '#F0E0C8'}`, color: dm ? '#e8c89a' : '#9A6B2F' }}>
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Free-text comment, clearly labeled as the client's own note */}
            {notes.comment && (
              <div className="px-4 py-3" style={{ borderRadius: 4, background: dm ? 'rgba(196,132,154,0.08)' : '#FBF5F7', borderLeft: '2px solid #C4849A' }}>
                <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase mb-1" style={{ color: PLUM }}>Additional Comments</p>
                <p className="text-[0.85rem] leading-relaxed" style={{ color: dm ? '#cbb3bf' : '#6B4055' }}>
                  {notes.comment}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bridal Inquiry Details */}
        {isBridal && bridalInquiry && (
          <div className="mb-6 overflow-hidden" style={{ borderRadius: 6, border: `1px solid ${dm ? '#3a3a48' : '#E8E2DC'}` }}>
            {/* Section header */}
            <div className="px-5 py-3.5" style={{ background: dm ? 'rgba(196,132,154,0.12)' : '#FBF5F7', borderBottom: `1px solid ${dm ? '#3a3a48' : '#F0E0E9'}` }}>
              <p className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase" style={{ color: PLUM }}>Bridal Inquiry Details</p>
            </div>

            <div className="px-5 py-5" style={{ background: dm ? '#1e1e24' : '#fff' }}>
              {/* Wedding timeline */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5">
                <BField dm={dm} label="Wedding Date" value={biWedding} />
                <BField dm={dm} label="Preferred Appt" value={biPreferred} />
                <BField dm={dm} label="Event Start" value={bridalInquiry.event_start_time} />
                <BField dm={dm} label="Venue Access" value={bridalInquiry.venue_access_time} />
                <BField dm={dm} label="Artist Arrive By" value={bridalInquiry.ready_by_time} accent />
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
                      <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase mb-1" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Event Location</p>
                      <CopyableAddress address={bridalInquiry.event_location} dm={dm} />
                    </div>
                  </div>
                  <a href={mapsUrl(bridalInquiry.event_location)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-80 flex-shrink-0"
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
                  <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM }}>Makeup Vision &amp; Additional Details</p>
                  <p className="text-[0.84rem] leading-[1.7]" style={{ color: dm ? '#cbb3bf' : '#6B4055' }}>{bridalInquiry.additional_details}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signed Service Agreement (contract) */}
        {(
          <div className="mb-6">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#A89098] mb-3">Service Agreement</p>
            {booking.contract_signed ? (
              <div className="rounded-[6px] p-4" style={{ background: dm ? 'rgba(34,197,94,0.08)' : '#f3faf5', border: `1px solid ${dm ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.25)'}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-[0.8rem] font-semibold" style={{ color: dm ? '#4ade80' : '#15803d' }}>Signed</span>
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

        {/* Zelle Deposit Received */}
        <div className="mb-6">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#A89098] mb-3">Zelle Deposit</p>

          {/* Screenshot viewer */}
          {booking.zelle_screenshot && (
            <ZelleScreenshotViewer bookingId={booking.id} table="bookings" dm={dm} />
          )}

          <div className="flex items-stretch gap-3">
            <button
              onClick={() => onUpdateBooking({ deposit_received: true })}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-[6px] transition-all"
              style={booking.deposit_received
                ? { background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: '1px solid #22c55e', boxShadow: '0 4px 16px rgba(34,197,94,0.25)' }
                : { background: dm ? '#27272a' : '#fafafa', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }
              }
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: booking.deposit_received ? 'rgba(255,255,255,0.2)' : dm ? '#2e2e38' : '#f0ece8' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="text-[0.7rem] font-semibold tracking-[0.04em]">Received</span>
            </button>
            <button
              onClick={() => onUpdateBooking({ deposit_received: false })}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-[6px] transition-all"
              style={!booking.deposit_received
                ? { background: dm ? 'rgba(120,20,20,0.55)' : 'linear-gradient(135deg, rgba(244,63,63,0.08), rgba(220,38,38,0.12))', color: dm ? '#fca5a5' : '#b91c1c', border: `1px solid ${dm ? 'rgba(185,28,28,0.4)' : 'rgba(239,68,68,0.25)'}`, boxShadow: 'none' }
                : { background: dm ? '#27272a' : '#fafafa', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }
              }
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: !booking.deposit_received ? 'rgba(255,255,255,0.15)' : dm ? '#2e2e38' : '#f0ece8' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <span className="text-[0.7rem] font-semibold tracking-[0.04em]">Not Yet</span>
            </button>
          </div>
        </div>

        {/* Reference Photos */}
        <BookingReferencePhotos booking={booking} onUpdateBooking={onUpdateBooking} dm={dm} />

        {/* Appointment Time Setter */}
        <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-3">Appointment Time</p>

          {/* Trigger — current time window (clickable) or empty state button */}
          {!showTimePicker && (
            booking.time ? (
              <button
                type="button"
                onClick={openTimePicker}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[6px] transition-all touch-manipulation hover:opacity-80 active:opacity-60"
                style={{ background: dm ? '#1e1e24' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dm ? '#2e2e38' : 'rgba(212,160,176,0.12)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <p className="text-[0.9rem] font-semibold" style={{ color: dm ? '#F0EBE6' : '#111' }}>{booking.time}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#ccc'} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={openTimePicker}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-[6px] touch-manipulation transition-all hover:opacity-80"
                style={{ background: dm ? '#1e1e24' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dm ? '#2e2e38' : 'rgba(212,160,176,0.12)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#71717a' : '#888' }}>Set Appointment Time</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className="w-3.5 h-3.5 opacity-40"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )
          )}

          {/* Time picker — two-tap window: first tap = start, second tap = end */}
          {showTimePicker && (
            <div className="rounded-[6px]" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}`, overflow: 'visible' }}>
              {/* Header — shows the window being built */}
              <div className="flex items-center justify-between px-4 py-3 rounded-t-xl"
                style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#f0f0f0'}` }}>
                <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase flex items-center gap-2 min-w-0" style={{ color: '#D4A0B0' }}>
                  <span className="flex-shrink-0">{!startTime ? 'Tap start time' : !endTime ? 'Now tap end time' : 'Time window'}</span>
                  {startTime && (
                    <span className="text-[0.72rem] font-semibold tracking-normal normal-case truncate" style={{ color: dm ? '#F0EBE6' : '#111' }}>
                      {formatRange(startTime, endTime) || startTime}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all touch-manipulation flex-shrink-0"
                  style={{ background: dm ? '#3f3f46' : '#f0f0f0', color: dm ? '#71717a' : '#888' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Mobile — two native time inputs (Start + End) */}
              <div className="md:hidden grid grid-cols-2 gap-3 px-4 pt-4 pb-1" style={{ background: dm ? '#1e1e24' : '#fff' }}>
                {[['Start', startTime, setStartTime], ['End', endTime, setEndTime]].map(([lbl, val, setter]) => (
                  <div key={lbl}>
                    <label className="block text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: dm ? '#71717a' : '#999' }}>{lbl}</label>
                    <input
                      type="time"
                      value={to24h(val)}
                      onChange={e => setter(from24h(e.target.value))}
                      style={{
                        width: '100%', fontSize: '16px', padding: '12px 14px',
                        borderRadius: '10px', border: `1.5px solid ${dm ? '#3a3a48' : '#e5e5e5'}`,
                        background: dm ? '#27272a' : '#fafafa', color: dm ? '#e4e4e7' : '#111',
                        outline: 'none', boxSizing: 'border-box', display: 'block',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Desktop — pill grid, two-tap start → end with the window highlighted */}
              <div className="hidden md:block">
                <div className="p-3" style={{ background: dm ? '#1e1e24' : '#fff' }}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {APPT_TIMES.map(t => {
                      const sMin = apptToMin(startTime), eMin = apptToMin(endTime), tMin = apptToMin(t);
                      const isEnd = !!endTime && t === endTime;
                      const isStart = !isEnd && t === startTime;
                      const inRange = sMin != null && eMin != null && tMin != null && tMin > sMin && tMin < eMin;
                      const style = (isStart || isEnd)
                        ? { background: '#D4A0B0', color: '#fff', border: '1px solid #D4A0B0' }
                        : inRange
                          ? { background: dm ? 'rgba(212,160,176,0.22)' : 'rgba(212,160,176,0.18)', color: dm ? '#F0EBE6' : '#8a5a6c', border: `1px solid ${dm ? 'rgba(212,160,176,0.4)' : 'rgba(212,160,176,0.35)'}` }
                          : { background: dm ? '#27272a' : '#fff', color: dm ? '#71717a' : '#888', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` };
                      return (
                        <button key={t} type="button" onClick={() => pickTime(t)}
                          className="relative py-2.5 rounded-lg text-[0.68rem] font-medium transition-all text-center touch-manipulation"
                          style={style}
                        >
                          {t}
                          {(isStart || isEnd) && (
                            <span className="absolute top-0.5 right-1 text-[0.5rem] font-bold uppercase tracking-wide" style={{ opacity: 0.85 }}>
                              {isStart ? 'A' : 'B'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {startTime && (
                    <button type="button" onClick={() => { setStartTime(''); setEndTime(''); }}
                      className="mt-2 text-[0.62rem] font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
                      style={{ color: dm ? '#71717a' : '#999' }}>
                      Clear selection
                    </button>
                  )}
                </div>
              </div>

              {/* Confirm button */}
              <div className="px-3 pb-3 pt-1" style={{ background: dm ? '#1e1e24' : '#fff' }}>
                <button
                  type="button"
                  disabled={!startTime}
                  onClick={() => {
                    if (!startTime) return;
                    const value = pendingRange;
                    onUpdateBooking({ time: value });
                    setShowTimePicker(false);
                    showToast(`Time set to ${value}`, '#888');
                    if (booking.status === 'confirmed') setShowReconfirmBanner(true);
                  }}
                  className="w-full py-3 rounded-[6px] text-[0.75rem] font-semibold tracking-[0.04em] transition-all touch-manipulation"
                  style={startTime
                    ? { background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }
                    : { background: dm ? '#27272a' : '#f5f5f5', color: dm ? '#52525b' : '#bbb', cursor: 'not-allowed' }
                  }
                >
                  {!startTime ? 'Tap a start time above' : endTime ? `Set to ${pendingRange}` : `Set start ${startTime} · tap an end time`}
                </button>
              </div>
            </div>
          )}

          {/* Reconfirm banner — appears when time changes on a confirmed booking */}
          {showReconfirmBanner && booking.status === 'confirmed' && (
            <div className="mt-3 flex items-center justify-between px-4 py-3 rounded-[6px]"
              style={{
                background: dm ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.25)',
                animation: 'fadeSlideDown 0.3s ease-out',
              }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-semibold" style={{ color: '#3B82F6' }}>Time was updated</p>
                  <p className="text-[0.65rem]" style={{ color: dm ? '#71717a' : '#999' }}>Notify client of their new appointment time?</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={() => { setShowReconfirmBanner(false); setPendingStatus('reconfirm'); }}
                  className="px-3 py-1.5 rounded-lg text-[0.68rem] font-semibold text-white transition-all"
                  style={{ background: '#3B82F6' }}>
                  Reconfirm →
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
        </div>

        {/* Status & Consultation — for bridal these act as one unit: confirming a
            bridal booking happens by scheduling the consultation (one combined email). */}
        <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#A89098] mb-3">
            {isBridal ? 'Status & Consultation' : 'Update Status'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUSES.map(s => {
              const isActive = booking.status === s;
              return (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className="py-2.5 px-3 text-[0.65rem] font-semibold tracking-[0.06em] uppercase rounded-[6px] transition-all hover:opacity-90 truncate"
                  style={isActive
                    ? { background: STATUS_COLORS[s], color: '#fff' }
                    : { background: dm ? '#2e2e38' : '#f5f5f5', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                  }
                >{s}</button>
              );
            })}
          </div>

          {isBridal && booking.status !== 'confirmed' && !booking.consultation_date && (
            <p className="text-[0.68rem] mt-3 leading-relaxed" style={{ color: dm ? '#71717a' : '#999' }}>
              Tap <span className="font-semibold" style={{ color: '#3B82F6' }}>Confirmed</span> or schedule below — one email goes out with their confirmation, consultation details &amp; upload link.
            </p>
          )}

          {/* Consultation scheduler lives right under status */}
          <div ref={consultRef} className="mt-5 pt-5" style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#f0ece8'}` }}>
            <ConsultationScheduler
              booking={booking}
              onUpdateBooking={onUpdateBooking}
              dm={dm}
              bridal={isBridal}
              dateFormatted={dateFormatted}
              expanded={consultExpanded}
              setExpanded={setConsultExpanded}
              onSent={() => showToast(isBridal ? 'Confirmed — client notified' : 'Consultation sent', '#22c55e')}
            />
          </div>
        </div>

        {/* Delete */}
        <div className="pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 text-[0.65rem] font-medium tracking-[0.08em] uppercase rounded-lg transition-all"
              style={{ color: dm ? '#f87171' : '#dc2626', border: `1px solid ${dm ? 'rgba(185,28,28,0.3)' : 'rgba(239,68,68,0.25)'}` }}
              onMouseEnter={e => { e.currentTarget.style.background = dm ? 'rgba(120,20,20,0.2)' : 'rgba(244,63,63,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete Appointment
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[0.75rem] text-red-400">Are you sure?</span>
              <button onClick={onDelete} className="px-4 py-2 text-[0.65rem] font-medium uppercase bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all">Yes, Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-[0.65rem] font-medium uppercase rounded-lg transition-all"
                style={{ color: dm ? '#71717a' : '#999', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Client history */}
      {clientBookings.length > 0 && (
        <div className="rounded-[6px] p-6 sm:p-8" style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#A89098] mb-4">Appointment History</p>
          <div className="flex flex-col">
            {clientBookings.map((b, idx) => (
              <div key={b.id} className="flex items-center justify-between py-3"
                style={{ borderBottom: idx < clientBookings.length - 1 ? `1px solid ${dm ? '#2e2e38' : '#f5f0ed'}` : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    b.status === 'completed' ? 'bg-green-500' : b.status === 'confirmed' ? 'bg-blue-400' : b.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-[0.85rem] font-medium" style={{ color: dm ? '#F0EBE6' : '#111' }}>{b.service}</p>
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