import { useEffect, useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import Collapse from './Collapse';
import { groupByTime, relativeDate, daysUntil } from './timeline';
import { classesOfReg, regTotal } from '@/lib/classCatalog';

const ENROLLMENT_STYLES = {
  pending:   { bg: '#F59E0B', text: '#fff', label: 'Pending'   },
  confirmed: { bg: '#16A34A', text: '#fff', label: 'Confirmed' },
  enrolled:  { bg: '#16A34A', text: '#fff', label: 'Enrolled'  },
  cancelled: { bg: '#EF4444', text: '#fff', label: 'Cancelled' },
};

// Online = Zoom blue, In Person = studio violet. Shared look with the detail page.
export const FORMAT_META = {
  online:    { label: 'Online',    short: 'Zoom',   color: '#2D8CFF', bg: 'rgba(45,140,255,0.1)'  },
  in_person: { label: 'In Person', short: 'Studio', color: '#8A63A8', bg: 'rgba(138,99,168,0.12)' },
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

// Compact one-line row, mirroring the appointments list.
function ClassRow({ reg, onSelect, dm }) {
  const selectedClasses = classesOfReg(reg);
  const totalPrice = regTotal(reg);
  const classLabel = selectedClasses.length > 0 ? selectedClasses.map(c => c.title).join(' · ') : 'No classes selected';
  const fmt = FORMAT_META[reg.class_format];
  const meta = ENROLLMENT_STYLES[reg.status || 'pending'] || ENROLLMENT_STYLES.pending;
  const payState = normalizePaymentStatus(reg.payment_status);
  const isRefunded = payState === 'refunded';
  const isUnpaid = payState === 'unpaid' && !reg.stripe_session_id;
  const isNew = reg.created_date && (Date.now() - new Date(reg.created_date).getTime()) < 24 * 60 * 60 * 1000;
  const rel = relativeDate(reg.appointment_date);
  const initial = (reg.full_name || '?').trim().charAt(0).toUpperCase() || '?';
  const mutedColor = dm ? '#71717a' : '#a99e95';
  const dateColor = rel.tone === 'accent' ? '#A0607A' : rel.tone === 'past' ? '#E0795B' : rel.tone === 'muted' ? mutedColor : (dm ? '#a1a1aa' : '#8a7e84');

  const iconBtn = 'flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-105';
  const iconBtnStyle = { color: dm ? '#a1a1aa' : '#9a8e94', border: `1px solid ${dm ? '#3a3a48' : '#ece5e0'}` };

  return (
    <button
      onClick={() => onSelect(reg)}
      className="group w-full flex items-center gap-3 sm:gap-3.5 px-3 sm:px-4 py-3 rounded-xl text-left transition-all"
      style={{
        background: dm ? '#26262d' : '#FBF9F7',
        border: `1px solid ${dm ? '#34343d' : '#ece4dc'}`,
        boxShadow: dm ? 'none' : '0 1px 2px rgba(60,45,35,0.05), 0 2px 5px rgba(60,45,35,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,176,0.6)'; e.currentTarget.style.background = dm ? '#2e2e37' : '#FFFDFB'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#34343d' : '#ece4dc'; e.currentTarget.style.background = dm ? '#26262d' : '#FBF9F7'; }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[0.9rem]"
        style={{ background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#a1a1aa' : '#b0a59c' }}>
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[0.875rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>
          {reg.full_name || 'Unknown'}
        </p>
        <p className="text-[0.72rem] truncate mt-0.5 flex items-center gap-1.5" style={{ color: mutedColor }}>
          {fmt && (
            <span className="inline-flex flex-shrink-0 text-[0.55rem] font-bold tracking-[0.06em] uppercase px-1.5 py-[1px] rounded"
              style={{ background: fmt.bg, color: fmt.color }}>
              {fmt.label}
            </span>
          )}
          <span className="truncate">
            {classLabel}
            {totalPrice > 0 && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{` · $${totalPrice.toLocaleString()}`}</span>}
          </span>
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[0.72rem] font-semibold whitespace-nowrap" style={{ color: dateColor }}>
          {rel.label}
          {reg.appointment_time && <span className="font-normal" style={{ color: mutedColor }}> · {reg.appointment_time}</span>}
        </span>
        <div className="flex items-center gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-1 text-[0.55rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
              style={{ background: dm ? 'rgba(212,160,176,0.2)' : 'rgba(212,160,176,0.22)', color: dm ? '#e7c9d5' : '#A0607A' }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: dm ? '#e7c9d5' : '#A0607A' }} />
              New
            </span>
          )}
          {isUnpaid && (
            <span className="hidden sm:inline-flex text-[0.55rem] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full"
              style={{ background: PAYMENT_META.unpaid.bg, color: PAYMENT_META.unpaid.color }}>
              Unpaid
            </span>
          )}
          {isRefunded && (
            <span className="hidden sm:inline-flex text-[0.55rem] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full"
              style={{ background: PAYMENT_META.refunded.bg, color: PAYMENT_META.refunded.color }}>
              Refunded
            </span>
          )}
          <span className="px-3 py-1 text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-lg flex-shrink-0"
            style={{ background: meta.bg, color: meta.text }}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-1 flex-shrink-0 w-[60px] justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        {reg.email && (
          <a
            href={`mailto:${reg.email}?subject=Makeup Class with Roko`}
            onClick={e => e.stopPropagation()}
            aria-label="Email registrant"
            className={iconBtn}
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#D4A0B0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#ece5e0'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#9a8e94'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
          </a>
        )}
        {reg.phone && (
          <a
            href={`sms:${reg.phone}`}
            onClick={e => e.stopPropagation()}
            aria-label="Text registrant"
            className={iconBtn}
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#D4A0B0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#ece5e0'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#9a8e94'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </a>
        )}
      </div>
    </button>
  );
}

export default function ClassRegistrationsList({ darkMode: dm, onSelect, autoExpandId }) {
  const { data: rawRegistrations = [], isLoading } = useQuery({
    queryKey: ['class-registrations'],
    queryFn: () => api.entities.ClassRegistration.list('-created_date', 100),
  });
  const [collapsedGroups, setCollapsedGroups] = useState({ later: true });
  const [formatFilter, setFormatFilter] = useState('all'); // all | online | in_person

  const registrations = [...rawRegistrations].sort((a, b) => {
    const aDate = a.appointment_date ? new Date(a.appointment_date) : null;
    const bDate = b.appointment_date ? new Date(b.appointment_date) : null;
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate - bDate;
  });

  // Auto-navigate to a registration when autoExpandId is provided (e.g. from "Just Signed Up")
  useEffect(() => {
    if (autoExpandId && registrations.length > 0) {
      const match = registrations.find(r => r.id === autoExpandId);
      if (match) onSelect(match);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExpandId, registrations.length]);

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

  // Format filter first, then the timeline grouping runs on what's visible.
  const visible = formatFilter === 'all'
    ? registrations
    : registrations.filter(r => r.class_format === formatFilter);

  // Surface the just-signed-up / not-yet-scheduled sign-ups: pull the
  // "Unscheduled" bucket to the very top and dress it as an action callout,
  // then the timeline (This Week → This Month → Later) follows beneath it.
  const timeGroups = groupByTime(visible, r => r.appointment_date);
  const orderedGroups = [
    ...timeGroups.filter(g => g.key === 'unscheduled'),
    ...timeGroups.filter(g => g.key !== 'unscheduled'),
  ];
  const unscheduledCount = visible.filter(r => !r.appointment_date).length;
  const weekCount = visible.filter(r => { const d = daysUntil(r.appointment_date); return d >= 0 && d <= 7; }).length;
  const countOf = (f) => registrations.filter(r => r.class_format === f).length;

  return (
    <div>
      {/* Time-aware summary glance */}
      <div className="flex items-stretch gap-2 mb-4">
        {[
          { label: 'Needs Scheduling', value: unscheduledCount, accent: unscheduledCount > 0 },
          { label: 'This Week', value: weekCount },
          { label: 'Total', value: visible.length },
        ].map(s => (
          <div key={s.label} className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5"
            style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#f0e9e4'}` }}>
            <p className="text-[1.1rem] font-serif leading-none" style={{ color: s.accent ? '#A0607A' : (dm ? '#e4e4e7' : '#1a1a1a') }}>{s.value}</p>
            <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mt-1.5 truncate" style={{ color: dm ? '#71717a' : '#b0a59c' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Online / In Person filter — Booksy-style segmented pills */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl mb-5"
        style={{ background: dm ? '#1e1e24' : '#F5F0EC', border: `1px solid ${dm ? '#2e2e38' : '#eee6df'}` }}>
        {[
          { key: 'all', label: `All · ${registrations.length}` },
          { key: 'online', label: `Online · ${countOf('online')}`, meta: FORMAT_META.online },
          { key: 'in_person', label: `In Person · ${countOf('in_person')}`, meta: FORMAT_META.in_person },
        ].map(f => {
          const active = formatFilter === f.key;
          return (
            <button key={f.key} type="button" onClick={() => setFormatFilter(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.66rem] font-semibold tracking-[0.03em] transition-all"
              style={active
                ? { background: dm ? '#34343d' : '#fff', color: f.meta?.color || (dm ? '#e4e4e7' : '#1a1a1a'), boxShadow: dm ? 'none' : '0 1px 4px rgba(60,45,35,0.12)' }
                : { color: dm ? '#71717a' : '#a99e95' }}>
              {f.meta && <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.meta.color }} />}
              {f.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="text-[0.8rem] italic py-10 text-center" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>
          No {formatFilter === 'online' ? 'online' : 'in-person'} sign-ups yet
        </p>
      )}

      {/* Time-grouped rows */}
      <div className="flex flex-col gap-6">
        {orderedGroups.map(group => {
          const open = !collapsedGroups[group.key];
          const isNeedsScheduling = group.key === 'unscheduled';
          const headAccent = isNeedsScheduling ? (dm ? '#c47a92' : '#A0607A') : group.accent;
          const headLabel = isNeedsScheduling ? 'Needs Scheduling' : group.label;
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => setCollapsedGroups(p => ({ ...p, [group.key]: !p[group.key] }))}
                className="flex items-center gap-2.5 mb-3 w-full"
              >
                {headAccent && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNeedsScheduling ? 'animate-pulse' : ''}`} style={{ background: headAccent }} />}
                <h3 className="font-serif text-[1.05rem]" style={{ color: headAccent || (dm ? '#e4e4e7' : '#111') }}>{headLabel}</h3>
                <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#a1a1aa' : '#a99e95' }}>
                  {group.items.length}
                </span>
                {isNeedsScheduling && (
                  <span className="hidden sm:inline text-[0.62rem] italic" style={{ color: dm ? '#a06070' : '#c48090' }}>awaiting a date</span>
                )}
                <span className="flex-1" />
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#c5bdb5'} strokeWidth="2"
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${open ? '' : '-rotate-90'}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <Collapse open={open}>
                <div className="flex flex-col gap-2 pb-1">
                  {group.items.map(reg => (
                    <ClassRow key={reg.id} reg={reg} onSelect={onSelect} dm={dm} />
                  ))}
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>
    </div>
  );
}
