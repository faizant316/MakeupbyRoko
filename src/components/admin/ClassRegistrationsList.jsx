import { useState } from 'react';
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

const STATUS_META = {
  new:       { label: 'New',       color: '#b45309', bg: 'rgba(245,158,11,0.1)'  },
  contacted: { label: 'Contacted', color: '#1d4ed8', bg: 'rgba(59,130,246,0.1)' },
  enrolled:  { label: 'Enrolled',  color: '#15803d', bg: 'rgba(34,197,94,0.1)'  },
  declined:  { label: 'Declined',  color: '#b91c1c', bg: 'rgba(239,68,68,0.1)'  },
};

const PAYMENT_META = {
  pending:      { label: 'Deposit Pending',  color: '#b45309', bg: 'rgba(245,158,11,0.08)' },
  deposit_paid: { label: 'Deposit Paid',     color: '#15803d', bg: 'rgba(34,197,94,0.08)'  },
  paid_in_full: { label: 'Paid in Full',     color: '#15803d', bg: 'rgba(34,197,94,0.12)'  },
  refunded:     { label: 'Refunded',         color: '#b91c1c', bg: 'rgba(239,68,68,0.08)'  },
};

function StatusDot({ color }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

export default function ClassRegistrationsList({ darkMode: dm }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['class-registrations'],
    queryFn: () => base44.entities.ClassRegistration.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassRegistration.update(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
      // Send email notification for key status changes
      const reg = registrations.find(r => r.id === id);
      if (!reg) return;
      if (data.status === 'enrolled') {
        fetch('/api/send-class-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'enrolled', to: reg.email, name: reg.full_name }),
        }).catch(console.error);
      }
      if (data.payment_status === 'deposit_paid') {
        fetch('/api/send-class-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'deposit_paid', to: reg.email, name: reg.full_name, amount: Math.round(
            Object.keys(CLASS_PRICES).filter(k => reg[k]).reduce((s, k) => s + CLASS_PRICES[k], 0) / 2
          ) }),
        }).catch(console.error);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassRegistration.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-registrations'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#e8e2dc] border-t-[#A0785A] rounded-full animate-spin" />
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-serif text-[1.1rem] mb-2" style={{ color: dm ? '#71717a' : '#b5a99a' }}>No class registrations yet</p>
        <p className="text-[0.75rem]" style={{ color: dm ? '#52525b' : '#d4c8c0' }}>Registrations from the website will appear here ✦</p>
      </div>
    );
  }

  const depositPaidCount = registrations.filter(r => r.payment_status === 'deposit_paid' || r.payment_status === 'paid_in_full').length;
  const pendingCount = registrations.filter(r => !r.payment_status || r.payment_status === 'pending').length;

  return (
    <div className="flex flex-col gap-2">
      {/* Summary row */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase" style={{ color: dm ? '#71717a' : '#b5a99a' }}>
          {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
        </p>
        <span className="text-[0.65rem]" style={{ color: '#22c55e', fontWeight: 600 }}>{depositPaidCount} deposit paid</span>
        <span className="text-[0.65rem]" style={{ color: dm ? '#71717a' : '#b5a99a' }}>{pendingCount} pending</span>
      </div>

      {registrations.map(reg => {
        const selectedClasses = Object.entries(CLASS_LABELS).filter(([key]) => reg[key]);
        const totalPrice = selectedClasses.reduce((sum, [key]) => sum + (CLASS_PRICES[key] || 0), 0);
        const depositAmount = Math.round(totalPrice / 2);
        const isExpanded = expandedId === reg.id;
        const sm = STATUS_META[reg.status] || STATUS_META.new;
        const pm = PAYMENT_META[reg.payment_status] || PAYMENT_META.pending;
        const regDate = reg.created_date || reg.created_at;

        return (
          <div
            key={reg.id}
            className="rounded-2xl overflow-hidden transition-all"
            style={{
              border: `1px solid ${dm ? '#2e2e38' : '#ede8e4'}`,
              background: dm ? '#27272a' : '#fff',
              boxShadow: isExpanded ? (dm ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)') : 'none',
            }}
          >
            {/* ── Main row ── */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : reg.id)}
              className="w-full px-5 py-4 text-left"
            >
              <div className="flex items-start gap-4">
                {/* Initial avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-serif text-[1rem] mt-0.5"
                  style={{ background: dm ? '#3a3a48' : '#F5EEF0', color: dm ? '#D4A0B0' : '#A0785A' }}
                >
                  {(reg.full_name || '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + date */}
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="text-[0.9rem] font-semibold leading-tight truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                      {reg.full_name}
                    </p>
                    {regDate && (
                      <p className="text-[0.65rem] flex-shrink-0" style={{ color: dm ? '#52525b' : '#ccc' }}>
                        {new Date(regDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {/* Classes */}
                  <p className="text-[0.72rem] truncate mb-2" style={{ color: dm ? '#71717a' : '#999' }}>
                    {selectedClasses.length > 0
                      ? selectedClasses.map(([, label]) => label).join(', ')
                      : 'No classes selected'}
                  </p>

                  {/* Status + payment row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[0.65rem] font-medium" style={{ color: sm.color }}>
                      <StatusDot color={sm.color} />
                      {sm.label}
                    </span>
                    <span style={{ color: dm ? '#3a3a48' : '#e8e2dc', fontSize: '10px' }}>·</span>
                    <span className="flex items-center gap-1.5 text-[0.65rem] font-medium" style={{ color: pm.color }}>
                      <StatusDot color={pm.color} />
                      {pm.label}
                    </span>
                    {depositAmount > 0 && (
                      <>
                        <span style={{ color: dm ? '#3a3a48' : '#e8e2dc', fontSize: '10px' }}>·</span>
                        <span className="text-[0.65rem]" style={{ color: dm ? '#71717a' : '#999' }}>
                          ${depositAmount} deposit · ${totalPrice} total
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <svg
                  viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#ccc'} strokeWidth="2"
                  className={`w-3.5 h-3.5 flex-shrink-0 mt-1.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>

            {/* ── Expanded detail ── */}
            {isExpanded && (
              <div
                className="px-5 pb-6 pt-4 flex flex-col gap-5"
                style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#f5f0ec'}` }}
              >
                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: '#b5a99a' }}>Email</p>
                    <a href={`mailto:${reg.email}`}
                      className="text-[0.82rem] hover:text-[#D4A0B0] transition-colors"
                      style={{ color: dm ? '#e4e4e7' : '#333' }}>
                      {reg.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: '#b5a99a' }}>Phone</p>
                    <a href={`tel:${reg.phone}`} className="text-[0.82rem]" style={{ color: dm ? '#71717a' : '#777' }}>{reg.phone || '—'}</a>
                  </div>
                </div>

                {/* Class list */}
                {selectedClasses.length > 0 && (
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: '#b5a99a' }}>Classes</p>
                    <div className="flex flex-col gap-1.5">
                      {selectedClasses.map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between text-[0.78rem]">
                          <span style={{ color: dm ? '#a1a1aa' : '#555' }}>{label}</span>
                          <span style={{ color: dm ? '#e4e4e7' : '#111', fontWeight: 500 }}>${CLASS_PRICES[key]}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-[0.78rem] pt-2 mt-1" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
                        <span style={{ color: dm ? '#71717a' : '#999' }}>Deposit due</span>
                        <span style={{ color: '#D4A0B0', fontWeight: 600 }}>${depositAmount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {reg.additional_notes && (
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: '#b5a99a' }}>Notes</p>
                    <p className="text-[0.82rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#777' }}>{reg.additional_notes}</p>
                  </div>
                )}

                {/* Stripe session */}
                {reg.stripe_session_id && (
                  <p className="text-[0.6rem] font-mono" style={{ color: dm ? '#3f3f48' : '#ddd' }}>
                    Stripe: {reg.stripe_session_id.slice(0, 30)}…
                  </p>
                )}

                {/* ── Status control ── */}
                <div>
                  <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-2.5" style={{ color: '#b5a99a' }}>Enrollment Status</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(STATUS_META).map(([s, meta]) => (
                      <button
                        key={s}
                        onClick={() => updateMutation.mutate({ id: reg.id, data: { status: s } })}
                        className="py-2 px-3 rounded-lg text-[0.68rem] font-semibold tracking-[0.04em] transition-all text-left"
                        style={reg.status === s
                          ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }
                          : { background: dm ? '#2e2e38' : '#f5f1ee', color: dm ? '#71717a' : '#aaa', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                        }
                      >
                        <StatusDot color={reg.status === s ? meta.color : (dm ? '#52525b' : '#ccc')} />
                        {' '}{meta.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Payment control ── */}
                <div>
                  <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mb-2.5" style={{ color: '#b5a99a' }}>Payment Status</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(PAYMENT_META).map(([s, meta]) => (
                      <button
                        key={s}
                        onClick={() => updateMutation.mutate({ id: reg.id, data: { payment_status: s } })}
                        className="py-2 px-3 rounded-lg text-[0.68rem] font-semibold tracking-[0.04em] transition-all text-left"
                        style={reg.payment_status === s
                          ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }
                          : { background: dm ? '#2e2e38' : '#f5f1ee', color: dm ? '#71717a' : '#aaa', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                        }
                      >
                        <StatusDot color={reg.payment_status === s ? meta.color : (dm ? '#52525b' : '#ccc')} />
                        {' '}{meta.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => { if (confirm('Delete this registration? This cannot be undone.')) deleteMutation.mutate(reg.id); }}
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
  );
}
