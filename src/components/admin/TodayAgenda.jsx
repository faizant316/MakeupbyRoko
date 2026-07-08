import { useMemo } from 'react';
import { openZoomRoom, parseMeetingId, meetingIdFromUrl } from '@/lib/zoomHost';
import { classesOfReg } from '@/lib/classCatalog';
import { timeToMinutes } from './timeline';

// Local calendar date "YYYY-MM-DD" (NOT UTC). toISOString() would roll to
// tomorrow after ~5pm Pacific and make "Today" disagree with the calendar's
// selected day (which uses local dates), so the card would show the wrong day.
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Always-on "Today" card for the Home overview. Surfaces everything happening
// today, but grouped by what it is — Consultations, then Appointments, then
// Makeup Classes — each sorted chronologically, so the day reads cleanly
// instead of as one interleaved run (mirrors the selected-date view on the
// right). A booking today is impossible to miss without clicking the calendar.

const STATUS_META = {
  pending:   { bg: '#F59E0B', label: 'Pending' },
  confirmed: { bg: '#2563EB', label: 'Confirmed' },
  completed: { bg: '#64748B', label: 'Completed' },
  enrolled:  { bg: '#2563EB', label: 'Enrolled' },
  contacted: { bg: '#F59E0B', label: 'Pending' },
  new:       { bg: '#F59E0B', label: 'Pending' },
  cancelled: { bg: '#EF4444', label: 'Cancelled' },
};

export default function TodayAgenda({ bookings = [], classRegs = [], onSelectBooking, onSelectClassReg, darkMode: dm }) {
  const todayKey = localDateKey(new Date());
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const { groups, total } = useMemo(() => {
    const consults = [], appts = [], classes = [];
    (bookings || []).forEach(b => {
      if (b.status === 'cancelled') return;
      if (b.date === todayKey) {
        appts.push({ id: `a-${b.id}`, time: b.time, name: b.name || 'Client', label: b.service || 'Appointment', status: b.status || 'pending', onClick: () => onSelectBooking?.(b) });
      }
      if (b.consultation_date === todayKey) {
        const joinUrl = b.consultation_notes?.match(/^Link: (https?:\/\/\S+)/m)?.[1] || '';
        const isZoom = (b.consultation_type || 'Zoom') === 'Zoom';
        consults.push({ id: `c-${b.id}`, time: b.consultation_time, name: b.name || 'Client', label: `${b.consultation_type || 'Zoom'} · ${b.service || 'Consultation'}`, status: b.status || 'pending', onClick: () => onSelectBooking?.(b), joinUrl: isZoom ? joinUrl : '', meetingId: isZoom ? (parseMeetingId(b.consultation_notes) || meetingIdFromUrl(joinUrl)) : '' });
      }
    });
    (classRegs || []).forEach(r => {
      if (r.status === 'cancelled') return;
      if (r.appointment_date === todayKey) {
        const cls = classesOfReg(r);
        const fmtTag = r.class_format === 'in_person' ? ' · Studio' : r.class_format === 'online' ? ' · Zoom' : '';
        const label = (cls.length ? cls.map(c => c.title).join(' · ') : 'Makeup Class') + fmtTag;
        const joinUrl = r.lesson_notes?.match(/^Link: (https?:\/\/\S+)/m)?.[1] || '';
        const isZoom = r.consultation_type === 'Zoom';
        classes.push({ id: `l-${r.id}`, time: r.appointment_time, name: r.full_name || 'Client', label, status: r.status || 'pending', onClick: () => onSelectClassReg?.(r), joinUrl: isZoom ? joinUrl : '', meetingId: isZoom ? (parseMeetingId(r.lesson_notes) || meetingIdFromUrl(joinUrl)) : '' });
      }
    });
    const byTime = (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time);
    consults.sort(byTime); appts.sort(byTime); classes.sort(byTime);
    const g = [
      { key: 'consult', label: 'Consultations', color: '#9333EA', items: consults },
      { key: 'appt', label: 'Appointments', color: '#2563EB', items: appts },
      { key: 'class', label: 'Makeup Classes', color: '#C76BA6', items: classes },
    ].filter(x => x.items.length > 0);
    return { groups: g, total: consults.length + appts.length + classes.length };
  }, [bookings, classRegs, todayKey, onSelectBooking, onSelectClassReg]);

  const hasItems = total > 0;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasItems ? 'animate-pulse' : ''}`} style={{ background: hasItems ? '#D4A0B0' : (dm ? '#52525b' : '#d8cfc8') }} />
        <h2 className="font-serif text-[1.2rem] leading-none" style={{ color: dm ? '#e4e4e7' : '#111' }}>Today</h2>
        <span className="text-[0.78rem]" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>{todayLabel}</span>
        {hasItems && (
          <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.16)', color: '#A0607A' }}>
            {total} {total === 1 ? 'booking' : 'bookings'}
          </span>
        )}
      </div>

      {hasItems ? (
        <div className="flex flex-col gap-4">
          {groups.map(group => (
            <div key={group.key} className="flex flex-col gap-1.5">
              {/* Group header — labels the run so consultations, appointments
                  and classes never blur into one another. */}
              <div className="flex items-center gap-2 px-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: group.color }} />
                <span className="text-[0.6rem] font-bold tracking-[0.12em] uppercase" style={{ color: group.color }}>{group.label}</span>
                <span className="text-[0.6rem] font-semibold" style={{ color: dm ? '#52525b' : '#b8b8c0' }}>{group.items.length}</span>
              </div>

              {group.items.map(item => {
                const meta = STATUS_META[item.status] || STATUS_META.pending;
                const canJoin = !!(item.meetingId || item.joinUrl);
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={item.onClick}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.onClick?.(); } }}
                    className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer"
                    style={{ background: dm ? '#1e1e24' : '#FAFAFB' }}
                    onMouseEnter={e => { e.currentTarget.style.background = dm ? '#2a2a31' : '#F1F1F5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = dm ? '#1e1e24' : '#FAFAFB'; }}
                  >
                    <span className="text-[0.72rem] font-semibold w-[64px] flex-shrink-0 tabular-nums" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>
                      {item.time || '—'}
                    </span>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.bg }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.85rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>{item.name}</p>
                      <p className="text-[0.7rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>{item.label}</p>
                    </div>
                    {canJoin && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); openZoomRoom(item.joinUrl, item.meetingId); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.6rem] font-bold tracking-[0.06em] uppercase flex-shrink-0 transition-all hover:opacity-85 active:scale-95"
                        style={{ background: '#D4A0B0', color: '#fff' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                        </svg>
                        Join
                      </button>
                    )}
                    <span className="px-2.5 py-1 text-[0.55rem] font-semibold tracking-[0.08em] uppercase rounded-lg flex-shrink-0" style={{ background: meta.bg, color: '#fff' }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 py-1">
          <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#cbbfb6'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <p className="text-[0.8rem]" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>Nothing scheduled today. You're all clear.</p>
        </div>
      )}
    </div>
  );
}
