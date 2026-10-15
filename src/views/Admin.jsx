'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '@/api/apiClient';
import { cityFromLocation } from '@/lib/location';
import { isBridalService } from '@/components/admin/statusColors';
import { isBookingUnseen } from '@/components/admin/bookingSeen';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import '../components/admin/admin.css';
import AdminCalendar from '../components/admin/AdminCalendar';
import NewBookingsRail from '../components/admin/NewBookingsRail';
import BookingsList from '../components/admin/BookingsList';
import BookingDetail, { MY_SCHEDULE_EVENT } from '../components/admin/BookingDetail';
import ReviewsList from '../components/admin/ReviewsList';
import ServicesList from '../components/admin/ServicesList';
import ContractSettings from '../components/admin/ContractSettings';
import AdminSidebar, { ADMIN_TABS, AdminDrawer, useNavOrder } from '../components/admin/AdminSidebar';
import { cx } from '../components/admin/ui';
import AvailabilityTab from '../components/admin/AvailabilityTab';
import ClassSignupsCard from '../components/admin/ClassSignupsCard';
import ClassRegistrationsList from '../components/admin/ClassRegistrationsList';
import ClassRegistrationDetail from '../components/admin/ClassRegistrationDetail';
import ReportsTab from '../components/admin/ReportsTab';
import AddClientModal from '../components/admin/AddClientModal';
import ClientsTab from '../components/admin/ClientsTab';
import ResizableColumns from '../components/admin/ResizableColumns';
import HomeTop from '../components/admin/HomeTop';
import { daysUntil, scheduledDate } from '../components/admin/timeline';
import { isAdminEmail } from '@/lib/adminAllowlist';
import { scrollToTarget } from '@/lib/lenis';
import BrandLoader from '../components/BrandLoader';

const DEFAULT_CAP = 3;

