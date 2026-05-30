import { useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';

const CLASS_LABELS = {
  private_basic_lesson: 'Basic Makeup Lesson',
  masterclass: 'Advanced Makeup Lesson',
  virtual_lesson: 'Virtual Makeup Lesson',
  intermediate_lesson: 'Intermediate Makeup Lesson',
  glam_class: 'Glam Makeup Class',
};

const CLASS_PRICES = {
  private_basic_lesson: 300,
  masterclass: 1500,
  virtual_lesson: 400,
  intermediate_lesson: 500,
  glam_class: 600,
};

const ENROLLMENT_STYLES = {
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

export default function ClassRegistrationsList({ darkMode: dm, onSelect, autoExpandId }) {
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['class-registrations'],
    queryFn: () => api.entities.ClassRegistration.list('-created_date', 100),
  });

  // Auto-navigate to a registration when autoExpandId is provided (e.g. from "Just Signed Up")
  useEffect(() => {
    if (autoExpandId && registrations.length > 0) {
      const match = registrations.find(r => r.id === autoExpandId);
      if (match) onSelect(match);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExpandId, registrations.length]);

  const cardBg     = dm ? '#1e1e24' : '#fff';
  const cardBorder = dm ? '#3a3a48' : '#e5e5e5';
  const textMain   = dm ? '#F0EBE6' : '#111';
  const textMuted  = dm ? '#71717a' : '#999';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#e5e5e5] border-t-[#D4A0B0] rounded-full animate-spin" />
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-serif text-[1.1rem] mb-2" style={{ color: dm ? '#71717a' : '#999' }}>
          No class registrations yet
        </p>
        <p className="text-[0.75rem]" style={{ color: dm ? '#52525b' : '#ccc' }}>
          Registrations from the website will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary row */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase" style={{ color: dm ? '#71717a' : '#999' }}>
          {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
        </p>
        {Object.entries(ENROLLMENT_STYLES).map(([s, meta]) => {
          const cnt = registrations.filter(r => (r.status || 'pending') === s).length;
          if (!cnt) return null;
          return (
            <span key={s} className="text-[0.65rem] font-semibold" style={{ color: meta.bg }}>
              {cnt} {meta.label.toLowerCase()}
            </span>
          );
        })}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {registrations.map(reg => {
          const selectedClasses = Object.entries(CLASS_LABELS).filter(([key]) => reg[key]);
          const totalPrice = selectedClasses.reduce((sum, [key]) => sum + (CLASS_PRICES[key] || 0), 0);
          const enrollmentStatus = reg.status || 'pending';
          const enrollmentMeta = ENROLLMENT_STYLES[enrollmentStatus] || ENROLLMENT_STYLES.pending;
          const paymentStatus = normalizePaymentStatus(reg.payment_status);
          const pm = PAYMENT_META[paymentStatus] || PAYMENT_META.unpaid;

          const appointmentDate = reg.appointment_date
            ? new Date(reg.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric',
              })
            : '';

          return (
            <button
              key={reg.id}
              onClick={() => onSelect(reg)}
              className="rounded-xl p-4 text-left transition-all group w-full"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: dm ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,160,176,0.5)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = cardBorder}
            >
              {/* Name + badge */}
              <div className="flex items-start justify-between mb-2.5">
                <h4
                  className="font-serif text-[1rem] group-hover:text-[#D4A0B0] transition-colors"
                  style={{ color: textMain }}
                >
                  {reg.full_name || 'Unknown'}
                </h4>
                <span
                  className="px-3 py-1 text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-full flex-shrink-0 ml-2"
                  style={{ background: enrollmentMeta.bg, color: enrollmentMeta.text }}
                >
                  {enrollmentMeta.label}
                </span>
              </div>

              {/* Date / email / phone */}
              <div className="flex flex-col gap-1 mb-2.5">
                <div
                  className="flex items-center gap-2 text-[0.72rem]"
                  style={{ color: appointmentDate ? textMuted : (dm ? '#52525b' : '#ccc') }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {appointmentDate
                    ? `${appointmentDate}${reg.appointment_time ? ` at ${reg.appointment_time}` : ''}`
                    : 'No date scheduled yet'}
                </div>
                {reg.email && (
                  <div className="flex items-center gap-2 text-[0.72rem]" style={{ color: textMuted }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {reg.email}
                  </div>
                )}
                {reg.phone && (
                  <div className="flex items-center gap-2 text-[0.72rem]" style={{ color: textMuted }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 11.7 19.79 19.79 0 0 1 1 3.07 2 2 0 0 1 2.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {reg.phone}
                  </div>
                )}
              </div>

              {/* Class names */}
              <p className="text-[0.72rem] font-semibold mb-2.5" style={{ color: dm ? '#D4A0B0' : '#D4A0B0' }}>
                {selectedClasses.length > 0
                  ? selectedClasses.map(([, l]) => l).join(' · ')
                  : 'No classes selected'}
                {totalPrice > 0 && (
                  <span className="ml-1.5 font-normal text-[0.67rem]" style={{ color: textMuted }}>
                    (${totalPrice.toLocaleString()})
                  </span>
                )}
              </p>

              {/* Footer: payment badge + quick contact */}
              <div
                className="flex items-center gap-2 pt-2.5"
                style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}
              >
                <span
                  className="text-[0.58rem] font-semibold tracking-[0.08em] uppercase px-2.5 py-0.5 rounded-full"
                  style={{ background: pm.bg, color: pm.color }}
                >
                  {pm.label}
                </span>
                {reg.email && (
                  <a
                    href={`mailto:${reg.email}?subject=Makeup Class with Roko`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1 text-[0.62rem] font-medium tracking-[0.04em] uppercase rounded-lg hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all ml-auto"
                    style={{ color: textMuted, border: `1px solid ${dm ? '#3a3a48' : '#e4ddd7'}` }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Email
                  </a>
                )}
                {reg.phone && (
                  <a
                    href={`sms:${reg.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1 text-[0.62rem] font-medium tracking-[0.04em] uppercase rounded-lg hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all"
                    style={{ color: textMuted, border: `1px solid ${dm ? '#3a3a48' : '#e4ddd7'}` }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Text
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
