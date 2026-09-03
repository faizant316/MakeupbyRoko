import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { openZoomRoom, parseMeetingId, meetingIdFromUrl } from '@/lib/zoomHost';
import { classesOfReg } from '@/lib/classCatalog';
import { timeToMinutes } from './timeline';
import { Cross } from './Glyphs';

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

  // Each group (Consultations / Appointments / Makeup Classes) is expanded by
  // default so today's actual clients — with their service, format and status —
  // are visible at a glance. Each header can still be tapped to fold it away.
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = key => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const { groups, total } = useMemo(() => {
    const consults = [], appts = [], classes = [];
    (bookings || []).forEach(b => {
      if (b.status === 'cancelled') return;
      if (b.date === todayKey) {
        // Where she's going belongs on today's card more than anywhere else:
        // this is the view she checks before leaving the house.
        appts.push({ id: `a-${b.id}`, time: b.time, name: b.name || 'Client', label: b.service || 'Appointment', location: b.location_city || b.location || '', status: b.status || 'pending', onClick: () => onSelectBooking?.(b) });
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

  // Whether she's closed today. Without this the card reads "You're all clear"
  // on a day off, which looks identical to a quiet working day.
  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
  });
  const offToday = blockedDates.find(b => b.date === todayKey);

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasItems ? 'animate-pulse' : ''}`} style={{ background: hasItems ? '#D4A0B0' : (dm ? '#52525b' : '#D0D0D8') }} />
        <h2 className="font-serif text-[1.2rem] leading-none" style={{ color: dm ? '#e4e4e7' : '#111' }}>Today</h2>
        <span className="text-[0.78rem]" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>{todayLabel}</span>
        {hasItems && (
          <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(212,160,176,0.16)', color: '#A0607A' }}>
            {total} {total === 1 ? 'booking' : 'bookings'}
          </span>
        )}
        {offToday && (
          <span className="inline-flex items-center gap-1.5 text-[0.58rem] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: dm ? 'rgba(153,27,27,0.3)' : '#FDE4E1', color: dm ? '#fca5a5' : '#C0392B' }}
            title={offToday.reason || 'Closed to new bookings'}>
            <Cross className="w-2 h-2" strokeWidth={3.5} />
            Day off
          </span>
        )}
      </div>

      {hasItems ? (
        <div className="flex flex-col gap-4">
          {groups.map(group => {
            const isOpen = !collapsedGroups[group.key];
            return (
            <div key={group.key} className="flex flex-col gap-1.5">
              {/* Group header — tap to expand/collapse this run so consultations,
                  appointments and classes stay tidy and don't crowd the card. */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 px-1 py-1 rounded-lg transition-opacity hover:opacity-70 active:opacity-50"
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: group.color }} />
                <span className="text-[0.6rem] font-bold tracking-[0.12em] uppercase" style={{ color: group.color }}>{group.label}</span>
                <span className="text-[0.6rem] font-semibold" style={{ color: dm ? '#52525b' : '#b8b8c0' }}>{group.items.length}</span>
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                  style={{ color: dm ? '#52525b' : '#c2c2ca' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOpen && group.items.map(item => {
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
                      {item.location && (
                        <p className="flex items-center gap-1 text-[0.68rem] truncate mt-0.5" style={{ color: dm ? '#8fb3d9' : '#6a7f99' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-2.5 h-2.5 flex-shrink-0">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          <span className="truncate">{item.location}</span>
                        </p>
                      )}
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
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 py-1">
          <svg viewBox="0 0 24 24" fill="none" stroke={offToday ? '#EF4444' : (dm ? '#52525b' : '#C0C0C9')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            {offToday ? <><circle cx="12" cy="12" r="9" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></> : <path d="M20 6 9 17l-5-5" />}
          </svg>
          <p className="text-[0.8rem]" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
            {offToday
              ? `You're off today. Clients can't book this day.${offToday.reason ? ` (${offToday.reason})` : ''}`
              : "Nothing scheduled today. You're all clear."}
          </p>
        </div>
      )}
    </div>
  );
}