export default function Admin() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewType, setViewType] = useState('appointments');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Calendar tab's month + open day. Held here, not inside the tab, because the
  // month arrows render up in the page header next to the title.
  const [availMonth, setAvailMonth] = useState(() => new Date());
  const [availDay, setAvailDay] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin-dark') === 'true');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navTabs, setNavOrder] = useNavOrder();
  // The Add Client panel, which also blocks off time. Null when closed;
  // otherwise which side it opens on, the day it starts on, and the blocked
  // time being edited (when she tapped one on a calendar).
  const [entryPanel, setEntryPanel] = useState(null);
  const [selectedClassReg, setSelectedClassReg] = useState(null);
  const [authGranted, setAuthGranted] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Dark mode is a class on <html> that swaps the palette variables in
  // admin.css, so sheets portalled to <body> follow it too.
  useEffect(() => {
    localStorage.setItem('admin-dark', darkMode);
    document.documentElement.classList.toggle('admin-dark', darkMode);
  }, [darkMode]);

  // The body carries the dashboard's type, touch rules and canvas for as long
  // as the dashboard is open, and gives them back on the way out to the site.
  useEffect(() => {
    document.body.classList.add('admin-ui');
    return () => {
      document.body.classList.remove('admin-ui');
      document.documentElement.classList.remove('admin-dark');
    };
  }, []);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  // Every trip to a section starts at its top, the way an app's tabs do. The
  // window used to keep its scroll position, so leaving the bottom of Home for
  // Clients landed halfway down the client list. navTick counts taps in the
  // sidebar and the phone menu, so tapping the section you're already in (Home
  // while a client card is open, say) goes back to its top as well.
  //
  // A plain effect on purpose, not a layout effect: the phone menu pins the
  // page while it's open and puts the old position back in its own effect
  // cleanup as it closes. Cleanups run before effects, so this lands after
  // that restore instead of being undone by it.
  const [navTick, setNavTick] = useState(0);
  useEffect(() => {
    scrollToTarget(0, { immediate: true });
  }, [activeTab, navTick]);

  // Client-side auth gate (defense in depth — middleware already blocks the
  // route at the edge). Confirms a live session AND that it's an allowlisted
  // admin; anyone else is sent to the login screen.
  useEffect(() => {
    api.auth.me().then(u => {
      if (!isAdminEmail(u.email)) {
        router.push('/login');
        return;
      }
      setAuthGranted(true);
    }).catch(() => {
      router.push('/login');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rechecked every minute while the tab is in front of her. It used to load
  // once, so a booking that came in while the admin sat open never appeared
  // until she happened to refresh, and the Recent bookings rail had nothing new
  // to tell her about. An unchanged list comes back as the same data and
  // re-renders nothing.
  const { data: rawBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => api.entities.Booking.list('-created_date', 200),
    refetchInterval: 60_000,
  });

  // A bride's address lives on her INQUIRY (event_location), not her booking,
  // so without this the appointments list could show a location for every
  // travelling non-bridal client and nothing at all for the brides — which is
  // the exact case Roko asked to see. Fetched once here and merged in rather
  // than queried per row.
  const { data: inquiries = [] } = useQuery({
    queryKey: ['admin-bridal-inquiries'],
    queryFn: () => api.entities.BridalInquiry.list('-created_date', 200),
    staleTime: 30000,
  });

  const bookings = useMemo(() => {
    if (!inquiries.length) return rawBookings;
    // upload_token is the exact 1:1 link between a booking and its inquiry;
    // email is a fallback for older rows booked before tokens existed.
    //
    // The email fallback has to be kept on a short leash. One address can carry
    // any number of inquiries over the years, and it once put a wedding venue
    // from a bridal inquiry onto a studio appointment made months later, under
    // the heading "Client Location" — an address nobody typed, telling Roko to
    // drive somewhere she isn't going. So it now applies only to bridal
    // bookings, and picks the inquiry for THIS wedding rather than whichever
    // one happened to land last in the map.
    const byToken = new Map(), byEmail = new Map();
    for (const q of inquiries) {
      if (q.upload_token) byToken.set(q.upload_token, q);
      if (q.email) {
        const key = q.email.toLowerCase();
        if (!byEmail.has(key)) byEmail.set(key, []);
        byEmail.get(key).push(q);
      }
    }
    // Of several inquiries from one address, the one whose wedding date is the
    // booking's date is certainly the right one. Failing that, take the most
    // recent, which is the list's own order.
    const pickByEmail = (b) => {
      const list = byEmail.get(b.email.toLowerCase());
      if (!list?.length) return null;
      return (b.date && list.find(q => q.wedding_date === b.date)) || list[0];
    };
    return rawBookings.map(b => {
      // A location on the booking itself always wins: it is where she is
      // actually going, whereas the inquiry is what the bride typed months ago.
      if (b.location || b.location_city) return b;
      const q = (b.upload_token && byToken.get(b.upload_token))
        || (isBridalService(b.service) && b.email ? pickByEmail(b) : null);
      if (!q?.event_location) return b;
      return { ...b, location: q.event_location, location_city: cityFromLocation(q.event_location) };
    });
  }, [rawBookings, inquiries]);

  // Auto-complete finished work: once a CONFIRMED appointment's date has passed,
  // roll it to "completed" so it leaves Past Due for the Completed Archive on its
  // own, and the calendar dot updates to match. Pending past-due is left alone —
  // it never got confirmed, so it still needs Roko's attention. Runs on load;
  // the ref keeps it from re-firing the same update before the refetch lands.
  //
  // Dates the row through scheduledDate, not b.date. A consultation carries its
  // date in consultation_date and often has no b.date at all — every imported
  // Booksy consult is one — so reading b.date alone meant Past Due could file a
  // row that auto-complete then couldn't see, and it stayed there for good.
  const autoCompletedRef = useRef(new Set());
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    const stale = bookings.filter(b => {
      if (b.status !== 'confirmed' || autoCompletedRef.current.has(b.id)) return false;
      const when = scheduledDate(b);
      return when && daysUntil(when) < 0;
    });
    if (stale.length === 0) return;
    stale.forEach(b => autoCompletedRef.current.add(b.id));
    Promise.all(stale.map(b => api.entities.Booking.update(b.id, { status: 'completed' })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }))
      .catch(err => console.error('auto-complete past-due failed:', err));
  }, [bookings, queryClient]);

  const { data: capacitySettings = [] } = useQuery({
    queryKey: ['booking-capacity'],
    queryFn: () => api.entities.AppSettings.filter({ key: 'max_bookings_per_day' }),
    staleTime: 30000,
  });
  const maxPerDay = capacitySettings[0] ? parseInt(capacitySettings[0].value, 10) : DEFAULT_CAP;

  const { data: dayCapacities = [] } = useQuery({
    queryKey: ['day-capacities'],
    queryFn: () => api.entities.DayCapacity.list('-date', 200),
    staleTime: 30000,
  });
  // Build a map: date -> capacity override
  const dayCapacityMap = {};
  dayCapacities.forEach(d => { dayCapacityMap[d.date] = d.capacity; });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => api.entities.Review.list('-created_date', 200),
  });

  const { data: classRegs = [] } = useQuery({
    queryKey: ['class-registrations-summary'],
    queryFn: () => api.entities.ClassRegistration.list('-created_date', 200),
    staleTime: 30000,
  });
  // Sign-ups nobody has picked up yet.
  const newClassRegsCount = classRegs.filter(r => !r.status || r.status === 'new' || r.status === 'pending').length;

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Booking.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      // Update the selected booking in-place so the detail view reflects the change
      if (selectedBooking && selectedBooking.id === variables.id) {
        setSelectedBooking(prev => ({ ...prev, ...variables.data }));
      }
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (id) => api.entities.Booking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setSelectedBooking(null);
    },
  });

  // Bulk actions for the home multi-select. Fire all the per-row calls, then a
  // single refetch so the list re-renders once instead of flickering per item.
  const bulkUpdateBookings = async (ids, data) => {
    await Promise.all(ids.map((id) => api.entities.Booking.update(id, data)));
    queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
  };
  const bulkDeleteBookings = async (ids) => {
    await Promise.all(ids.map((id) => api.entities.Booking.delete(id)));
    queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    setSelectedBooking(null);
  };

  const updateReviewMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Review.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id) => api.entities.Review.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const filtered = bookings.filter(b => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesSearch = !search || [b.name, b.service, b.email, b.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesDate = !selectedDate || b.date === selectedDate;
    return matchesStatus && matchesSearch && matchesDate;
  });

  // Bookings that have a Zoom/consultation scheduled on the selected date
  const consultationsOnDate = selectedDate
    ? bookings.filter(b => b.consultation_date === selectedDate)
    : [];

  // Makeup class lessons scheduled on the selected date
  const lessonsOnDate = selectedDate
    ? classRegs.filter(r => r.appointment_date === selectedDate)
    : [];

  // Status chips count real appointments/consultations only. Booksy-imported
  // rows with neither a date nor a consultation are CRM contacts (they live in
  // Clients); rows with a date OR a consultation are real scheduled items.
  const siteBookings = bookings.filter(b => b.source !== 'booksy' || b.date || b.consultation_date);
  const pendingCount = siteBookings.filter(b => b.status === 'pending').length;
  const confirmedCount = siteBookings.filter(b => b.status === 'confirmed').length;
  const completedCount = siteBookings.filter(b => b.status === 'completed').length;
  const cancelledCount = siteBookings.filter(b => b.status === 'cancelled').length;
  const statusCounts = { all: siteBookings.length, pending: pendingCount, confirmed: confirmedCount, completed: completedCount, cancelled: cancelledCount };

  // What each section has waiting, for the counts beside it in the menu.
  const navCounts = useMemo(() => ({
    bookings: bookings.filter(isBookingUnseen).length,
    classes: newClassRegsCount,
    reviews: reviews.filter(r => r.status === 'pending').length,
  }), [bookings, newClassRegsCount, reviews]);

  const dm = darkMode;

  // The same screen the page showed while the dashboard downloaded, so the
  // sign-in check doesn't flash a different one in between.
  if (!authGranted) return <BrandLoader caption="Loading your dashboard" />;

  const activeTabMeta = ADMIN_TABS.find(t => t.key === activeTab);
  const activeTabLabel = activeTabMeta?.label ?? '';

  // A client card (or class sign-up) open over a section. The phone bar's left
  // button turns into Back while one is, and the page title steps aside for
  // the card's own header.
  const isDetailOpen =
    (activeTab === 'bookings' && !!selectedBooking) ||
    (activeTab === 'classes' && !!selectedClassReg) ||
    // The Calendar tab opens client cards in place, so back there means
    // "close the card and show the calendar again", not "leave the tab".
    (activeTab === 'availability' && (!!selectedBooking || !!selectedClassReg));
  const handleBack = () => {
    if (selectedBooking) { setSelectedBooking(null); return; }
    if (selectedClassReg) setSelectedClassReg(null);
  };
  const detailName = selectedBooking?.name || selectedClassReg?.full_name || '';

  const goTab = (key) => { setActiveTab(key); setSelectedBooking(null); setSelectedClassReg(null); setNavTick(n => n + 1); };
  const sidebarProps = {
    activeTab,
    setActiveTab: goTab,
    counts: navCounts,
    darkMode: dm,
    onDarkModeToggle: () => setDarkMode(d => !d),
    onBackToSite: () => router.push('/'),
    onLogout: () => api.auth.logout(),
    tabs: navTabs,
  };

  return (
    <div className="admin-app min-h-[100svh] bg-canvas text-ink">
      <div className="lg:flex">
        <AdminSidebar {...sidebarProps} setOrder={setNavOrder} />

        <div className="min-w-0 flex-1">
          <PhoneBar
            detailOpen={isDetailOpen}
            title={isDetailOpen ? detailName : activeTabLabel}
            watchKey={`${activeTab}:${selectedBooking?.id || ''}:${selectedClassReg?.id || ''}`}
            menuOpen={mobileNavOpen}
            onMenu={() => setMobileNavOpen(true)}
            onBack={handleBack}
            onAdd={() => setEntryPanel({ mode: 'client', date: selectedDate })}
            // Inside a client card the + gives way to My Schedule: the card
            // owns the drawer, so the bar just asks it to open.
            onSchedule={(activeTab === 'bookings' || activeTab === 'availability') && selectedBooking
              ? () => window.dispatchEvent(new Event(MY_SCHEDULE_EVENT))
              : null}
            unseen={navCounts.bookings}
          />

          <main id="admin-main" className="mx-auto w-full max-w-[1360px] px-4 pb-[calc(48px+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-10">
            {activeTab === 'bookings' && !isDetailOpen ? (
              <HomeTop
                bookings={bookings}
                onOpen={setSelectedBooking}
                onAddClient={() => setEntryPanel({ mode: 'client', date: selectedDate })}
              />
            ) : !isDetailOpen && (
              <PageHeader title={activeTabLabel} sub={activeTabMeta?.sub} />
            )}

        {/* Keyed so every navigation (open/close a card, switch tabs) replays
            the same quiet fade-rise. */}
        <div key={`${activeTab}:${selectedBooking?.id || ''}:${selectedClassReg?.id || ''}`} className="admin-enter">
        {activeTab === 'bookings' && !selectedBooking && (
          <>
            {/* Who booked, and when? On a phone that's the first question and
                the appointments list is three scrolls down, so the rail answers
                it before the calendar does. Laptop keeps it inside the list. */}
            <NewBookingsRail bookings={bookings} loading={loadingBookings} onSelect={setSelectedBooking} darkMode={dm} className="sm:hidden mb-6" />
            <ResizableColumns
              darkMode={dm}
              left={
                <>
                  <div className="mb-8">
                    <AdminCalendar bookings={bookings} classRegs={classRegs} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setStatusFilter={setStatusFilter} maxPerDay={maxPerDay} dayCapacityMap={dayCapacityMap} darkMode={dm}
                      defaultDay
                      onSelectBooking={setSelectedBooking}
                      onSelectTimeBlock={(t) => setEntryPanel({ mode: 'block', editBlock: t })}
                      onSelectClassReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }} />
                  </div>
                  {classRegs.length > 0 && (
                    <ClassSignupsCard
                      classRegs={classRegs}
                      onOpenAll={() => { setActiveTab('classes'); setSelectedBooking(null); }}
                      onOpenReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }}
                      darkMode={dm}
                    />
                  )}
                </>
              }
              right={
                <div id="bookings-list">
                  <BookingsList
                    bookings={filtered} loading={loadingBookings}
                    search={search} setSearch={setSearch} statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter} statusCounts={statusCounts}
                    selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                    onSelect={setSelectedBooking} currentMonth={currentMonth}
                    allBookings={bookings} consultationsOnDate={consultationsOnDate} lessonsOnDate={lessonsOnDate}
                    darkMode={dm} onAddClient={() => setEntryPanel({ mode: 'client', date: selectedDate })}
                    onSelectTimeBlock={(t) => setEntryPanel({ mode: 'block', editBlock: t })}
                    classRegs={classRegs} viewType={viewType} setViewType={setViewType}
                    onSelectClassReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }}
                    onViewAllCalendar={(jumpTo) => {
                      setActiveTab('availability'); setSelectedBooking(null); setSelectedClassReg(null);
                      // A day handed over from the list (a closed day, say)
                      // opens already selected on the Calendar tab.
                      if (jumpTo) { setAvailDay(jumpTo); setAvailMonth(new Date(jumpTo + 'T00:00:00')); }
                    }}
                    onBulkUpdate={bulkUpdateBookings}
                    onBulkDelete={bulkDeleteBookings}
                  />
                </div>
              }
            />
          </>
        )}

        {activeTab === 'bookings' && selectedBooking && (
          <BookingDetail
            booking={selectedBooking}
            onBack={() => setSelectedBooking(null)}
            onUpdateStatus={(status) => updateBookingMutation.mutate({ id: selectedBooking.id, data: { status } })}
            onUpdateBooking={(data) => updateBookingMutation.mutate({ id: selectedBooking.id, data })}
            onDelete={() => deleteBookingMutation.mutate(selectedBooking.id)}
            allBookings={bookings}
            classRegs={classRegs}
            onSelectBooking={setSelectedBooking}
            onSelectClassReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }}
            darkMode={dm}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsTab
            bookings={bookings}
            classRegs={classRegs}
            darkMode={dm}
            onOpenBooking={(b) => { setActiveTab('bookings'); setSelectedBooking(b); }}
            onOpenClassReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }}
          />
        )}

        {/* Calendar. Opening a client from a day swaps the card in right here
            instead of throwing you into another tab, so Back lands you on the
            calendar you came from. */}
        {activeTab === 'availability' && !selectedBooking && !selectedClassReg && (
          <AvailabilityTab
            bookings={bookings}
            classRegs={classRegs}
            darkMode={dm}
            month={availMonth}
            setMonth={setAvailMonth}
            selectedDate={availDay}
            setSelectedDate={setAvailDay}
            onSelect={setSelectedBooking}
            onSelectClassReg={setSelectedClassReg}
            onSelectTimeBlock={(t) => setEntryPanel({ mode: 'block', editBlock: t })}
            onBlockTime={(d) => setEntryPanel({ mode: 'block', date: d })}
          />
        )}

        {activeTab === 'availability' && selectedBooking && (
          <BookingDetail
            booking={selectedBooking}
            onBack={() => setSelectedBooking(null)}
            onUpdateStatus={(status) => updateBookingMutation.mutate({ id: selectedBooking.id, data: { status } })}
            onUpdateBooking={(data) => updateBookingMutation.mutate({ id: selectedBooking.id, data })}
            onDelete={() => deleteBookingMutation.mutate(selectedBooking.id)}
            allBookings={bookings}
            classRegs={classRegs}
            onSelectBooking={setSelectedBooking}
            onSelectClassReg={(r) => { setSelectedBooking(null); setSelectedClassReg(r); }}
            darkMode={dm}
          />
        )}

        {activeTab === 'availability' && selectedClassReg && (
          <ClassRegistrationDetail
            reg={selectedClassReg}
            onBack={() => setSelectedClassReg(null)}
            darkMode={dm}
          />
        )}

        {activeTab === 'services' && (
          <>
            <ContractSettings darkMode={dm} />
            <ServicesList darkMode={dm} />
          </>
        )}

        {activeTab === 'reviews' && (
          <ReviewsList reviews={reviews} loading={loadingReviews}
            onApprove={(id) => updateReviewMutation.mutate({ id, data: { status: 'approved' } })}
            onDelete={(id) => deleteReviewMutation.mutate(id)}
            darkMode={dm} />
        )}

        {activeTab === 'classes' && !selectedClassReg && (
          <ClassRegistrationsList
            darkMode={dm}
            onSelect={setSelectedClassReg}
          />
        )}

        {activeTab === 'classes' && selectedClassReg && (
          <ClassRegistrationDetail
            reg={selectedClassReg}
            onBack={() => setSelectedClassReg(null)}
            darkMode={dm}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab darkMode={dm} />
        )}
        </div> {/* /animated tab content */}
          </main>
        </div>
      </div>

      <AdminDrawer {...sidebarProps} open={mobileNavOpen} onClose={closeMobileNav} />

      {/* Outside the keyed tab wrapper, so switching tabs underneath can't
          remount it, and the Calendar tab can open it as well as Home. */}
      {entryPanel && (
        <AddClientModal
          initialMode={entryPanel.mode}
          initialDate={entryPanel.date || entryPanel.editBlock?.date || null}
          editBlock={entryPanel.editBlock || null}
          bookings={bookings}
          classRegs={classRegs}
          onSave={(record, kind) => {
            setEntryPanel(null);
            if (kind === 'class') {
              queryClient.invalidateQueries({ queryKey: ['class-registrations'] });
              queryClient.invalidateQueries({ queryKey: ['class-registrations-summary'] });
              setActiveTab('classes');
              setSelectedClassReg(record);
            } else if (kind === 'booking') {
              queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
              setSelectedBooking(record);
            } else {
              // Blocked time or a day off: refresh both, then land on the day
              // it went on, so she sees it arrive.
              queryClient.invalidateQueries({ queryKey: ['time-blocks'] });
              queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
              const d = record?.date;
              if (d && activeTab === 'availability') { setAvailDay(d); setAvailMonth(new Date(d + 'T00:00:00')); }
              else if (d) { setSelectedDate(d); setCurrentMonth(new Date(d + 'T00:00:00')); }
            }
          }}
          onClose={() => setEntryPanel(null)}
          darkMode={dm}
        />
      )}
    </div>
  );
}

