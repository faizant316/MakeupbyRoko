import { useMemo } from 'react';

// Always-on "Today" card for the Home overview. Surfaces everything happening
// today in one place — regular appointments, Zoom/phone consultations, AND
// class sign-up lessons — so a booking today is impossible to miss without
// having to click the date on the calendar.

const CLASS_LABELS = {
  private_basic_lesson: 'Basic Makeup Lesson',
  masterclass: 'Advanced Makeup Lesson',
  virtual_lesson: 'Virtual Makeup Lesson',
  intermediate_lesson: 'Intermediate Makeup Lesson',
  glam_class: 'Glam Makeup Class',
};

const STATUS_META = {
  pending:   { bg: '#F59E0B', label: 'Pending' },
  confirmed: { bg: '#3B82F6', label: 'Confirmed' },
  completed: { bg: '#22C55E', label: 'Completed' },
  enrolled:  { bg: '#22C55E', label: 'Enrolled' },
  cancelled: { bg: '#EF4444', label: 'Cancelled' },
};

// Parse "10:00 AM" -> minutes so the agenda sorts chronologically (lexical
// sorting would put 10:00 AM before 9:00 AM).
function toMinutes(t) {
  if (!t) return 9999;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 9999;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3] && m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

export default function TodayAgenda({ bookings = [], classRegs = [], onSelectBooking, onSelectClassReg, darkMode: dm }) {
  const todayKey = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const items = useMemo(() => {
    const list = [];
    (bookings || []).forEach(b => {
      if (b.status === 'cancelled') return;
      if (b.date === todayKey) {
        list.push({ id: `a-${b.id}`, time: b.time, name: b.name || 'Client', label: b.service || 'Appointment', status: b.status || 'pending', dot: STATUS_META[b.status]?.bg || '#3B82F6', onClick: () => onSelectBooking?.(b) });
      }
      if (b.consultation_date === todayKey) {
        list.push({ id: `c-${b.id}`, time: b.consultation_time, name: b.name || 'Client', label: `${b.consultation_type || 'Zoom'} consultation`, status: b.status || 'pending', dot: '#A855F7', tag: 'Consult', onClick: () => onSelectBooking?.(b) });
      }
    });
    (classRegs || []).forEach(r => {
      if (r.status === 'cancelled') return;
      if (r.appointment_date === todayKey) {
        const cls = Object.keys(CLASS_LABELS).filter(k => r[k]);
        const label = cls.length ? cls.map(k => CLASS_LABELS[k]).join(' · ') : 'Makeup Class';
        list.push({ id: `l-${r.id}`, time: r.appointment_time, name: r.full_name || 'Client', label, status: r.status || 'pending', dot: '#D4A0B0', tag: 'Class', onClick: () => onSelectClassReg?.(r) });
      }
    });
    return list.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  }, [bookings, classRegs, todayKey, onSelectBooking, onSelectClassReg]);

  const hasItems = items.length > 0;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasItems ? 'animate-pulse' : ''}`} style={{ background: hasItems ? '#D4A0B0' : (dm ? '#52525b' : '#d8cfc8') }} />
        <h2 className="font-serif text-[1.2rem] leading-none" style={{ color: dm ? '#e4e4e7' : '#111' }}>Today</h2>
        <span className="text-[0.78rem]" style={{ color: dm ? '#71717a' : '#a99e95' }}>{todayLabel}</span>
        {hasItems && (
          <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.16)', color: '#A0607A' }}>
            {items.length} {items.length === 1 ? 'booking' : 'bookings'}
          </span>
        )}
      </div>

      {hasItems ? (
        <div className="flex flex-col gap-1.5">
          {items.map(item => {
            const meta = STATUS_META[item.status] || STATUS_META.pending;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                style={{ background: dm ? '#1e1e24' : '#FAF8F6' }}
                onMouseEnter={e => { e.currentTarget.style.background = dm ? '#2a2a31' : '#F4EFEC'; }}
                onMouseLeave={e => { e.currentTarget.style.background = dm ? '#1e1e24' : '#FAF8F6'; }}
              >
                <span className="text-[0.72rem] font-semibold w-[64px] flex-shrink-0 tabular-nums" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>
                  {item.time || '—'}
                </span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.85rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>{item.name}</p>
                  <p className="text-[0.7rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#a99e95' }}>{item.label}</p>
                </div>
                {item.tag && (
                  <span className="hidden sm:inline-flex text-[0.55rem] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: item.tag === 'Class' ? 'rgba(212,160,176,0.16)' : 'rgba(168,85,247,0.12)', color: item.tag === 'Class' ? '#A0607A' : '#9333EA' }}>
                    {item.tag}
                  </span>
                )}
                <span className="px-2.5 py-1 text-[0.55rem] font-semibold tracking-[0.08em] uppercase rounded-lg flex-shrink-0" style={{ background: meta.bg, color: '#fff' }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 py-1">
          <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#cbbfb6'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <p className="text-[0.8rem]" style={{ color: dm ? '#71717a' : '#a99e95' }}>Nothing scheduled today. You're all clear.</p>
        </div>
      )}
    </div>
  );
}
