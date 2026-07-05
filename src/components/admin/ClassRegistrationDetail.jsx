import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { openZoomHost, meetingIdFromUrl } from '@/lib/zoomHost';
import { CLASS_DISPLAY } from '@/lib/classCatalog';
import { AdminDatePicker, AdminTimeSelect } from './SchedulePicker';
import { parseRange } from '@/lib/timeWindow';

// Booksy-style hero gradients per enrollment status (matches BookingDetail).
const HERO_GRADIENTS = {
  pending:   'linear-gradient(150deg, #D97706, #F59E0B)',
  confirmed: 'linear-gradient(150deg, #15803D, #22C55E)',
  enrolled:  'linear-gradient(150deg, #15803D, #22C55E)',
  cancelled: 'linear-gradient(150deg, #DC2626, #EF4444)',
};

// Strip the legacy "| ✍️ Agreement … · Photos: …" suffix some older rows still
// carry in additional_notes, so the Notes section shows only real client notes.
function stripAgreementNote(raw) {
  return (raw || '').replace(/\s*\|\s*✍️[^]*$/u, '').trim();
}

// "2026-07-15" → "Wednesday, July 15, 2026"
function formatDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
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

const LESSON_COLOR = '#5BB0CC';
const LESSON_BG = 'rgba(91,176,204,0.07)';

