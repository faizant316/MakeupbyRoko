'use client';
import { useEffect } from 'react';

export const ADMIN_TABS = [
  { key: 'bookings',     label: 'Home',           sub: 'Overview & appointments', icon: 'home'     },
  { key: 'clients',      label: 'Clients',        sub: 'Directory & smart groups', icon: 'users'    },
  { key: 'availability', label: 'Availability',   sub: 'Capacity & days off',     icon: 'calendar' },
  { key: 'services',     label: 'Services',       sub: 'Edit & update offerings',  icon: 'sparkles' },
  { key: 'reviews',      label: 'Reviews',        sub: 'Approve & manage',        icon: 'star'     },
  { key: 'classes',      label: 'Class Sign-Ups', sub: 'Registrations',           icon: 'cap'      },
  { key: 'analytics',    label: 'Analytics',      sub: 'Insights & trends',       icon: 'chart'    },
  { key: 'revenue',      label: 'Revenue',        sub: 'Revenue & booking stats', icon: 'revenue'  },
];

/* Modern, crisp line icons (Lucide-style, 24px grid, round joins). stroke is
   currentColor so each icon inherits the nav item's active/muted color. */
function NavIcon({ name, className, style }) {
  const common = {
    className,
    style,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3l1.9 4.9L18.8 9.8 13.9 11.7 12 16.6 10.1 11.7 5.2 9.8 10.1 7.9z" />
          <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
          <path d="M5 4.5l.5 1.3 1.3.5-1.3.5L5 8.1 4.5 6.8 3.2 6.3 4.5 5.8z" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95z" />
        </svg>
      );
    case 'cap':
      return (
        <svg {...common}>
          <path d="M22 10 12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
          <path d="M22 10v6" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path d="M7 14l3.5-4 3 3L21 6" />
        </svg>
      );
    case 'revenue':
      return (
        <svg {...common}>
          <path d="M12 2v20" />
          <path d="M17 5.5H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H6" />
        </svg>
      );
    default:
      return null;
  }
}

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
          borderRight: `1px solid ${dm ? '#2e2e38' : '#E5E7EB'}`,
          background: dm ? '#1e1e24' : '#fff',
        }}
      >
        {/* Nav items — icon + label rows, ChatGPT-style rounded highlight */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 pt-6">
          {ADMIN_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const activeColor = dm ? '#f4dce4' : '#A0607A';
            const mutedColor = dm ? '#a1a1aa' : '#8a8a8a';
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: isActive
                    ? dm ? 'rgba(212,160,176,0.14)' : 'rgba(212,160,176,0.12)'
                    : 'transparent',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <NavIcon
                  name={tab.icon}
                  className="w-[18px] h-[18px] flex-shrink-0 transition-colors"
                  style={{ color: isActive ? activeColor : mutedColor }}
                />
                <span className="flex flex-col min-w-0">
                  <span
                    className="text-[0.82rem] font-medium leading-tight truncate transition-colors"
                    style={{ color: isActive ? activeColor : (dm ? '#d4d4d8' : '#3f3f46') }}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="text-[0.62rem] mt-0.5 leading-tight truncate" style={{ color: dm ? '#9a8088' : '#c79bb0' }}>
                      {tab.sub}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Utility actions at bottom of sidebar — icon chips with a sun/moon
            toggle, matching the mobile menu's cleaner look */}
        <div
          className="px-3 pb-5 pt-3 flex flex-col gap-0.5"
          style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#E5E7EB'}` }}
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
            borderBottom: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}`,
          }}
        >
          <span
            className="text-base font-semibold tracking-[0.02em]"
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

        {/* Nav items — icon chip + label rows, sized so all sections fit */}
        <nav className="flex-1 overflow-y-auto px-5 pt-1">
          {ADMIN_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const activeColor = '#D4A0B0';
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className="w-full text-left py-3 flex items-center gap-3.5 active:opacity-60 transition-opacity"
                style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}` }}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isActive
                      ? 'rgba(212,160,176,0.16)'
                      : dm ? '#2a2a32' : '#f5f0ec',
                  }}
                >
                  <NavIcon
                    name={tab.icon}
                    className="w-[19px] h-[19px]"
                    style={{ color: isActive ? activeColor : (dm ? '#a1a1aa' : '#7a6f74') }}
                  />
                </span>
                <span className="flex flex-col min-w-0">
                  <span
                    className="font-medium leading-tight"
                    style={{
                      fontSize: 'clamp(1.05rem, 4.4vw, 1.3rem)',
                      color: isActive ? activeColor : (dm ? '#e4e4e7' : '#1a1a1a'),
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
                </span>
              </button>
            );
          })}
        </nav>

        {/* Utility actions at bottom — compact rows with icon chips, sized so
            every nav section still stays visible above them without scrolling */}
        <div
          className="px-5 pb-5 pt-2 flex flex-col flex-shrink-0"
          style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#ECEDF1'}` }}
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
