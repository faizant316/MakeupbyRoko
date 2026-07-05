import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DateBlockPopup from './DateBlockPopup';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

const STATUS_COLORS = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  completed: '#22C55E',
  cancelled: '#EF4444',
};



function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// Dark-mode muted versions of status colors
const STATUS_COLORS_DM = {
  pending: '#92660A',
  confirmed: '#1D4ED8',
  completed: '#166534',
  cancelled: '#991B1B',
};

function MonthDayCell({ day, year, month, todayKey, selectedDate, dateMap, confirmedDateMap = {}, consultationDateMap = {}, classRegDateMap = {}, blockedSet, blockedMap, onSingleClick, onDoubleClick, onUnblock, maxPerDay, dayCapacityMap = {}, dm }) {
  const key = `${year}-${pad(month + 1)}-${pad(day)}`;
  const effectiveCap = dayCapacityMap[key] ?? maxPerDay;
  const isCustom = dayCapacityMap[key] != null; // day has its own limit, not the default
  const isToday = key === todayKey;
  const isSel = key === selectedDate;
  const isBlocked = blockedSet.has(key);
  const statuses = dateMap[key] || [];
  const activeStatuses = statuses.filter(s => s !== 'cancelled');
  const hasBookings = activeStatuses.length > 0;
  const hasConsultation = (consultationDateMap[key] || []).length > 0;
  const hasClassReg = (classRegDateMap[key] || []).length > 0;
  const confirmedStatuses = confirmedDateMap[key] || [];
  const count = confirmedStatuses.length;
  const isFull = count >= effectiveCap;
  const isFillingUp = count > 0 && !isFull;
  const spotsLeft = effectiveCap - count;

  const cellStyle = isBlocked
    ? { background: dm ? 'rgba(153,27,27,0.18)' : undefined, border: `1px solid ${dm ? 'rgba(153,27,27,0.4)' : undefined}` }
    : isSel
    ? {}
    : isToday
    ? { background: dm ? 'rgba(99,102,241,0.15)' : undefined, border: dm ? '2px solid rgba(99,102,241,0.45)' : undefined }
    : isFull
    ? { background: dm ? 'rgba(153,27,27,0.18)' : undefined, border: `1px solid ${dm ? 'rgba(153,27,27,0.35)' : undefined}` }
    : isFillingUp
    ? { background: dm ? 'rgba(180,120,20,0.22)' : undefined, border: `1px solid ${dm ? 'rgba(200,145,30,0.55)' : undefined}` }
    : hasBookings
    ? { background: dm ? 'rgba(29,78,216,0.15)' : undefined, border: `1px solid ${dm ? 'rgba(29,78,216,0.3)' : undefined}` }
    : {};

  return (
    <button
      onClick={() => { if (!isBlocked) onSingleClick(key); }}
      onDoubleClick={(e) => { e.preventDefault(); if (isBlocked) onUnblock(blockedMap[key]?.id); else onDoubleClick(key); }}
      title={isBlocked ? 'Double-click to unblock' : 'Click to select · Double-click to block'}
      className={`relative h-10 sm:h-14 w-full min-w-0 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 select-none group ${
        isBlocked
          ? dm ? '' : 'bg-red-50 border border-red-200 hover:bg-red-100'
          : isSel
          ? 'bg-[#111] text-white shadow-md'
          : isToday
          ? dm ? 'font-bold' : 'bg-indigo-50 border-2 border-indigo-300 text-indigo-700 font-bold'
          : isFull
          ? dm ? '' : 'bg-red-50 border border-red-200 text-[#111] hover:bg-red-100'
          : isFillingUp
          ? dm ? '' : 'bg-amber-50 border border-amber-200 text-[#111] hover:border-amber-300 hover:bg-amber-100'
          : hasBookings
          ? dm ? '' : 'bg-blue-50 border border-blue-100 text-[#111] hover:border-blue-300 hover:bg-blue-100'
          : dm ? 'text-[#71717a]' : 'text-[#555] hover:bg-[#f5f0ec] hover:text-[#111]'
      }`}
      style={dm ? cellStyle : {}}
    >
      {/* Custom-limit marker — a small rose dot in the corner (day has its own cap) */}
      {isCustom && !isBlocked && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{ background: isSel ? 'rgba(255,255,255,0.9)' : '#A0607A' }} title="Custom limit" />
      )}
      {isBlocked ? (
        <>
          <span className={`text-[0.8rem] font-medium ${dm ? 'text-red-400/70' : 'text-red-400'}`}>{day}</span>
          <span className={`text-[0.6rem] ${dm ? 'text-red-400/70' : 'text-red-400'}`}>✕</span>
        </>
      ) : (
        <>
          <span className={`text-[0.875rem] font-${isSel || isToday ? 'bold' : 'medium'} ${isToday && dm ? 'text-indigo-200' : isFillingUp && dm ? 'text-amber-100' : isFull && dm ? 'text-red-200' : isBlocked && dm ? 'text-red-200' : hasBookings && dm ? 'text-blue-100' : dm ? 'text-zinc-300' : ''}`}>{day}</span>
          {isFull ? (
            <span className={`text-[0.5rem] font-bold ${isSel ? 'text-white/70' : dm ? 'text-red-400/70' : 'text-red-400'}`}>FULL</span>
          ) : (
            <div className="flex gap-[3px] items-center">
              {[...new Set(statuses.filter(s => s !== 'cancelled'))].slice(0, 3).map((s, i) => (
                <span key={i} className="w-[5px] h-[5px] rounded-full"
                  style={{ background: isSel ? 'rgba(255,255,255,0.8)' : (dm ? STATUS_COLORS_DM[s] : STATUS_COLORS[s]) || '#999' }} />
              ))}
              {hasConsultation && (
                <span className="w-[5px] h-[5px] rounded-full" title="Consultation"
                  style={{ background: isSel ? 'rgba(255,255,255,0.8)' : '#A855F7' }} />
              )}
              {hasClassReg && (
                <span className="w-[5px] h-[5px] rounded-full" title="Makeup Class"
                  style={{ background: isSel ? 'rgba(255,255,255,0.8)' : '#D4A0B0' }} />
              )}
              <span className={`text-[0.62rem] font-semibold ${isSel ? 'text-white/70' : dm ? 'text-[#52525b]' : 'text-[#999]'}`}>{count}/{effectiveCap}</span>
            </div>
          )}
        </>
      )}
    </button>
  );
}