function parseNotes(raw) {
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

function LessonScheduler({ reg, onUpdateReg, dm, className, phone, confirmFn }) {
  const hasLesson = !!reg.appointment_date;
  const parsed = parseNotes(reg.lesson_notes);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [meetLink, setMeetLink] = useState(parsed.link);
  const [meetingId, setMeetingId] = useState(parsed.meetingId);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [form, setForm] = useState({
    date: reg.appointment_date || reg.preferred_date || '',
    time: reg.appointment_time || TIME_SLOTS[2],
    type: reg.consultation_type || 'Zoom',
    notes: parsed.notes,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const border = dm ? '#3a3a48' : '#e5e5e5';
  const inputBg = dm ? '#1c1c28' : '#fafafa';
  const inputColor = dm ? '#e4e4e7' : '#111';
  const textMuted = dm ? '#71717a' : '#999';
  const inputStyle = { border: `1px solid ${border}`, background: inputBg, color: inputColor, fontSize: '16px' };

  const generateZoomLink = async () => {
    setGeneratingLink(true);
    setLinkCopied(false);
    try {
      const res = await fetch('/api/create-zoom-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Makeup by Roko — Lesson with ${reg.full_name || 'Client'}`,
          duration: 60,
          date: form.date || undefined,
          time: form.time || undefined,
        }),
      });
      const data = await res.json();
      if (data.join_url) {
        setMeetLink(data.join_url);
        setMeetingId(data.meeting_id ? String(data.meeting_id) : '');
      } else alert(`Zoom error: ${data.error || 'Unknown error'}`);
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

  const doSend = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/send-class-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: reg.id,
          clientEmail: reg.email,
          clientName: reg.full_name,
          clientPhone: phone || reg.phone || '',
          className,
          lessonDate: form.date,
          lessonTime: form.time,
          meetingType: form.type,
          zoomLink: form.type === 'Zoom' ? meetLink : '',
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const storedNotes = [
        form.type === 'Zoom' && meetLink ? `Link: ${meetLink}` : null,
        form.type === 'Zoom' && meetingId ? `MeetingId: ${meetingId}` : null,
        form.notes || null,
      ].filter(Boolean).join('\n');
      onUpdateReg({ appointment_date: form.date, appointment_time: form.time, consultation_type: form.type, lesson_notes: storedNotes, status: 'enrolled' });
      setSent(true);
      setExpanded(false);
    } catch {
      alert('Failed to send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = () => {
    if (!form.date || !form.time) { alert('Please select a date and time.'); return; }
    confirmFn({
      title: 'Confirm & Notify Client?',
      body: `This will enroll ${reg.full_name || 'the client'} and send them their lesson details.`,
      color: LESSON_COLOR,
      icon: '✓',
      confirmLabel: 'Yes, Send',
      onConfirm: doSend,
    });
  };

  const lessonDate = reg.appointment_date
    ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="mb-8">
      <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: textMuted }}>Makeup Lesson</p>

      {hasLesson && !expanded && (
        <div className="flex items-center justify-between px-4 py-4 rounded-xl"
          style={{ background: dm ? '#1c1c28' : '#fafafa', border: `1px solid ${border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: LESSON_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[0.78rem] font-semibold" style={{ color: dm ? '#cdb8c8' : LESSON_COLOR }}>
                {reg.consultation_type === 'Phone' ? 'Phone / FaceTime' : reg.consultation_type} · {reg.appointment_time}
              </p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: textMuted }}>{lessonDate}</p>
              {(meetingId || parsed.meetingId) ? (
                <button type="button"
                  onClick={() => openZoomHost(meetingId || parsed.meetingId, meetLink || parsed.link)}
                  className="text-[0.65rem] mt-1.5 inline-flex items-center gap-1.5 font-semibold"
                  style={{ color: dm ? '#cdb8c8' : LESSON_COLOR }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                  </svg>
                  Join as host
                </button>
              ) : parsed.link ? (
                <a href={parsed.link} target="_blank" rel="noopener noreferrer"
                  className="text-[0.65rem] mt-1 block truncate underline underline-offset-2"
                  style={{ color: textMuted }}>{parsed.link}</a>
              ) : null}
            </div>
          </div>
          <button onClick={() => { setExpanded(true); setSent(false); }}
            className="text-[0.65rem] font-semibold tracking-[0.08em] uppercase ml-3 flex-shrink-0"
            style={{ color: dm ? '#cdb8c8' : LESSON_COLOR }}>
            Edit
          </button>
        </div>
      )}

      {!hasLesson && !expanded && (
        <button onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all touch-manipulation"
          style={{ background: dm ? '#1c1c28' : '#fafafa', border: `1px solid ${border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: LESSON_BG }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="text-left">
              <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#cdb8c8' : LESSON_COLOR }}>Schedule Makeup Lesson</p>
              <p className="text-[0.68rem] mt-0.5" style={{ color: dm ? '#52525b' : '#bbb' }}>Set date, time &amp; meeting type</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="2" className="w-3.5 h-3.5 opacity-40">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {expanded && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.18em] uppercase" style={{ color: LESSON_COLOR }}>Makeup Lesson</p>
              <p className="font-serif text-[1rem] mt-0.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>Schedule Makeup Lesson</p>
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
                <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent={LESSON_COLOR} />
              </div>
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>Time</label>
                <AdminTimeSelect value={form.time} onChange={v => set('time', v)} dm={dm} slots={TIME_SLOTS} accent={LESSON_COLOR} />
              </div>
            </div>

            {/* Meeting Type */}
            <div>
              <label className="block text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: textMuted }}>Meeting Type</label>
              <div className="flex gap-2">
                {[{ value: 'Zoom', label: 'Zoom' }, { value: 'Phone', label: 'Phone / FaceTime' }].map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => set('type', value)}
                    className="flex-1 py-3 rounded-xl text-[0.72rem] font-semibold tracking-[0.04em] uppercase transition-all touch-manipulation"
                    style={form.type === value
                      ? { background: '#111', color: '#fff', border: '1px solid #111' }
                      : { background: inputBg, color: textMuted, border: `1px solid ${border}` }
                    }>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom link */}
            {form.type === 'Zoom' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase" style={{ color: textMuted }}>Zoom Link</label>
                  {meetLink && (
                    <button type="button" onClick={generateZoomLink} disabled={generatingLink}
                      className="flex items-center gap-1 text-[0.65rem] font-semibold px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: dm ? '#2a2a32' : '#f7f2f6', color: LESSON_COLOR, border: `1px solid ${border}` }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      New Link
                    </button>
                  )}
                </div>
                {!meetLink ? (
                  <button type="button" onClick={generateZoomLink} disabled={generatingLink}
                    className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation"
                    style={{ minHeight: '48px', fontSize: '14px', background: generatingLink ? inputBg : '#2D8CFF', color: generatingLink ? textMuted : '#fff', border: `1px solid ${generatingLink ? border : '#2D8CFF'}` }}>
                    {generatingLink
                      ? <><div className="w-4 h-4 border-2 border-[#2D8CFF]/30 border-t-[#2D8CFF] rounded-full animate-spin" /> Generating…</>
                      : 'Generate Zoom Link'}
                  </button>
                ) : (
                  <button type="button" onClick={copyMeetLink}
                    className="w-full px-4 rounded-xl text-left transition-all flex items-center justify-between gap-3 touch-manipulation"
                    style={{ minHeight: '48px', background: linkCopied ? (dm ? '#14532d' : '#f0fdf4') : inputBg, border: `1.5px solid ${linkCopied ? '#22c55e' : '#2D8CFF'}` }}>
                    <span className="text-[0.73rem] font-medium truncate" style={{ color: linkCopied ? '#16a34a' : '#2D8CFF' }}>{meetLink}</span>
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
                Notes <span style={{ color: dm ? '#52525b' : '#d4c8c0', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
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
                <p className="text-[0.75rem] font-medium text-green-600">Enrolled and notified.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ENROLLMENT_STATUSES = {
  pending:   { bg: '#F59E0B', text: '#fff', label: 'Pending'   },
  confirmed: { bg: '#16A34A', text: '#fff', label: 'Confirmed' },
  enrolled:  { bg: '#16A34A', text: '#fff', label: 'Enrolled'  },
  cancelled: { bg: '#EF4444', text: '#fff', label: 'Cancelled' },
};

const PAYMENT_META = {
  unpaid:   { label: 'Unpaid',   color: '#C4849A', bg: 'rgba(212,160,176,0.14)' },
  paid:     { label: 'Paid',     color: '#15803d', bg: 'rgba(34,197,94,0.1)'    },
  refunded: { label: 'Refunded', color: '#b91c1c', bg: 'rgba(239,68,68,0.1)'    },
};

function normalizePaymentStatus(raw) {
  if (!raw || raw === 'pending' || raw === 'unpaid') return 'unpaid';
  if (['paid', 'deposit_paid', 'paid_in_full'].includes(raw)) return 'paid';
  if (raw === 'refunded') return 'refunded';
  return 'unpaid';
}

function ConfirmModal({ modal, onCancel, onConfirm, dm }) {
  if (!modal) return null;
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-xl shadow-2xl p-7 max-w-[340px] w-full text-center"
        style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#e5e5e5'}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: modal.color + '22', border: `1.5px solid ${modal.color}44` }}>
          <span style={{ color: modal.color, fontSize: '16px', fontWeight: 700 }}>{modal.icon || '✓'}</span>
        </div>
        <p className="text-[1.05rem] font-serif mb-1.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>{modal.title}</p>
        <p className="text-[0.78rem] mb-6" style={{ color: dm ? '#71717a' : '#999' }}>{modal.body}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel}
            className="px-5 py-2 text-[0.75rem] font-medium rounded-lg transition-all"
            style={{ color: dm ? '#a1a1aa' : '#777', border: `1px solid ${dm ? '#3f3f46' : '#e5e5e5'}` }}>
            Never Mind
          </button>
          <button onClick={onConfirm}
            className="px-5 py-2 text-[0.75rem] font-semibold text-white rounded-lg"
            style={{ background: modal.color }}>
            {modal.confirmLabel || 'Yes, Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassRegistrationDetail({ reg: initialReg, onBack, darkMode: dm }) {
  const queryClient = useQueryClient();
  const [reg, setReg] = useState(initialReg);
  const [confirmModal, setConfirmModal] = useState(null);

  const cardBg    = dm ? '#26262e' : '#fff';
  const cardBorder = dm ? '#3a3a48' : '#e5e5e5';
  const textMain  = dm ? '#e4e4e7' : '#111';
  const textMuted = dm ? '#71717a' : '#999';
  const sectionBg = dm ? '#1e1e24' : '#fafafa';

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.ClassRegistration.update(reg.id, data),
    onSuccess: (_, data) => {
      setReg(prev => ({ ...prev, ...data }));
      queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.entities.ClassRegistration.delete(reg.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
      onBack();
    },
  });

  const selectedClasses = Object.entries(CLASS_DISPLAY).filter(([key]) => reg[key]);
  const classLabel = selectedClasses.map(([, m]) => m.title).join(' · ');
  const computedTotal = selectedClasses.reduce((sum, [, m]) => sum + (m.price || 0), 0);
  // Prefer what Stripe actually charged; fall back to the catalog sum for
  // manually-added rows that never went through checkout.
  const totalPrice = reg.amount_paid ?? computedTotal;
  // Sign-ups reach this page because they paid through Stripe at checkout, so
  // "paid" is the baseline truth — the only meaningful payment action left is a
  // refund. Exception: a client added manually (no Stripe session) never went
  // through checkout, so treat that as genuinely unpaid and let Roko mark it paid.
  const payState = normalizePaymentStatus(reg.payment_status);
  const isRefunded = payState === 'refunded';
  const isUnpaid = payState === 'unpaid' && !reg.stripe_session_id;
  const enrollmentStatus = reg.status || 'pending';
  const enrollmentMeta = ENROLLMENT_STATUSES[enrollmentStatus] || ENROLLMENT_STATUSES.pending;
  const paymentMeta = isRefunded ? PAYMENT_META.refunded : isUnpaid ? PAYMENT_META.unpaid : PAYMENT_META.paid;

  const appointmentDate = reg.appointment_date
    ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const confirm = ({ title, body, color, icon, confirmLabel, onConfirm }) =>
    setConfirmModal({ title, body, color, icon, confirmLabel, onConfirm });

  const changePayment = (newStatus) => {
    const meta = PAYMENT_META[newStatus];
    confirm({
      title: `Mark as ${meta.label}?`,
      body: 'This will update their payment status.',
      color: meta.color,
      icon: '✓',
      confirmLabel: 'Yes, Update',
      onConfirm: () => {
        updateMutation.mutate({ payment_status: newStatus });
      },
    });
  };

  const handleDelete = () => confirm({
    title: 'Delete this registration?',
    body: 'This cannot be undone.',
    color: '#EF4444',
    icon: '✕',
    confirmLabel: 'Yes, Delete',
    onConfirm: () => deleteMutation.mutate(),
  });

  const SectionLabel = ({ children }) => (
    <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: textMuted }}>
      {children}
    </p>
  );

  const heroWin = parseRange(reg.appointment_time || '');
  const heroDate = reg.appointment_date
    ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date set';
  const signedUpOn = reg.created_date
    ? new Date(reg.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <>
      {/* ── Booksy-style status hero ── */}
      <div className="relative mb-6">
        <div className="rounded-2xl px-5 pt-4 pb-14 text-center"
          style={{ background: HERO_GRADIENTS[enrollmentStatus] || HERO_GRADIENTS.pending }}>
          <div className="flex items-center justify-between">
            <button onClick={onBack} aria-label="Back to list"
              className="w-10 h-10 -ml-1.5 rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-white/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div className="min-w-0 px-2">
              <p className="text-white font-bold tracking-[0.16em] uppercase text-[1.25rem] leading-none">{enrollmentMeta.label}</p>
              <p className="text-white/70 text-[0.64rem] mt-1.5 truncate tabular-nums">
                Makeup Class · ID: {String(reg.id || '').slice(0, 8).toUpperCase()}{signedUpOn ? ` · Signed up ${signedUpOn}` : ''}
              </p>
            </div>
            <span className="w-10 -mr-1.5" />
          </div>
        </div>

        {/* START | DATE card, overlapping the banner like Booksy */}
        <div className="relative w-[calc(100%-24px)] sm:w-[calc(100%-40px)] mx-auto -mt-10 grid grid-cols-[1fr_auto_1fr] items-center rounded-xl px-1 py-3.5"
          style={{
            background: dm ? '#27272a' : '#fff',
            border: `1px solid ${dm ? '#3f3f46' : '#eee'}`,
            boxShadow: dm ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(50,35,30,0.12)',
          }}>
          <div className="px-4 min-w-0">
            <p className="text-[0.56rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#71717a' : '#a9a29a' }}>Start</p>
            <p className="text-[1.05rem] font-semibold mt-0.5 truncate tabular-nums" style={{ color: dm ? '#F0EBE6' : '#111' }}>
              {heroWin.start || 'Not set'}
            </p>
            {heroWin.end && <p className="text-[0.64rem] tabular-nums" style={{ color: dm ? '#71717a' : '#b0a89f' }}>until {heroWin.end}</p>}
          </div>
          <div className="w-px self-stretch" style={{ background: dm ? '#3a3a44' : '#f0eae4' }} />
          <div className="px-4 min-w-0">
            <p className="text-[0.56rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#71717a' : '#a9a29a' }}>Date</p>
            <p className="text-[1.05rem] font-semibold mt-0.5 truncate" style={{ color: dm ? '#F0EBE6' : '#111' }}>{heroDate}</p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl p-6 sm:p-8" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: dm ? 'none' : '0 2px 16px rgba(0,0,0,0.04)' }}>

        {/* Header: name + badge */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-[1.7rem] font-light tracking-[-0.01em] mb-1.5" style={{ color: textMain }}>
              {reg.full_name || 'Unknown'}
            </h2>
            <p className="text-[0.8rem]" style={{ color: dm ? '#D4A0B0' : '#D4A0B0' }}>
              {classLabel || 'No class selected'}
            </p>
            {/* Agreement + photo-consent chips, near the name (not in Notes). */}
            {reg.contract_signed && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.6rem] font-semibold tracking-[0.04em]"
                  style={{ background: dm ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.1)', color: dm ? '#86efac' : '#15803d' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Agreement signed
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.6rem] font-semibold tracking-[0.04em]"
                  style={reg.contract_photo_consent
                    ? { background: dm ? 'rgba(212,160,176,0.18)' : 'rgba(212,160,176,0.16)', color: dm ? '#e7c9d5' : '#A0607A' }
                    : { background: dm ? '#33333c' : '#F1EEEA', color: dm ? '#a1a1aa' : '#8a7e84' }}>
                  Photos: {reg.contract_photo_consent ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
          <span
            className="px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-full flex-shrink-0 mt-1"
            style={{ background: enrollmentMeta.bg, color: enrollmentMeta.text }}
          >
            {enrollmentMeta.label}
          </span>
        </div>

        {/* Date/Time + Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <SectionLabel>Date & Time</SectionLabel>
            {appointmentDate ? (
              <>
                <p className="text-[0.95rem] font-semibold" style={{ color: textMain }}>{appointmentDate}</p>
                {reg.appointment_time && <p className="text-[0.82rem] mt-0.5" style={{ color: textMuted }}>{reg.appointment_time}</p>}
                {reg.consultation_type && (
                  <p className="text-[0.72rem] mt-1 font-medium" style={{ color: LESSON_COLOR }}>
                    {reg.consultation_type === 'Phone' ? 'Phone / FaceTime' : reg.consultation_type}
                  </p>
                )}
              </>
            ) : reg.preferred_date ? (
              <>
                <p className="text-[0.95rem] font-semibold" style={{ color: textMain }}>{formatDate(reg.preferred_date)}</p>
                <p className="text-[0.72rem] mt-1 font-medium" style={{ color: dm ? '#c47a92' : '#A0607A' }}>Requested by client · not yet confirmed</p>
              </>
            ) : (
              <p className="text-[0.82rem] italic" style={{ color: dm ? '#52525b' : '#ccc' }}>Not scheduled yet</p>
            )}
          </div>
          <div>
            <SectionLabel>Contact</SectionLabel>
            {reg.email && (
              <a href={`mailto:${reg.email}`} className="block text-[0.85rem] hover:underline mb-1"
                style={{ color: dm ? '#60a5fa' : '#1d4ed8' }}>
                {reg.email}
              </a>
            )}
            {reg.phone && (
              <a href={`tel:${reg.phone}`} className="block text-[0.82rem]" style={{ color: textMuted }}>
                {reg.phone}
              </a>
            )}
          </div>
        </div>

        {/* Total */}
        {totalPrice > 0 && (
          <div className="mb-8 px-4 py-3 rounded-xl flex items-center justify-between"
            style={{ background: sectionBg, border: `1px solid ${cardBorder}` }}>
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em]" style={{ color: textMuted }}>{isUnpaid ? 'Total Due' : 'Total Paid'}</span>
            <div className="flex items-center gap-3">
              <span
                className="px-2.5 py-0.5 rounded-full text-[0.6rem] font-semibold tracking-[0.06em] uppercase"
                style={{ background: paymentMeta.bg, color: paymentMeta.color }}
              >
                {paymentMeta.label}
              </span>
              <span className="font-serif text-[1.1rem]" style={{ color: dm ? '#D4A0B0' : '#D4A0B0' }}>
                ${totalPrice.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Notes — real client notes only (agreement lives in the chips above). */}
        {stripAgreementNote(reg.additional_notes) && (
          <div className="mb-8">
            <SectionLabel>Notes</SectionLabel>
            <p className="text-[0.85rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#555' }}>
              {stripAgreementNote(reg.additional_notes)}
            </p>
          </div>
        )}

        {/* Lesson Scheduler */}
        <LessonScheduler
          reg={reg}
          className={classLabel || 'Makeup Lesson'}
          phone={reg.phone}
          dm={dm}
          confirmFn={confirm}
          onUpdateReg={(data) => {
            setReg(prev => ({ ...prev, ...data }));
            queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
          }}
        />

        {/* Payment — paid at checkout, so refund is the only real action.
            Manually-added clients (no Stripe session) start out genuinely unpaid. */}
        <div className="mb-8">
          <SectionLabel>Payment</SectionLabel>
          {isUnpaid ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: dm ? 'rgba(212,160,176,0.08)' : '#FBF5F7', border: `1px solid ${dm ? '#5a4750' : '#EAD7E0'}` }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,132,154,0.16)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8rem] font-semibold" style={{ color: dm ? '#e7c9d5' : '#A0607A' }}>Not paid yet</p>
                  <p className="text-[0.65rem] mt-0.5" style={{ color: textMuted }}>
                    Added manually{totalPrice > 0 ? ` · $${totalPrice.toLocaleString()} due` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => changePayment('paid')}
                className="text-[0.65rem] font-semibold tracking-[0.04em] px-3 py-2 rounded-lg transition-all flex-shrink-0"
                style={{ color: '#fff', background: '#15803d', border: '1px solid #15803d' }}
              >
                Mark as Paid
              </button>
            </div>
          ) : !isRefunded ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: sectionBg, border: `1px solid ${cardBorder}` }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8rem] font-semibold" style={{ color: dm ? '#86efac' : '#15803d' }}>Paid in full</p>
                  <p className="text-[0.65rem] mt-0.5" style={{ color: textMuted }}>
                    Settled at checkout{totalPrice > 0 ? ` · $${totalPrice.toLocaleString()}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => changePayment('refunded')}
                className="text-[0.65rem] font-semibold tracking-[0.04em] px-3 py-2 rounded-lg transition-all flex-shrink-0"
                style={{ color: '#b91c1c', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}
              >
                Mark as Refunded
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: dm ? 'rgba(239,68,68,0.08)' : '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8rem] font-semibold" style={{ color: '#b91c1c' }}>Refunded</p>
                  <p className="text-[0.65rem] mt-0.5" style={{ color: textMuted }}>This payment was returned</p>
                </div>
              </div>
              <button
                onClick={() => changePayment('paid')}
                className="text-[0.65rem] font-semibold tracking-[0.04em] px-3 py-2 rounded-lg transition-all flex-shrink-0"
                style={{ color: dm ? '#86efac' : '#15803d', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}`, background: dm ? '#2e2e38' : '#f5f5f5' }}
              >
                Undo Refund
              </button>
            </div>
          )}
        </div>

        {/* Stripe reference */}
        {reg.stripe_session_id && (
          <p className="text-[0.6rem] font-mono mb-6" style={{ color: dm ? '#3f3f48' : '#ccc' }}>
            Stripe: {reg.stripe_session_id.slice(0, 36)}…
          </p>
        )}

        {/* Delete */}
        <div className="pt-6" style={{ borderTop: `1px solid ${cardBorder}` }}>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-[0.7rem] font-medium py-2 px-3 rounded-lg transition-all"
            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete Registration
          </button>
        </div>
      </div>

      <ConfirmModal
        modal={confirmModal}
        dm={dm}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
      />
    </>
  );
}
