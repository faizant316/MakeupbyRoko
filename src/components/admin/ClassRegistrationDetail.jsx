import { useState, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  if (!raw) return { link: '', notes: '' };
  const m = raw.match(/^Link: (https?:\/\/\S+)(?:\n|$)/);
  return m ? { link: m[1], notes: raw.slice(m[0].length).trimStart() } : { link: '', notes: raw };
}

function LessonScheduler({ reg, onUpdateReg, dm, className }) {
  const hasLesson = !!reg.appointment_date;
  const parsed = parseNotes(reg.lesson_notes);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [meetLink, setMeetLink] = useState(parsed.link);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [form, setForm] = useState({
    date: reg.appointment_date || '',
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
      if (data.join_url) setMeetLink(data.join_url);
      else alert(`Zoom error: ${data.error || 'Unknown error'}`);
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
      const res = await fetch('/api/send-class-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: reg.id,
          clientEmail: reg.email,
          clientName: reg.full_name,
          className,
          lessonDate: form.date,
          lessonTime: form.time,
          meetingType: form.type,
          zoomLink: form.type === 'Zoom' ? meetLink : '',
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const storedNotes = [form.type === 'Zoom' && meetLink ? `Link: ${meetLink}` : null, form.notes || null].filter(Boolean).join('\n');
      onUpdateReg({ appointment_date: form.date, appointment_time: form.time, consultation_type: form.type, lesson_notes: storedNotes });
      setSent(true);
      setExpanded(false);
    } catch {
      alert('Failed to send. Please try again.');
    } finally {
      setSaving(false);
    }
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
              {parsed.link && (
                <a href={parsed.link} target="_blank" rel="noopener noreferrer"
                  className="text-[0.65rem] mt-1 block truncate underline underline-offset-2"
                  style={{ color: textMuted }}>{parsed.link}</a>
              )}
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
                <p className="text-[0.75rem] font-medium text-green-600">Lesson scheduled — client notified.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CLASS_LABELS = {
  private_basic_lesson: 'Private Basic Makeup Lesson',
  virtual_lesson: 'Virtual Makeup Lesson',
  intermediate_lesson: 'Intermediate Makeup Lesson',
  glam_class: 'Glam Makeup Class',
  masterclass: 'Makeup Masterclass',
};

const CLASS_PRICES = {
  private_basic_lesson: 300,
  virtual_lesson: 400,
  intermediate_lesson: 500,
  glam_class: 600,
  masterclass: 1500,
};

const ENROLLMENT_STATUSES = {
  pending:   { bg: '#F59E0B', text: '#fff', label: 'Pending'   },
  confirmed: { bg: '#3B82F6', text: '#fff', label: 'Confirmed' },
  enrolled:  { bg: '#22C55E', text: '#fff', label: 'Enrolled'  },
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
  const [toast, setToast] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = (msg, color) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, color });
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToast(null), 500);
    }, 1800);
  };

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
      if (data.status === 'enrolled') {
        fetch('/api/send-class-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'enrolled', to: reg.email, name: reg.full_name }),
        }).catch(console.error);
      }
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

  const selectedClasses = Object.entries(CLASS_LABELS).filter(([key]) => reg[key]);
  const totalPrice = selectedClasses.reduce((sum, [key]) => sum + (CLASS_PRICES[key] || 0), 0);
  const paymentStatus = normalizePaymentStatus(reg.payment_status);
  const enrollmentStatus = reg.status || 'pending';
  const enrollmentMeta = ENROLLMENT_STATUSES[enrollmentStatus] || ENROLLMENT_STATUSES.pending;
  const paymentMeta = PAYMENT_META[paymentStatus] || PAYMENT_META.unpaid;

  const appointmentDate = reg.appointment_date
    ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const confirm = ({ title, body, color, icon, confirmLabel, onConfirm }) =>
    setConfirmModal({ title, body, color, icon, confirmLabel, onConfirm });

  const changeEnrollment = (newStatus) => {
    const meta = ENROLLMENT_STATUSES[newStatus];
    confirm({
      title: newStatus === 'cancelled' ? 'Cancel this enrollment?' : `Mark as ${meta.label}?`,
      body: newStatus === 'enrolled'
        ? 'A confirmation email will be sent to the client.'
        : newStatus === 'cancelled'
        ? 'This will cancel their enrollment.'
        : 'This will update their enrollment status.',
      color: meta.bg,
      icon: newStatus === 'cancelled' ? '✕' : '✓',
      confirmLabel: newStatus === 'cancelled' ? 'Yes, Cancel' : 'Yes, Update',
      onConfirm: () => {
        updateMutation.mutate({ status: newStatus });
        const msgs = { pending: 'Marked as pending', confirmed: 'Enrollment confirmed', enrolled: 'Enrolled', cancelled: 'Enrollment cancelled' };
        showToast(msgs[newStatus] || `Marked as ${meta.label}`, meta.bg);
      },
    });
  };

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
        showToast(`Payment ${meta.label.toLowerCase()}`, meta.color);
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

  return (
    <>
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase mb-6 transition-colors"
        style={{ color: '#D4A0B0' }}
        onMouseEnter={e => e.currentTarget.style.color = '#b8849a'}
        onMouseLeave={e => e.currentTarget.style.color = '#D4A0B0'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to List
      </button>

      {/* Card */}
      <div className="rounded-2xl p-6 sm:p-8" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: dm ? 'none' : '0 2px 16px rgba(0,0,0,0.04)' }}>

        {/* Header: name + badge */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-[1.7rem] font-light tracking-[-0.01em] mb-1.5" style={{ color: textMain }}>
              {reg.full_name || 'Unknown'}
            </h2>
            <p className="text-[0.8rem]" style={{ color: dm ? '#D4A0B0' : '#D4A0B0' }}>
              {selectedClasses.map(([, l]) => l).join(' · ') || 'No class selected'}
            </p>
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
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em]" style={{ color: textMuted }}>Total Paid</span>
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

        {/* Notes */}
        {reg.additional_notes && (
          <div className="mb-8">
            <SectionLabel>Notes</SectionLabel>
            <p className="text-[0.85rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#555' }}>
              {reg.additional_notes}
            </p>
          </div>
        )}

        {/* Lesson Scheduler */}
        <LessonScheduler
          reg={reg}
          className={selectedClasses.map(([, l]) => l).join(' · ') || 'Makeup Lesson'}
          dm={dm}
          onUpdateReg={(data) => {
            setReg(prev => ({ ...prev, ...data }));
            queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
          }}
        />

        {/* Enrollment Status */}
        <div className="mb-8">
          <SectionLabel>Enrollment Status</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(ENROLLMENT_STATUSES).map(([s, meta]) => (
              <button
                key={s}
                onClick={() => changeEnrollment(s)}
                className="py-2.5 px-3 rounded-xl text-[0.68rem] font-semibold tracking-[0.04em] transition-all"
                style={enrollmentStatus === s
                  ? { background: meta.bg, color: meta.text, boxShadow: `0 0 0 2px ${meta.bg}40` }
                  : { background: dm ? '#2e2e38' : '#f5f5f5', color: dm ? '#71717a' : '#aaa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }
                }
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div className="mb-8">
          <SectionLabel>Payment Status</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PAYMENT_META).map(([s, meta]) => (
              <button
                key={s}
                onClick={() => changePayment(s)}
                className="py-2.5 px-3 rounded-xl text-[0.68rem] font-semibold tracking-[0.04em] transition-all"
                style={paymentStatus === s
                  ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`, boxShadow: `0 0 0 2px ${meta.color}20` }
                  : { background: dm ? '#2e2e38' : '#f5f5f5', color: dm ? '#71717a' : '#aaa', border: `1px solid ${dm ? '#3a3a48' : '#e5e5e5'}` }
                }
              >
                {meta.label}
              </button>
            ))}
          </div>
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${toast.color}18` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: toast.color }} />
            </div>
            <p className="text-[0.8rem] font-semibold text-[#111] leading-snug whitespace-nowrap">{toast.message}</p>
          </div>
        </div>
      )}
    </>
  );
}
