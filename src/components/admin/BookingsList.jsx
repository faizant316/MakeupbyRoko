import { useState, useRef, useEffect } from 'react';
import BookingCard from './BookingCard';
import StatusBadge from './StatusBadge';

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

// Month picker for the appointments list — a compact calendar-icon trigger.
// Native <select> wheel on iOS (via an invisible overlay), styled dropdown on desktop.
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] flex-shrink-0">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5"/>
      <path d="M3 9h18"/>
      <path d="M8 2.5v4M16 2.5v4"/>
      <circle cx="8" cy="13" r="0.85" fill="#C4849A" stroke="none"/>
      <circle cx="12" cy="13" r="0.85" fill="#C4849A" stroke="none"/>
      <circle cx="16" cy="13" r="0.85" fill="#C4849A" stroke="none"/>
      <circle cx="8" cy="16.5" r="0.85" fill="#C4849A" stroke="none"/>
      <circle cx="12" cy="16.5" r="0.85" fill="#C4849A" stroke="none"/>
    </svg>
  );
}

function MonthSelect({ value, onChange, options, dm }) {
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream); }, []);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];
  const hasFilter = !!value;
  const label = hasFilter ? selected.label : 'Filter by month';

  const triggerStyle = hasFilter
    ? { background: dm ? 'rgba(196,132,154,0.16)' : '#FBF5F7', border: `1px solid ${dm ? '#5a4750' : '#E2C4D2'}`, color: dm ? '#e7c9d5' : '#A0607A' }
    : { background: dm ? '#2e2e38' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}`, color: dm ? '#a1a1aa' : '#8a7e84' };

  const trigger = (
    <button type="button" onClick={() => { if (!isIOS) setOpen(o => !o); }}
      className="inline-flex items-center gap-2 rounded-lg pl-2.5 pr-2 py-2 text-[0.72rem] font-semibold tracking-[0.01em] transition-all hover:opacity-90 active:scale-[0.98]"
      style={triggerStyle}>
      <CalendarIcon />
      <span className="whitespace-nowrap">{label}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className={`w-3 h-3 flex-shrink-0 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
    </button>
  );

  // iOS — show the same trigger, overlay an invisible native select for the wheel picker
  if (isIOS) {
    return (
      <div className="relative inline-flex">
        {trigger}
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by month"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ fontSize: '16px' }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 rounded-lg overflow-hidden min-w-[190px] max-h-[280px] overflow-y-auto"
          style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#ece6e0'}`, boxShadow: '0 10px 34px rgba(0,0,0,0.14)', animation: 'fadeSlideDown 0.16s ease-out' }}>
          {options.map(o => {
            const isSel = o.value === value;
            return (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 text-[0.72rem] font-medium transition-colors flex items-center justify-between gap-2"
                style={{ background: isSel ? (dm ? 'rgba(196,132,154,0.14)' : '#FBF5F7') : 'transparent', color: isSel ? '#C4849A' : (dm ? '#a1a1aa' : '#555') }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = dm ? '#2e2e38' : '#FAF8F6'; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                <span className="truncate">{o.label}</span>
                {isSel && <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2.5" className="w-3.5 h-3.5 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Bridal / Non-Bridal / Both toggle — segmented control with a sliding indicator.
function TypeSegment({ value, onChange, dm }) {
  const segs = [
    { key: 'both', label: 'Both' },
    { key: 'bridal', label: 'Bridal' },
    { key: 'nonbridal', label: 'Non-Bridal' },
  ];
  const activeIndex = Math.max(0, segs.findIndex(s => s.key === value));
  return (
    <div className="relative grid grid-cols-3 p-0.5 rounded-lg w-full sm:w-[268px]"
      style={{ background: dm ? '#2e2e38' : '#F5F0EC', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}` }}>
      <div className="absolute rounded-md pointer-events-none"
        style={{
          top: 2, bottom: 2, left: 2, width: 'calc((100% - 4px) / 3)',
          transform: `translateX(${activeIndex * 100}%)`,
          transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          background: dm ? '#1e1e24' : '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        }} />
      {segs.map(s => {
        const isActive = s.key === value;
        return (
          <button key={s.key} type="button" onClick={() => onChange(s.key)}
            className="relative z-10 py-2 text-[0.68rem] font-semibold tracking-[0.01em] transition-colors whitespace-nowrap text-center"
            style={{ color: isActive ? (dm ? '#e7c9d5' : '#A0607A') : (dm ? '#8a8a93' : '#9a8e94') }}>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

const BRIDAL_KEYWORDS = ['bridal', 'bride', 'wedding', 'full day'];
const NON_BRIDAL_KEYWORDS = ['non-bridal', 'non bridal'];

function isBridalBooking(booking) {
  const service = (booking.service || '').toLowerCase();
  if (NON_BRIDAL_KEYWORDS.some(kw => service.includes(kw))) return false;
  return BRIDAL_KEYWORDS.some(kw => service.includes(kw));
}

const CONSULT_COLOR = '#A855F7';
const LESSON_COLOR = '#C4956A';

const CLASS_LABELS = {
  private_basic_lesson: 'Basic Makeup Lesson',
  masterclass: 'Advanced Makeup Lesson',
  virtual_lesson: 'Virtual Makeup Lesson',
  intermediate_lesson: 'Intermediate Makeup Lesson',
  glam_class: 'Glam Makeup Class',
};

export default function BookingsList({
  bookings, loading, search, setSearch, statusFilter, setStatusFilter,
  statusCounts, selectedDate, setSelectedDate, onSelect, currentMonth,
  allBookings, consultationsOnDate = [], lessonsOnDate = [], darkMode: dm, onAddClient,
  classRegs = [], viewType = 'appointments', setViewType, onSelectClassReg,
}) {
  const [showArchive, setShowArchive] = useState(false);
  const [showRecentPanel, setShowRecentPanel] = useState(false);
  const [recentSearch, setRecentSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState(''); // 'YYYY-MM' or '' for all
  const [typeFilter, setTypeFilter] = useState('both'); // 'both' | 'bridal' | 'nonbridal'

  // Months that actually have appointments, for the month dropdown
  const monthMap = new Map();
  (bookings || []).forEach(b => {
    if (!b.date) return;
    const key = b.date.slice(0, 7);
    if (!monthMap.has(key)) {
      monthMap.set(key, new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
  });
  const monthOptions = [
    { value: '', label: 'All Months' },
    ...[...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, label]) => ({ value, label })),
  ];
  // Ignore a selected month that no longer exists in the current results
  const effectiveMonth = monthFilter && monthMap.has(monthFilter) ? monthFilter : '';

  // Recent bookings: created within the last 24 hours (uses allBookings, unfiltered)
  const now = Date.now();
  const recentBookings = (allBookings || [])
    .filter(b => b.created_date && (now - new Date(b.created_date).getTime()) < 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Apply the month filter (appointments list only), then sort chronologically
  const monthScoped = effectiveMonth
    ? (bookings || []).filter(b => (b.date || '').slice(0, 7) === effectiveMonth)
    : bookings;
  const sorted = [...monthScoped].sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return (a.created_date || '').localeCompare(b.created_date || '');
  });

  // Separate completed from active
  const activeBookings = sorted.filter(b => b.status !== 'completed');
  const completedBookings = sorted.filter(b => b.status === 'completed');

  const bridalBookings = activeBookings.filter(isBridalBooking);
  const nonBridalBookings = activeBookings.filter(b => !isBridalBooking(b));

  // Type filter (Bridal / Non-Bridal / Both)
  const showBridal = typeFilter !== 'nonbridal';
  const showNonBridal = typeFilter !== 'bridal';
  const visibleActiveCount = (showBridal ? bridalBookings.length : 0) + (showNonBridal ? nonBridalBookings.length : 0);
  const visibleCompleted = completedBookings.filter(b => (isBridalBooking(b) ? showBridal : showNonBridal));

  const today = new Date().toISOString().split('T')[0];

  const consultationBookings = (allBookings || [])
    .filter(b => b.consultation_date && b.consultation_date >= today && (!search || [b.name, b.email, b.service].some(f => f?.toLowerCase().includes(search.toLowerCase()))))
    .sort((a, b) => (a.consultation_date || '').localeCompare(b.consultation_date || ''));

  const filteredClassRegs = classRegs
    .filter(r => (!r.appointment_date || r.appointment_date >= today) && (!search || [r.full_name, r.email, r.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))))
    .sort((a, b) => (a.appointment_date || '').localeCompare(b.appointment_date || ''));

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

      {/* Just Booked — appointments only, last 24 hrs */}
      {recentBookings.length > 0 && (
        <div className="mb-7 overflow-hidden rounded-2xl" style={{ border: `1px solid ${dm ? '#3f3f46' : '#f0e6df'}`, boxShadow: '0 2px 20px rgba(160,120,90,0.07)' }}>
          <button
            onClick={() => setShowRecentPanel(v => !v)}
            aria-expanded={showRecentPanel}
            className="w-full flex items-center justify-between px-5 py-3 transition-colors"
            style={{ background: dm ? 'rgba(180,100,120,0.25)' : 'rgba(212,160,176,0.25)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: dm ? '#c47a92' : '#D4A0B0' }} />
              <span className="text-[0.6rem] font-bold tracking-[0.18em] uppercase" style={{ color: dm ? '#c47a92' : '#A0607A' }}>Just Booked</span>
              <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: dm ? 'rgba(212,160,176,0.2)' : 'rgba(212,160,176,0.3)', color: dm ? '#c47a92' : '#A0607A' }}>
                {recentBookings.length}
              </span>
              <span className="text-[0.58rem] italic" style={{ color: dm ? '#a06070' : '#c48090' }}>last 24 hrs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] italic" style={{ color: dm ? '#a06070' : '#c48090' }}>
                {showRecentPanel ? 'collapse' : 'view all'}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#c47a92' : '#A0607A'} strokeWidth="2"
                className="w-3.5 h-3.5"
                style={{ transition: 'transform 450ms cubic-bezier(0.16,1,0.3,1)', transform: showRecentPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          {/* Collapsible panel — grid-rows 0fr→1fr gives a smooth, JS-free height animation */}
          <div
            className="grid"
            style={{
              gridTemplateRows: showRecentPanel ? '1fr' : '0fr',
              transition: 'grid-template-rows 450ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div className="overflow-hidden">
            <div
              style={{
                background: dm ? '#27272a' : '#fff',
                opacity: showRecentPanel ? 1 : 0,
                transform: showRecentPanel ? 'translateY(0)' : 'translateY(-8px)',
                pointerEvents: showRecentPanel ? 'auto' : 'none',
                transition: 'opacity 300ms ease, transform 350ms cubic-bezier(0.16,1,0.3,1)',
                transitionDelay: showRecentPanel ? '110ms' : '0ms',
              }}
            >
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
                    style={{ background: dm ? '#1e1e24' : '#FAF8F6', border: `1px solid ${dm ? '#3f3f46' : '#ede8e3'}`, color: dm ? '#e4e4e7' : '#111' }}
                    onClick={e => e.stopPropagation()}
                  />
                  {recentSearch && (
                    <button onClick={() => setRecentSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#777] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
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
                        {b.date && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{' · '}{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                ))
              }
              {recentSearch && recentBookings.filter(b => [b.name, b.service, b.email].some(f => f?.toLowerCase().includes(recentSearch.toLowerCase()))).length === 0 && (
                <div className="py-6 text-center text-[0.78rem]" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>No results for "{recentSearch}"</div>
              )}
            </div>
            </div>
          </div>
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

      {/* Status pills + service type pills */}
      {(() => {
        const STATUS_COLORS = {
          all:       { active: dm ? '#D4A0B0' : '#111', activeTxt: dm ? '#1a1614' : '#fff', dot: null },
          pending:   { active: '#F59E0B', activeTxt: '#fff', dot: '#F59E0B' },
          confirmed: { active: '#3B82F6', activeTxt: '#fff', dot: '#3B82F6' },
          completed: { active: '#22C55E', activeTxt: '#fff', dot: '#22C55E' },
          cancelled: { active: '#EF4444', activeTxt: '#fff', dot: '#EF4444' },
        };
        const inAppointments = viewType === 'appointments';
        return (
          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto no-scrollbar pb-0.5">
            {STATUSES.map(s => {
              const count = statusCounts[s] || 0;
              const isActive = inAppointments && statusFilter === s;
              const colors = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setViewType?.('appointments'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.65rem] font-semibold whitespace-nowrap transition-all flex-shrink-0"
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

            {/* Divider */}
            <div className="w-px h-4 rounded-full flex-shrink-0 mx-0.5" style={{ background: dm ? '#3f3f46' : '#e0d8d2' }} />

            {/* Makeup Courses pill */}
            <button
              onClick={() => setViewType?.('courses')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.65rem] font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={viewType === 'courses'
                ? { background: LESSON_COLOR, color: '#fff', border: `1px solid ${LESSON_COLOR}` }
                : { background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#71717a' : '#999', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}` }
              }
            >
              {viewType !== 'courses' && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: LESSON_COLOR }} />}
              <span>Makeup Courses</span>
              <span className="opacity-70">({classRegs.filter(r => !r.appointment_date || r.appointment_date >= today).length})</span>
            </button>

            {/* Consultations pill */}
            <button
              onClick={() => setViewType?.('consultations')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.65rem] font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={viewType === 'consultations'
                ? { background: CONSULT_COLOR, color: '#fff', border: `1px solid ${CONSULT_COLOR}` }
                : { background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#71717a' : '#999', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}` }
              }
            >
              {viewType !== 'consultations' && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CONSULT_COLOR }} />}
              <span>Consultations</span>
              <span className="opacity-70">({(allBookings || []).filter(b => b.consultation_date && b.consultation_date >= today).length})</span>
            </button>
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
          <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(168,85,247,0.25)` }}>
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3"
              style={{ background: 'rgba(168,85,247,0.07)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-3 h-3">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span className="text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: CONSULT_COLOR }}>
                Zoom Consultations
              </span>
              <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.12)', color: CONSULT_COLOR }}>
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
                  borderBottom: i < uniqueConsults.length - 1 ? `1px solid ${dm ? '#2e2e38' : '#ebebeb'}` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = dm ? '#27272a' : '#faf8f6'}
                onMouseLeave={e => e.currentTarget.style.background = dm ? '#1e1e24' : '#fff'}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.1)' }}>
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
                {(() => {
                  const hostMatch = b.consultation_notes?.match(/^HostLink: (https?:\/\/\S+)/m);
                  const joinMatch = b.consultation_notes?.match(/^Link: (https?:\/\/\S+)/m);
                  const url = hostMatch?.[1] || joinMatch?.[1];
                  const isHost = !!hostMatch?.[1];
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-semibold transition-all flex-shrink-0 hover:opacity-80"
                      style={{ background: '#D4A0B0', color: '#fff' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                      </svg>
                      Join
                    </a>
                  ) : null;
                })()}
                <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Makeup Lessons on selected date */}
      {selectedDate && lessonsOnDate.length > 0 && (
        <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(196,149,106,0.3)` }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3"
            style={{ background: 'rgba(196,149,106,0.08)', borderBottom: '1px solid rgba(196,149,106,0.18)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,149,106,0.18)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="1.5" className="w-3 h-3">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: LESSON_COLOR }}>
              Makeup Lessons
            </span>
            <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(196,149,106,0.15)', color: LESSON_COLOR }}>
              {lessonsOnDate.length}
            </span>
          </div>

          {/* Items */}
          {lessonsOnDate.map((r, i) => {
            const classList = Object.keys(CLASS_LABELS).filter(k => r[k]);
            const classLabel = classList.length ? CLASS_LABELS[classList[0]] : 'Makeup Lesson';
            const zoomMatch = r.lesson_notes?.match(/^Link: (https?:\/\/\S+)/);
            const isZoom = r.consultation_type === 'Zoom';
            const isPhone = r.consultation_type === 'Phone';
            return (
              <div
                key={r.id}
                className="w-full flex items-center gap-4 px-4 py-3.5"
                style={{
                  background: dm ? '#1e1e24' : '#fff',
                  borderBottom: i < lessonsOnDate.length - 1 ? `1px solid ${dm ? '#2e2e38' : '#ebebeb'}` : 'none',
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,149,106,0.12)' }}>
                  {isZoom ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="1.5" className="w-4 h-4">
                      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="1.5" className="w-4 h-4">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 11.7 19.79 19.79 0 0 1 1 3.07 2 2 0 0 1 2.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.85rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                    {r.full_name || 'Client'}
                  </p>
                  <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#71717a' : '#999' }}>
                    {isPhone ? 'Phone / FaceTime' : (r.consultation_type || 'Zoom')} · {r.appointment_time || ''} · {classLabel}
                  </p>
                </div>
                {isZoom && zoomMatch ? (
                  <a
                    href={(() => { const hm = r.lesson_notes?.match(/^HostLink: (https?:\/\/\S+)/m); return hm?.[1] || zoomMatch[1]; })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-semibold transition-all flex-shrink-0 hover:opacity-80"
                    style={{ background: '#D4A0B0', color: '#fff' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                    </svg>
                    Join
                  </a>
                ) : isPhone && r.phone ? (
                  <a
                    href={`tel:${r.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-semibold transition-all flex-shrink-0 hover:opacity-80"
                    style={{ background: 'rgba(196,149,106,0.1)', color: LESSON_COLOR, border: '1px solid rgba(196,149,106,0.25)' }}
                  >
                    {r.phone}
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Makeup Courses view */}
      {viewType === 'courses' && (
        <div>
          {filteredClassRegs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#b5a99a] text-[0.85rem]">No makeup courses found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredClassRegs.map((r, i) => {
                const classList = Object.keys(CLASS_LABELS).filter(k => r[k]);
                const classLabel = classList.length ? CLASS_LABELS[classList[0]] : 'Makeup Course';
                const statusColor = (r.status === 'enrolled' || r.status === 'confirmed') ? '#22C55E' : r.status === 'pending' || !r.status ? '#F59E0B' : '#3B82F6';
                const statusLabel = r.status === 'enrolled' ? 'Enrolled' : r.status === 'confirmed' ? 'Confirmed' : 'Pending';
                const ps = r.payment_status;
                const isPaid = ps === 'paid' || ps === 'deposit_paid' || ps === 'paid_in_full';
                const isRefunded = ps === 'refunded';
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectClassReg?.(r)}
                    className="flex items-center gap-4 px-5 py-4 rounded-xl w-full text-left transition-colors group"
                    style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#f0ebe5'}` }}
                    onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FDF9F7'}
                    onMouseLeave={e => e.currentTarget.style.background = dm ? '#27272a' : '#fff'}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,149,106,0.12)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="1.5" className="w-4 h-4">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.875rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                        {r.full_name || 'Client'}
                      </p>
                      <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#71717a' : '#999' }}>
                        {classLabel}
                        {r.appointment_date && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{' · '}{new Date(r.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {r.appointment_time && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{' · '}{r.appointment_time}</span>}
                        {r.consultation_type && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{' · '}{r.consultation_type}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isPaid && (
                        <span className="text-[0.6rem] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
                          Paid
                        </span>
                      )}
                      {isRefunded && (
                        <span className="text-[0.6rem] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#b91c1c' }}>
                          Refunded
                        </span>
                      )}
                      <span className="text-[0.6rem] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: `${statusColor}18`, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Consultations view */}
      {viewType === 'consultations' && (
        <div>
          {consultationBookings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#b5a99a] text-[0.85rem]">No consultations found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {consultationBookings.map(b => {
                const hostMatch = b.consultation_notes?.match(/^HostLink: (https?:\/\/\S+)/m);
                const joinMatch = b.consultation_notes?.match(/^Link: (https?:\/\/\S+)/m);
                const url = hostMatch?.[1] || joinMatch?.[1];
                const isHost = !!hostMatch?.[1];
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex items-center gap-4 w-full text-left px-5 py-4 rounded-xl transition-colors group"
                    style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#f0ebe5'}` }}
                    onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FDF9F7'}
                    onMouseLeave={e => e.currentTarget.style.background = dm ? '#27272a' : '#fff'}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.12)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="1.5" className="w-4 h-4">
                        <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.875rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                        {b.name || 'Client'}
                      </p>
                      <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#71717a' : '#999' }}>
                        {b.service}
                        {b.consultation_date && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{' · '}{new Date(b.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {b.consultation_time && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{' · '}{b.consultation_time}</span>}
                        {b.consultation_type && <span style={{ color: dm ? '#52525b' : '#c5bdb5' }}>{' · '}{b.consultation_type}</span>}
                      </p>
                    </div>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-semibold transition-all flex-shrink-0 hover:opacity-80"
                        style={{ background: '#D4A0B0', color: '#fff' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                        </svg>
                        {isHost ? 'Join as Host' : 'Join'}
                      </a>
                    )}
                    <svg viewBox="0 0 24 24" fill="none" stroke={CONSULT_COLOR} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Type + Month filters — appointments list (separate from the calendar above) */}
      {viewType === 'appointments' && !selectedDate && !loading && (activeBookings.length > 0 || completedBookings.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <TypeSegment value={typeFilter} onChange={setTypeFilter} dm={dm} />
          {monthOptions.length > 1 && (
            <MonthSelect value={effectiveMonth} onChange={setMonthFilter} options={monthOptions} dm={dm} />
          )}
        </div>
      )}

      {/* Appointments content */}
      {viewType === 'appointments' && (loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#e8e2dc] border-t-[#A0785A] rounded-full animate-spin" />
        </div>
      ) : visibleActiveCount === 0 && visibleCompleted.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#b5a99a] text-[0.85rem]">
            No {typeFilter === 'bridal' ? 'bridal ' : typeFilter === 'nonbridal' ? 'non-bridal ' : ''}appointments found
          </p>
        </div>
      ) : (
        <div key={`${effectiveMonth || 'all'}-${typeFilter}`} className="flex flex-col gap-8" style={{ animation: 'fadeRiseIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
          {visibleActiveCount === 0 ? (
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
              {visibleCompleted.length > 0 && (
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
              {showBridal && bridalBookings.length > 0 && (
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
              {showNonBridal && nonBridalBookings.length > 0 && (
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
          {visibleCompleted.length > 0 && (
            <div className="border-t border-dashed border-[#e8e2dc] pt-6">
              <button
                onClick={() => setShowArchive(v => !v)}
                className="flex items-center gap-3 mb-4 group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[1rem]">🗂️</span>
                  <h3 className="font-serif text-[1.1rem] transition-colors" style={{ color: dm ? '#52525b' : '#999' }}>Completed Archive</h3>
                </div>
                <span className="text-[0.65rem] text-[#bbb]">({visibleCompleted.length})</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"
                  className={`w-4 h-4 transition-transform duration-200 ${showArchive ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showArchive && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                  {visibleCompleted.map(b => (
                    <BookingCard key={b.id} booking={b} onClick={() => onSelect(b)} darkMode={dm} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}