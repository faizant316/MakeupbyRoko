import { useState } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CLASS_LABELS = {
  private_basic_lesson: 'Private Basic Lesson',
  virtual_lesson: 'Virtual Lesson',
  intermediate_lesson: 'Intermediate Lesson',
  glam_class: 'Glam Class',
  masterclass: 'Masterclass',
};

const CLASS_PRICES = {
  private_basic_lesson: 300,
  virtual_lesson: 400,
  intermediate_lesson: 500,
  glam_class: 600,
  masterclass: 1500,
};

const STATUS_COLORS = {
  new: { bg: '#F59E0B', text: '#fff' },
  contacted: { bg: '#3B82F6', text: '#fff' },
  enrolled: { bg: '#22C55E', text: '#fff' },
  declined: { bg: '#EF4444', text: '#fff' },
};

const PAYMENT_BADGES = {
  pending: { bg: 'rgba(245,158,11,0.12)', text: '#B45309', label: 'Deposit Pending' },
  deposit_paid: { bg: 'rgba(34,197,94,0.12)', text: '#15803d', label: 'Deposit Paid ✓' },
  paid_in_full: { bg: 'rgba(34,197,94,0.2)', text: '#15803d', label: 'Paid in Full ✓' },
  refunded: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', label: 'Refunded' },
};

export default function ClassRegistrationsList({ darkMode: dm }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['class-registrations'],
    queryFn: () => base44.entities.ClassRegistration.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassRegistration.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-registrations'] }),
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
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase" style={{ color: dm ? '#71717a' : '#b5a99a' }}>
          {registrations.length} registration{registrations.length !== 1 ? 's' : ''} total
        </p>
        <span style={{ color: dm ? '#3a3a48' : '#e8e2dc' }}>·</span>
        <span className="text-[0.65rem] font-semibold" style={{ color: '#22c55e' }}>
          {depositPaidCount} deposit paid
        </span>
        <span style={{ color: dm ? '#3a3a48' : '#e8e2dc' }}>·</span>
        <span className="text-[0.65rem]" style={{ color: dm ? '#71717a' : '#b5a99a' }}>
          {pendingCount} pending payment
        </span>
      </div>

      {registrations.map(reg => {
        const selectedClasses = Object.entries(CLASS_LABELS).filter(([key]) => reg[key]);
        const totalPrice = selectedClasses.reduce((sum, [key]) => sum + (CLASS_PRICES[key] || 0), 0);
        const depositAmount = Math.round(totalPrice / 2);
        const isExpanded = expandedId === reg.id;
        const paymentInfo = PAYMENT_BADGES[reg.payment_status] || PAYMENT_BADGES.pending;

        return (
          <div
            key={reg.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{ border: `1px solid ${dm ? '#3a3a48' : '#eee8e2'}`, background: dm ? '#27272a' : '#fff' }}
          >
            {/* Main row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : reg.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = dm ? '#2e2e38' : '#FAF8F6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[0.9rem]"
                style={{ background: dm ? '#3a3a48' : '#F5EEF0', color: dm ? '#D4A0B0' : '#A0785A' }}>
                {(reg.full_name || '?')[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[0.875rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{reg.full_name}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {selectedClasses.length > 0 ? (
                    selectedClasses.slice(0, 2).map(([key, label]) => (
                      <span key={key} className="text-[0.62rem] px-2 py-0.5 rounded-full"
                        style={{ background: dm ? '#3a3a48' : '#F5EEF0', color: dm ? '#D4A0B0' : '#A0785A' }}>
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[0.72rem]" style={{ color: dm ? '#71717a' : '#bbb' }}>No classes selected</span>
                  )}
                  {selectedClasses.length > 2 && (
                    <span className="text-[0.62rem]" style={{ color: dm ? '#52525b' : '#ccc' }}>+{selectedClasses.length - 2} more</span>
                  )}
                </div>
              </div>

              {/* Payment badge */}
              <span className="text-[0.55rem] font-semibold tracking-[0.06em] px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap"
                style={{ background: paymentInfo.bg, color: paymentInfo.text }}>
                {paymentInfo.label}
              </span>

              {/* Status badge */}
              <span className="text-[0.55rem] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLORS[reg.status]?.bg || '#999', color: STATUS_COLORS[reg.status]?.text || '#fff' }}>
                {reg.status}
              </span>

              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#ccc'} strokeWidth="2"
                className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-1 flex flex-col gap-4" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f5f0ec'}` }}>

                {/* Contact info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Email</p>
                    <a href={`mailto:${reg.email}`} className="text-[0.82rem] hover:text-[#D4A0B0] transition-colors underline underline-offset-2"
                      style={{ color: dm ? '#e4e4e7' : '#333' }}>{reg.email}</a>
                  </div>
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Phone</p>
                    <a href={`tel:${reg.phone}`} className="text-[0.82rem]" style={{ color: dm ? '#71717a' : '#777' }}>{reg.phone}</a>
                  </div>
                </div>

                {/* Payment info */}
                <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#1e1e24' : '#FAF8F6', border: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Payment</p>
                      <p className="text-[0.82rem] font-semibold" style={{ color: paymentInfo.text }}>{paymentInfo.label}</p>
                    </div>
                    {depositAmount > 0 && (
                      <div className="text-right">
                        <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Deposit</p>
                        <p className="text-[0.82rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>${depositAmount}</p>
                      </div>
                    )}
                  </div>
                  {reg.stripe_session_id && (
                    <p className="text-[0.6rem] font-mono mt-2" style={{ color: dm ? '#52525b' : '#ccc' }}>
                      Session: {reg.stripe_session_id.slice(0, 28)}…
                    </p>
                  )}
                </div>

                {/* Registered */}
                <div>
                  <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Registered</p>
                  <p className="text-[0.78rem]" style={{ color: dm ? '#a1a1aa' : '#999' }}>
                    {new Date(reg.created_date || reg.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {reg.additional_notes && (
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Notes</p>
                    <p className="text-[0.82rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#777' }}>{reg.additional_notes}</p>
                  </div>
                )}

                {/* Update Status */}
                <div>
                  <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['new', 'contacted', 'enrolled', 'declined'].map(s => (
                      <button key={s} onClick={() => updateMutation.mutate({ id: reg.id, data: { status: s } })}
                        className="px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.06em] uppercase rounded-full transition-all"
                        style={reg.status === s
                          ? { background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].text }
                          : { background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                        }>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Update Payment Status */}
                <div>
                  <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a] mb-2">Update Payment</p>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'deposit_paid', 'paid_in_full', 'refunded'].map(s => (
                      <button key={s} onClick={() => updateMutation.mutate({ id: reg.id, data: { payment_status: s } })}
                        className="px-3 py-1.5 text-[0.6rem] font-semibold rounded-full transition-all"
                        style={reg.payment_status === s
                          ? { background: PAYMENT_BADGES[s].bg, color: PAYMENT_BADGES[s].text, border: `1px solid ${PAYMENT_BADGES[s].text}40` }
                          : { background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                        }>
                        {PAYMENT_BADGES[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => { if (confirm('Delete this registration?')) deleteMutation.mutate(reg.id); }}
                  className="self-start flex items-center gap-2 px-3 py-1.5 text-[0.6rem] font-medium uppercase rounded-full transition-all"
                  style={{ color: dm ? '#f87171' : '#dc2626', border: `1px solid ${dm ? 'rgba(185,28,28,0.3)' : 'rgba(239,68,68,0.25)'}` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}