// ---- the phone bar ---------------------------------------------------------------

// A slim frosted bar on a phone: the menu (or Back, while a card is open), the
// brand, and a new client from anywhere. Once the page's own title has scrolled
// up under the bar, the bar takes the title over, the way an iPhone app's
// large title does.
function PhoneBar({ detailOpen, title, watchKey, menuOpen, onMenu, onBack, onAdd, onSchedule, unseen }) {
  const past = useTitlePast(watchKey);
  const showTitle = detailOpen ? past || !!title : past;
  return (
    <header className="sticky top-0 z-[200] grid h-14 grid-cols-[48px_minmax(0,1fr)_48px] items-center border-b border-line/80 bg-paper/80 px-1.5 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
      {detailOpen ? (
        <button type="button" onClick={onBack} aria-label="Back" className="press flex h-11 w-11 items-center justify-center text-ink">
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="press relative flex h-11 w-11 items-center justify-center text-ink"
        >
          <span className="burger" data-x="false"><i /><i /><i /></span>
          {unseen ? <span aria-hidden className="absolute right-2 top-2.5 h-2 w-2 rounded-full bg-ink ring-2 ring-paper" /> : null}
        </button>
      )}

      <div className="relative h-full min-w-0 overflow-hidden">
        <p
          aria-hidden={showTitle}
          className={cx(
            'absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,transform] duration-300 ease-quint',
            showTitle && 'pointer-events-none -translate-y-3 opacity-0',
          )}
        >
          <span className="truncate text-[1rem] font-semibold tracking-[-0.02em] text-ink">Roqia Moshref</span>
        </p>
        <p
          aria-hidden={!showTitle}
          className={cx(
            'absolute inset-0 flex items-center justify-center px-1 transition-[opacity,transform] duration-300 ease-quint',
            showTitle ? 'opacity-100' : 'translate-y-3 opacity-0',
          )}
        >
          <span className="truncate text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">{title}</span>
        </p>
      </div>

      {onSchedule ? (
        <button type="button" onClick={onSchedule} aria-label="My Schedule" title="My Schedule" className="press flex h-11 w-11 items-center justify-center text-ink">
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
            <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18" />
          </svg>
        </button>
      ) : (
        <button type="button" onClick={onAdd} aria-label="Add client" className="press flex h-11 w-11 items-center justify-center text-ink">
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-[22px] w-[22px]">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </header>
  );
}

// Whether the page's large title (the h1, or whatever carries data-bar-title)
// has gone up under the phone bar. Screens can render their title late, so it
// keeps looking for as long as the screen is up.
function useTitlePast(watchKey) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    setPast(false);
    const main = document.getElementById('admin-main');
    if (!main) return undefined;
    let io;
    let node = null;
    const attach = () => {
      const h = main.querySelector('[data-bar-title]') || main.querySelector('h1');
      if (!h || h === node) return;
      io?.disconnect();
      node = h;
      io = new IntersectionObserver(
        ([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 80),
        { rootMargin: '-56px 0px 0px 0px' },
      );
      io.observe(h);
    };
    attach();
    const mo = new MutationObserver(attach);
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, [watchKey]);
  return past;
}

// The top of every section: a large title and one line under it.
function PageHeader({ title, sub, children }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-[clamp(1.85rem,4vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">{title}</h1>
      {sub ? <p className="mt-1.5 text-[0.86rem] text-ink-muted sm:mt-2">{sub}</p> : null}
      {children}
    </div>
  );
}
