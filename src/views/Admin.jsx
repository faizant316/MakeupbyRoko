'use client';
import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AdminStats from '../components/admin/AdminStats';
import AdminCalendar from '../components/admin/AdminCalendar';
import BookingsList from '../components/admin/BookingsList';
import BookingDetail from '../components/admin/BookingDetail';
import ReviewsList from '../components/admin/ReviewsList';
import ServicesList from '../components/admin/ServicesList';
import AdminSidebar, { ADMIN_TABS } from '../components/admin/AdminSidebar';
import AvailabilityTab from '../components/admin/AvailabilityTab';
import TodayAgenda from '../components/admin/TodayAgenda';
import ClassSignupsCard from '../components/admin/ClassSignupsCard';
import ClassRegistrationsList from '../components/admin/ClassRegistrationsList';
import ClassRegistrationDetail from '../components/admin/ClassRegistrationDetail';
import AnalyticsTab from '../components/admin/AnalyticsTab';
import RevenueTab from '../components/admin/RevenueTab';
import AddClientModal from '../components/admin/AddClientModal';

const DEFAULT_CAP = 3;

export default function Admin() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewType, setViewType] = useState('appointments');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userName, setUserName] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin-dark') === 'true');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNavFab, setShowNavFab] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [autoExpandClassRegId, setAutoExpandClassRegId] = useState(null);
  const [selectedClassReg, setSelectedClassReg] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);   // DEV: bypassed
  const [authGranted, setAuthGranted] = useState(true);   // DEV: bypassed
  const [authError, setAuthError] = useState(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem('admin-dark', darkMode);
  }, [darkMode]);

  // Floating back button (mobile): reveal as soon as the page is scrolled even
  // a little past the header, and keep it there so it's always within reach.
  // Only tucked away right at the top, where the header already sits.
  useEffect(() => {
    const onScroll = () => setShowNavFab(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // DEV MODE: auth bypassed — re-enable by uncommenting below and reverting useState defaults above
  // useEffect(() => {
  //   api.auth.me().then(u => {
  //     if (u.full_name) setUserName(u.full_name.split(' ')[0]);
  //     setAuthGranted(true);
  //     setAuthChecked(true);
  //   }).catch(() => {
  //     setAuthChecked(true);
  //     router.push('/login');
  //   });
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => api.entities.Booking.list('-created_date', 200),
  });

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
  const newClassRegsCount = classRegs.filter(r => r.status === 'new' || !r.status).length;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentClassRegs = classRegs.filter(r => r.created_date && r.created_date > oneDayAgo);

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

  const today = new Date().toISOString().split('T')[0];
  const todayCount = bookings.filter(b => b.date === today).length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
  const statusCounts = { all: bookings.length, pending: pendingCount, confirmed: confirmedCount, completed: completedCount, cancelled: cancelledCount };

  const dm = darkMode;

  // Access denied screen when logged in as non-admin
  if (authError === 'admin_required') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0C0A09' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #ef4444, transparent 70%)' }} />
        </div>

        <div className="relative flex flex-col items-center gap-8 px-8 text-center max-w-[380px]">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="text-red-400 text-2xl">🔐</span>
          </div>
          <div>
            <h1 className="font-serif text-[1.6rem] tracking-[0.18em] uppercase text-white/90 font-light mb-2">
              Admin Access Only
            </h1>
            <p className="text-[0.85rem] text-white/50 leading-relaxed">
              This dashboard requires admin privileges. Log out and sign in with your admin account to continue.
            </p>
          </div>

          <button
            onClick={() => api.auth.logout()}
            className="px-8 py-3 rounded-lg font-medium tracking-[0.08em] uppercase transition-all"
            style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.75rem',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
          >
            Log Out & Try Again
          </button>
        </div>
      </div>
    );
  }

  // Beautiful loading / auth gate screen
  if (!authGranted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0C0A09' }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #D4A0B0, transparent 70%)' }} />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #B8A0D4, transparent 70%)' }} />
        </div>

        <div className="relative flex flex-col items-center gap-8 px-8 text-center">
          {/* Logo mark */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: 'rgba(212,160,176,0.12)', border: '1px solid rgba(212,160,176,0.2)' }}>
              <span className="text-[#D4A0B0] text-2xl">✦</span>
            </div>
            <h1 className="font-serif text-[1.6rem] tracking-[0.18em] uppercase text-white/90 font-light">
              Roqia Moshref
            </h1>
            <p className="text-[0.6rem] tracking-[0.22em] uppercase text-[#D4A0B0]/70 font-medium">
              Studio Dashboard
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,160,176,0.3), transparent)' }} />

          {/* Loading indicator */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#D4A0B0',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.6,
                  }} />
              ))}
            </div>
            <p className="text-[0.65rem] tracking-[0.16em] uppercase text-white/20 font-medium">
              Verifying access
            </p>
          </div>

          {/* Logout button for testing */}
          <button
            onClick={() => api.auth.logout()}
            className="text-[0.65rem] tracking-[0.1em] uppercase transition-colors mt-6"
            style={{ color: 'rgba(212,160,176,0.6)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#D4A0B0'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,160,176,0.6)'}
          >
            Clear Session & Try Again
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // Resolve active tab label for mobile header
  const activeTabLabel = ADMIN_TABS.find(t => t.key === activeTab)?.label ?? '';

  // Floating back button: where "back" goes. Not shown on the Home overview
  // (use the menu to switch sections); everywhere else it returns one level up.
  const isDetailOpen =
    (activeTab === 'bookings' && !!selectedBooking) ||
    (activeTab === 'classes' && !!selectedClassReg);
  const canGoBack = isDetailOpen || activeTab !== 'bookings';
  const handleBack = () => {
    if (activeTab === 'bookings' && selectedBooking) { setSelectedBooking(null); return; }
    if (activeTab === 'classes' && selectedClassReg) { setSelectedClassReg(null); return; }
    if (activeTab !== 'bookings') {
      setActiveTab('bookings');
      setSelectedBooking(null);
      setSelectedClassReg(null);
    }
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: dm ? '#1e1e24' : '#fff', color: dm ? '#e4e4e7' : '#111' }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-[100]"
        style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#e8e2dc'}`, background: dm ? '#26262e' : '#fff' }}
      >
        <div className="px-4 sm:px-6 lg:px-8 flex items-center h-14">
          {/* Branding + active section chip (mobile). pr-14 on mobile reserves
              room for the fixed hamburger so the pill never slides under it. */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-14 sm:pr-0">
            <a
              href="/"
              className="font-serif text-lg tracking-[0.12em] uppercase whitespace-nowrap flex-shrink-0"
              style={{ color: dm ? '#e4e4e7' : '#111' }}
            >
              Roqia Moshref
            </a>
            {/* Active section pill — mobile only. Truncates so it stays tidy. */}
            <span
              className="sm:hidden text-[0.55rem] tracking-[0.14em] uppercase font-semibold px-1.5 py-0.5 rounded-md min-w-0 truncate"
              style={{ color: '#D4A0B0', background: dm ? 'rgba(212,160,176,0.1)' : 'rgba(212,160,176,0.08)' }}
            >
              {activeTabLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile hamburger — animates to × when open.
          Rendered as a FIXED button (not inside the sticky header) so its hit
          box always lines up with where it's painted — exactly how the public
          site's nav button behaves (its parent is fixed too). The sticky header
          was desyncing the tap target downward; fixed positioning fixes that.
          Lines are pointer-events-none so every tap lands on the button, and
          touch-action:manipulation keeps taps instant. */}
      <button
        onClick={() => setMobileNavOpen(o => !o)}
        className="sm:hidden fixed top-[6px] right-4 z-[110] w-11 h-11 flex items-center justify-center rounded-full transition-transform duration-200 active:scale-90"
        style={{
          background: mobileNavOpen ? (dm ? '#3f3f46' : '#f0ebe6') : 'transparent',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
      >
        <span
          className={`pointer-events-none absolute block w-[20px] h-[1.5px] rounded-full transition-all duration-300 ease-in-out ${
            mobileNavOpen ? 'rotate-45 translate-y-0' : '-translate-y-[5px]'
          }`}
          style={{ background: dm ? '#F0EBE6' : '#111' }}
        />
        <span
          className={`pointer-events-none absolute block w-[20px] h-[1.5px] rounded-full transition-all duration-300 ease-in-out ${
            mobileNavOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
          }`}
          style={{ background: dm ? '#F0EBE6' : '#111' }}
        />
        <span
          className={`pointer-events-none absolute block w-[20px] h-[1.5px] rounded-full transition-all duration-300 ease-in-out ${
            mobileNavOpen ? '-rotate-45 translate-y-0' : 'translate-y-[5px]'
          }`}
          style={{ background: dm ? '#F0EBE6' : '#111' }}
        />
      </button>

      {/* ── Floating back button (mobile) ────────────────────────
          Gray translucent arrow, like the public site's modal back button.
          Goes up one level (no menu). Hidden while scrolling down a page;
          slides in when you scroll up to leave. */}
      <button
        onClick={handleBack}
        aria-label="Go back"
        className={`sm:hidden fixed left-4 top-[68px] z-[90] w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out active:scale-90 ${
          showNavFab && canGoBack && !mobileNavOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* ── Sidebar + Content ────────────────────────────────── */}
      <div className="flex">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={(key) => { setActiveTab(key); setSelectedBooking(null); setSelectedClassReg(null); }}
          mobileOpen={mobileNavOpen}
          setMobileOpen={setMobileNavOpen}
          darkMode={dm}
          onDarkModeToggle={() => setDarkMode(d => !d)}
          onBackToSite={() => router.push('/')}
          onLogout={() => api.auth.logout()}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pb-16">
          {/* Page title */}
          <div className="flex items-end justify-between gap-4 mt-8 sm:mt-10 mb-6">
            <div>
              <h1
                className="font-serif text-[2rem] sm:text-[2.25rem] leading-none tracking-[-0.01em]"
                style={{ color: dm ? '#e4e4e7' : '#111' }}
              >
                {activeTabLabel}
              </h1>
              <p className="text-[0.78rem] mt-2 tracking-wide" style={{ color: dm ? '#71717a' : '#bbb' }}>
                Welcome back, <span className="text-[#D4A0B0]">Roqia</span> ✦
              </p>
            </div>
          </div>

        {activeTab === 'bookings' && !selectedBooking && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5 mb-8">
              <AdminStats today={todayCount} pending={pendingCount} confirmed={confirmedCount} completed={completedCount} darkMode={dm} onFilterClick={(filter) => { setStatusFilter(filter); setTimeout(() => document.getElementById('bookings-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} />
              <AdminCalendar bookings={bookings} classRegs={classRegs} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setStatusFilter={setStatusFilter} maxPerDay={maxPerDay} dayCapacityMap={dayCapacityMap} darkMode={dm} />
            </div>
            {/* Today's agenda — always-on, surfaces appointments + class lessons due today */}
            <TodayAgenda
              bookings={bookings}
              classRegs={classRegs}
              onSelectBooking={setSelectedBooking}
              onSelectClassReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }}
              darkMode={dm}
            />
            {/* Class Sign-Ups quick access — sits above bookings list */}
            {classRegs.length > 0 && (
              <ClassSignupsCard
                classRegs={classRegs}
                onOpenAll={() => { setActiveTab('classes'); setSelectedBooking(null); }}
                onOpenReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }}
                darkMode={dm}
              />
            )}
            <div id="bookings-list">
              <BookingsList
                bookings={filtered} loading={loadingBookings}
                search={search} setSearch={setSearch} statusFilter={statusFilter}
                setStatusFilter={setStatusFilter} statusCounts={statusCounts}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                onSelect={setSelectedBooking} currentMonth={currentMonth}
                allBookings={bookings} consultationsOnDate={consultationsOnDate} lessonsOnDate={lessonsOnDate}
                darkMode={dm} onAddClient={() => setShowAddClient(true)}
                classRegs={classRegs} viewType={viewType} setViewType={setViewType}
                onSelectClassReg={(r) => { setActiveTab('classes'); setSelectedClassReg(r); }}
              />
            </div>
            {showAddClient && (
              <AddClientModal
                onSave={(newBooking) => {
                  queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
                  setShowAddClient(false);
                  setSelectedBooking(newBooking);
                }}
                onClose={() => setShowAddClient(false)}
                darkMode={dm}
              />
            )}
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
            darkMode={dm}
          />
        )}

        {activeTab === 'availability' && (
          <AvailabilityTab bookings={bookings} classRegs={classRegs} darkMode={dm} />
        )}

        {activeTab === 'services' && (
          <ServicesList darkMode={dm} />
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
            autoExpandId={autoExpandClassRegId}
          />
        )}

        {activeTab === 'classes' && selectedClassReg && (
          <ClassRegistrationDetail
            reg={selectedClassReg}
            onBack={() => setSelectedClassReg(null)}
            darkMode={dm}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab darkMode={dm} />
        )}

        {activeTab === 'revenue' && (
          <RevenueTab darkMode={dm} />
        )}
        </div> {/* /main content */}
      </div> {/* /flex row */}
    </div>
  );
}