function WeekDayCell({ d, todayKey, selectedDate, dateMap, confirmedDateMap = {}, consultationDateMap = {}, classRegDateMap = {}, blockedSet, blockedMap, onSingleClick, onDoubleClick, onUnblock, maxPerDay, dayCapacityMap = {}, dm }) {
  const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const effectiveCap = dayCapacityMap[key] ?? maxPerDay;
  const isCustom = dayCapacityMap[key] != null; // day has its own limit, not the default
  const isToday = key === todayKey;
  const isSel = key === selectedDate;
  const isBlocked = blockedSet.has(key);
  const statuses = dateMap[key] || [];
  const activeStatuses = statuses.filter(s => s !== 'cancelled');
  const hasBookings = activeStatuses.length > 0;
  const hasConsultation = (consultationDateMap[key] || []).length > 0;
  const hasClassReg = (classRegDateMap[key] || []).length > 0;
  const confirmedStatuses = confirmedDateMap[key] || [];
  const count = confirmedStatuses.length;
  const isFull = count >= effectiveCap;
  const isFillingUp = count > 0 && !isFull;
  const dayName = DAYS[d.getDay()];

  const cellStyle = isBlocked
    ? { background: dm ? 'rgba(153,27,27,0.18)' : undefined, border: `1px solid ${dm ? 'rgba(153,27,27,0.4)' : undefined}` }
    : isSel ? {}
    : isToday
    ? { background: dm ? 'rgba(99,102,241,0.15)' : undefined, border: dm ? '2px solid rgba(99,102,241,0.45)' : undefined }
    : isFull
    ? { background: dm ? 'rgba(153,27,27,0.18)' : undefined, border: `1px solid ${dm ? 'rgba(153,27,27,0.35)' : undefined}` }
    : isFillingUp
    ? { background: dm ? 'rgba(180,120,20,0.22)' : undefined, border: `1px solid ${dm ? 'rgba(200,145,30,0.55)' : undefined}` }
    : hasBookings
    ? { background: dm ? 'rgba(29,78,216,0.15)' : undefined, border: `1px solid ${dm ? 'rgba(29,78,216,0.3)' : undefined}` }
    : {};

  return (
    <button
      onClick={() => { if (!isBlocked) onSingleClick(key); }}
      onDoubleClick={(e) => { e.preventDefault(); if (isBlocked) onUnblock(blockedMap[key]?.id); else onDoubleClick(key); }}
      title={isBlocked ? 'Double-click to unblock' : isFull ? `Fully booked (${count})` : isFillingUp ? `${effectiveCap - count} spot(s) left` : 'Click to select · Double-click to block'}
      className={`relative rounded-xl py-2 sm:py-4 flex flex-col items-center gap-1 sm:gap-1.5 transition-all select-none w-full ${
        isBlocked
          ? dm ? '' : 'bg-red-50 border border-red-200 hover:bg-red-100 text-red-400'
          : isSel
          ? 'bg-[#111] text-white shadow-md'
          : isToday
          ? dm ? '' : 'bg-indigo-50 border-2 border-indigo-300 text-indigo-700'
          : isFull
          ? dm ? '' : 'bg-red-50 border border-red-200 text-[#111] hover:bg-red-100'
          : isFillingUp
          ? dm ? '' : 'bg-amber-50 border border-amber-200 text-[#111] hover:bg-amber-100'
          : hasBookings
          ? dm ? '' : 'bg-blue-50 border border-blue-100 text-[#111] hover:bg-blue-100'
          : dm ? 'text-[#71717a]' : 'text-[#777] hover:bg-[#f5f0ec] hover:text-[#111]'
      }`}
      style={dm ? cellStyle : {}}
    >
      {/* Custom-limit marker — a small rose dot in the corner (day has its own cap) */}
      {isCustom && !isBlocked && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ background: isSel ? 'rgba(255,255,255,0.9)' : '#A0607A' }} title="Custom limit" />
      )}
      <span className={`text-[0.6rem] font-semibold tracking-[0.08em] ${isSel ? 'text-white/70' : isToday ? (dm ? 'text-indigo-400' : 'text-indigo-500') : 'text-[#aaa]'}`}>{dayName}</span>
      <span className={`text-[1.1rem] font-semibold ${isFillingUp && dm ? 'text-amber-100' : isFull && dm ? 'text-red-200' : hasBookings && dm ? 'text-blue-100' : dm ? 'text-zinc-300' : ''}`}>{d.getDate()}</span>
      {isBlocked ? (
        <span className={`text-[0.65rem] ${dm ? 'text-red-400/70' : 'text-red-400'}`}>✕</span>
      ) : isFull ? (
        <span className={`text-[0.5rem] font-bold ${isSel ? 'text-white/70' : dm ? 'text-red-400/70' : 'text-red-400'}`}>FULL</span>
      ) : (
        <div className="flex gap-[3px] items-center">
          {[...new Set(activeStatuses)].slice(0, 3).map((s, i) => (
            <span key={i} className="w-[5px] h-[5px] rounded-full"
              style={{ background: isSel ? 'rgba(255,255,255,0.8)' : (dm ? STATUS_COLORS_DM[s] : STATUS_COLORS[s]) || '#999' }} />
          ))}
          {hasConsultation && (
            <span className="w-[5px] h-[5px] rounded-full" title="Consultation"
              style={{ background: isSel ? 'rgba(255,255,255,0.8)' : '#7C3AED' }} />
          )}
          {hasClassReg && (
            <span className="w-[5px] h-[5px] rounded-full" title="Makeup Class"
              style={{ background: isSel ? 'rgba(255,255,255,0.8)' : '#D4A0B0' }} />
          )}
          <span className={`text-[0.62rem] font-semibold ${isSel ? 'text-white/70' : dm ? 'text-[#52525b]' : 'text-[#999]'}`}>{count}/{effectiveCap}</span>
        </div>
      )}
    </button>
  );
}

