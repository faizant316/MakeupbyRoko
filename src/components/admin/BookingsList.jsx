import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import BookingRow from './BookingRow';
import StatusBadge from './StatusBadge';
import Collapse from './Collapse';
import { groupByTime, timeToMinutes } from './timeline';
import { openZoomRoom, zoomRoomUrl, parseMeetingId, meetingIdFromUrl } from '@/lib/zoomHost';
import { classesOfReg } from '@/lib/classCatalog';

// SSR-safe layout effect — measures the active tab to position the underline
// without a first-paint flash, while staying quiet during server render.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
    ? { color: dm ? '#e7c9d5' : '#A0607A' }
    : { color: dm ? '#a1a1aa' : '#83838d' };

  const trigger = (
    <button type="button" onClick={() => { if (!isIOS) setOpen(o => !o); }}
      className="inline-flex items-center gap-1.5 px-1 py-2 text-[0.72rem] font-semibold tracking-[0.01em] bg-transparent border-0 transition-all hover:opacity-70 active:scale-[0.98]"
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
        <div className="absolute right-0 top-full mt-1.5 z-50 rounded-lg overflow-hidden min-w-[190px] max-h-[280px] overflow-y-auto"
          style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#E8E9EE'}`, boxShadow: '0 10px 34px rgba(0,0,0,0.14)', animation: 'fadeSlideDown 0.16s ease-out' }}>
          {options.map(o => {
            const isSel = o.value === value;
            return (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 text-[0.72rem] font-medium transition-colors flex items-center justify-between gap-2"
                style={{ background: isSel ? (dm ? 'rgba(196,132,154,0.14)' : '#FBF5F7') : 'transparent', color: isSel ? '#C4849A' : (dm ? '#a1a1aa' : '#555') }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = dm ? '#2e2e38' : '#FAFAFB'; }}
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

// Both / Bridal / Non-Bridal picker — minimalist underline tabs. A thin plum
// bar slides to hug the active label; no pill, no fill, just type and motion.
function TypeSegment({ value, onChange, dm }) {
  const segs = [
    { key: 'both', label: 'Both' },
    { key: 'bridal', label: 'Bridal' },
    { key: 'nonbridal', label: 'Non-Bridal' },
  ];
  const btnRefs = useRef({});
  const [bar, setBar] = useState({ left: 0, width: 0 });

  useIsoLayoutEffect(() => {
    const el = btnRefs.current[value];
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value]);

  useEffect(() => {
    const onResize = () => {
      const el = btnRefs.current[value];
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [value]);

  return (
    <div className="relative inline-flex items-center gap-6 sm:gap-7">
      {segs.map(s => {
        const isActive = s.key === value;
        return (
          <button
            key={s.key}
            ref={el => { btnRefs.current[s.key] = el; }}
            type="button"
            onClick={() => onChange(s.key)}
            className="relative pb-2 pt-0.5 text-[0.92rem] tracking-[0.01em] whitespace-nowrap transition-colors duration-200"
            style={{
              color: isActive ? (dm ? '#ECEDF1' : '#1a1a1a') : (dm ? '#6f6f78' : '#a8a8b1'),
              fontWeight: isActive ? 600 : 500,
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = dm ? '#a1a1aa' : '#83838d'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = dm ? '#6f6f78' : '#a8a8b1'; }}
          >
            {s.label}
          </button>
        );
      })}
      <span
        className="absolute bottom-0 h-[2px] rounded-full pointer-events-none"
        style={{
          left: bar.left,
          width: bar.width,
          background: 'linear-gradient(90deg, #A0607A, #6B4055)',
          opacity: bar.width ? 1 : 0,
          transition: 'left 0.32s cubic-bezier(0.4,0,0.2,1), width 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
        }}
      />
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
const LESSON_COLOR = '#C76BA6';

// Class titles/prices come from the shared catalog so admin surfaces never
// drift from what the site sells.

export default function BookingsList({
  bookings, loading, search, setSearch, statusFilter, setStatusFilter,
  statusCounts, selectedDate, setSelectedDate, onSelect, currentMonth,
  allBookings, consultationsOnDate = [], lessonsOnDate = [], darkMode: dm, onAddClient,
  classRegs = [], viewType = 'appointments', setViewType, onSelectClassReg,
  onMarkDepositReceived,
}) {
  const [showArchive, setShowArchive] = useState(false);
  const [showRecentPanel, setShowRecentPanel] = useState(false);
  const [showZellePanel, setShowZellePanel] = useState(false);
  const [markingIds, setMarkingIds] = useState(() => new Set());
  const [recentSearch, setRecentSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState(''); // 'YYYY-MM' or '' for all
  const [typeFilter, setTypeFilter] = useState('both'); // 'both' | 'bridal' | 'nonbridal'
  const [collapsedGroups, setCollapsedGroups] = useState({ later: true }); // far-future folded by default

  // Deposits waiting on Roko's eyes: client uploaded a Zelle screenshot but no
  // one has confirmed it in the admin yet. Purely derived from existing data —
  // as soon as she marks one received it drops out on its own.
  const pendingZelleReviews = (allBookings || [])
    .filter(b => b.zelle_screenshot && !b.deposit_received && b.status !== 'cancelled');

  const handleMarkReceived = (id) => {
    setMarkingIds(prev => new Set(prev).add(id));
    onMarkDepositReceived?.(id);
  };

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

  // Connect the month picker to the timeline: picking a specific month opens
  // every group so those bookings show right away (no hunting under "Later");
  // clearing it restores the default of folding "Later" away.
  useEffect(() => {
    setCollapsedGroups(effectiveMonth ? {} : { later: true });
  }, [effectiveMonth]);

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

  // Active bookings the type filter lets through, bridal first within the same day.
  const visibleActive = activeBookings
    .filter(b => (isBridalBooking(b) ? showBridal : showNonBridal))
    .sort((a, b) => {
      const ad = a.date || '9999-12-31';
      const bd = b.date || '9999-12-31';
      if (ad !== bd) return ad.localeCompare(bd);
      const ab = isBridalBooking(a) ? 0 : 1;
      const bb = isBridalBooking(b) ? 0 : 1;
      if (ab !== bb) return ab - bb;
      return (a.created_date || '').localeCompare(b.created_date || '');
    });

  // Bucket by how soon each appointment is, so the list reads as a timeline
  // instead of one endless run. "Later" folds away by default.
  const timeGroups = groupByTime(visibleActive, b => b.date);

  const today = new Date().toISOString().split('T')[0];

  // When the "Completed" status chip is active, the whole point of the view is
  // the archive, so we skip the empty "No active appointments" state and just
  // show the completed list, expanded.
  const completedOnly = statusFilter === 'completed';

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
        style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}` }}>
        <div>
          <h2 className="font-serif text-[1.85rem] sm:text-[2.1rem] font-light leading-none tracking-[-0.01em]"
            style={{ color: dm ? '#e4e4e7' : '#111' }}>Appointments</h2>
          <p className="text-[0.72rem] font-medium tracking-[0.04em] mt-1.5"
            style={{ color: dm ? '#71717a' : '#bbb' }}>
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

      {/* Deposits to Confirm — client sent a Zelle screenshot, awaiting review */}
      {pendingZelleReviews.length > 0 && (
        <div className="mb-4 relative">
          <button
            onClick={() => setShowZellePanel(v => !v)}
            aria-expanded={showZellePanel}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-colors"
            style={{
              background: dm ? '#26262e' : '#fff',
              border: `1px solid ${dm ? '#34343d' : '#d7e2f7'}`,
              borderLeft: '3px solid #2563EB',
              boxShadow: dm ? 'none' : '0 1px 3px rgba(30,64,175,0.05), 0 4px 14px rgba(30,64,175,0.05)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: dm ? 'rgba(59,130,246,0.16)' : 'rgba(59,130,246,0.12)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" className="w-3.5 h-3.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </span>
              <span className="text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: '#2563EB' }}>Deposits to Confirm</span>
              <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: dm ? 'rgba(59,130,246,0.16)' : 'rgba(59,130,246,0.14)', color: '#2563EB' }}>
                {pendingZelleReviews.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] italic" style={{ color: dm ? '#71717a' : '#9c9ca4' }}>
                {showZellePanel ? 'collapse' : 'review'}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"
                className="w-3.5 h-3.5"
                style={{ transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)', transform: showZellePanel ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          <div
            className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: dm ? '#27272a' : '#fff',
              border: `1px solid ${dm ? '#3f3f46' : '#d7e2f7'}`,
              boxShadow: dm ? '0 18px 48px rgba(0,0,0,0.45)' : '0 18px 48px rgba(30,64,175,0.14)',
              maxHeight: 'min(70vh, 480px)',
              transformOrigin: 'top center',
              opacity: showZellePanel ? 1 : 0,
              transform: showZellePanel ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.985)',
              pointerEvents: showZellePanel ? 'auto' : 'none',
              visibility: showZellePanel ? 'visible' : 'hidden',
              willChange: 'transform, opacity',
              transition: showZellePanel
                ? 'opacity 200ms ease, transform 300ms cubic-bezier(0.22,1,0.36,1)'
                : 'opacity 150ms ease, transform 200ms ease, visibility 0s linear 200ms',
            }}
          >
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {pendingZelleReviews.map((b, i) => {
                const isMarking = markingIds.has(b.id);
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 w-full text-left px-5 py-3.5"
                    style={{ borderBottom: i < pendingZelleReviews.length - 1 ? `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(30,64,175,0.08)'}` : 'none' }}
                  >
                    <button
                      onClick={() => onSelect(b)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                        <span className="font-serif text-[#2563EB] text-[0.85rem]">{(b.name || '?').trim().charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.875rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.name}</p>
                        <p className="text-[0.72rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#8791a6' }}>
                          {b.service}
                          {b.date && <span style={{ color: dm ? '#52525b' : '#a6b2cc' }}>{' · '}{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={isMarking}
                      onClick={(e) => { e.stopPropagation(); handleMarkReceived(b.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-bold tracking-[0.04em] uppercase transition-all hover:opacity-85 active:scale-95 flex-shrink-0"
                      style={{ background: isMarking ? (dm ? '#3f3f46' : '#e5e5e5') : '#2563EB', color: '#fff', opacity: isMarking ? 0.7 : 1 }}
                    >
                      {isMarking ? (
                        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                      {isMarking ? 'Marking…' : 'Received'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Just Booked — appointments only, last 24 hrs */}
      {recentBookings.length > 0 && (
        <div className="mb-7 relative">
          <button
            onClick={() => setShowRecentPanel(v => !v)}
            aria-expanded={showRecentPanel}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-colors"
            style={{
              background: dm ? '#26262e' : '#fff',
              border: `1px solid ${dm ? '#34343d' : '#EAEBF0'}`,
              borderLeft: '3px solid #D4A0B0',
              boxShadow: dm ? 'none' : '0 1px 3px rgba(60,45,35,0.05), 0 4px 14px rgba(60,45,35,0.05)',
            }}
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
                style={{ transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)', transform: showRecentPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          {/* Floating dropdown — animates transform + opacity only (GPU-composited), so it stays
              buttery on mobile, where animating height / grid-rows forces per-frame layout + repaint. */}
          <div
            className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: dm ? '#27272a' : '#fff',
              border: `1px solid ${dm ? '#3f3f46' : '#EAEBF0'}`,
              boxShadow: dm ? '0 18px 48px rgba(0,0,0,0.45)' : '0 18px 48px rgba(160,120,90,0.18)',
              maxHeight: 'min(70vh, 520px)',
              transformOrigin: 'top center',
              opacity: showRecentPanel ? 1 : 0,
              transform: showRecentPanel ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.985)',
              pointerEvents: showRecentPanel ? 'auto' : 'none',
              visibility: showRecentPanel ? 'visible' : 'hidden',
              willChange: 'transform, opacity',
              transition: showRecentPanel
                ? 'opacity 200ms ease, transform 300ms cubic-bezier(0.22,1,0.36,1)'
                : 'opacity 150ms ease, transform 200ms ease, visibility 0s linear 200ms',
            }}
          >
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.06)' : 'rgba(160,120,90,0.1)'}` }}>
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#a3a3ad" strokeWidth="1.5" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    value={recentSearch}
                    onChange={e => setRecentSearch(e.target.value)}
                    placeholder="Search recent clients…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-[0.8rem] outline-none transition-all"
                    style={{ background: dm ? '#1e1e24' : '#FAFAFB', border: `1px solid ${dm ? '#3f3f46' : '#E8E9EE'}`, color: dm ? '#e4e4e7' : '#111' }}
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
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {recentBookings
                .filter(b => !recentSearch || [b.name, b.service, b.email].some(f => f?.toLowerCase().includes(recentSearch.toLowerCase())))
                .map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex items-center gap-4 w-full text-left px-5 py-4 transition-colors group"
                    style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(160,120,90,0.08)'}` }}
                    onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FAFAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                      <span className="font-serif text-[#D4A0B0] text-[0.85rem]">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.875rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.name}</p>
                      <p className="text-[0.72rem] truncate mt-0.5" style={{ color: dm ? '#71717a' : '#a3a3ad' }}>
                        {b.service}
                        {b.date && <span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{' · '}{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
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
                <div className="py-6 text-center text-[0.78rem]" style={{ color: dm ? '#52525b' : '#bcbcc4' }}>No results for "{recentSearch}"</div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Search */}
      <div className="relative mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="#a3a3ad" strokeWidth="1.5" className="w-[15px] h-[15px] absolute left-3.5 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or service..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg text-base sm:text-[0.82rem] focus:ring-1 focus:ring-[#D4A0B0]/20 outline-none transition-all"
          style={{
            background: dm ? '#232328' : '#FAFAFB',
            border: `1px solid ${dm ? '#34343d' : '#E8E9EE'}`,
            color: dm ? '#e4e4e7' : '#111',
          }}
        />
        {/* Clear button — appears once there's text to wipe out */}
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#3f3f46' : '#ECEDF1', touchAction: 'manipulation' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#d4d4d8' : '#83838d'} strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Status + service-type filters — minimal text chips, soft-tint when active */}
      {(() => {
        const STATUS_COLORS = {
          all:       { dot: null,      light: { bg: 'rgba(160,96,122,0.10)',  txt: '#8A4A63' }, dark: { bg: 'rgba(212,160,176,0.16)',  txt: '#e7c9d5' } },
          pending:   { dot: '#F59E0B', light: { bg: 'rgba(245,158,11,0.13)',  txt: '#B26A04' }, dark: { bg: 'rgba(245,158,11,0.18)',   txt: '#F5B83C' } },
          confirmed: { dot: '#2563EB', light: { bg: 'rgba(37,99,235,0.13)',   txt: '#1D4ED8' }, dark: { bg: 'rgba(59,130,246,0.18)',    txt: '#93B4F7' } },
          completed: { dot: '#64748B', light: { bg: 'rgba(100,116,139,0.14)', txt: '#475569' }, dark: { bg: 'rgba(148,163,184,0.16)',  txt: '#A7B2C4' } },
          cancelled: { dot: '#EF4444', light: { bg: 'rgba(239,68,68,0.12)',   txt: '#DC2626' }, dark: { bg: 'rgba(239,68,68,0.18)',    txt: '#F87171' } },
        };
        const inAppointments = viewType === 'appointments';
        const mutedTxt = dm ? '#8a8a93' : '#93939b';
        const hoverTxt = dm ? '#cfcfd6' : '#6b6259';
        const hoverBg  = dm ? '#26262d' : '#F3F3F7';
        const chipCls = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.74rem] font-semibold whitespace-nowrap transition-colors flex-shrink-0';
        const inactiveStyle = { background: 'transparent', color: mutedTxt };
        const onEnter = (e, active) => { if (!active) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverTxt; } };
        const onLeave = (e, active) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedTxt; } };
        return (
          <div className="flex items-center gap-1 mb-5 overflow-x-auto no-scrollbar pb-0.5">
            {STATUSES.map(s => {
              const count = statusCounts[s] || 0;
              const isActive = inAppointments && statusFilter === s;
              const c = STATUS_COLORS[s];
              const tone = dm ? c.dark : c.light;
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setViewType?.('appointments'); }}
                  className={chipCls}
                  style={isActive ? { background: tone.bg, color: tone.txt } : inactiveStyle}
                  onMouseEnter={e => onEnter(e, isActive)}
                  onMouseLeave={e => onLeave(e, isActive)}
                >
                  {c.dot && !isActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />}
                  <span className="capitalize">{s}</span>
                  <span style={{ opacity: 0.55 }}>{count}</span>
                </button>
              );
            })}

            {/* Divider */}
            <div className="w-px h-3.5 rounded-full flex-shrink-0 mx-1.5" style={{ background: dm ? '#3f3f46' : '#E2E4EA' }} />

            {/* Makeup Courses */}
            {(() => {
              const active = viewType === 'courses';
              const tone = dm ? { bg: 'rgba(199,107,166,0.2)', txt: '#E7A9CE' } : { bg: 'rgba(199,107,166,0.14)', txt: '#A83E86' };
              const count = classRegs.filter(r => !r.appointment_date || r.appointment_date >= today).length;
              return (
                <button onClick={() => setViewType?.('courses')} className={chipCls}
                  style={active ? { background: tone.bg, color: tone.txt } : inactiveStyle}
                  onMouseEnter={e => onEnter(e, active)} onMouseLeave={e => onLeave(e, active)}>
                  {!active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: LESSON_COLOR }} />}
                  <span>Makeup Courses</span>
                  <span style={{ opacity: 0.55 }}>{count}</span>
                </button>
              );
            })()}

            {/* Consultations */}
            {(() => {
              const active = viewType === 'consultations';
              const tone = dm ? { bg: 'rgba(168,85,247,0.22)', txt: '#C99BF5' } : { bg: 'rgba(168,85,247,0.12)', txt: '#9333EA' };
              const count = (allBookings || []).filter(b => b.consultation_date && b.consultation_date >= today).length;
              return (
                <button onClick={() => setViewType?.('consultations')} className={chipCls}
                  style={active ? { background: tone.bg, color: tone.txt } : inactiveStyle}
                  onMouseEnter={e => onEnter(e, active)} onMouseLeave={e => onLeave(e, active)}>
                  {!active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CONSULT_COLOR }} />}
                  <span>Consultations</span>
                  <span style={{ opacity: 0.55 }}>{count}</span>
                </button>
              );
            })()}
          </div>
        );
      })()}

      {/* Selected-date bar — one clean pill with the date and a dismiss circle */}
      {selectedDate && (
        <div className="flex items-center justify-between gap-3 mb-4 pl-3.5 pr-2.5 py-2.5 rounded-xl"
          style={{ background: dm ? '#26262e' : '#FAFAFB', border: `1px solid ${dm ? '#34343d' : '#E8E9EE'}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: dm ? 'rgba(212,160,176,0.14)' : 'rgba(212,160,176,0.16)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><path d="M8 2.5v4M16 2.5v4"/>
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase" style={{ color: dm ? '#71717a' : '#b6b6bf' }}>Showing</p>
              <p className="text-[0.9rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            aria-label="Clear date filter"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ background: dm ? '#34343d' : '#E8E9EE', touchAction: 'manipulation' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#d4d4d8' : '#83838d'} strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Consultations on selected date */}
      {selectedDate && consultationsOnDate.length > 0 && (() => {
        // Deduplicate — don't show bookings already listed as regular appointments
        const uniqueConsults = consultationsOnDate
          .filter(b => !bookings.some(fb => fb.id === b.id))
          .sort((a, b) => timeToMinutes(a.consultation_time) - timeToMinutes(b.consultation_time));
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
                  const join = b.consultation_notes?.match(/^Link: (https?:\/\/\S+)/m)?.[1];
                  const meetingId = parseMeetingId(b.consultation_notes) || meetingIdFromUrl(join);
                  const roomUrl = zoomRoomUrl(join, meetingId);
                  if (!roomUrl) return null;
                  return (
                    <a
                      href={roomUrl}
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
                  );
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
        <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(199,107,166,0.3)` }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3"
            style={{ background: 'rgba(199,107,166,0.08)', borderBottom: '1px solid rgba(199,107,166,0.18)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(199,107,166,0.18)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="1.5" className="w-3 h-3">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: LESSON_COLOR }}>
              Makeup Lessons
            </span>
            <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(199,107,166,0.15)', color: LESSON_COLOR }}>
              {lessonsOnDate.length}
            </span>
          </div>

          {/* Items */}
          {[...lessonsOnDate].sort((a, b) => timeToMinutes(a.appointment_time) - timeToMinutes(b.appointment_time)).map((r, i) => {
            const classLabel = classesOfReg(r)[0]?.title || 'Makeup Lesson';
            const zoomMatch = r.lesson_notes?.match(/^Link: (https?:\/\/\S+)/m);
            const meetingId = parseMeetingId(r.lesson_notes) || meetingIdFromUrl(zoomMatch?.[1]);
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(199,107,166,0.12)' }}>
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
                    {isPhone ? 'Phone / FaceTime' : r.consultation_type === 'In-Person' ? 'In Person · Studio' : (r.consultation_type || 'Zoom')} · {r.appointment_time || ''} · {classLabel}
                  </p>
                </div>
                {isZoom && (meetingId || zoomMatch) ? (
                  <button
                    type="button"
                    onClick={() => openZoomRoom(zoomMatch?.[1], meetingId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-semibold transition-all flex-shrink-0 hover:opacity-80"
                    style={{ background: '#D4A0B0', color: '#fff' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                    </svg>
                    Join
                  </button>
                ) : isPhone && r.phone ? (
                  <a
                    href={`tel:${r.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-semibold transition-all flex-shrink-0 hover:opacity-80"
                    style={{ background: 'rgba(199,107,166,0.1)', color: LESSON_COLOR, border: '1px solid rgba(199,107,166,0.25)' }}
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
              <p className="text-[#a3a3ad] text-[0.85rem]">No makeup courses found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredClassRegs.map((r, i) => {
                const classLabel = classesOfReg(r)[0]?.title || 'Makeup Course';
                const statusColor = (r.status === 'enrolled' || r.status === 'confirmed') ? '#3B82F6' : r.status === 'pending' || !r.status ? '#F59E0B' : '#3B82F6';
                const statusLabel = r.status === 'enrolled' ? 'Enrolled' : r.status === 'confirmed' ? 'Confirmed' : 'Pending';
                const isRefunded = r.payment_status === 'refunded';
                const isUnpaid = (!r.payment_status || r.payment_status === 'unpaid' || r.payment_status === 'pending') && !r.stripe_session_id;
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectClassReg?.(r)}
                    className="flex items-center gap-4 px-5 py-4 rounded-xl w-full text-left transition-colors group"
                    style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}` }}
                    onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FAFAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = dm ? '#27272a' : '#fff'}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(199,107,166,0.12)' }}>
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
                        {r.appointment_date && <span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{' · '}{new Date(r.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {r.appointment_time && <span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{' · '}{r.appointment_time}</span>}
                        {r.consultation_type && <span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{' · '}{r.consultation_type}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isUnpaid && (
                        <span className="text-[0.6rem] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(212,160,176,0.14)', color: '#C4849A' }}>
                          Unpaid
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
              <p className="text-[#a3a3ad] text-[0.85rem]">No consultations found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {consultationBookings.map(b => {
                const join = b.consultation_notes?.match(/^Link: (https?:\/\/\S+)/m)?.[1];
                const meetingId = parseMeetingId(b.consultation_notes) || meetingIdFromUrl(join);
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className="flex items-center gap-4 w-full text-left px-5 py-4 rounded-xl transition-colors group"
                    style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}` }}
                    onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FAFAFB'}
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
                        {b.consultation_date && <span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{' · '}{new Date(b.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {b.consultation_time && <span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{' · '}{b.consultation_time}</span>}
                        {b.consultation_type && <span style={{ color: dm ? '#52525b' : '#bcbcc4' }}>{' · '}{b.consultation_type}</span>}
                      </p>
                    </div>
                    {zoomRoomUrl(join, meetingId) && (
                      <a
                        href={zoomRoomUrl(join, meetingId)}
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
          <div className="w-6 h-6 border-2 border-[#E5E7EB] border-t-[#A0785A] rounded-full animate-spin" />
        </div>
      ) : visibleActiveCount === 0 && visibleCompleted.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#a3a3ad] text-[0.85rem]">
            No {typeFilter === 'bridal' ? 'bridal ' : typeFilter === 'nonbridal' ? 'non-bridal ' : ''}appointments found
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {visibleActiveCount === 0 ? (
            completedOnly ? null : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: dm ? '#2e2e38' : '#F5F0EC' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#bcbcc4'} strokeWidth="1.5" className="w-5 h-5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[0.9rem] font-serif" style={{ color: dm ? '#71717a' : '#a3a3ad' }}>No active appointments</p>
                <p className="text-[0.72rem] mt-1" style={{ color: dm ? '#52525b' : '#d4c8c0' }}>All wrapped up here ✦</p>
              </div>
              {visibleCompleted.length > 0 && (
                <button
                  onClick={() => setShowArchive(true)}
                  className="flex flex-col items-center gap-1 mt-1 group"
                >
                  <p className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase transition-colors group-hover:text-[#A0785A]" style={{ color: dm ? '#52525b' : '#bcbcc4' }}>
                    See completed archive below
                  </p>
                  <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#bcbcc4'} strokeWidth="1.5" className="w-4 h-4 transition-colors group-hover:stroke-[#A0785A]">
                    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                  </svg>
                </button>
              )}
            </div>
            )
          ) : selectedDate ? (
            // A single day is selected — show its appointments flat (no timeline
            // buckets to hide them under, no collapse).
            <div className="flex flex-col gap-2">
              {visibleActive.map(b => (
                <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)} onClick={() => onSelect(b)} darkMode={dm} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* "Today" is intentionally dropped here — the Home overview's
                  left-hand Today card already shows today in full (consultations,
                  appointments AND classes), so a second "Today" in this pipeline
                  was redundant. This list is the upcoming pipeline from here on. */}
              {timeGroups.filter(g => g.key !== 'today').map(group => {
                const open = !collapsedGroups[group.key];
                return (
                  <div key={group.key}>
                    <button
                      type="button"
                      onClick={() => setCollapsedGroups(p => ({ ...p, [group.key]: !p[group.key] }))}
                      className="flex items-center gap-2.5 mb-3 w-full"
                    >
                      {group.accent && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: group.accent }} />}
                      <h3 className="font-serif text-[1.05rem]" style={{ color: group.accent || (dm ? '#e4e4e7' : '#111') }}>{group.label}</h3>
                      <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#a1a1aa' : '#9c9ca4' }}>
                        {group.items.length}
                      </span>
                      <span className="flex-1" />
                      <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#bcbcc4'} strokeWidth="2"
                        className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${open ? '' : '-rotate-90'}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    <Collapse open={open}>
                      <div className="flex flex-col gap-2 pb-1">
                        {group.items.map(b => (
                          <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)} onClick={() => onSelect(b)} darkMode={dm} />
                        ))}
                      </div>
                    </Collapse>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Archive */}
          {visibleCompleted.length > 0 && (
            <div className={completedOnly ? '' : 'border-t border-dashed border-[#E5E7EB] pt-6'}>
              <button
                onClick={() => { if (!completedOnly) setShowArchive(v => !v); }}
                className="flex items-center gap-3 mb-4 group"
                style={completedOnly ? { cursor: 'default' } : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[1rem]">🗂️</span>
                  <h3 className="font-serif text-[1.1rem] transition-colors" style={{ color: dm ? '#52525b' : '#999' }}>Completed Archive</h3>
                </div>
                <span className="text-[0.65rem] text-[#bbb]">({visibleCompleted.length})</span>
                {!completedOnly && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"
                    className={`w-4 h-4 transition-transform duration-300 ${showArchive ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                )}
              </button>
              <Collapse open={showArchive || completedOnly}>
                <div className="flex flex-col gap-2 pb-1">
                  {visibleCompleted.map(b => (
                    <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)} onClick={() => onSelect(b)} darkMode={dm} dimmed />
                  ))}
                </div>
              </Collapse>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}