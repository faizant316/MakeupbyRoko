'use client';
import { useEffect } from 'react';

export const ADMIN_TABS = [
  { key: 'bookings',     label: 'Home',           sub: 'Overview & appointments' },
  { key: 'clients',      label: 'Clients',        sub: 'Directory & smart groups' },
  { key: 'availability', label: 'Availability',   sub: 'Capacity & days off'     },
  { key: 'services',     label: 'Services',       sub: 'Edit & update offerings' },
  { key: 'reviews',      label: 'Reviews',        sub: 'Approve & manage'        },
  { key: 'classes',      label: 'Class Sign-Ups', sub: 'Registrations'           },
  { key: 'analytics',    label: 'Analytics',      sub: 'Insights & trends'       },
  { key: 'revenue',      label: 'Revenue',        sub: 'Revenue & booking stats' },
];

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  darkMode: dm,
  onDarkModeToggle,
  onBackToSite,
  onLogout,
}) {
  // Lock body scroll when mobile nav is open — same robust technique the public
  // site's menu uses (pin the body with position:fixed and restore the exact
  // scroll position on close). Plain overflow:hidden lets the page lurch on
  // mobile; this keeps the open/close buttery smooth with no shift.
  useEffect(() => {
    if (!mobileOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  const handleTabClick = (key) => {
    setActiveTab(key);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ════════════════════════════════════════════════════
          DESKTOP sidebar — sticky, 220px, left of content
          ════════════════════════════════════════════════════ */}
      <aside
        className="hidden sm:flex flex-col w-[220px] shrink-0 sticky top-14 self-start overflow-y-auto"
        style={{
          height: 'calc(100vh - 56px)',
          borderRight: `1px solid ${dm ? '#2e2e38' : '#e8e2dc'}`,
          background: dm ? '#1e1e24' : '#fff',
        }}
      >
        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 pt-6">
          {ADMIN_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: isActive
                    ? dm ? 'rgba(212,160,176,0.12)' : 'rgba(212,160,176,0.1)'
                    : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#D4A0B0' : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = dm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <p
                  className="text-[0.78rem] font-semibold tracking-[0.02em] leading-tight transition-colors"
                  style={{ color: isActive ? (dm ? '#f4dce4' : '#A0607A') : (dm ? '#a1a1aa' : '#888') }}
                >
                  {tab.label}
                </p>
                {isActive && (
                  <p className="text-[0.62rem] mt-0.5 leading-tight" style={{ color: dm ? '#9a8088' : '#c79bb0' }}>
                    {tab.sub}
                  </p>
                )}
              </button>
            );
          })}
        </nav>

        {/* Utility actions at bottom of sidebar — icon chips with a sun/moon
            toggle, matching the mobile menu's cleaner look */}
        <div
          className="px-3 pb-5 pt-3 flex flex-col gap-0.5"
          style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#e8e2dc'}` }}
        >
          {/* Dark / light mode */}
          <button
            onClick={onDarkModeToggle}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70 active:opacity-50"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: dm ? 'rgba(212,160,176,0.14)' : '#f5f0ec' }}>
              {dm ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#7a6f74" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </span>
            <span className="text-[0.72rem] font-medium" style={{ color: dm ? '#d4d4d8' : '#555' }}>
              {dm ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Back to site */}
          <button
            onClick={onBackToSite}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70 active:opacity-50"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: dm ? '#2e2e38' : '#f5f0ec' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#a1a1aa' : '#7a6f74'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
            </span>
            <span className="text-[0.72rem] font-medium" style={{ color: dm ? '#d4d4d8' : '#555' }}>Back to Site</span>
          </button>

          {/* Log out */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70 active:opacity-50"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </span>
            <span className="text-[0.72rem] font-medium text-red-400">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════
          MOBILE full-screen nav overlay — fades in over the page
          Matches the style of Navigation.jsx mobile menu
          ════════════════════════════════════════════════════ */}
      <div
        className={`sm:hidden fixed inset-0 z-[200] flex flex-col transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: dm ? '#1e1e24' : '#ffffff',
        }}
      >
        {/* Header row — matches height of admin header */}
        <div
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{
            height: '56px',
            borderBottom: `1px solid ${dm ? '#2e2e38' : '#f0ebe6'}`,
          }}
        >
          <span
            className="font-serif text-base tracking-[0.12em] uppercase"
            style={{ color: dm ? '#e4e4e7' : '#111' }}
          >
            Dashboard
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#2e2e38' : '#f5f0ec' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#e4e4e7' : '#111'} strokeWidth="2.2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Nav items — serif text like Navigation.jsx, sized so all sections fit */}
        <nav className="flex-1 overflow-y-auto px-6 pt-1">
          {ADMIN_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className="w-full text-left py-3.5 flex flex-col gap-0.5 active:opacity-60 transition-opacity"
                style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#f0ebe6'}` }}
              >
                <span
                  className="font-serif font-light leading-none"
                  style={{
                    fontSize: 'clamp(1.35rem, 5vw, 1.7rem)',
                    color: isActive ? '#D4A0B0' : (dm ? '#e4e4e7' : '#111'),
                  }}
                >
                  {tab.label}
                </span>
                <span
                  className="text-[0.6rem] tracking-[0.12em] uppercase mt-0.5"
                  style={{ color: dm ? '#52525b' : '#bbb' }}
                >
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Utility actions at bottom — compact rows with icon chips, sized so
            every nav section still stays visible above them without scrolling */}
        <div
          className="px-5 pb-5 pt-2 flex flex-col flex-shrink-0"
          style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#f0ebe6'}` }}
        >
          {/* Dark / light mode — sun & moon */}
          <button
            onClick={onDarkModeToggle}
            className="w-full flex items-center gap-3 py-2.5 rounded-lg active:opacity-60 transition-opacity"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: dm ? 'rgba(212,160,176,0.14)' : '#f5f0ec' }}
            >
              {dm ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#7a6f74" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </span>
            <span className="text-[0.86rem] font-medium" style={{ color: dm ? '#e4e4e7' : '#2a2a2a' }}>
              {dm ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </span>
          </button>

          {/* Back to site */}
          <button
            onClick={() => { setMobileOpen(false); onBackToSite(); }}
            className="w-full flex items-center gap-3 py-2.5 rounded-lg active:opacity-60 transition-opacity"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: dm ? '#2e2e38' : '#f5f0ec' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#a1a1aa' : '#7a6f74'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
            </span>
            <span className="text-[0.86rem] font-medium" style={{ color: dm ? '#e4e4e7' : '#2a2a2a' }}>Back to Site</span>
          </button>

          {/* Log out */}
          <button
            onClick={() => { setMobileOpen(false); onLogout(); }}
            className="w-full flex items-center gap-3 py-2.5 rounded-lg active:opacity-60 transition-opacity"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </span>
            <span className="text-[0.86rem] font-medium" style={{ color: '#ef4444' }}>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
