import { Fragment, useState, useRef, useEffect, useLayoutEffect } from 'react';
import BookingRow from './BookingRow';
import { Archive } from './Glyphs';
import StatusBadge from './StatusBadge';
import NewBookingsRail from './NewBookingsRail';
import Collapse from './Collapse';
import { groupByTime, timeToMinutes, scheduledDate } from './timeline';
import { openZoomRoom, zoomRoomUrl, parseMeetingId, meetingIdFromUrl } from '@/lib/zoomHost';
import { classesOfReg } from '@/lib/classCatalog';
import { formatPhone, phoneHref } from '@/lib/phone';
import { CONSULT_INK } from './statusColors';
import { isDepositUnseen, depositTone, timeAgo as depositTimeAgo, daysSince } from './depositState';

// Thumbnail of the client's uploaded Zelle screenshot, so a deposit can be
// checked and cleared from the list without opening the card. Signed URLs are
// short-lived, so it's fetched per mount rather than cached.
function ZelleThumb({ bookingId, dm, onOpen }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let live = true;
    fetch('/api/screenshot-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, table: 'bookings' }),
    })
      .then(r => r.json())
      .then(d => { if (live && d?.url) setUrl(d.url); })
      .catch(() => {});
    return () => { live = false; };
  }, [bookingId]);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (url) { onOpen?.(url); } }}
      aria-label={url ? 'Open the Zelle screenshot full size' : 'Zelle screenshot loading'}
      className="w-[38px] h-[50px] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105"
      style={{ background: dm ? '#1e1e24' : '#F4F6FB', border: `1px solid ${dm ? '#3f3f46' : '#DDE5F4'}` }}
    >
      {url ? (
        <img src={url} alt="Zelle screenshot" className="w-full h-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#B9C4DA'} strokeWidth="1.6" className="w-4 h-4">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
      )}
    </button>
  );
}

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

const CONSULT_COLOR = CONSULT_INK.light;
const LESSON_COLOR = '#C76BA6';

// Class titles/prices come from the shared catalog so admin surfaces never
// drift from what the site sells.

