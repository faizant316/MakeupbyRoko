import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from './StatusBadge';
import EditBookingModal from './EditBookingModal';
import BookingReferencePhotos from './BookingReferencePhotos';
import confetti from 'canvas-confetti';

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
    <div className="mb-3 rounded-xl overflow-hidden border" style={{ borderColor: dm ? '#3a3a48' : '#e5e5e5' }}>
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

const CONSULT_COLOR = '#5BB0CC';
const CONSULT_BG = 'rgba(91,176,204,0.07)';
const CONSULT_BORDER = 'rgba(91,176,204,0.2)';

function parseConsultNotes(raw) {
  if (!raw) return { link: '', notes: '' };
  const m = raw.match(/^Link: (https?:\/\/\S+)(?:\n|$)/);
  return m ? { link: m[1], notes: raw.slice(m[0].length).trimStart() } : { link: '', notes: raw };
}

function ConsultationScheduler({ booking, onUpdateBooking, dm, onSent }) {
  const hasConsult = !!booking.consultation_date;
  const parsed = parseConsultNotes(booking.consultation_notes);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [meetLink, setMeetLink] = useState(parsed.link);
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
      const dateFormatted = new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const activeLink = form.type === 'Zoom' ? meetLink : '';
      const res = await fetch('/api/send-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          clientEmail: booking.email,
          clientName: booking.name,
          serviceName: booking.service,
          consultationDate: dateFormatted,
          consultationTime: form.time,
          consultationType: form.type,
          zoomLink: activeLink,
          consultationNotes: form.notes,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const storedNotes = [activeLink ? `Link: ${activeLink}` : null, form.notes || null].filter(Boolean).join('\n');
      onUpdateBooking({ consultation_date: form.date, consultation_time: form.time, consultation_type: form.type, consultation_notes: storedNotes });
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
    <div className="mb-6">
      <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-3">Consultation</p>

      {/* Scheduled state */}
      {hasConsult && !expanded && (
        <div className="flex items-center justify-between px-4 py-4 rounded-xl transition-all"
          style={{ background: dm ? '#1c1c28' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: CONSULT_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[0.78rem] font-semibold" style={{ color: dm ? '#cdb8c8' : CONSULT_COLOR }}>
                {booking.consultation_type} · {booking.consultation_time}
              </p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#71717a' : '#999' }}>
                {booking.consultation_date && new Date(booking.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {parsed.link && (
                <a href={parsed.link} target="_blank" rel="noopener noreferrer"
                  className="text-[0.65rem] mt-1 block truncate underline underline-offset-2"
                  style={{ color: dm ? '#71717a' : '#999' }}>
                  {parsed.link}
                </a>
              )}
              {parsed.notes && (
                <p className="text-[0.65rem] mt-0.5" style={{ color: dm ? '#52525b' : '#bbb' }}>{parsed.notes}</p>
              )}
            </div>
          </div>
          <button onClick={() => { setExpanded(true); setSent(false); }}
            className="text-[0.65rem] font-semibold tracking-[0.08em] uppercase ml-3 flex-shrink-0"
            style={{ color: dm ? '#cdb8c8' : CONSULT_COLOR }}>
            Edit
          </button>
        </div>
      )}

      {/* Empty state */}
      {!hasConsult && !expanded && (
        <button onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all touch-manipulation"
          style={{ background: dm ? '#1c1c28' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: CONSULT_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="text-left">
              <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#cdb8c8' : CONSULT_COLOR }}>Schedule Consultation</p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#52525b' : '#bbb' }}>Set date, time &amp; meeting type</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="2" className="w-3.5 h-3.5 opacity-40">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {/* Picker */}
      {expanded && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.18em] uppercase" style={{ color: CONSULT_COLOR }}>Consultation</p>
              <p className="font-serif text-[1rem] mt-0.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>Schedule a Meeting</p>
            </div>
            <button onClick={() => setExpanded(false)}
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
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="w-full px-4 rounded-xl outline-none appearance-none"
                  style={{ ...inputStyle, minHeight: '48px' }} />
              </div>
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>Time</label>
                <select value={form.time} onChange={e => set('time', e.target.value)}
                  className="w-full px-4 rounded-xl outline-none appearance-none"
                  style={{ ...inputStyle, minHeight: '48px' }}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>Meeting Type</label>
              <div className="flex gap-2">
                {['Zoom', 'Phone', 'In-Person'].map(key => (
                  <button key={key} type="button" onClick={() => set('type', key)}
                    className="flex-1 py-3 rounded-xl text-[0.72rem] font-semibold tracking-[0.04em] uppercase transition-all touch-manipulation"
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
                    className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation"
                    style={{ minHeight: '48px', fontSize: '14px', background: generatingLink ? (dm ? '#1c1c28' : '#f0ece8') : '#2D8CFF', color: generatingLink ? (dm ? '#52525b' : '#bbb') : '#fff', border: `1px solid ${generatingLink ? border : '#2D8CFF'}` }}>
                    {generatingLink ? (
                      <><div className="w-4 h-4 border-2 border-[#2D8CFF]/30 border-t-[#2D8CFF] rounded-full animate-spin" /> Generating…</>
                    ) : (
                      <>Generate Zoom Link</>
                    )}
                  </button>
                ) : (
                  <button type="button" onClick={copyMeetLink}
                    className="w-full px-4 rounded-xl text-left transition-all flex items-center justify-between gap-3 touch-manipulation"
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
                className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                style={{ ...inputStyle, minHeight: '80px' }} />
            </div>

            {/* CTA */}
            <button onClick={handleSend} disabled={saving || !form.date}
              className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation"
              style={{
                minHeight: '50px', fontSize: '14px',
                ...(!form.date
                  ? { background: dm ? '#2e2e38' : '#f0ece8', color: dm ? '#52525b' : '#bbb', cursor: 'not-allowed' }
                  : { background: '#111', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }),
              }}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                : 'Confirm & Notify Client'}
            </button>

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
  const [pendingTime, setPendingTime] = useState(booking.time || '');
  const [showReconfirmBanner, setShowReconfirmBanner] = useState(false);
  const [mapsKey, setMapsKey] = useState('');

  useEffect(() => {
    api.functions.invoke('getMapKey', {}).then(res => setMapsKey(res.data?.key || '')).catch(() => {});
  }, []);

  const showToast = (msg, color) => {
    setToast({ message: msg, color });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2200);
  };

  const handleStatusChange = (s) => {
    if (booking.status === s) return;
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
      if (booking.email) {
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
    queryKey: ['bridal-inquiry', booking.email],
    queryFn: async () => {
      const results = await api.entities.BridalInquiry.filter({ email: booking.email }, '-created_date', 1);
      return results[0] || null;
    },
    enabled: isBridal && !!booking.email,
  });

  // Scroll to top when detail view mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
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
      if (newStatus === 'confirmed') {
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

      <div className="rounded-xl p-6 sm:p-8 mb-6" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#e5e5e5'}` }}>
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
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl" style={{ background: dm ? '#1e1e24' : '#fafafa', border: `1px solid ${dm ? '#2a2420' : '#ebebeb'}`, animation: 'fadeSlideDown 0.3s ease-out' }}>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{totalVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#999]">Total Visits</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{completedVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#999]">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{cancelledVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#999]">Cancelled</div>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1">Date & Time</p>
            <p className="text-[0.9rem] font-medium" style={{ color: dm ? '#F0EBE6' : '#111' }}>{dateFormatted}</p>
            {booking.time && <p className="text-[0.85rem]" style={{ color: dm ? '#D4A0B0' : '#888' }}>{booking.time}</p>}
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1">Contact</p>
            {booking.email && <a href={`mailto:${booking.email}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block" style={{ color: dm ? '#e4e4e7' : '#111' }}>{booking.email}</a>}
            {booking.phone && <a href={`sms:${booking.phone}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block mt-0.5" style={{ color: dm ? '#71717a' : '#999' }}>{booking.phone}</a>}
          </div>
        </div>

        {booking.notes && (
          <div className="mb-6">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1">Notes</p>
            <p className="text-[0.85rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#777' }}>{booking.notes}</p>
          </div>
        )}

        {/* Bridal Inquiry Details */}
        {isBridal && bridalInquiry && (
          <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ background: dm ? 'rgba(212,160,176,0.12)' : 'rgba(212,160,176,0.1)', borderBottom: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
              <span className="text-base">💍</span>
              <p className="text-[0.6rem] font-bold tracking-[0.18em] uppercase text-[#D4A0B0]">Bridal Inquiry Details</p>
            </div>

            <div className="p-5" style={{ background: dm ? '#1e1e24' : '#FFFCFA' }}>
              {/* Top grid — key timing info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: '👰', label: 'Bride', value: `${bridalInquiry.bride_name || ''}${bridalInquiry.soon_to_be_last_name ? ` ${bridalInquiry.soon_to_be_last_name}` : ''}` },
                  { icon: '📅', label: 'Wedding Date', value: bridalInquiry.wedding_date ? new Date(bridalInquiry.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : null },
                  { icon: '🕐', label: 'Event Start', value: bridalInquiry.event_start_time },
                  { icon: '🚪', label: 'Venue Access', value: bridalInquiry.venue_access_time },
                ].filter(f => f.value).map(({ icon, label, value }) => (
                  <div key={label} className="rounded-xl px-4 py-3 flex items-center gap-3 sm:block" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                    <span className="text-[1.2rem] sm:hidden">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-0.5">{label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.85rem] hidden sm:inline">{icon}</span>
                        <p className="text-[0.85rem] font-medium leading-snug" style={{ color: dm ? '#e4e4e7' : '#111' }}>{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Makeup artist timing row */}
              {(bridalInquiry.ready_by_time || bridalInquiry.photographer_arrival_time) && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {bridalInquiry.ready_by_time && (
                    <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                      <div className="w-8 h-8 rounded-full bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[0.9rem]">💄</span>
                      </div>
                      <div>
                        <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-0.5">Artist Arrive By</p>
                        <p className="text-[0.85rem] font-semibold" style={{ color: dm ? '#D4A0B0' : '#C4849A' }}>{bridalInquiry.ready_by_time}</p>
                      </div>
                    </div>
                  )}
                  {bridalInquiry.photographer_arrival_time && (
                    <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                      <div className="w-8 h-8 rounded-full bg-[#B8A0D4]/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[0.9rem]">📷</span>
                      </div>
                      <div>
                        <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-0.5">Photographer Arrives</p>
                        <p className="text-[0.85rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>{bridalInquiry.photographer_arrival_time}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Event Location — big card with map embed */}
              {bridalInquiry.event_location && (
                <div className="rounded-xl overflow-hidden mb-5" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                  <div className="px-4 py-4 sm:py-3" style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-0.5">Event Location</p>
                        <CopyableAddress address={bridalInquiry.event_location} dm={dm} />
                      </div>
                      <a
                        href={`maps://?q=${encodeURIComponent(bridalInquiry.event_location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.65rem] font-semibold transition-colors flex-shrink-0"
                        style={{ background: dm ? '#3a3a48' : '#f5f5f5', color: dm ? '#D4A0B0' : '#888' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Maps
                      </a>
                    </div>
                  </div>
                  {/* Google Maps embed — desktop only */}
                  <div className="hidden sm:block">
                    {mapsKey ? (
                      <iframe
                        title="Event Location"
                        width="100%"
                        height="220"
                        style={{ border: 0, display: 'block' }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encodeURIComponent(bridalInquiry.event_location)}&zoom=14`}
                      />
                    ) : (
                      <div className="h-[120px] flex items-center justify-center" style={{ background: dm ? '#1e1e24' : '#f5f0ec' }}>
                        <div className="w-5 h-5 border-2 border-[#D4A0B0]/30 border-t-[#D4A0B0] rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor row */}
              {(bridalInquiry.photographer || bridalInquiry.hairstylist) && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {bridalInquiry.photographer && (
                    <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                      <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-1">Photographer</p>
                      <a href={`https://instagram.com/${bridalInquiry.photographer.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                        className="text-[0.82rem] font-medium hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#e4e4e7' : '#333' }}>
                        {bridalInquiry.photographer}
                      </a>
                    </div>
                  )}
                  {bridalInquiry.hairstylist && (
                    <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                      <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-1">Hairstylist</p>
                      <a href={`https://instagram.com/${bridalInquiry.hairstylist.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                        className="text-[0.82rem] font-medium hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#e4e4e7' : '#333' }}>
                        {bridalInquiry.hairstylist}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom row — glam count, instagram, how heard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {bridalInquiry.num_people_glam && (
                  <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                    <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-0.5">People Needing Glam</p>
                    <p className="text-[0.85rem] font-medium" style={{ color: dm ? '#e4e4e7' : '#111' }}>✨ {bridalInquiry.num_people_glam}</p>
                  </div>
                )}
                {bridalInquiry.instagram_handle && (
                  <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                    <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-0.5">Instagram / TikTok</p>
                    <a href={`https://instagram.com/${bridalInquiry.instagram_handle.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                      className="text-[0.82rem] font-medium hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#e4e4e7' : '#333' }}>
                      {bridalInquiry.instagram_handle}
                    </a>
                  </div>
                )}
                {bridalInquiry.how_heard && (
                  <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                    <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-0.5">How They Heard</p>
                    <p className="text-[0.82rem] font-medium" style={{ color: dm ? '#e4e4e7' : '#333' }}>{bridalInquiry.how_heard}</p>
                  </div>
                )}
              </div>

              {/* Additional details */}
              {bridalInquiry.additional_details && (
                <div className="rounded-xl px-4 py-3.5" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
                  <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#999] mb-1.5">Additional Details / Makeup Vision</p>
                  <p className="text-[0.83rem] leading-[1.7]" style={{ color: dm ? '#a1a1aa' : '#555' }}>{bridalInquiry.additional_details}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zelle Deposit Received */}
        <div className="mb-6">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-3">Zelle Deposit</p>

          {/* Screenshot viewer */}
          {booking.zelle_screenshot && (
            <ZelleScreenshotViewer bookingId={booking.id} table="bookings" dm={dm} />
          )}

          <div className="flex items-stretch gap-3">
            <button
              onClick={() => onUpdateBooking({ deposit_received: true })}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all"
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
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all"
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
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-3">Appointment Time</p>

          {/* Trigger — current time display (clickable) or empty state button */}
          {!showTimePicker && (
            booking.time ? (
              <button
                type="button"
                onClick={() => { setPendingTime(booking.time); setShowTimePicker(true); setShowReconfirmBanner(false); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all touch-manipulation hover:opacity-80 active:opacity-60"
                style={{ background: dm ? '#1e1e24' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dm ? '#2e2e38' : '#f5f5f5' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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
                onClick={() => { setPendingTime(''); setShowTimePicker(true); }}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl touch-manipulation transition-all hover:opacity-80"
                style={{ background: dm ? '#1e1e24' : '#fafafa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dm ? '#2e2e38' : '#f5f5f5' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#71717a' : '#888' }}>Set Appointment Time</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className="w-3.5 h-3.5 opacity-40"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )
          )}

          {/* Time picker — pill grid on ALL screen sizes */}
          {showTimePicker && (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ background: dm ? '#27272a' : '#f7f3f0', borderBottom: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
                <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase flex items-center gap-2" style={{ color: dm ? '#71717a' : '#888' }}>
                  Select a time
                  {pendingTime && (
                    <span className="text-[0.72rem] font-semibold tracking-normal normal-case" style={{ color: dm ? '#F0EBE6' : '#111' }}>
                      — {pendingTime}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all touch-manipulation"
                  style={{ background: dm ? '#3f3f46' : '#e5e5e5', color: dm ? '#71717a' : '#888' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Mobile — native time input (iOS wheel picker) */}
              <div className="block md:hidden p-4" style={{ background: dm ? '#1e1e24' : '#fafafa' }}>
                <input
                  type="time"
                  value={to24h(pendingTime)}
                  onChange={e => setPendingTime(from24h(e.target.value))}
                  style={{
                    width: '100%', fontSize: '16px', padding: '12px 16px',
                    borderRadius: '12px', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}`,
                    background: dm ? '#27272a' : '#fff', color: dm ? '#e4e4e7' : '#111',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Desktop — pill grid */}
              <div className="hidden md:block">
                <div className="p-3" style={{ background: dm ? '#1e1e24' : '#fafafa' }}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {APPT_TIMES.map(t => (
                      <button key={t} type="button" onClick={() => setPendingTime(t)}
                        className="py-2.5 rounded-lg text-[0.68rem] font-medium transition-all text-center touch-manipulation"
                        style={pendingTime === t
                          ? { background: '#111', color: '#fff', border: '1px solid #111' }
                          : { background: dm ? '#27272a' : '#fff', color: dm ? '#71717a' : '#888', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }
                        }
                      >{t}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <div className="px-3 pb-3" style={{ background: dm ? '#1e1e24' : '#fafafa' }}>
                <button
                  type="button"
                  disabled={!pendingTime}
                  onClick={() => {
                    if (!pendingTime) return;
                    onUpdateBooking({ time: pendingTime });
                    setShowTimePicker(false);
                    showToast(`Time set to ${pendingTime}`, '#888');
                    if (booking.status === 'confirmed') setShowReconfirmBanner(true);
                  }}
                  className="w-full py-3 rounded-xl text-[0.75rem] font-semibold tracking-[0.04em] transition-all touch-manipulation"
                  style={pendingTime
                    ? { background: '#111', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }
                    : { background: dm ? '#27272a' : '#f5f5f5', color: dm ? '#52525b' : '#bbb', cursor: 'not-allowed' }
                  }
                >
                  {pendingTime ? `Set to ${pendingTime}` : 'Select a time above'}
                </button>
              </div>
            </div>
          )}

          {/* Reconfirm banner — appears when time changes on a confirmed booking */}
          {showReconfirmBanner && booking.status === 'confirmed' && (
            <div className="mt-3 flex items-center justify-between px-4 py-3 rounded-xl"
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

        {/* Update Status */}
        <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-3">Update Status</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUSES.map(s => {
              const isActive = booking.status === s;
              return (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className="py-2.5 px-3 text-[0.65rem] font-semibold tracking-[0.06em] uppercase rounded-xl transition-all hover:opacity-90 truncate"
                  style={isActive
                    ? { background: STATUS_COLORS[s], color: '#fff' }
                    : { background: dm ? '#2e2e38' : '#f5f5f5', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                  }
                >{s}</button>
              );
            })}
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

        {/* Consultation Scheduler — moved to bottom after status */}
        <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
          <ConsultationScheduler booking={booking} onUpdateBooking={onUpdateBooking} dm={dm}
            onSent={() => showToast('Consultation sent', '#22c55e')} />
        </div>
      </div>

      {/* Client history */}
      {clientBookings.length > 0 && (
        <div className="rounded-xl p-6 sm:p-8" style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }}>
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-4">Appointment History</p>
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
          <div className="rounded-xl shadow-2xl p-7 max-w-[340px] w-full text-center"
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