export default function AdminCalendar({ bookings, classRegs = [], currentMonth, setCurrentMonth, selectedDate, setSelectedDate, setStatusFilter, maxPerDay = 3, dayCapacityMap = {}, darkMode: dm }) {
  const [view, setView] = useState('month');
  const [blockPopup, setBlockPopup] = useState(null);
  const queryClient = useQueryClient();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
  });

  const blockedMap = {};
  blockedDates.forEach(b => { blockedMap[b.date] = b; });
  const blockedSet = new Set(Object.keys(blockedMap));

  const blockMutation = useMutation({
    mutationFn: ({ date, reason }) => api.entities.BlockedDate.create({ date, reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocked-dates'] }); setBlockPopup(null); },
  });

  const unblockMutation = useMutation({
    mutationFn: (id) => api.entities.BlockedDate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocked-dates'] }); setBlockPopup(null); },
  });

  // Only confirmed/completed bookings count toward capacity
  const dateMap = {};
  bookings.forEach(b => {
    if (!b.date) return;
    if (!dateMap[b.date]) dateMap[b.date] = [];
    dateMap[b.date].push(b.status || 'pending');
  });

  // Only pending/confirmed count toward capacity — completed appointments free up the slot
  const confirmedDateMap = {};
  bookings.forEach(b => {
    if (!b.date || !['confirmed', 'pending'].includes(b.status)) return;
    if (!confirmedDateMap[b.date]) confirmedDateMap[b.date] = [];
    confirmedDateMap[b.date].push(b.status);
  });

  // Consultation dates — purple dots
  const consultationDateMap = {};
  bookings.forEach(b => {
    if (!b.consultation_date) return;
    if (!consultationDateMap[b.consultation_date]) consultationDateMap[b.consultation_date] = [];
    consultationDateMap[b.consultation_date].push(b.name || 'Client');
  });

  // Class registration dates — pink dots
  const classRegDateMap = {};
  classRegs.forEach(r => {
    if (!r.appointment_date) return;
    if (!classRegDateMap[r.appointment_date]) classRegDateMap[r.appointment_date] = [];
    classRegDateMap[r.appointment_date].push(r.full_name || 'Client');
  });

  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(todayKey); setStatusFilter?.('all'); };
  const handleSingleClick = (key) => {
    const isNewSelection = key !== selectedDate;
    setSelectedDate(isNewSelection ? key : null);
    // Keep the calendar's reference date on the day you tapped so Week/Day
    // views open on that same date instead of drifting back to today.
    if (isNewSelection) { setCurrentMonth(new Date(key + 'T00:00:00')); setStatusFilter?.('all'); }
  };
  // Switching views re-centers on the selected day (if any) so the chosen date
  // stays put whether you look at it by day, week, or month.
  const changeView = (v) => {
    setView(v);
    if (selectedDate) setCurrentMonth(new Date(selectedDate + 'T00:00:00'));
  };
  const handleDoubleClick = (key) => setBlockPopup({ date: key });
  const handleUnblock = (id) => unblockMutation.mutate(id);

  const sharedCellProps = {
    todayKey, selectedDate, dateMap, confirmedDateMap, consultationDateMap, classRegDateMap, blockedSet, blockedMap, maxPerDay, dayCapacityMap, dm,
    onSingleClick: handleSingleClick,
    onDoubleClick: handleDoubleClick,
    onUnblock: handleUnblock,
  };

  // ─── MONTH VIEW ───
  const renderMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
      <>
        <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-base font-medium flex-shrink-0"
              style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>‹</button>
            <span className="text-[0.875rem] sm:text-[0.95rem] font-semibold tracking-tight text-center flex-1 truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{monthName}</span>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-base font-medium flex-shrink-0"
              style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>›</button>
          </div>
          <button onClick={goToToday}
            className="text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[#A0785A] hover:text-[#7a5e44] px-3 py-1 rounded-lg transition-all flex-shrink-0"
            style={{ background: dm ? 'rgba(160,120,90,0.14)' : '#F6EFE8' }}>
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {DAYS.map(d => (
            <div key={d} className="text-center text-[0.65rem] font-semibold py-1.5 uppercase tracking-widest" style={{ color: dm ? '#71717a' : '#bbb' }}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {cells.map((day, idx) => (
            day === null
              ? <div key={`e-${idx}`} className="h-10 sm:h-14" />
              : <MonthDayCell key={`${year}-${pad(month + 1)}-${pad(day)}`} day={day} year={year} month={month} {...sharedCellProps} />
          ))}
        </div>
      </>
    );
  };

  // ─── WEEK VIEW ───
  const renderWeek = () => {
    const weekStart = getWeekStart(currentMonth);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const prevWeek = () => { const d = new Date(currentMonth); d.setDate(d.getDate() - 7); setCurrentMonth(d); };
    const nextWeek = () => { const d = new Date(currentMonth); d.setDate(d.getDate() + 7); setCurrentMonth(d); };
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });

    return (
      <>
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={prevWeek} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-base font-medium flex-shrink-0" style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>‹</button>
            <span className="text-[0.8rem] font-semibold text-center flex-1 truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{label}</span>
            <button onClick={nextWeek} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-base font-medium flex-shrink-0" style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>›</button>
          </div>
          <button onClick={goToToday} className="text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[#A0785A] px-3 py-1 rounded-lg transition-all flex-shrink-0" style={{ border: `1px solid ${dm ? '#4a4a5a' : '#e8d5c4'}` }}>Today</button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(d => (
            <WeekDayCell key={`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`} d={d} {...sharedCellProps} />
          ))}
        </div>
      </>
    );
  };

  // ─── DAY VIEW ───
  const renderDay = () => {
    const d = currentMonth;
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const dayBookings = bookings.filter(b => b.date === key).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const dayClassRegs = classRegs.filter(r => r.appointment_date === key).sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));
    const isBlocked = blockedSet.has(key);
    const goDay = (nd) => { setCurrentMonth(nd); setSelectedDate(`${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-${pad(nd.getDate())}`); };
    const prevDay = () => { const nd = new Date(d); nd.setDate(nd.getDate() - 1); goDay(nd); };
    const nextDay = () => { const nd = new Date(d); nd.setDate(nd.getDate() + 1); goDay(nd); };

    return (
      <>
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-base font-medium flex-shrink-0" style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>‹</button>
            <span className="text-[0.875rem] font-semibold flex-1 min-w-0" style={{ color: dm ? '#e4e4e7' : '#111' }}>{label}</span>
            <button onClick={nextDay} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-base font-medium flex-shrink-0" style={{ background: dm ? '#2a2a31' : '#F7F2EE', color: dm ? '#a1a1aa' : '#999' }}>›</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => isBlocked ? unblockMutation.mutate(blockedMap[key].id) : setBlockPopup({ date: key })}
              className={`text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-3 py-1 rounded-lg border transition-all ${
                isBlocked
                  ? 'text-red-500 border-red-200 hover:bg-red-50'
                  : dm ? 'text-[#71717a] border-[#3a3a48] hover:text-red-400 hover:border-red-400' : 'text-[#b5a99a] border-[#e8e2dc] hover:text-red-500 hover:border-red-200'
              }`}>
              {isBlocked ? '✕ Unblock' : '+ Block Day'}
            </button>
            <button onClick={goToToday} className="text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[#A0785A] hover:text-[#7a5e44] px-3 py-1 rounded-lg transition-all" style={{ border: `1px solid ${dm ? '#4a4a5a' : '#e8d5c4'}` }}>Today</button>
          </div>
        </div>

        {isBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-red-400 text-base">🚫</span>
            <div>
              <p className="text-[0.75rem] font-semibold text-red-500">This day is blocked — clients can't book</p>
              {blockedMap[key]?.reason && <p className="text-[0.7rem] text-[#999] mt-0.5">{blockedMap[key].reason}</p>}
            </div>
          </div>
        )}

        {dayBookings.length === 0 && dayClassRegs.length === 0 ? (
          <div className="text-center py-10 text-[0.85rem] text-[#c5bdb5]">No appointments this day</div>
        ) : (
          <div className="flex flex-col gap-2">
            {dayBookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: dm ? '#27272a' : '#FAF8F6', borderColor: dm ? '#3a3a48' : '#f0ebe6' }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[b.status] || '#999' }} />
                <span className="text-[0.8rem] font-semibold w-20 flex-shrink-0" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.time || '—'}</span>
                <span className="text-[0.8rem] flex-1 truncate" style={{ color: dm ? '#a1a1aa' : '#555' }}>{b.name}</span>
                <span className="text-[0.7rem] font-medium" style={{ color: '#A0785A' }}>{b.service}</span>
              </div>
            ))}
            {dayClassRegs.map(r => {
              const cls = ['private_basic_lesson','masterclass','virtual_lesson','intermediate_lesson','glam_class'].filter(k => r[k]);
              const CLASS_NAMES = { private_basic_lesson: 'Basic Lesson', masterclass: 'Advanced Lesson', virtual_lesson: 'Virtual Lesson', intermediate_lesson: 'Intermediate Lesson', glam_class: 'Glam Class' };
              const label = cls.length ? CLASS_NAMES[cls[0]] : 'Makeup Class';
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: dm ? '#27272a' : '#FDF5F8', borderColor: dm ? '#4a3a48' : '#f0d8e4' }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#D4A0B0' }} />
                  <span className="text-[0.8rem] font-semibold w-20 flex-shrink-0" style={{ color: dm ? '#e4e4e7' : '#111' }}>{r.appointment_time || '—'}</span>
                  <span className="text-[0.8rem] flex-1 truncate" style={{ color: dm ? '#a1a1aa' : '#555' }}>{r.full_name}</span>
                  <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(212,160,176,0.15)', color: '#A0607A' }}>💄 {label}</span>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="rounded-xl p-5" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#f1ece7'}` }}>
        {/* View switcher + hint — minimal text tabs, soft tint when active */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {['Day', 'Week', 'Month'].map(v => {
              const active = view === v.toLowerCase();
              return (
                <button key={v} onClick={() => changeView(v.toLowerCase())}
                  className="px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.08em] uppercase rounded-full transition-colors"
                  style={active
                    ? { background: dm ? '#34343d' : '#F1EBE6', color: dm ? '#f0ebe6' : '#1a1a1a' }
                    : { background: 'transparent', color: dm ? '#6f6f78' : '#b3a89f' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = dm ? '#a1a1aa' : '#8a7e84'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = dm ? '#6f6f78' : '#b3a89f'; }}>
                  {v}
                </button>
              );
            })}
          </div>
          <span className="text-[0.6rem] tracking-wide hidden sm:block italic" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>Double-click to block a date</span>
        </div>

        {view === 'month' && renderMonth()}
        {view === 'week' && renderWeek()}
        {view === 'day' && renderDay()}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 pt-3 flex-wrap" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>
            <span className="w-3 h-3 rounded-md bg-indigo-50 border-2 border-indigo-300 inline-block" /> Today
          </span>
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>
            <span className="w-3 h-3 rounded-md bg-amber-50 border border-amber-200 inline-block" /> Filling Up
          </span>
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium text-red-400">
            <span className="w-3 h-3 rounded-md bg-red-50 border border-red-200 inline-block" /> Full / Blocked
          </span>
          {Object.entries(STATUS_COLORS).filter(([s]) => s !== 'cancelled').map(([s, color]) => (
            <span key={s} className="flex items-center gap-1.5 text-[0.6rem] font-medium capitalize" style={{ color: dm ? '#71717a' : '#999' }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} /> {s}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#A855F7' }} /> Consultation
          </span>
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#D4A0B0' }} /> Makeup Class
          </span>
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium" style={{ color: dm ? '#71717a' : '#999' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#A0607A' }} /> Custom limit
          </span>
        </div>
      </div>

      {blockPopup && (
        <DateBlockPopup
          date={blockPopup.date}
          isBlocked={blockedSet.has(blockPopup.date)}
          existingReason={blockedMap[blockPopup.date]?.reason || ''}
          onBlock={(reason) => blockMutation.mutate({ date: blockPopup.date, reason })}
          onUnblock={() => unblockMutation.mutate(blockedMap[blockPopup.date].id)}
          onClose={() => setBlockPopup(null)}
        />
      )}
    </>
  );
}