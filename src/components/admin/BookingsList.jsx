import { Fragment, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import BookingRow from './BookingRow';
import { Archive } from './Glyphs';
import NewBookingsRail from './NewBookingsRail';
import ConfirmDialog from './ConfirmDialog';
import { groupByTime, timeToMinutes, scheduledDate } from './timeline';
import { todayItems, localDateKey } from './todayItems';
import { openZoomRoom, zoomRoomUrl, parseMeetingId, meetingIdFromUrl } from '@/lib/zoomHost';
import { classesOfReg } from '@/lib/classCatalog';
import { formatPhone, phoneHref } from '@/lib/phone';
import { CONSULT_INK, blockHatch } from './statusColors';
import { useTimeBlocks } from './useTimeBlocks';
import { blockLabel } from '@/lib/timeBlocks';
import { isDepositUnseen, timeAgo as depositTimeAgo, daysSince } from './depositState';
import { Button, Chevron, Fold, RowPanel, SearchLine, Segmented, cx } from './ui';

// Thumbnail of the client's uploaded Zelle screenshot, so a deposit can be
// checked and cleared from the list without opening the card. Signed URLs are
// short-lived, so it's fetched per mount rather than cached.
//
// A client can send several (one per payment when a deposit is split). The
// thumbnail shows the first with a count on it, and opens all of them.
function ZelleThumb({ bookingId, onOpen }) {
  const [urls, setUrls] = useState([]);
  const url = urls[0] || null;

  useEffect(() => {
    let live = true;
    fetch('/api/screenshot-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, table: 'bookings' }),
    })
      .then(r => r.json())
      .then(d => { if (live) setUrls(d?.urls?.length ? d.urls : (d?.url ? [d.url] : [])); })
      .catch(() => {});
    return () => { live = false; };
  }, [bookingId]);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (url) { onOpen?.(urls); } }}
      aria-label={url ? `Open ${urls.length > 1 ? `all ${urls.length} Zelle screenshots` : 'the Zelle screenshot'} full size` : 'Zelle screenshot loading'}
      className="press relative flex h-[50px] w-[38px] shrink-0 items-center justify-center overflow-hidden border border-line bg-canvas"
    >
      {url ? (
        <>
          <img src={url} alt="Zelle screenshot" className="h-full w-full object-cover" />
          {urls.length > 1 && (
            <span className="absolute bottom-0.5 right-0.5 h-[15px] min-w-[15px] bg-black/70 px-1 text-center text-[0.55rem] font-bold leading-[15px] tabular-nums text-white">
              {urls.length}
            </span>
          )}
        </>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-ink-muted/60" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
        </svg>
      )}
    </button>
  );
}

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

