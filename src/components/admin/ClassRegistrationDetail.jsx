import { useState, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [editDate, setEditDate] = useState(reg.appointment_date || '');
  const [editTime, setEditTime] = useState(reg.appointment_time || '');
  const [editConsultType, setEditConsultType] = useState(reg.consultation_type || '');
  const [confirmModal, setConfirmModal] = useState(null);
  const [dateSaveState, setDateSaveState] = useState(null);
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
                {reg.appointment_time && (
                  <p className="text-[0.82rem] mt-0.5" style={{ color: textMuted }}>{reg.appointment_time}</p>
                )}
                {reg.consultation_type && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {reg.consultation_type === 'zoom' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3" style={{ color: '#2D8CFF' }}>
                        <path d="M15 10l4.553-2.07A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3" style={{ color: '#22C55E' }}>
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.12 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                      </svg>
                    )}
                    <span className="text-[0.7rem] font-medium" style={{ color: textMuted }}>
                      {reg.consultation_type === 'zoom' ? 'Zoom' : 'Phone / FaceTime'}
                    </span>
                  </div>
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

        {/* Schedule */}
        <div className="mb-8">
          <SectionLabel>Schedule Consultation</SectionLabel>

          {/* Consultation type */}
          <div className="mb-4">
            <label className="block text-[0.6rem] font-medium mb-2" style={{ color: textMuted }}>Consultation Type</label>
            <div className="flex gap-2">
              {[
                {
                  value: 'zoom',
                  label: 'Zoom',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                      <path d="M15 10l4.553-2.07A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                    </svg>
                  ),
                  activeColor: '#2D8CFF',
                },
                {
                  value: 'phone',
                  label: 'Phone / FaceTime',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.12 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                    </svg>
                  ),
                  activeColor: '#22C55E',
                },
              ].map(({ value, label, icon, activeColor }) => {
                const active = editConsultType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEditConsultType(active ? '' : value)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[0.72rem] font-medium transition-all"
                    style={active
                      ? { background: activeColor + '18', color: activeColor, border: `1.5px solid ${activeColor}55` }
                      : { background: sectionBg, color: textMuted, border: `1px solid ${cardBorder}` }
                    }
                  >
                    <span style={{ color: active ? activeColor : textMuted }}>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[0.6rem] font-medium mb-1.5" style={{ color: textMuted }}>Date</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-[0.82rem] outline-none"
                style={{ background: sectionBg, border: `1px solid ${cardBorder}`, color: textMain }}
              />
            </div>
            <div>
              <label className="block text-[0.6rem] font-medium mb-1.5" style={{ color: textMuted }}>Time</label>
              <input
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-[0.82rem] outline-none"
                style={{ background: sectionBg, border: `1px solid ${cardBorder}`, color: textMain }}
              />
            </div>
          </div>
          <button
            disabled={dateSaveState === 'saving'}
            onClick={async () => {
              setDateSaveState('saving');
              try {
                await updateMutation.mutateAsync({ appointment_date: editDate, appointment_time: editTime, consultation_type: editConsultType || null });
                setDateSaveState('saved');
                setTimeout(() => setDateSaveState(null), 2200);
              } catch {
                setDateSaveState(null);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[0.72rem] font-semibold transition-all"
            style={{
              background: dateSaveState === 'saved' ? '#22C55E' : '#111',
              color: '#fff',
              opacity: dateSaveState === 'saving' ? 0.65 : 1,
              transform: dateSaveState === 'saved' ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {dateSaveState === 'saved' ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>
                Saved
              </>
            ) : dateSaveState === 'saving' ? 'Saving...' : 'Save Date & Time'}
          </button>
        </div>

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
