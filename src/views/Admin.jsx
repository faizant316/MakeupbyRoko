'use client';
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AdminStats from '../components/admin/AdminStats';
import AdminCalendar from '../components/admin/AdminCalendar';
import BookingsList from '../components/admin/BookingsList';
import BookingDetail from '../components/admin/BookingDetail';
import ReviewsList from '../components/admin/ReviewsList';
import ServicesList from '../components/admin/ServicesList';
import AdminTabSwitcher from '../components/admin/AdminTabSwitcher';
import CapacitySettings from '../components/admin/CapacitySettings';
import ClassRegistrationsList from '../components/admin/ClassRegistrationsList';
import AnalyticsTab from '../components/admin/AnalyticsTab';

const DEFAULT_CAP = 3;

export default function Admin() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userName, setUserName] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin-dark') === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authGranted, setAuthGranted] = useState(false);
  const [authError, setAuthError] = useState(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('admin-dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.full_name) setUserName(u.full_name.split(' ')[0]);
      setAuthGranted(true);
      setAuthChecked(true);
    }).catch(() => {
      setAuthChecked(true);
      router.push('/login');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const { data: capacitySettings = [] } = useQuery({
    queryKey: ['booking-capacity'],
    queryFn: () => base44.entities.AppSettings.filter({ key: 'max_bookings_per_day' }),
    staleTime: 30000,
  });
  const maxPerDay = capacitySettings[0] ? parseInt(capacitySettings[0].value, 10) : DEFAULT_CAP;

  const { data: dayCapacities = [] } = useQuery({
    queryKey: ['day-capacities'],
    queryFn: () => base44.entities.DayCapacity.list('-date', 200),
    staleTime: 30000,
  });
  // Build a map: date -> capacity override
  const dayCapacityMap = {};
  dayCapacities.forEach(d => { dayCapacityMap[d.date] = d.capacity; });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 200),
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      // Update the selected booking in-place so the detail view reflects the change
      if (selectedBooking && selectedBooking.id === variables.id) {
        setSelectedBooking(prev => ({ ...prev, ...variables.data }));
      }
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setSelectedBooking(null);
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Review.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id) => base44.entities.Review.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const filtered = bookings.filter(b => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesSearch = !search || [b.name, b.service, b.email, b.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesDate = !selectedDate || b.date === selectedDate;
    return matchesStatus && matchesSearch && matchesDate;
  });

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
            onClick={() => base44.auth.logout()}
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
            onClick={() => base44.auth.logout()}
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

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: dm ? '#1e1e24' : '#FAF8F6', color: dm ? '#e4e4e7' : '#111' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-50" style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#e8e2dc'}`, background: dm ? '#26262e' : '#fff' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <a href="/" className="font-serif text-lg tracking-[0.12em] uppercase whitespace-nowrap" style={{ color: dm ? '#e4e4e7' : '#111' }}>
            Roqia Moshref
          </a>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={() => setDarkMode(d => !d)}
              title={dm ? 'Switch to light mode' : 'Switch to dark mode'}
              className="relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center px-0.5 flex-shrink-0"
              style={{ background: dm ? '#D4A0B0' : '#e2dbd5' }}
            >
              <div
                className="w-5 h-5 rounded-full shadow-sm transition-transform duration-300 flex items-center justify-center"
                style={{ background: dm ? '#1a1210' : '#fff', transform: dm ? 'translateX(20px)' : 'translateX(0px)' }}
              >
                {dm
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2" className="w-3 h-3"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="#A0785A" strokeWidth="2" className="w-3 h-3"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                }
              </div>
            </button>
            <button onClick={() => router.push('/')}
              className="text-[0.7rem] font-medium tracking-[0.08em] uppercase transition-colors flex items-center gap-1.5 whitespace-nowrap"
              style={{ color: dm ? '#71717a' : '#999' }}
              onMouseEnter={e => e.currentTarget.style.color = dm ? '#D4A0B0' : '#555'}
              onMouseLeave={e => e.currentTarget.style.color = dm ? '#71717a' : '#999'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
              Back to Site
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="sm:hidden relative" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="w-11 h-11 flex items-center justify-center rounded-full transition-all"
              style={{ background: mobileMenuOpen ? (dm ? '#3f3f46' : '#f0ebe6') : 'transparent' }}
            >
              {mobileMenuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#F0EBE6' : '#111'} strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#F0EBE6' : '#111'} strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>

            {mobileMenuOpen && (
              <div
                className="absolute right-0 top-11 w-56 z-50 overflow-hidden"
                style={{
                  background: dm ? '#27272a' : '#ffffff',
                  border: `1px solid ${dm ? '#3f3f46' : '#ede8e3'}`,
                  borderRadius: '16px',
                  boxShadow: dm
                    ? '0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)'
                    : '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                {/* Dark mode row */}
                <button
                  onClick={() => setDarkMode(d => !d)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors active:opacity-70"
                  style={{ borderBottom: `1px solid ${dm ? '#3f3f46' : '#f0ebe6'}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#f5f0ec' }}>
                      {dm
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="#A0785A" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                      }
                    </div>
                    <span className="text-[0.8rem] font-medium" style={{ color: dm ? '#a1a1aa' : '#333' }}>
                      {dm ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  </div>
                  <div className="relative w-9 h-5 rounded-full flex items-center px-0.5 flex-shrink-0 transition-colors duration-300" style={{ background: dm ? '#D4A0B0' : '#ddd' }}>
                    <div className="w-4 h-4 rounded-full shadow transition-transform duration-300"
                      style={{ background: '#fff', transform: dm ? 'translateX(16px)' : 'translateX(0px)' }} />
                  </div>
                </button>

                {/* Back to Site */}
                <button
                  onClick={() => { setMobileMenuOpen(false); router.push('/'); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors active:opacity-70"
                  style={{ borderBottom: `1px solid ${dm ? '#3f3f46' : '#f0ebe6'}` }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#f5f0ec' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#a1a1aa' : '#A0785A'} strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                  </div>
                  <span className="text-[0.8rem] font-medium" style={{ color: dm ? '#a1a1aa' : '#333' }}>Back to Site</span>
                </button>

                {/* Log Out */}
                <button
                  onClick={() => { setMobileMenuOpen(false); base44.auth.logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors active:opacity-70"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: dm ? 'rgba(239,68,68,0.15)' : '#fef2f2' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  </div>
                  <span className="text-[0.8rem] font-medium text-red-400">Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Page title + welcome + logout */}
        <div className="flex items-start justify-between gap-4 mt-10 mb-6">
          <div>
            <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.01em]" style={{ color: dm ? '#e4e4e7' : '#111' }}>
              {activeTab === 'bookings' ? 'Appointments' : activeTab === 'services' ? 'Services' : activeTab === 'classes' ? 'Class Sign-Ups' : activeTab === 'analytics' ? 'Analytics' : 'Reviews'}
            </h1>
            <p className="text-[0.8rem] mt-2 tracking-wide" style={{ color: dm ? '#71717a' : '#bbb' }}>
              Welcome back, <span className="text-[#D4A0B0]">Roqia</span> ✦
            </p>
          </div>
          <button onClick={() => base44.auth.logout()}
            className="hidden sm:flex text-[0.65rem] font-medium tracking-[0.1em] uppercase transition-colors items-center gap-1.5 whitespace-nowrap mt-2 flex-shrink-0"
            style={{ color: dm ? '#52525b' : '#ccc' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = dm ? '#52525b' : '#ccc'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Log Out
          </button>
        </div>

        {/* Tab switcher with sliding indicator */}
        <AdminTabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} darkMode={dm} />

        {activeTab === 'bookings' && !selectedBooking && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5 mb-8">
              <AdminStats today={todayCount} pending={pendingCount} confirmed={confirmedCount} completed={completedCount} darkMode={dm} onFilterClick={(filter) => { setStatusFilter(filter); setTimeout(() => document.getElementById('bookings-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} />
              <AdminCalendar bookings={bookings} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} maxPerDay={maxPerDay} dayCapacityMap={dayCapacityMap} darkMode={dm} />
            </div>
            <div className="mb-6">
              <CapacitySettings selectedDate={selectedDate} darkMode={dm} />
            </div>
            <div id="bookings-list">
              <BookingsList bookings={filtered} loading={loadingBookings} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} statusCounts={statusCounts} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onSelect={setSelectedBooking} currentMonth={currentMonth} allBookings={bookings} darkMode={dm} />
            </div>
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

        {activeTab === 'services' && (
          <ServicesList darkMode={dm} />
        )}

        {activeTab === 'reviews' && (
          <ReviewsList reviews={reviews} loading={loadingReviews}
            onApprove={(id) => updateReviewMutation.mutate({ id, data: { status: 'approved' } })}
            onDelete={(id) => deleteReviewMutation.mutate(id)}
            darkMode={dm} />
        )}

        {activeTab === 'classes' && (
          <ClassRegistrationsList darkMode={dm} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab darkMode={dm} />
        )}
      </div>
    </div>
  );
}