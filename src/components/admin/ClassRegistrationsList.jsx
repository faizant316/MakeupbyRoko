import { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

const CLASS_STATUS_STYLES = {
  pending:   { bg: '#F59E0B', text: '#fff', label: 'Pending'   },
  confirmed: { bg: '#3B82F6', text: '#fff', label: 'Confirmed' },
  enrolled:  { bg: '#22C55E', text: '#fff', label: 'Enrolled'  },
  cancelled: { bg: '#EF4444', text: '#fff', label: 'Cancelled' },
};

const PAYMENT_META = {
  pending:      { label: 'Deposit Pending',  color: '#b45309', bg: 'rgba(245,158,11,0.08)' },
  deposit_paid: { label: 'Deposit Paid',     color: '#15803d', bg: 'rgba(34,197,94,0.08)'  },
  paid_in_full: { label: 'Paid in Full',     color: '#15803d', bg: 'rgba(34,197,94,0.12)'  },
  refunded:     { label: 'Refunded',         color: '#b91c1c', bg: 'rgba(239,68,68,0.08)'  },
};

// Badge on card header — stays rounded-full (display only)
function ClassStatusBadge({ status }) {
  const s = CLASS_STATUS_STYLES[status] || CLASS_STATUS_STYLES.pending;
  return (
    <span className="px-3 py-1 text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-full flex-shrink-0"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

// In-site confirm modal — mirrors BookingDetail's modal exactly
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
        style={{
          background: dm ? '#27272a' : '#fff',
          border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}`,
          animation: 'fadeSlideDown 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: modal.color + '22', border: `1.5px solid ${modal.color}44` }}
        >
          <span style={{ color: modal.color, fontSize: '16px', fontWeight: 700 }}>
            {modal.icon || '✓'}
          </span>
        </div>
        <p className="text-[1.05rem] font-serif mb-1.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>
          {modal.title}
        </p>
        <p className="text-[0.78rem] mb-6" style={{ color: dm ? '#71717a' : '#999' }}>
          {modal.body}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-[0.75rem] font-medium rounded-lg transition-all"
            style={{ color: dm ? '#a1a1aa' : '#777', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}` }}
          >
            Never Mind
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-[0.75rem] font-semibold text-white rounded-lg transition-all"
            style={{ background: modal.color }}
          >
            {modal.confirmLabel || 'Yes, Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassRegistrationsList({ darkMode: dm, onBack, autoExpandId }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(autoExpandId ?? null);
  const [editDate, setEditDate] = useState({});
  const [editTime, setEditTime] = useState({});
  const [confirmModal, setConfirmModal] = useState(null); // { title, body, color, icon, confirmLabel, onConfirm }

  // Auto-expand when autoExpandId changes (navigated from Just Booked)
  useEffect(() => {
    if (autoExpandId) setExpandedId(autoExpandId);
  }, [autoExpandId]);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['class-registrations'],
    queryFn: () => base44.entities.ClassRegistration.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassRegistration.update(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
      const reg = registrations.find(r => r.id === id);
      if (!reg) return;
      // Only send email when marking as enrolled — payment changes are internal tracking
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
    mutationFn: (id) => base44.entities.ClassRegistration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
    },
  });

  const changeStatus = (reg, newStatus) => {
    const s = CLASS_STATUS_STYLES[newStatus];
    const isEnrolled = newStatus === 'enrolled';
    const isCancelled = newStatus === 'cancelled';
    setConfirmModal({
      title: isCancelled ? 'Cancel this enrollment?' : `Mark as ${s?.label || newStatus}?`,
      body: isEnrolled
        ? 'A confirmation email will be sent to the client.'
        : isCancelled
        ? 'This will cancel their enrollment.'
        : 'This will update their enrollment status.',
      color: s?.bg || '#F59E0B',
      icon: isCancelled ? '✕' : '✓',
      confirmLabel: isCancelled ? 'Yes, Cancel' : 'Yes, Update',
      onConfirm: () => updateMutation.mutate({ id: reg.id, data: { status: newStatus } }),
    });
  };

  const changePaymentStatus = (reg, newPaymentStatus) => {
    const meta = PAYMENT_META[newPaymentStatus];
    setConfirmModal({
      title: `Mark as ${meta?.label || newPaymentStatus}?`,
      body: 'This will update their payment status.',
      color: meta?.color || '#22C55E',
      icon: '✓',
      confirmLabel: 'Yes, Update',
      onConfirm: () => updateMutation.mutate({ id: reg.id, data: { payment_status: newPaymentStatus } }),
    });
  };

  const confirmDelete = (reg) => {
    setConfirmModal({
      title: 'Delete this registration?',
      body: 'This cannot be undone.',
      color: '#EF4444',
      icon: '✕',
      confirmLabel: 'Yes, Delete',
      onConfirm: () => deleteMutation.mutate(reg.id),
    });
  };

  const saveDateTime = (reg) => {
    const d = editDate[reg.id] ?? reg.appointment_date ?? '';
    const t = editTime[reg.id] ?? reg.appointment_time ?? '';
    updateMutation.mutate({ id: reg.id, data: { appointment_date: d, appointment_time: t } });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#e8e2dc] border-t-[#A0785A] rounded-full animate-spin" /></div>;
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-serif text-[1.1rem] mb-2" style={{ color: dm ? '#71717a' : '#b5a99a' }}>No class registrations yet</p>
        <p className="text-[0.75rem]" style={{ color: dm ? '#52525b' : '#d4c8c0' }}>Registrations from the website will appear here ✦</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Summary */}
        <div className="flex items-center gap-4 mb-2 flex-wrap">
          <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase" style={{ color: dm ? '#71717a' : '#b5a99a' }}>
            {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
          </p>
          {Object.entries(CLASS_STATUS_STYLES).map(([s, meta]) => {
            const cnt = registrations.filter(r => (r.status || 'pending') === s).length;
            if (!cnt) return null;
            return (
              <span key={s} className="text-[0.65rem] font-semibold" style={{ color: meta.bg }}>
                {cnt} {meta.label.toLowerCase()}
              </span>
            );
          })}
        </div>

        {/* Cards */}
        {registrations.map(reg => {
          const selectedClasses = Object.entries(CLASS_LABELS).filter(([key]) => reg[key]);
          const totalPrice = selectedClasses.reduce((sum, [key]) => sum + (CLASS_PRICES[key] || 0), 0);
          const depositAmount = Math.round(totalPrice / 2);
          const isExpanded = expandedId === reg.id;
          const pm = PAYMENT_META[reg.payment_status] || PAYMENT_META.pending;
          const currentStatus = reg.status || 'pending';

          const appointmentDate = reg.appointment_date
            ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
            : '';

          return (
            <div key={reg.id}>
              {/* Main card */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                className="rounded-xl p-5 text-left transition-all group w-full"
                style={{
                  background: dm ? '#1e1e24' : '#fff',
                  border: `1px solid ${isExpanded ? 'rgba(212,160,176,0.5)' : (dm ? '#3a3a48' : '#e8e2dc')}`,
                  borderBottomLeftRadius: isExpanded ? 0 : undefined,
                  borderBottomRightRadius: isExpanded ? 0 : undefined,
                }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.borderColor = 'rgba(212,160,176,0.5)'; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#e8e2dc'; }}
              >
                {/* Name + badge */}
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-serif text-[1.05rem] group-hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#F0EBE6' : '#111' }}>
                    {reg.full_name || 'Unknown'}
                  </h4>
                  <ClassStatusBadge status={currentStatus} />
                </div>

                {/* Date / email / phone rows */}
                <div className="flex flex-col gap-1.5 mb-3">
                  {appointmentDate ? (
                    <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: dm ? '#71717a' : '#999' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {appointmentDate}{reg.appointment_time && ` at ${reg.appointment_time}`}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: dm ? '#52525b' : '#ccc' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      No date scheduled yet
                    </div>
                  )}
                  {reg.email && (
                    <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: dm ? '#71717a' : '#999' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                      {reg.email}
                    </div>
                  )}
                  {reg.phone && (
                    <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: dm ? '#71717a' : '#999' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      {reg.phone}
                    </div>
                  )}
                </div>

                {/* Class names */}
                <span className="text-[0.75rem] font-semibold block mb-3" style={{ color: dm ? '#D4A0B0' : '#A0785A' }}>
                  {selectedClasses.length > 0 ? selectedClasses.map(([, l]) => l).join(' · ') : 'No classes selected'}
                  {depositAmount > 0 && <span className="ml-2 font-normal text-[0.7rem]" style={{ color: dm ? '#71717a' : '#bbb' }}>(${depositAmount} deposit)</span>}
                </span>

                {/* Footer: payment badge + contact buttons */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
                  <span className="text-[0.6rem] font-semibold tracking-[0.08em] uppercase px-3 py-1 rounded-full"
                    style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
                  {reg.email && (
                    <a href={`mailto:${reg.email}?subject=Makeup Class with Roko`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.04em] uppercase rounded-lg hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all ml-auto"
                      style={{ color: dm ? '#71717a' : '#555', border: `1px solid ${dm ? '#3a3a48' : '#e4ddd7'}` }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Email
                    </a>
                  )}
                  {reg.phone && (
                    <a href={`sms:${reg.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.04em] uppercase rounded-lg hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all"
                      style={{ color: dm ? '#71717a' : '#555', border: `1px solid ${dm ? '#3a3a48' : '#e4ddd7'}` }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Text
                    </a>
                  )}
                </div>
              </button>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div
                  className="px-5 pb-6 pt-5 flex flex-col gap-5 rounded-b-xl"
                  style={{
                    background: dm ? '#27272a' : '#FAF8F6',
                    border: `1px solid rgba(212,160,176,0.5)`,
                    borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}`,
                  }}
                >
                  {/* Schedule date + time */}
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: '#b5a99a' }}>
                      Schedule Appointment
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[0.6rem] font-medium mb-1" style={{ color: dm ? '#71717a' : '#999' }}>Date</label>
                        <input
                          type="date"
                          defaultValue={reg.appointment_date || ''}
                          onChange={e => setEditDate(prev => ({ ...prev, [reg.id]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-[0.78rem] outline-none"
                          style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`, color: dm ? '#e4e4e7' : '#111' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6rem] font-medium mb-1" style={{ color: dm ? '#71717a' : '#999' }}>Time</label>
                        <input
                          type="time"
                          defaultValue={reg.appointment_time || ''}
                          onChange={e => setEditTime(prev => ({ ...prev, [reg.id]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-[0.78rem] outline-none"
                          style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}`, color: dm ? '#e4e4e7' : '#111' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => saveDateTime(reg)}
                      className="mt-2 px-4 py-1.5 rounded-lg text-[0.68rem] font-semibold transition-all"
                      style={{ background: '#111', color: '#fff' }}
                    >
                      Save Date & Time
                    </button>
                  </div>

                  {/* Notes */}
                  {reg.additional_notes && (
                    <div>
                      <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: '#b5a99a' }}>Notes</p>
                      <p className="text-[0.82rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#777' }}>{reg.additional_notes}</p>
                    </div>
                  )}

                  {/* Enrollment Status — rounded-lg to match BookingDetail */}
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-2.5" style={{ color: '#b5a99a' }}>
                      Enrollment Status
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(CLASS_STATUS_STYLES).map(([s, meta]) => (
                        <button
                          key={s}
                          onClick={() => changeStatus(reg, s)}
                          className="py-2 px-3 rounded-lg text-[0.68rem] font-semibold tracking-[0.04em] transition-all"
                          style={currentStatus === s
                            ? { background: meta.bg, color: meta.text, boxShadow: `0 0 0 2px ${meta.bg}40` }
                            : { background: dm ? '#2e2e38' : '#f5f1ee', color: dm ? '#71717a' : '#aaa', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                          }
                        >
                          {meta.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Status — rounded-lg to match BookingDetail */}
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-2.5" style={{ color: '#b5a99a' }}>
                      Payment Status
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(PAYMENT_META).map(([s, meta]) => (
                        <button
                          key={s}
                          onClick={() => changePaymentStatus(reg, s)}
                          className="py-2 px-3 rounded-lg text-[0.68rem] font-semibold tracking-[0.04em] transition-all"
                          style={(reg.payment_status || 'pending') === s
                            ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`, boxShadow: `0 0 0 2px ${meta.color}20` }
                            : { background: dm ? '#2e2e38' : '#f5f1ee', color: dm ? '#71717a' : '#aaa', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                          }
                        >
                          {meta.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stripe session */}
                  {reg.stripe_session_id && (
                    <p className="text-[0.6rem] font-mono" style={{ color: dm ? '#3f3f48' : '#ccc' }}>
                      Stripe: {reg.stripe_session_id.slice(0, 32)}…
                    </p>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => confirmDelete(reg)}
                    className="self-start flex items-center gap-2 text-[0.7rem] font-medium transition-all py-2 px-3 rounded-lg"
                    style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete Registration
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* In-site confirm modal */}
      <ConfirmModal
        modal={confirmModal}
        dm={dm}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
      />
    </>
  );
}