export default function BookingsList({
  bookings, loading, search, setSearch, statusFilter, setStatusFilter,
  statusCounts, selectedDate, setSelectedDate, onSelect, currentMonth,
  allBookings, consultationsOnDate = [], lessonsOnDate = [], darkMode: dm, onAddClient, onBulkImport,
  classRegs = [], viewType = 'appointments', setViewType, onSelectClassReg,
  onBulkUpdate, onBulkDelete, onViewAllCalendar,
}) {
  const [showArchive, setShowArchive] = useState(false);
  // iOS-style multi-select for the appointments list. `selectMode` flips rows
  // into pickable checkboxes; `selectedIds` holds the chosen booking ids.
  // Phone-only chrome. The search field and the filter row are both permanently
  // on show on a laptop, where there's room; on a phone they're one tap each,
  // because together they were taking the top third of the screen before a
  // single appointment appeared.
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  // One rail open at a time. These used to be three independent booleans over
  // absolutely-positioned dropdowns, which meant an open panel floated on top
  // of the rails beneath it instead of pushing them down. Now they expand
  // inline and opening one closes the others, so the stack never collides.
  const [openRail, setOpenRail] = useState(null); // 'deposit'
  const toggleRail = (name) => setOpenRail(cur => (cur === name ? null : name));
  const showZellePanel = openRail === 'deposit';
  const [lightbox, setLightbox] = useState(null);
  const [monthFilter, setMonthFilter] = useState(''); // 'YYYY-MM' or '' for all
  const [typeFilter, setTypeFilter] = useState('both'); // 'both' | 'bridal' | 'nonbridal'
  // On load only "This Week" (and urgent Past Due) is open — "This Month" and
  // "Later" start folded so the list lands clean; Roko can open them herself.
  const [collapsedGroups, setCollapsedGroups] = useState({ month: true, later: true });

  // Deposits that landed and haven't been looked at. Opening the client card
  // is what clears one, so this empties itself as she works and never needs a
  // button of its own. Newest arrival first.
  const pendingZelleReviews = (allBookings || [])
    .filter(isDepositUnseen)
    .sort((a, b) => new Date(b.zelle_uploaded_at || 0) - new Date(a.zelle_uploaded_at || 0));

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
    setCollapsedGroups(effectiveMonth ? {} : { month: true, later: true });
  }, [effectiveMonth]);


  // A booking earns a spot on the appointments list only if it's an actual
  // appointment or consultation. Booksy-imported CRM contacts (no date and no
  // consultation) live in the Clients tab, not here, so they never clutter the
  // list or the Completed Archive. `ed` is shared with Admin's auto-complete
  // now, so the rule that puts a row in Past Due is the same one that takes it
  // back out — see scheduledDate().
  const ed = scheduledDate;
  const listable = (bookings || []).filter(b => b.date || b.consultation_date);

  // Apply the month filter (appointments list only), then sort chronologically
  const monthScoped = effectiveMonth
    ? listable.filter(b => ed(b).slice(0, 7) === effectiveMonth)
    : listable;
  const sorted = [...monthScoped].sort((a, b) => {
    const dateCompare = ed(a).localeCompare(ed(b));
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
      const ad = ed(a) || '9999-12-31';
      const bd = ed(b) || '9999-12-31';
      if (ad !== bd) return ad.localeCompare(bd);
      const ab = isBridalBooking(a) ? 0 : 1;
      const bb = isBridalBooking(b) ? 0 : 1;
      if (ab !== bb) return ab - bb;
      return (a.created_date || '').localeCompare(b.created_date || '');
    });

  // Bucket by how soon each appointment is, so the list reads as a timeline
  // instead of one endless run. "Later" folds away by default.
  const timeGroups = groupByTime(visibleActive, ed);

  const today = new Date().toISOString().split('T')[0];

  // When the "Completed" status chip is active, the whole point of the view is
  // the archive, so we skip the empty "No active appointments" state and just
  // show the completed list, expanded.
  const completedOnly = statusFilter === 'completed';

  // Whenever there are no active appointments to show, the completed list IS
  // the content, so it renders flat and expanded (no collapsible chrome, no
  // dashed divider) right where the empty-state placeholder used to sit.
  const flatCompleted = completedOnly || visibleActiveCount === 0;

  const consultationBookings = (allBookings || [])
    .filter(b => b.consultation_date && b.consultation_date >= today && (!search || [b.name, b.email, b.service].some(f => f?.toLowerCase().includes(search.toLowerCase()))))
    .sort((a, b) => (a.consultation_date || '').localeCompare(b.consultation_date || ''));

  const filteredClassRegs = classRegs
    .filter(r => (!r.appointment_date || r.appointment_date >= today) && (!search || [r.full_name, r.email, r.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))))
    .sort((a, b) => (a.appointment_date || '').localeCompare(b.appointment_date || ''));

  // ── Multi-select plumbing (appointments list) ────────────────────────────
  // Every booking the list is currently showing, for select-all + counts.
  const selectableIds = [...visibleActive, ...visibleCompleted].map(b => b.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()); setConfirmBulkDelete(false); };
  const toggleSelectAll = () =>
    setSelectedIds(prev => (selectableIds.every(id => prev.has(id)) ? new Set() : new Set(selectableIds)));

  const runBulk = async (fn) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try { await fn(ids); exitSelect(); }
    catch (e) { console.error('bulk action failed:', e); }
    finally { setBulkBusy(false); }
  };
  const bulkSetStatus = (status) => runBulk((ids) => onBulkUpdate?.(ids, { status }));
  const bulkDelete = () => runBulk((ids) => onBulkDelete?.(ids));

  // Leave select mode whenever the list context changes out from under it.
  useEffect(() => { if (viewType !== 'appointments') exitSelect(); /* eslint-disable-next-line */ }, [viewType]);

  return (
    <div>
      {/* Month heading + actions. On mobile the buttons drop to their own row
          below the title and stretch to fill the width so nothing clips off
          the edge of the screen; on desktop they sit inline to the right. */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-6 pb-4"
        style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}` }}>
        <div className="min-w-0">
          <h2 className="font-serif text-[1.85rem] sm:text-[2.1rem] font-light leading-none tracking-[-0.01em]"
            style={{ color: dm ? '#e4e4e7' : '#111' }}>Appointments</h2>
          <p className="text-[0.72rem] font-medium tracking-[0.04em] mt-1.5"
            style={{ color: dm ? '#8e8e99' : '#bbb' }}>
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View all — jumps to the Calendar tab, which is now the single
              full calendar (appointments, days off and capacity together).
              It used to open a separate overlay, which meant three different
              calendars showing the same data. */}
          {/* Phone: a search toggle stands in for the full-width field below. */}
          {!selectMode && (
            <button
              onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 20); else setSearch(''); }}
              aria-label="Search appointments"
              aria-expanded={searchOpen}
              className="sm:hidden flex flex-shrink-0 items-center justify-center w-10 h-10 rounded-lg transition-all active:scale-95"
              style={{ background: searchOpen || search ? (dm ? '#26262e' : '#F3F3F7') : 'transparent', color: dm ? '#a1a1aa' : '#6b6b73', border: `1px solid ${dm ? '#34343d' : '#E5E6EC'}` }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}
          {/* View all — laptop only. It jumps to the Calendar tab, which on a
              phone is already one tap away in the nav, so on a small screen it
              was a third button competing for the same row. */}
          {!selectMode && (
            <button
              onClick={() => onViewAllCalendar?.()}
              aria-label="View all appointments"
              title="View all appointments"
              className="hidden sm:flex flex-shrink-0 items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 sm:py-2 rounded-lg text-[0.72rem] font-semibold tracking-[0.04em] transition-all whitespace-nowrap active:scale-95"
              style={{ background: 'transparent', color: dm ? '#a1a1aa' : '#6b6b73', border: `1px solid ${dm ? '#34343d' : '#E5E6EC'}` }}
              onMouseEnter={e => { e.currentTarget.style.background = dm ? '#26262e' : '#F7F7FA'; e.currentTarget.style.color = dm ? '#d4d4d8' : '#4b4b53'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#6b6b73'; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-3.5 sm:h-3.5 flex-shrink-0">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />
              </svg>
              <span className="hidden sm:inline">View all</span>
            </button>
          )}
          {/* Select toggle — appointments only, when there's something to pick */}
          {viewType === 'appointments' && (activeBookings.length > 0 || completedBookings.length > 0) && (
            <button
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-lg text-[0.72rem] font-semibold tracking-[0.04em] transition-all"
              style={selectMode
                ? { background: dm ? 'rgba(37,99,235,0.16)' : 'rgba(37,99,235,0.1)', color: '#2563EB' }
                : { background: dm ? '#26262e' : '#F3F3F7', color: dm ? '#d4d4d8' : '#4b4b53' }}
            >
              {selectMode ? 'Done' : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Select
                </>
              )}
            </button>
          )}
          {onAddClient && !selectMode && (
            <button
              onClick={onAddClient}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg text-[0.72rem] font-semibold tracking-[0.04em] transition-all whitespace-nowrap"
              style={{ background: dm ? '#2e2e38' : '#111', color: dm ? '#e4e4e7' : '#fff' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 flex-shrink-0">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Client
            </button>
          )}
        </div>
      </div>

      {/* Deposit received — a client sent proof and nobody has confirmed it yet.
          This is the whole point of the deposit alerting: money that arrived
          days after booking used to flip a hidden flag and announce nothing. */}
      {pendingZelleReviews.length > 0 && (() => {
        const tone = depositTone('arrived', dm);
        const lead = pendingZelleReviews[0];
        return (
        <div className="mb-4 relative">
          <button
            onClick={() => toggleRail('deposit')}
            aria-expanded={showZellePanel}
            className="w-full flex items-center gap-2.5 px-2 py-2 -mx-2 rounded-[12px] text-left transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = dm ? 'rgba(255,255,255,0.045)' : 'rgba(30,64,175,0.045)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[0.8rem] font-semibold tabular-nums"
              style={{ background: tone.bg, color: tone.fg }}>
              {pendingZelleReviews.length}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[0.86rem] font-medium" style={{ color: dm ? '#ECEDF1' : '#1a1a1f' }}>
                {pendingZelleReviews.length === 1 ? 'Deposit received' : 'Deposits received'}
              </span>
              <span className="block text-[0.75rem] mt-0.5 truncate" style={{ color: dm ? '#8b8b95' : '#9c9ca6' }}>
                {lead.name || 'Someone'}
                {lead.service ? ` · ${lead.service}` : ''}
                {lead.zelle_uploaded_at ? ` · sent ${depositTimeAgo(lead.zelle_uploaded_at)}` : ''}
              </span>
            </span>

            <span className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[0.8rem] font-medium" style={{ color: tone.fg }}>
                {showZellePanel ? 'Hide' : 'View'}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke={tone.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-3.5 h-3.5"
                style={{ transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)', transform: showZellePanel ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </button>

          <div
            className="mt-2 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: dm ? '#27272a' : '#fff',
              border: `1px solid ${dm ? '#3f3f46' : '#d7e2f7'}`,
              maxHeight: showZellePanel ? 'min(60vh, 420px)' : '0px',
              opacity: showZellePanel ? 1 : 0,
              marginTop: showZellePanel ? undefined : 0,
              borderWidth: showZellePanel ? '1px' : '0px',
              pointerEvents: showZellePanel ? 'auto' : 'none',
              willChange: 'max-height, opacity',
              transition: 'max-height 320ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease, margin-top 320ms ease',
            }}
          >
            <div className="px-5 py-3 flex items-center gap-2 flex-shrink-0"
              style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.08)'}` }}>
              <span className="text-[0.68rem] font-semibold tracking-[0.06em] uppercase" style={{ color: tone.fg }}>
                New since you last looked
              </span>
              <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full tabular-nums"
                style={{ background: tone.bg, color: tone.fg }}>
                {pendingZelleReviews.length}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {pendingZelleReviews.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => onSelect(b)}
                  className="flex items-center gap-3 w-full text-left px-5 py-3.5 transition-colors"
                  style={{ borderBottom: i < pendingZelleReviews.length - 1 ? `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(30,64,175,0.08)'}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#F7F9FE'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ZelleThumb bookingId={b.id} dm={dm} onOpen={setLightbox} />

                  <span className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                    <span className="text-[0.875rem] font-medium truncate max-w-full" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.name}</span>
                    <span className="text-[0.72rem] truncate max-w-full" style={{ color: dm ? '#8e8e99' : '#8791a6' }}>
                      {b.service}
                      {b.date && <span style={{ color: dm ? '#7a7a84' : '#a6b2cc' }}>{' · '}{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </span>
                    {b.zelle_uploaded_at && (
                      <span className="text-[0.7rem] font-semibold flex items-center gap-1.5" style={{ color: tone.fg }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tone.key }} />
                        Sent {depositTimeAgo(b.zelle_uploaded_at)}
                        {(() => {
                          const gap = daysSince(b.created_date) - daysSince(b.zelle_uploaded_at);
                          return gap >= 1 ? `, ${gap === 1 ? '1 day' : `${gap} days`} after booking` : '';
                        })()}
                      </span>
                    )}
                  </span>

                  <span className="text-[0.75rem] font-medium flex-shrink-0" style={{ color: tone.fg }}>Open</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Screenshot lightbox — opened from a thumbnail in the confirm queue */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: 'rgba(12,12,16,0.82)' }}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Zelle screenshot"
        >
          <img
            src={lightbox}
            alt="Zelle screenshot"
            className="max-w-full max-h-full rounded-xl object-contain"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Just Booked — laptop only. On a phone this same rail renders at the
          very top of the admin page instead, above the calendar, so a new
          booking is the first thing on screen rather than three scrolls down. */}
      <NewBookingsRail bookings={allBookings} onSelect={onSelect} darkMode={dm} className="hidden sm:block mb-5" />

      {/* Search */}
      <div className={`relative mb-4 ${searchOpen || search ? '' : 'hidden sm:block'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#a3a3ad" strokeWidth="1.5" className="w-[15px] h-[15px] absolute left-3.5 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={searchInputRef}
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

      {/* Status + service-type filters.
          One description of every filter, rendered two ways: the full row of
          chips on a laptop, and a single pill that opens a list on a phone.
          Seven chips scrolling sideways under a full-width search box was most
          of what made this screen feel like a wall on mobile, and a sideways
          scroller hides half its own options besides. */}
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
        const hoverTxt = dm ? '#cfcfd6' : '#62626B';
        const hoverBg  = dm ? '#26262d' : '#F3F3F7';
        const chipCls = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.74rem] font-semibold whitespace-nowrap transition-colors flex-shrink-0';
        const inactiveStyle = { background: 'transparent', color: mutedTxt };
        const onEnter = (e, on) => { if (!on) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverTxt; } };
        const onLeave = (e, on) => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedTxt; } };

        const courseTone = dm ? { bg: 'rgba(199,107,166,0.2)', txt: '#E7A9CE' } : { bg: 'rgba(199,107,166,0.14)', txt: '#A83E86' };
        const consultTone = dm ? { bg: 'rgba(168,85,247,0.22)', txt: '#C99BF5' } : { bg: 'rgba(168,85,247,0.12)', txt: '#9333EA' };

        const options = [
          ...STATUSES.map(st => ({
            key: st,
            label: st.charAt(0).toUpperCase() + st.slice(1),
            count: statusCounts[st] || 0,
            dot: STATUS_COLORS[st].dot,
            tone: dm ? STATUS_COLORS[st].dark : STATUS_COLORS[st].light,
            active: inAppointments && statusFilter === st,
            pick: () => { setStatusFilter(st); setViewType?.('appointments'); },
          })),
          {
            key: 'courses', label: 'Makeup Courses', dot: LESSON_COLOR, tone: courseTone,
            count: classRegs.filter(r => !r.appointment_date || r.appointment_date >= today).length,
            active: viewType === 'courses', pick: () => setViewType?.('courses'),
          },
          {
            key: 'consultations', label: 'Consultations', dot: CONSULT_COLOR, tone: consultTone,
            count: (allBookings || []).filter(b => b.consultation_date && b.consultation_date >= today).length,
            active: viewType === 'consultations', pick: () => setViewType?.('consultations'),
          },
        ];
        const current = options.find(o => o.active) || options[0];

        return (
          <>
            {/* Laptop: every filter visible at once */}
            <div className="hidden sm:flex items-center gap-1 mb-5 overflow-x-auto no-scrollbar pb-0.5">
              {options.map(o => (
                <Fragment key={o.key}>
                  {o.key === 'courses' && (
                    <div className="w-px h-3.5 rounded-full flex-shrink-0 mx-1.5" style={{ background: dm ? '#3f3f46' : '#E2E4EA' }} />
                  )}
                  <button onClick={o.pick} className={chipCls}
                    style={o.active ? { background: o.tone.bg, color: o.tone.txt } : inactiveStyle}
                    onMouseEnter={e => onEnter(e, o.active)} onMouseLeave={e => onLeave(e, o.active)}>
                    {o.dot && !o.active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: o.dot }} />}
                    <span>{o.label}</span>
                    <span style={{ opacity: 0.55 }}>{o.count}</span>
                  </button>
                </Fragment>
              ))}
            </div>

            {/* Phone: what you're looking at, and one tap to change it */}
            <div className="sm:hidden relative mb-4">
              <button type="button" onClick={() => setFilterOpen(v => !v)} aria-expanded={filterOpen}
                className="inline-flex items-center gap-2 pl-3.5 pr-3 py-2 rounded-full text-[0.8rem] font-semibold"
                style={{ background: current.tone.bg, color: current.tone.txt }}>
                {current.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: current.dot }} />}
                <span>{current.label}</span>
                <span style={{ opacity: 0.6 }}>{current.count}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"
                  style={{ transition: 'transform 200ms ease', transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                  <div className="absolute z-50 left-0 top-full mt-1.5 rounded-2xl p-1.5 w-[min(280px,88vw)]"
                    style={{
                      background: dm ? '#27272a' : '#fff',
                      border: '1px solid ' + (dm ? '#3f3f46' : '#EAEBF0'),
                      boxShadow: dm ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 40px rgba(60,30,45,0.14)',
                    }}>
                    {options.map(o => (
                      <Fragment key={o.key}>
                        {o.key === 'courses' && (
                          <div className="h-px my-1.5 mx-2" style={{ background: dm ? '#3f3f46' : '#EDEDF3' }} />
                        )}
                        <button type="button" onClick={() => { o.pick(); setFilterOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[0.84rem] font-medium"
                          style={o.active ? { background: o.tone.bg, color: o.tone.txt } : { background: 'transparent', color: dm ? '#d4d4d8' : '#4b4b53' }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: o.dot || 'transparent' }} />
                          <span className="flex-1 min-w-0 truncate">{o.label}</span>
                          <span className="tabular-nums" style={{ opacity: 0.55 }}>{o.count}</span>
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
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
              <p className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: dm ? '#8e8e99' : '#b6b6bf' }}>Showing</p>
              <p className="text-[0.9rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            aria-label="Show all appointments"
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full flex-shrink-0 transition-all active:scale-95 text-[0.68rem] font-semibold tracking-[0.04em]"
            style={{ background: dm ? '#34343d' : '#E8E9EE', color: dm ? '#d4d4d8' : '#6b6b73', touchAction: 'manipulation' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-3 h-3">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Show all
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
              <span className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: CONSULT_COLOR }}>
                Zoom Consultations
              </span>
              <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(107,90,147,0.12)', color: CONSULT_COLOR }}>
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
                  <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#8e8e99' : '#999' }}>
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
            <span className="text-[0.68rem] font-medium tracking-[0.06em] uppercase" style={{ color: LESSON_COLOR }}>
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
              // Opens the class card, matching the consultation rows above. A
              // div, not a button, because Join/phone are interactive children
              // and a button inside a button is invalid.
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectClassReg?.(r)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectClassReg?.(r); } }}
                title={`Open ${r.full_name || 'this client'}'s card`}
                className="w-full flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors group outline-none"
                style={{
                  background: dm ? '#1e1e24' : '#fff',
                  borderBottom: i < lessonsOnDate.length - 1 ? `1px solid ${dm ? '#2e2e38' : '#ebebeb'}` : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = dm ? '#27272e' : '#FAFAFB'}
                onMouseLeave={e => e.currentTarget.style.background = dm ? '#1e1e24' : '#fff'}
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
                  <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#8e8e99' : '#999' }}>
                    {isPhone ? 'Phone / FaceTime' : r.consultation_type === 'In-Person' ? 'In Person · Studio' : (r.consultation_type || 'Zoom')} · {r.appointment_time || ''} · {classLabel}
                  </p>
                </div>
                {isZoom && (meetingId || zoomMatch) ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openZoomRoom(zoomMatch?.[1], meetingId); }}
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
                    href={`tel:${phoneHref(r.phone)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.62rem] font-semibold transition-all flex-shrink-0 hover:opacity-80 tabular-nums"
                    style={{ background: 'rgba(199,107,166,0.1)', color: LESSON_COLOR, border: '1px solid rgba(199,107,166,0.25)' }}
                  >
                    {formatPhone(r.phone)}
                  </a>
                ) : null}
                <svg viewBox="0 0 24 24" fill="none" stroke={LESSON_COLOR} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
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
                      <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#8e8e99' : '#999' }}>
                        {classLabel}
                        {r.appointment_date && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{new Date(r.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {r.appointment_time && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{r.appointment_time}</span>}
                        {r.consultation_type && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{r.consultation_type}</span>}
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
                      <p className="text-[0.72rem] mt-0.5 truncate" style={{ color: dm ? '#8e8e99' : '#999' }}>
                        {b.service}
                        {b.consultation_date && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{new Date(b.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {b.consultation_time && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{b.consultation_time}</span>}
                        {b.consultation_type && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{b.consultation_type}</span>}
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
          <div className="w-6 h-6 border-2 border-[#E5E7EB] border-t-[#71717a] rounded-full animate-spin" />
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
            // No active appointments → skip the empty-state placeholder entirely.
            // The completed list below renders flat right here in its place.
            null
          ) : selectedDate ? (
            // A single day is selected — show its appointments flat (no timeline
            // buckets to hide them under, no collapse).
            <div className="flex flex-col gap-2">
              {visibleActive.map(b => (
                <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)}
                  onClick={() => (selectMode ? toggleSelect(b.id) : onSelect(b))}
                  selectable={selectMode} selected={selectedIds.has(b.id)} darkMode={dm} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Today leads, then tomorrow, then each named day. It used to be
                  dropped here as redundant with the Home Today card, but once
                  the list reads day by day, starting at Tomorrow just raises the
                  question of where today went. The Today card stays the detailed
                  view (it carries classes and consultations too); this is the
                  same day's place in the run of the week. */}
              {timeGroups.map(group => {
                const open = !collapsedGroups[group.key];
                return (
                  <div key={group.key}>
                    <button
                      type="button"
                      onClick={() => setCollapsedGroups(p => ({ ...p, [group.key]: !p[group.key] }))}
                      className="flex items-center gap-2.5 mb-3 w-full"
                    >
                      {group.accent && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: group.accent }} />}
                      {/* A named day is a signpost, not a section: lighter than
                          Tomorrow or Past Due so seven of them down the page
                          still read as one list. */}
                      <h3
                        className={group.day && !group.accent ? 'text-[0.82rem] font-semibold' : 'font-serif text-[1.05rem]'}
                        style={{ color: group.accent || (group.day ? (dm ? '#9a9aa4' : '#8b8b95') : (dm ? '#e4e4e7' : '#111')) }}>
                        {group.label}
                      </h3>
                      <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: dm ? '#2e2e38' : '#F0F0F5', color: dm ? '#a1a1aa' : '#9c9ca4' }}>
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
                          <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)}
                            onClick={() => (selectMode ? toggleSelect(b.id) : onSelect(b))}
                            selectable={selectMode} selected={selectedIds.has(b.id)} darkMode={dm} />
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
            <div className={flatCompleted ? '' : 'border-t border-dashed border-[#E5E7EB] pt-6'}>
              <button
                onClick={() => { if (!flatCompleted) setShowArchive(v => !v); }}
                className="flex items-center gap-3 mb-4 group"
                style={flatCompleted ? { cursor: 'default' } : undefined}
              >
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4" style={{ color: dm ? '#7a7a84' : '#b4b4bd' }} />
                  <h3 className="font-serif text-[1.1rem] transition-colors" style={{ color: dm ? '#7a7a84' : '#999' }}>Completed Archive</h3>
                </div>
                <span className="text-[0.65rem] text-[#bbb]">({visibleCompleted.length})</span>
                {!flatCompleted && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"
                    className={`w-4 h-4 transition-transform duration-300 ${showArchive ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                )}
              </button>
              <Collapse open={showArchive || flatCompleted}>
                <div className="flex flex-col gap-2 pb-1">
                  {visibleCompleted.map(b => (
                    <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)}
                      onClick={() => (selectMode ? toggleSelect(b.id) : onSelect(b))}
                      selectable={selectMode} selected={selectedIds.has(b.id)} darkMode={dm} dimmed />
                  ))}
                </div>
              </Collapse>
            </div>
          )}
        </div>
      ))}

      {/* ══ Floating bulk-action bar (iOS-style) — appointments select mode ══ */}
      {selectMode && viewType === 'appointments' && (
        <div
          className="fixed left-1/2 bottom-4 z-[120] w-[calc(100%-1.5rem)] max-w-[560px]"
          style={{ transform: 'translateX(-50%)', animation: 'fadeSlideUp 0.24s cubic-bezier(0.22,1,0.36,1)' }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: dm ? '#26262e' : '#fff',
              border: `1px solid ${dm ? '#3a3a44' : '#EAEBF0'}`,
              boxShadow: dm ? '0 14px 44px rgba(0,0,0,0.55)' : '0 14px 44px rgba(30,30,45,0.20)',
            }}
          >
            {/* Count + select-all + done */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${dm ? '#33333d' : '#F0F0F4'}` }}>
              <span className="text-[0.85rem] font-semibold" style={{ color: selectedCount ? (dm ? '#e4e4e7' : '#111') : (dm ? '#8e8e99' : '#9c9ca4') }}>
                {selectedCount > 0 ? `${selectedCount} selected` : 'Tap appointments to select'}
              </span>
              <div className="flex items-center gap-3">
                {selectableIds.length > 0 && (
                  <button onClick={toggleSelectAll} className="text-[0.72rem] font-semibold transition-opacity hover:opacity-70" style={{ color: '#2563EB' }}>
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
                <button onClick={exitSelect} aria-label="Done selecting"
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ background: dm ? '#33333d' : '#F0F0F4' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#d4d4d8' : '#83838d'} strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-4 gap-1 p-2">
              {[
                { key: 'confirm',  label: 'Confirm',  color: '#2563EB', onClick: () => bulkSetStatus('confirmed'),
                  icon: <><path d="M20 6 9 17l-5-5" /></> },
                { key: 'complete', label: 'Complete', color: dm ? '#A7B2C4' : '#475569', onClick: () => bulkSetStatus('completed'),
                  icon: <><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" /></> },
                { key: 'cancel',   label: 'Cancel',   color: dm ? '#F5B83C' : '#B26A04', onClick: () => bulkSetStatus('cancelled'),
                  icon: <><circle cx="12" cy="12" r="9" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></> },
                { key: 'delete',   label: 'Delete',   color: '#DC2626', onClick: () => setConfirmBulkDelete(true),
                  icon: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> },
              ].map(a => {
                const disabled = selectedCount === 0 || bulkBusy;
                return (
                  <button
                    key={a.key}
                    onClick={a.onClick}
                    disabled={disabled}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all active:scale-95"
                    style={{ opacity: disabled ? 0.4 : 1, background: dm ? 'transparent' : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer' }}
                    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = dm ? '#31313b' : '#F5F5F8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
                      {a.icon}
                    </svg>
                    <span className="text-[0.66rem] font-semibold tracking-[0.01em]" style={{ color: a.color }}>{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation — destructive, so it always asks first */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', animation: 'fadeSlideDown 0.15s ease-out' }}
          onClick={() => !bulkBusy && setConfirmBulkDelete(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-[360px] rounded-2xl p-6 text-center"
            style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${dm ? '#3a3a44' : '#EAEBF0'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3.5" style={{ background: 'rgba(220,38,38,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="font-serif text-[1.25rem] font-light mb-1.5" style={{ color: dm ? '#e4e4e7' : '#111' }}>
              Delete {selectedCount} appointment{selectedCount === 1 ? '' : 's'}?
            </h3>
            <p className="text-[0.8rem] leading-relaxed mb-5" style={{ color: dm ? '#a1a1aa' : '#83838d' }}>
              {selectedCount === 1 ? 'This appointment' : 'These appointments'} will be permanently removed from your dashboard. This can't be undone.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmBulkDelete(false)} disabled={bulkBusy}
                className="flex-1 py-2.5 rounded-xl text-[0.8rem] font-semibold transition-all active:scale-95"
                style={{ background: dm ? '#33333d' : '#F0F0F4', color: dm ? '#e4e4e7' : '#3f3f46' }}>
                Keep
              </button>
              <button onClick={bulkDelete} disabled={bulkBusy}
                className="flex-1 py-2.5 rounded-xl text-[0.8rem] font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#DC2626', opacity: bulkBusy ? 0.7 : 1 }}>
                {bulkBusy && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {bulkBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}