import { useState } from 'react';
import BookingCard from './BookingCard';
import StatusBadge from './StatusBadge';

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const BRIDAL_KEYWORDS = ['bridal', 'bride', 'wedding', 'full day'];
const NON_BRIDAL_KEYWORDS = ['non-bridal', 'non bridal'];

function isBridalBooking(booking) {
  const service = (booking.service || '').toLowerCase();
  if (NON_BRIDAL_KEYWORDS.some(kw => service.includes(kw))) return false;
  return BRIDAL_KEYWORDS.some(kw => service.includes(kw));
}

const CONSULT_COLOR = '#4A7FA5';

export default function BookingsList({
  bookings, classRegs = [], loading, search, setSearch, statusFilter, setStatusFilter,
  statusCounts, selectedDate, setSelectedDate, onSelect, currentMonth,
  allBookings, consultationsOnDate = [], darkMode: dm, onAddClient, onOpenClassReg
}) {
  const [showArchive, setShowArchive] = useState(false);
  const [showRecentPanel, setShowRecentPanel] = useState(false);
  const [recentSearch, setRecentSearch] = useState('');
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
  const dateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
    : null;

  // Recent bookings: created within the last 24 hours (uses allBookings, unfiltered)
  const now = Date.now();
  const recentBookings = (allBookings || [])
    .filter(b => b.created_date && (now - new Date(b.created_date).getTime()) < 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const recentClassRegs = classRegs
    .filter(r => r.created_date && (now - new Date(r.created_date).getTime()) < 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Sort chronologically (earliest date first)
  const sorted = [...bookings].sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return (a.created_date || '').localeCompare(b.created_date || '');
  });

  // Separate completed from active
  const activeBookings = sorted.filter(b => b.status !== 'completed');
  const completedBookings = sorted.filter(b => b.status === 'completed');

  const bridalBookings = activeBookings.filter(isBridalBooking);
  const nonBridalBookings = activeBookings.filter(b => !isBridalBooking(b));

  return (
    <div>
      {/* Month heading + Add Client */}
      <div className="flex items-center justify-between mb-6 pb-4"
        style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#f0ebe5'}` }}>
        <div>
          <p className="text-[0.55rem] font-semibold tracking-[0.18em] uppercase mb-1"
            style={{ color: dm ? '#52525b' : '#c5bdb5' }}>Appointments</p>
          <p className="font-serif text-[1.4rem] font-light tracking-[-0.01em]"
            style={{ color: dm ? '#e4e4e7' : '#111' }}>
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        {onAddClient && (
          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.72rem] font-semibold tracking-[0.04em] transition-all"
            style={{ background: dm ? '#2e2e38' : '#111', color: dm ? '#e4e4e7' : '#fff' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Client
          </button>
        )}
      </div>

      {/* Recent Bookings — last 24 hours, collapsible */}
      {(recentBookings.length > 0 || recentClassRegs.length > 0) && (
        <div className="mb-7 overflow-hidden rounded-2xl" style={{ border: `1px solid ${dm ? '#3f3f46' : '#f0e6df'}`, boxShadow: '0 2px 20px rgba(160,120,90,0.07)' }}>
          {/* Header — clickable toggle */}
          <button
            onClick={() => setShowRecentPanel(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 transition-colors"
            style={{ background: dm ? 'rgba(180,100,120,0.25)' : 'rgba(212,160,176,0.25)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: dm ? '#c47a92' : '#D4A0B0' }} />
              <span className="text-[0.6rem] font-bold tracking-[0.18em] uppercase" style={{ color: dm ? '#c47a92' : '#A0607A' }}>Just Booked</span>
              <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: dm ? 'rgba(212,160,176,0.2)' : 'rgba(212,160,176,0.3)', color: dm ? '#c47a92' : '#A0607A' }}>
                {recentBookings.length + recentClassRegs.length}
              </span>
              <span className="text-[0.58rem] italic" style={{ color: dm ? '#a06070' : '#c48090' }}>last 24 hrs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] italic" style={{ color: dm ? '#a06070' : '#c48090' }}>
                {showRecentPanel ? 'collapse' : 'view all'}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#c47a92' : '#A0607A'} strokeWidth="2"
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showRecentPanel ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          {/* Expandable panel */}
          {showRecentPanel && (
            <div style={{ background: dm ? '#27272a' : '#fff' }}>
              {/* Search bar inside panel */}
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.06)' : 'rgba(160,120,90,0.1)'}` }}>
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b5a99a" strokeWidth="1.5" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    value={recentSearch}
                    onChange={e => setRecentSearch(e.target.value)}
                    placeholder="Search recent clients…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-[0.8rem] outline-none transition-all"
                    style={{
                      background: dm ? '#1e1e24' : '#FAF8F6',
                      border: `1px solid ${dm ? '#3f3f46' : '#ede8e3'}`,
                      color: dm ? '#e4e4e7' : '#111',
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  {recentSearch && (
                    <button onClick={() => setRecentSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#777] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Items */}
              {recentBookings
                .filter(b => !recentSearch || [b.name, b.service, b.email].some(f => f?.toLowerCase().includes(recentSearch.toLowerCase())))
                .map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex items-center gap-4 w-full text-left px-5 py-4 transition-colors group"
                    style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(160,120,90,0.08)'}` }}
                    onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FDF9F7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                      <span className="font-serif text-[#D4A0B0] text-[0.85rem]">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.875rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.name}</p>
                      <p className="text-[0.72rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#b5a99a' }}>
                        {b.service}
                        {b.date && (
                          <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>
                            {' · '}
                            {new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                ))
              }
              {/* Recent class sign-ups */}
              {recentClassRegs
                .filter(r => !recentSearch || [r.full_name, r.email].some(f => f?.toLowerCase().includes(recentSearch.toLowerCase())))
                .map((r) => {
                  const CLASS_NAMES = {
                    private_basic_lesson: 'Private Basic Lesson',
                    virtual_lesson: 'Virtual Lesson',
                    intermediate_lesson: 'Intermediate Lesson',
                    glam_class: 'Glam Class',
                    masterclass: 'Masterclass',
                  };
                  const classes = Object.keys(CLASS_NAMES).filter(k => r[k]).map(k => CLASS_NAMES[k]).join(', ');
                  return (
                    <button
                      key={r.id}
                      onClick={() => onOpenClassReg && onOpenClassReg(r)}
                      className="flex items-center gap-4 w-full text-left px-5 py-4 transition-colors group"
                      style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(160,120,90,0.08)'}` }}
                      onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FDF9F7'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,160,176,0.15)' }}>
                        <span style={{ fontSize: '0.9rem' }}>💄</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.875rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{r.full_name}</p>
                        <p className="text-[0.72rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#b5a99a' }}>
                          {classes || 'Makeup Class'}
                          <span className="ml-1.5 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(212,160,176,0.15)', color: '#A0607A' }}>
                            Class Sign-Up
                          </span>
                        </p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  );
                })
              }
              {recentSearch && recentBookings.filter(b => [b.name, b.service, b.email].some(f => f?.toLowerCase().includes(recentSearch.toLowerCase()))).length === 0 && (
                <div className="py-6 text-center text-[0.78rem]" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>No results for "{recentSearch}"</div>
              )}
            </div>
          )}
        </div>
      )}



      {/* Search */}
      <div className="relative mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="#b5a99a" strokeWidth="1.5" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or service..."
          className="w-full pl-11 pr-4 py-3 rounded-xl text-[0.85rem] focus:ring-1 focus:ring-[#D4A0B0]/20 outline-none transition-all"
          style={{
            background: dm ? '#27272a' : '#fff',
            border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}`,
            color: dm ? '#e4e4e7' : '#111',
          }}
        />
      </div>

      {/* Status pills — color-coded, always shown */}
      {(() => {
        const STATUS_COLORS = {
          all:       { active: dm ? '#D4A0B0' : '#111', activeTxt: dm ? '#1a1614' : '#fff', dot: null },
          pending:   { active: '#F59E0B', activeTxt: '#fff', dot: '#F59E0B' },
          confirmed: { active: '#3B82F6', activeTxt: '#fff', dot: '#3B82F6' },
          completed: { active: '#22C55E', activeTxt: '#fff', dot: '#22C55E' },
          cancelled: { active: '#EF4444', activeTxt: '#fff', dot: '#EF4444' },
        };
        return (
          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto no-scrollbar pb-0.5">
            {STATUSES.map(s => {
              const count = statusCounts[s] || 0;
              const isActive = statusFilter === s;
              const colors = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.65rem] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                  style={isActive
                    ? { background: colors.active, color: colors.activeTxt, border: `1px solid ${colors.active}` }
                    : { background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#71717a' : '#999', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}` }
                  }
                >
                  {colors.dot && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
                  )}
                  <span className="capitalize">{s}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Date label + clear — just above booking results */}
      {selectedDate && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase mb-0.5" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>Showing appointments for</p>
            <div className="flex items-center gap-2">
              <p className="text-[1rem] font-semibold font-serif" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.65rem] font-semibold tracking-[0.06em] uppercase transition-all flex-shrink-0"
            style={{ background: dm ? 'rgba(239,68,68,0.12)' : '#FEF2F2', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Clear
          </button>
        </div>
      )}

      {/* Consultations on selected date */}
      {selectedDate && consultationsOnDate.length > 0 && (() => {
        // Deduplicate — don't show bookings already listed as regular appointments
        const uniqueConsults = consultationsOnDate.filter(b => !bookings.some(fb => fb.id === b.id));
        if (uniqueConsults.length === 0) return null;
        return (
          <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(74,127,165,0.25)` }}>
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3"
              style={{ background: 'rgba(74,127,165,0.07)', borderBottom: '1px solid rgba(74,127,165,0.15)' }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,127,165,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-3 h-3">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span className="text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: CONSULT_COLOR }}>
                Zoom Consultations
              </span>
              <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,127,165,0.12)', color: CONSULT_COLOR }}>
                {uniqueConsults.length}
              </span>
            </div>

            {/* Items */}
            {uniqueConsults.map((b, i) => (
              <button
                key={b.id}
                onClick={() => onSelect(b)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors group"
                style={{
                  background: dm ? '#1e1e24' : '#fff',
                  borderBottom: i < uniqueConsults.length - 1 ? `1px solid ${dm ? '#2e2e38' : '#f0ebe6'}` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = dm ? '#27272a' : '#faf8f6'}
                onMouseLeave={e => e.currentTarget.style.background = dm ? '#1e1e24' : '#fff'}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,127,165,0.1)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4">
                    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.85rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                    {b.name || 'Client'}
                  </p>
                  <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#71717a' : '#999' }}>
                    {b.consultation_type || 'Zoom'} · {b.consultation_time || ''} · {b.service}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#e8e2dc] border-t-[#A0785A] rounded-full animate-spin" />
        </div>
      ) : activeBookings.length === 0 && completedBookings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#b5a99a] text-[0.85rem]">No appointments found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {activeBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: dm ? '#2e2e38' : '#F5F0EC' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#c5bdb5'} strokeWidth="1.5" className="w-5 h-5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[0.9rem] font-serif" style={{ color: dm ? '#71717a' : '#b5a99a' }}>No active appointments</p>
                <p className="text-[0.72rem] mt-1" style={{ color: dm ? '#52525b' : '#d4c8c0' }}>All wrapped up here ✦</p>
              </div>
              {completedBookings.length > 0 && (
                <button
                  onClick={() => setShowArchive(true)}
                  className="flex flex-col items-center gap-1 mt-1 group"
                >
                  <p className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase transition-colors group-hover:text-[#A0785A]" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>
                    See completed archive below
                  </p>
                  <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#c5bdb5'} strokeWidth="1.5" className="w-4 h-4 transition-colors group-hover:stroke-[#A0785A]">
                    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Bridal Section — Top Priority */}
              {bridalBookings.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[1rem]">💍</span>
                      <h3 className="font-serif text-[1.1rem]" style={{ color: dm ? '#e4e4e7' : '#111' }}>Bridal</h3>
                    </div>
                    <span className="px-2.5 py-1 bg-[#D4A0B0]/15 text-[#D4A0B0] text-[0.6rem] font-semibold tracking-[0.1em] uppercase rounded-full">
                      Top Priority
                    </span>
                    <span className="text-[0.65rem] text-[#bbb]">({bridalBookings.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bridalBookings.map(b => (
                      <BookingCard key={b.id} booking={b} onClick={() => onSelect(b)} darkMode={dm} />
                    ))}
                  </div>
                </div>
              )}

              {/* Non-Bridal Section */}
              {nonBridalBookings.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[1rem]">✨</span>
                      <h3 className="font-serif text-[1.1rem]" style={{ color: dm ? '#e4e4e7' : '#111' }}>Non-Bridal</h3>
                    </div>
                    <span className="text-[0.65rem] text-[#bbb]">({nonBridalBookings.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nonBridalBookings.map(b => (
                      <BookingCard key={b.id} booking={b} onClick={() => onSelect(b)} darkMode={dm} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Completed Archive */}
          {completedBookings.length > 0 && (
            <div className="border-t border-dashed border-[#e8e2dc] pt-6">
              <button
                onClick={() => setShowArchive(v => !v)}
                className="flex items-center gap-3 mb-4 group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[1rem]">🗂️</span>
                  <h3 className="font-serif text-[1.1rem] transition-colors" style={{ color: dm ? '#52525b' : '#999' }}>Completed Archive</h3>
                </div>
                <span className="text-[0.65rem] text-[#bbb]">({completedBookings.length})</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"
                  className={`w-4 h-4 transition-transform duration-200 ${showArchive ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showArchive && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                  {completedBookings.map(b => (
                    <BookingCard key={b.id} booking={b} onClick={() => onSelect(b)} darkMode={dm} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}