// Month filter for the appointments list: a small calendar-icon trigger. The
// native wheel on iOS (an invisible <select> over the trigger), a dropdown
// everywhere else.
function MonthSelect({ value, onChange, options }) {
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

  const trigger = (
    <button
      type="button"
      onClick={() => { if (!isIOS) setOpen(o => !o); }}
      className={cx('press inline-flex h-9 items-center gap-1.5 rounded px-2 text-[0.78rem] font-medium transition-colors', hasFilter ? 'text-rose' : 'text-ink-muted hover:text-ink')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] shrink-0" aria-hidden>
        <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
      <span className="whitespace-nowrap">{hasFilter ? selected.label : 'Filter by month'}</span>
      <Chevron open={open} className="h-3 w-3 opacity-70" />
    </button>
  );

  if (isIOS) {
    return (
      <div className="relative inline-flex">
        {trigger}
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by month"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" style={{ fontSize: '16px' }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger}
      {open && (
        <div className="pop-in absolute right-0 top-full z-50 mt-1 max-h-[280px] min-w-[200px] overflow-y-auto border border-line bg-paper p-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]" data-lenis-prevent>
          {options.map(o => {
            const isSel = o.value === value;
            return (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cx('flex h-9 w-full items-center justify-between gap-2 px-3 text-left text-[0.8rem] transition-colors', isSel ? 'bg-canvas font-medium text-ink' : 'text-ink-soft hover:bg-canvas/60')}>
                <span className="truncate">{o.label}</span>
                {isSel && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 shrink-0 text-rose" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TYPE_OPTIONS = [
  { value: 'both', label: 'Both' },
  { value: 'bridal', label: 'Bridal' },
  { value: 'nonbridal', label: 'Non-Bridal' },
];

// The small header over a panel of rows (consultations, lessons on a day).
function PanelHead({ dot, label, count }) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 sm:px-5">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <span className="text-[0.7rem] tabular-nums text-ink-muted">{count}</span>
    </div>
  );
}

const ZoomIcon = ({ className = 'h-3.5 w-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cx('shrink-0', className)} aria-hidden>
    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
  </svg>
);

const joinClass = 'press inline-flex h-8 shrink-0 items-center gap-1.5 rounded bg-rose px-3 text-[0.72rem] font-semibold text-paper hover:bg-rose/90';
const listRowClass = 'group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:px-5';

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
  onBulkUpdate, onBulkDelete, onViewAllCalendar, onSelectTimeBlock,
}) {
  const [showArchive, setShowArchive] = useState(false);
  // iOS-style multi-select for the appointments list. `selectMode` flips rows
  // into pickable checkboxes; `selectedIds` holds the chosen booking ids.
  // Phone-only chrome. The search field and the filter row are both permanently
  // on show on a laptop, where there's room; on a phone they're one tap each,
  // because together they were taking the top third of the screen before a
  // single appointment appeared.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
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

  // Days off, so a closed day can say so. Tapping the 22nd on the calendar and
  // reading "No appointments found" answered the wrong question: the day isn't
  // empty, it's shut, and the reason she shut it is the thing worth showing.
  // Same query key as the calendars, so it's already in cache.
  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
    staleTime: 30000,
  });
  const dayOff = selectedDate ? blockedDates.find(b => b.date === selectedDate) : null;
  // Her own blocked time on the picked day ("Concert 2 to 7:30"), earliest first,
  // whole-day notes on top.
  const timeBlocks = useTimeBlocks();
  const blocksOnDay = selectedDate
    ? timeBlocks.filter(t => t.date === selectedDate).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
    : [];
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

  // Separate the working list from the archive.
  //
  // Cancelled joins completed in the archive rather than sitting in the
  // timeline. A cancelled appointment is not on her day: it has no time to
  // keep, nobody to get ready for and nothing left to decide, so leaving it in
  // the run of days meant reading past appointments that were not happening to
  // find the ones that were. It is filed, not deleted, and the Cancelled chip
  // in the filter list still pulls every one of them straight back up.
  const isArchived = (b) => b.status === 'completed' || b.status === 'cancelled';
  const activeBookings = sorted.filter(b => !isArchived(b));
  const archivedBookings = sorted.filter(isArchived);

  const bridalBookings = activeBookings.filter(isBridalBooking);
  const nonBridalBookings = activeBookings.filter(b => !isBridalBooking(b));

  // Type filter (Bridal / Non-Bridal / Both)
  const showBridal = typeFilter !== 'nonbridal';
  const showNonBridal = typeFilter !== 'bridal';
  const visibleActiveCount = (showBridal ? bridalBookings.length : 0) + (showNonBridal ? nonBridalBookings.length : 0);
  const visibleArchived = archivedBookings.filter(b => (isBridalBooking(b) ? showBridal : showNonBridal));
  const archivedCancelled = visibleArchived.filter(b => b.status === 'cancelled').length;
  const archivedCompleted = visibleArchived.length - archivedCancelled;

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

  // Today is the only group that isn't just appointments: the consultations and
  // the class lessons join it, in time order, because they're the same day's
  // work. The Today card under the calendar used to hold these; it was the only
  // place with the Zoom link, which meant the day lived in two columns at once.
  const todayKey = localDateKey();
  const todayExtras = todayItems(allBookings, classRegs, todayKey);
  const { data: blockedToday } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
    select: (rows) => (rows || []).find(b => b.date === todayKey) || null,
  });

  // One row list per group. Today is the special one: its appointments, its
  // consultations and its classes interleaved by time.
  //
  // The extras only ride along on an unfiltered list. Searching "Diana" or
  // filtering to Confirmed is a question about appointments, and answering it
  // with today's Zoom class attached would be answering a question nobody
  // asked. Same reason the always-on empty Today only appears unfiltered.
  const plainList = !search.trim() && statusFilter === 'all' && typeFilter === 'both' && !effectiveMonth;
  const withToday = (() => {
    const rest = timeGroups
      .filter(g => g.key !== 'today')
      .map(g => ({ ...g, rows: g.items.map(b => ({ b })) }));
    const appts = (timeGroups.find(g => g.key === 'today')?.items || [])
      .map(b => ({ b, sort: timeToMinutes(b.time) }));
    const extras = plainList ? todayExtras.map(a => ({ agenda: a, sort: a.sort })) : [];
    const rows = [...appts, ...extras].sort((x, y) => x.sort - y.sort);
    const today = (rows.length || plainList)
      ? [{ key: 'today', label: 'Today', accent: '#A0607A', day: true, order: 0, rows }]
      : [];
    return [...today, ...rest].sort((a, b) => a.order - b.order);
  })();

  const today = new Date().toISOString().split('T')[0];

  // When the Completed or Cancelled chip is active, the whole point of the view
  // is the archive, so we skip the empty "No active appointments" state and
  // just show the archived list, expanded.
  const archiveOnly = statusFilter === 'completed' || statusFilter === 'cancelled';

  // Whenever there are no active appointments to show, the archive IS the
  // content, so it renders flat and expanded (no collapsible chrome, no
  // dashed divider) right where the empty-state placeholder used to sit.
  const flatArchive = archiveOnly || visibleActiveCount === 0;

  const consultationBookings = (allBookings || [])
    .filter(b => b.consultation_date && b.consultation_date >= today && (!search || [b.name, b.email, b.service].some(f => f?.toLowerCase().includes(search.toLowerCase()))))
    .sort((a, b) => (a.consultation_date || '').localeCompare(b.consultation_date || ''));

  const filteredClassRegs = classRegs
    .filter(r => (!r.appointment_date || r.appointment_date >= today) && (!search || [r.full_name, r.email, r.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))))
    .sort((a, b) => (a.appointment_date || '').localeCompare(b.appointment_date || ''));

  // ── Multi-select plumbing (appointments list) ────────────────────────────
  // Every booking the list is currently showing, for select-all + counts.
  const selectableIds = [...visibleActive, ...visibleArchived].map(b => b.id);
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

  // Confirming an appointment with no working window on it is the one thing
  // this bar must not let through. The client card already refuses it; doing it
  // four at a time here would have been the way straight around that.
  const selectedRows = [...visibleActive, ...visibleArchived].filter(b => selectedIds.has(b.id));
  const timelessSelected = selectedRows.filter(b => !b.time);

  // Leave select mode whenever the list context changes out from under it.
  useEffect(() => { if (viewType !== 'appointments') exitSelect(); /* eslint-disable-next-line */ }, [viewType]);


  const monthLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // The colour a group's heading wears: rose for today and tomorrow, the alert
  // red for anything past due, quieter ink for the named days further out.
  const groupTone = (g) => (g.key === 'pastdue'
    ? 'text-[0.98rem] font-semibold text-tone-alert'
    : g.accent ? 'text-[0.98rem] font-semibold text-rose'
    : g.day ? 'text-[0.86rem] font-semibold text-ink-soft'
    : 'text-[0.98rem] font-semibold text-ink');

  return (
    <div>
      {/* Title and actions. The buttons wrap under the title rather than
          colliding with it when the column is narrow. */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-line pb-4">
        <div className="min-w-0">
          <h2 className="text-[1.45rem] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[1.6rem]">Appointments</h2>
          <p className="mt-1.5 text-[0.8rem] text-ink-muted">{monthLabel}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {/* Phone: a search toggle stands in for the full-width field below. */}
          {!selectMode && (
            <button
              type="button"
              onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 20); else setSearch(''); }}
              aria-label="Search appointments"
              aria-expanded={searchOpen}
              className={cx('press flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line-strong text-ink-soft sm:hidden', (searchOpen || search) ? 'bg-canvas' : 'bg-paper')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" />
              </svg>
            </button>
          )}
          {/* View all: laptop only. It jumps to the Calendar tab, which on a
              phone is already one tap away in the menu. */}
          {!selectMode && (
            <Button size="sm" onClick={() => onViewAllCalendar?.()} className="hidden sm:inline-flex" title="View all appointments">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />
              </svg>
              View all
            </Button>
          )}
          {viewType === 'appointments' && (activeBookings.length > 0 || archivedBookings.length > 0) && (
            <Button
              size="sm"
              variant={selectMode ? 'solid' : 'quiet'}
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              className="h-10 flex-1 sm:h-9 sm:flex-none"
            >
              {selectMode ? 'Done' : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                    <path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Select
                </>
              )}
            </Button>
          )}
          {onAddClient && !selectMode && (
            // Laptops have Add client up beside the greeting; phones keep it here
            // with a label as well as the + in the top bar.
            <Button size="sm" variant="solid" onClick={onAddClient} className="h-10 flex-1 sm:hidden">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add client
            </Button>
          )}
        </div>
      </div>

      {/* Deposit received: a client sent proof and she hasn't looked yet.
          Opening the client card is what clears one, so this empties itself as
          she works and never needs a button of its own. */}
      {pendingZelleReviews.length > 0 && (() => {
        const lead = pendingZelleReviews[0];
        return (
          <div className="mb-4 border border-line bg-paper">
            <button
              type="button"
              onClick={() => toggleRail('deposit')}
              aria-expanded={showZellePanel}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-canvas/50 sm:px-5"
            >
              <span className="flex h-7 min-w-[28px] shrink-0 items-center justify-center bg-tone-confirmed/10 px-1.5 text-[0.8rem] font-semibold tabular-nums text-tone-confirmed">
                {pendingZelleReviews.length}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.88rem] font-medium text-ink">
                  {pendingZelleReviews.length === 1 ? 'Deposit received' : 'Deposits received'}
                </span>
                <span className="mt-0.5 block truncate text-[0.76rem] text-ink-muted">
                  {lead.name || 'Someone'}
                  {lead.service ? ` · ${lead.service}` : ''}
                  {lead.zelle_uploaded_at ? ` · sent ${depositTimeAgo(lead.zelle_uploaded_at)}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[0.78rem] font-medium text-tone-confirmed">
                {showZellePanel ? 'Hide' : 'View'}
                <Chevron open={showZellePanel} className="h-3.5 w-3.5" />
              </span>
            </button>
            <Fold open={showZellePanel} lazy>
              <div className="max-h-[min(60vh,420px)] divide-y divide-line overflow-y-auto overscroll-contain border-t border-line" data-lenis-prevent>
                {pendingZelleReviews.map((b) => (
                  <button key={b.id} type="button" onClick={() => onSelect(b)} className={listRowClass}>
                    <ZelleThumb bookingId={b.id} onOpen={setLightbox} />
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                      <span className="max-w-full truncate text-[0.88rem] font-medium text-ink">{b.name}</span>
                      <span className="max-w-full truncate text-[0.74rem] text-ink-muted">
                        {b.service}
                        {b.date && ` · ${new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </span>
                      {b.zelle_uploaded_at && (
                        <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-tone-confirmed">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                          Sent {depositTimeAgo(b.zelle_uploaded_at)}
                          {(() => {
                            const gap = daysSince(b.created_date) - daysSince(b.zelle_uploaded_at);
                            return gap >= 1 ? `, ${gap === 1 ? '1 day' : `${gap} days`} after booking` : '';
                          })()}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[0.76rem] font-medium text-tone-confirmed">Open</span>
                  </button>
                ))}
              </div>
            </Fold>
          </div>
        );
      })()}

      {/* Every screenshot on the deposit, side by side, scrolling sideways when
          they don't fit. */}
      {lightbox?.length > 0 && (
        <div
          className="fixed inset-0 z-[500] flex items-center overflow-x-auto bg-black/85 p-6"
          style={{ animation: 'sheet-scrim-in 200ms ease-out both' }}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label={lightbox.length > 1 ? 'Zelle screenshots' : 'Zelle screenshot'}
          data-lenis-prevent
        >
          <div className="mx-auto flex h-full items-center gap-4">
            {lightbox.map((src, i) => (
              <img key={src} src={src} alt={`Zelle screenshot ${i + 1}`}
                className="h-full w-auto max-w-[85vw] shrink-0 object-contain"
                onClick={e => e.stopPropagation()} />
            ))}
          </div>
          <button type="button" onClick={() => setLightbox(null)} aria-label="Close"
            className="press absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] flex h-11 w-11 items-center justify-center text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Recent bookings: laptop only. On a phone the same rail renders at the
          very top of the page instead, above the calendar. */}
      <NewBookingsRail bookings={allBookings} loading={loading} onSelect={onSelect} className="mb-5 hidden sm:block" />

      {/* Search: a line, not a box. Always on a laptop; one tap away on a phone. */}
      <div className={cx('mb-4', searchOpen || search ? '' : 'hidden sm:block')}>
        <SearchLine value={search} onChange={setSearch} inputRef={searchInputRef} />
      </div>

      {/* What you're looking at, and one tap to change it: one list naming
          every option, instead of a row of chips you read left to right. */}
      {(() => {
        const DOT = {
          all: null,
          pending: 'rgb(var(--c-pending))',
          confirmed: 'rgb(var(--c-confirmed))',
          completed: 'rgb(var(--c-done))',
          cancelled: 'rgb(var(--c-alert))',
        };
        const inAppointments = viewType === 'appointments';
        const options = [
          ...STATUSES.map(st => ({
            key: st,
            label: st.charAt(0).toUpperCase() + st.slice(1),
            count: statusCounts[st] || 0,
            dot: DOT[st],
            active: inAppointments && statusFilter === st,
            pick: () => { setStatusFilter(st); setViewType?.('appointments'); },
          })),
          {
            key: 'courses', label: 'Makeup Courses', dot: 'rgb(var(--c-rose))',
            count: classRegs.filter(r => !r.appointment_date || r.appointment_date >= today).length,
            active: viewType === 'courses', pick: () => setViewType?.('courses'),
          },
          {
            key: 'consultations', label: 'Consultations', dot: 'rgb(var(--c-consult))',
            count: (allBookings || []).filter(b => b.consultation_date && b.consultation_date >= today).length,
            active: viewType === 'consultations', pick: () => setViewType?.('consultations'),
          },
        ];
        const current = options.find(o => o.active) || options[0];

        return (
          <div className="relative mb-4">
            <button
              type="button"
              onClick={() => setFilterOpen(v => !v)}
              aria-expanded={filterOpen}
              className={cx('press inline-flex h-9 items-center gap-2 rounded border px-3 text-[0.8rem] font-medium transition-colors', filterOpen ? 'border-ink/40 bg-paper text-ink' : 'border-line-strong bg-paper text-ink hover:border-ink/40')}
            >
              {current.dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: current.dot }} />}
              <span>{current.label}</span>
              <span className="tabular-nums text-ink-muted">{current.count}</span>
              <Chevron open={filterOpen} className="h-3.5 w-3.5 text-ink-muted" />
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                <div className="pop-in absolute left-0 top-full z-50 mt-1 w-[min(280px,88vw)] border border-line bg-paper p-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]" style={{ '--origin': 'top left' }}>
                  {options.map(o => (
                    <Fragment key={o.key}>
                      {o.key === 'courses' && <div className="mx-2 my-1 h-px bg-line" />}
                      <button
                        type="button"
                        onClick={() => { o.pick(); setFilterOpen(false); }}
                        className={cx('flex h-10 w-full items-center gap-2.5 px-3 text-left text-[0.84rem] transition-colors', o.active ? 'bg-canvas font-semibold text-ink' : 'text-ink-soft hover:bg-canvas/60')}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: o.dot || 'transparent' }} />
                        <span className="min-w-0 flex-1 truncate">{o.label}</span>
                        <span className="tabular-nums text-ink-muted">{o.count}</span>
                      </button>
                    </Fragment>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* The day picked on the calendar, and the way back to everything. */}
      {selectedDate && (
        <div className="mb-4 flex items-center justify-between gap-3 border border-line bg-paper py-2.5 pl-4 pr-2.5">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">Showing</p>
            <p className="truncate text-[0.92rem] font-semibold text-ink">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button size="sm" onClick={() => setSelectedDate(null)} aria-label="Show all appointments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
            Show all
          </Button>
        </div>
      )}

      {/* A closed day: the reason, in place of a list that would otherwise read
          as "nothing here". */}
      {dayOff && (() => {
        const reason = (dayOff.reason || '').trim();
        const onDay = (bookings || []).filter(b => b.date === selectedDate && b.status !== 'cancelled').length;
        return (
          <div className="mb-6 flex flex-col items-center border border-tone-alert/25 bg-tone-alert/[0.04] px-5 py-7 text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-tone-alert/10 text-tone-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-5 w-5" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </span>
            <p className="text-[1.05rem] font-semibold text-tone-alert">Day off</p>
            <p className="mt-1 text-[0.86rem] font-medium text-ink">{reason || 'Closed to bookings'}</p>
            <p className="mt-2 max-w-[300px] text-[0.78rem] leading-relaxed text-ink-muted">
              Clients can't book {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
              {onDay > 0 ? ` The ${onDay === 1 ? 'appointment' : onDay + ' appointments'} already on it still stand.` : ''}
            </p>
            {onViewAllCalendar && (
              <Button size="sm" className="mt-4" onClick={() => onViewAllCalendar(selectedDate)}>Reopen in Calendar</Button>
            )}
          </div>
        );
      })()}

      {/* Her own blocked time on the day. Hatched and grey, the same way the
          day schedule draws it, so it reads as "taken, not a client". */}
      {blocksOnDay.length > 0 && (
        <RowPanel className="mb-5">
          {blocksOnDay.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTimeBlock?.(t)}
              className={listRowClass}
              style={{ backgroundImage: blockHatch(dm) }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden>
                  <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.86rem] font-semibold text-ink">{blockLabel(t)}</span>
                <span className="mt-0.5 block text-[0.74rem] text-ink-muted">Blocked · {t.time || 'All day'}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden>
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          ))}
        </RowPanel>
      )}

      {/* Consultations on the selected date. */}
      {selectedDate && consultationsOnDate.length > 0 && (() => {
        // Don't repeat bookings already listed as regular appointments.
        const uniqueConsults = consultationsOnDate
          .filter(b => !bookings.some(fb => fb.id === b.id))
          .sort((a, b) => timeToMinutes(a.consultation_time) - timeToMinutes(b.consultation_time));
        if (uniqueConsults.length === 0) return null;
        return (
          <div className="mb-6 border border-line bg-paper">
            <PanelHead dot="rgb(var(--c-consult))" label="Consultations" count={uniqueConsults.length} />
            <div className="divide-y divide-line">
              {uniqueConsults.map(b => {
                const join = b.consultation_notes?.match(/^Link: (https?:\/\/\S+)/m)?.[1];
                const meetingId = parseMeetingId(b.consultation_notes) || meetingIdFromUrl(join);
                const roomUrl = zoomRoomUrl(join, meetingId);
                return (
                  <div key={b.id} role="button" tabIndex={0} onClick={() => onSelect(b)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(b); } }}
                    className={cx(listRowClass, 'cursor-pointer outline-none')}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-tone-consult/10 text-tone-consult"><ZoomIcon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88rem] font-semibold text-ink">{b.name || 'Client'}</span>
                      <span className="mt-0.5 block truncate text-[0.74rem] text-ink-muted">{b.consultation_type || 'Zoom'} · {b.consultation_time || ''} · {b.service}</span>
                    </span>
                    {roomUrl && (
                      <a href={roomUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={joinClass}>
                        <ZoomIcon /> Join
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Makeup lessons on the selected date. */}
      {selectedDate && lessonsOnDate.length > 0 && (
        <div className="mb-6 border border-line bg-paper">
          <PanelHead dot="rgb(var(--c-rose))" label="Makeup lessons" count={lessonsOnDate.length} />
          <div className="divide-y divide-line">
            {[...lessonsOnDate].sort((a, b) => timeToMinutes(a.appointment_time) - timeToMinutes(b.appointment_time)).map((r) => {
              const classLabel = classesOfReg(r)[0]?.title || 'Makeup Lesson';
              const zoomMatch = r.lesson_notes?.match(/^Link: (https?:\/\/\S+)/m);
              const meetingId = parseMeetingId(r.lesson_notes) || meetingIdFromUrl(zoomMatch?.[1]);
              const isZoom = r.consultation_type === 'Zoom';
              const isPhone = r.consultation_type === 'Phone';
              return (
                // A div, not a button: Join and the phone link are interactive
                // children, and a button inside a button is invalid.
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectClassReg?.(r)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectClassReg?.(r); } }}
                  title={`Open ${r.full_name || 'this client'}'s card`}
                  className={cx(listRowClass, 'cursor-pointer outline-none')}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-rose/10 text-rose">
                    {isZoom ? <ZoomIcon className="h-4 w-4" /> : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 11.7 19.79 19.79 0 0 1 1 3.07 2 2 0 0 1 2.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.88rem] font-semibold text-ink">{r.full_name || 'Client'}</span>
                    <span className="mt-0.5 block truncate text-[0.74rem] text-ink-muted">
                      {isPhone ? 'Phone / FaceTime' : r.consultation_type === 'In-Person' ? 'In Person · Studio' : (r.consultation_type || 'Zoom')} · {r.appointment_time || ''} · {classLabel}
                    </span>
                  </span>
                  {isZoom && (meetingId || zoomMatch) ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); openZoomRoom(zoomMatch?.[1], meetingId); }} className={joinClass}>
                      <ZoomIcon /> Join
                    </button>
                  ) : isPhone && r.phone ? (
                    <a href={`tel:${phoneHref(r.phone)}`} onClick={(e) => e.stopPropagation()}
                      className="press inline-flex h-8 shrink-0 items-center rounded border border-rose/30 px-3 text-[0.72rem] font-semibold tabular-nums text-rose">
                      {formatPhone(r.phone)}
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Makeup Courses view */}
      {viewType === 'courses' && (
        filteredClassRegs.length === 0 ? (
          <p className="py-20 text-center text-[0.86rem] text-ink-muted">No makeup courses found</p>
        ) : (
          <RowPanel>
            {filteredClassRegs.map((r) => {
              const classLabel = classesOfReg(r)[0]?.title || 'Makeup Course';
              const isRefunded = r.payment_status === 'refunded';
              const isUnpaid = (!r.payment_status || r.payment_status === 'unpaid' || r.payment_status === 'pending') && !r.stripe_session_id;
              const status = r.status === 'enrolled' ? 'enrolled' : r.status === 'confirmed' ? 'confirmed' : 'pending';
              return (
                <button key={r.id} type="button" onClick={() => onSelectClassReg?.(r)} className={listRowClass}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-rose/10 text-rose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden>
                      <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.88rem] font-semibold text-ink">{r.full_name || 'Client'}</span>
                    <span className="mt-0.5 block truncate text-[0.74rem] text-ink-muted">
                      {classLabel}
                      {r.appointment_date && ` · ${new Date(r.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      {r.appointment_time && ` · ${r.appointment_time}`}
                      {r.consultation_type && ` · ${r.consultation_type}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isUnpaid && <span className="inline-flex h-[22px] items-center bg-rose/10 px-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-rose">Unpaid</span>}
                    {isRefunded && <span className="inline-flex h-[22px] items-center bg-tone-alert/10 px-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-tone-alert">Refunded</span>}
                    <span className={cx('inline-flex h-[22px] items-center px-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em]', status === 'pending' ? 'bg-tone-pending/10 text-tone-pending' : 'bg-tone-confirmed/10 text-tone-confirmed')}>
                      {status}
                    </span>
                  </span>
                </button>
              );
            })}
          </RowPanel>
        )
      )}

      {/* Consultations view */}
      {viewType === 'consultations' && (
        consultationBookings.length === 0 ? (
          <p className="py-20 text-center text-[0.86rem] text-ink-muted">No consultations found</p>
        ) : (
          <RowPanel>
            {consultationBookings.map(b => {
              const join = b.consultation_notes?.match(/^Link: (https?:\/\/\S+)/m)?.[1];
              const meetingId = parseMeetingId(b.consultation_notes) || meetingIdFromUrl(join);
              const roomUrl = zoomRoomUrl(join, meetingId);
              return (
                <div key={b.id} role="button" tabIndex={0} onClick={() => onSelect(b)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(b); } }}
                  className={cx(listRowClass, 'cursor-pointer outline-none')}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-tone-consult/10 text-tone-consult"><ZoomIcon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.88rem] font-semibold text-ink">{b.name || 'Client'}</span>
                    <span className="mt-0.5 block truncate text-[0.74rem] text-ink-muted">
                      {b.service}
                      {b.consultation_date && ` · ${new Date(b.consultation_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      {b.consultation_time && ` · ${b.consultation_time}`}
                      {b.consultation_type && ` · ${b.consultation_type}`}
                    </span>
                  </span>
                  {roomUrl && (
                    <a href={roomUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={joinClass}>
                      <ZoomIcon /> Join
                    </a>
                  )}
                </div>
              );
            })}
          </RowPanel>
        )
      )}

      {/* Type + month filters for the appointments list. */}
      {viewType === 'appointments' && !selectedDate && !loading && (activeBookings.length > 0 || archivedBookings.length > 0) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Segmented options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
          {monthOptions.length > 1 && (
            <MonthSelect value={effectiveMonth} onChange={setMonthFilter} options={monthOptions} />
          )}
        </div>
      )}

      {/* Appointments content */}
      {viewType === 'appointments' && (loading ? (
        <RowPanel aria-hidden="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
              <span className="h-9 w-9 shrink-0 rounded-full bg-line/50" />
              <span className="min-w-0 flex-1">
                <span className="block h-3.5 w-32 bg-line/70" />
                <span className="mt-2.5 block h-2.5 w-44 max-w-full bg-line/50" />
              </span>
            </div>
          ))}
        </RowPanel>
      ) : visibleActiveCount === 0 && visibleArchived.length === 0 ? (
        dayOff ? null : (
          <p className="py-20 text-center text-[0.86rem] text-ink-muted">
            No {typeFilter === 'bridal' ? 'bridal ' : typeFilter === 'nonbridal' ? 'non-bridal ' : ''}appointments found
          </p>
        )
      ) : (
        <div className="flex flex-col gap-7">
          {visibleActiveCount === 0 ? (
            // No active appointments: the archive below renders flat in its place.
            null
          ) : selectedDate ? (
            // A single day is picked: its appointments flat, nothing folded.
            <RowPanel>
              {visibleActive.map(b => (
                <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)} hideDate
                  onClick={() => (selectMode ? toggleSelect(b.id) : onSelect(b))}
                  selectable={selectMode} selected={selectedIds.has(b.id)} />
              ))}
            </RowPanel>
          ) : (
            <div className="flex flex-col gap-5">
              {withToday.map(group => {
                const open = !collapsedGroups[group.key];
                return (
                  <div key={group.key}>
                    <button
                      type="button"
                      onClick={() => setCollapsedGroups(p => ({ ...p, [group.key]: !p[group.key] }))}
                      aria-expanded={open}
                      className="mb-2.5 flex w-full items-center gap-2.5 text-left"
                    >
                      {group.accent && <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', group.key === 'pastdue' ? 'bg-tone-alert' : 'bg-rose')} />}
                      <h3 className={groupTone(group)}>{group.label}</h3>
                      <span className="text-[0.74rem] tabular-nums text-ink-muted">{group.rows.length}</span>
                      {group.key === 'today' && blockedToday && (
                        <span className="inline-flex h-[18px] shrink-0 items-center bg-tone-alert/10 px-1.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-tone-alert"
                          title={blockedToday.reason || 'Closed to new bookings'}>
                          Day off
                        </span>
                      )}
                      <span className="flex-1" />
                      <Chevron open={open} className="text-ink-muted" />
                    </button>
                    <Fold open={open}>
                      {group.rows.length === 0 ? (
                        <p className="border border-line bg-paper px-4 py-3.5 text-[0.82rem] text-ink-muted sm:px-5">
                          {blockedToday
                            ? `You're off today${blockedToday.reason ? ` · ${blockedToday.reason}` : ''}. Clients can't book this day.`
                            : "Nothing scheduled today. You're all clear."}
                        </p>
                      ) : (
                        <RowPanel>
                          {group.rows.map(row => (row.agenda ? (
                            <BookingRow
                              key={row.agenda.id}
                              booking={row.agenda.booking}
                              agendaKind={row.agenda.kind}
                              agendaTime={row.agenda.time}
                              agendaLabel={row.agenda.label}
                              join={row.agenda.join}
                              hideDate
                              onClick={() => (row.agenda.kind === 'class'
                                ? onSelectClassReg?.(row.agenda.raw)
                                : onSelect(row.agenda.raw))}
                            />
                          ) : (
                            <BookingRow key={row.b.id} booking={row.b} bridal={isBridalBooking(row.b)} hideDate={!!group.day}
                              onClick={() => (selectMode ? toggleSelect(row.b.id) : onSelect(row.b))}
                              selectable={selectMode} selected={selectedIds.has(row.b.id)} />
                          )))}
                        </RowPanel>
                      )}
                    </Fold>
                  </div>
                );
              })}
            </div>
          )}

          {/* Archive: everything that's over, done or called off. Named by what
              is inside, so the fold never hides that something was cancelled. */}
          {visibleArchived.length > 0 && (
            <div className={flatArchive ? '' : 'border-t border-line pt-6'}>
              <button
                type="button"
                onClick={() => { if (!flatArchive) setShowArchive(v => !v); }}
                aria-expanded={showArchive || flatArchive}
                className={cx('mb-2.5 flex w-full items-center gap-2.5 text-left', flatArchive && 'cursor-default')}
              >
                <Archive className="h-4 w-4 text-ink-muted" />
                <h3 className="text-[0.98rem] font-semibold text-ink-soft">Archive</h3>
                <span className="text-[0.74rem] text-ink-muted">
                  {[
                    archivedCompleted > 0 ? `${archivedCompleted} completed` : null,
                    archivedCancelled > 0 ? `${archivedCancelled} cancelled` : null,
                  ].filter(Boolean).join(' · ')}
                </span>
                <span className="flex-1" />
                {!flatArchive && <Chevron open={showArchive} className="text-ink-muted" />}
              </button>
              <Fold open={showArchive || flatArchive} lazy>
                <RowPanel>
                  {visibleArchived.map(b => (
                    <BookingRow key={b.id} booking={b} bridal={isBridalBooking(b)}
                      onClick={() => (selectMode ? toggleSelect(b.id) : onSelect(b))}
                      selectable={selectMode} selected={selectedIds.has(b.id)} dimmed />
                  ))}
                </RowPanel>
              </Fold>
            </div>
          )}
        </div>
      ))}

      {/* The bulk-action bar, floating at the foot of the screen while select
          mode is on. */}
      {selectMode && viewType === 'appointments' && (
        <div
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[120] w-[calc(100%-1.5rem)] max-w-[560px]"
          style={{ transform: 'translateX(-50%)', animation: 'fadeSlideUp 0.28s cubic-bezier(0.22,1,0.36,1)' }}
        >
          <div className="border border-line bg-paper shadow-[0_16px_44px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className={cx('text-[0.86rem] font-semibold', selectedCount ? 'text-ink' : 'text-ink-muted')}>
                {selectedCount > 0 ? `${selectedCount} selected` : 'Tap appointments to select'}
              </span>
              <div className="flex items-center gap-1">
                {selectableIds.length > 0 && (
                  <button type="button" onClick={toggleSelectAll} className="press h-8 px-2 text-[0.76rem] font-semibold text-tone-confirmed">
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
                <button type="button" onClick={exitSelect} aria-label="Done selecting" className="press flex h-8 w-8 items-center justify-center text-ink-muted hover:text-ink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Why Confirm is greyed out, said before she reaches for it. */}
            {timelessSelected.length > 0 && (
              <div className="flex items-start gap-2 border-b border-line bg-tone-pending/[0.06] px-4 py-2.5">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-tone-pending" />
                <span className="text-[0.74rem] leading-snug text-tone-pending">
                  {timelessSelected.length === 1
                    ? `${timelessSelected[0].name || 'One of these'} has no time set yet, so these can't be confirmed here.`
                    : `${timelessSelected.length} of these have no time set yet, so they can't be confirmed here.`}
                  {' '}Open the card and set the time first.
                </span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-1 p-1.5">
              {[
                { key: 'confirm', label: 'Confirm', cls: 'text-tone-confirmed', onClick: () => bulkSetStatus('confirmed'), blocked: timelessSelected.length > 0,
                  icon: <path d="M20 6 9 17l-5-5" /> },
                { key: 'complete', label: 'Complete', cls: 'text-tone-done', onClick: () => bulkSetStatus('completed'),
                  icon: <><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" /></> },
                { key: 'cancel', label: 'Cancel', cls: 'text-tone-pending', onClick: () => bulkSetStatus('cancelled'),
                  icon: <><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></> },
                { key: 'delete', label: 'Delete', cls: 'text-tone-alert', onClick: () => setConfirmBulkDelete(true),
                  icon: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> },
              ].map(a => {
                const disabled = selectedCount === 0 || bulkBusy || !!a.blocked;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={a.onClick}
                    disabled={disabled}
                    className={cx('press flex flex-col items-center justify-center gap-1 py-2.5 transition-colors hover:bg-canvas disabled:pointer-events-none disabled:opacity-35', a.cls)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]" aria-hidden>
                      {a.icon}
                    </svg>
                    <span className="text-[0.68rem] font-semibold">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Destructive, so it always asks first. */}
      {confirmBulkDelete && (
        <ConfirmDialog
          tone="danger"
          title={`Delete ${selectedCount} appointment${selectedCount === 1 ? '' : 's'}?`}
          body={`${selectedCount === 1 ? 'This appointment' : 'These appointments'} will be permanently removed from your dashboard. This can't be undone.`}
          cancelLabel="Keep"
          confirmLabel="Delete"
          busy={bulkBusy}
          onConfirm={bulkDelete}
          onCancel={() => { if (!bulkBusy) setConfirmBulkDelete(false); }}
        />
      )}
    </div>
  );
}
