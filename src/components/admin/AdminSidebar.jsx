'use client';
import { useEffect } from 'react';

export const ADMIN_TABS = [
  { key: 'bookings',   label: 'Home',         sub: 'Overview & appointments' },
  { key: 'services',   label: 'Services',     sub: 'Edit & update offerings'  },
  { key: 'reviews',    label: 'Reviews',      sub: 'Approve & manage'         },
  { key: 'classes',    label: 'Class Sign-Ups', sub: 'Registrations'          },
  { key: 'analytics',  label: 'Analytics',    sub: 'Insights & trends'        },
  { key: 'revenue',    label: 'Revenue',      sub: 'Revenue & booking stats'  },
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
  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  const handleTabClick = (key) => {
    setActiveTab(key);
    setMobileOpen(false);
  };

  /* ── Utility row helpers ───────────────────────────────── */
  const DarkToggle = ({ size = 'sm' }) => (
    <button
      onClick={onDarkModeToggle}
      className={`flex items-center gap-2.5 transition-opacity hover:opacity-70 active:opacity-50 ${size === 'lg' ? 'py-2' : 'w-full px-3.5 py-2.5 rounded-xl'}`}
    >
      {/* Mini toggle pill */}
      <div
        className="relative rounded-full flex items-center flex-shrink-0 px-0.5 transition-colors duration-300"
        style={{ width: size === 'lg' ? '34px' : '28px', height: size === 'lg' ? '20px' : '16px', background: dm ? '#D4A0B0' : '#e2dbd5' }}
      >
        <div
          className="rounded-full shadow-sm transition-transform duration-300"
          style={{
            width:  size === 'lg' ? '16px' : '12px',
            height: size === 'lg' ? '16px' : '12px',
            background: dm ? '#1a1210' : '#fff',
            transform: dm
              ? `translateX(${size === 'lg' ? '14px' : '12px'})`
              : 'translateX(0px)',
          }}
        />
      </div>
      <span
        className={`font-medium ${size === 'lg' ? 'text-[0.85rem]' : 'text-[0.7rem]'}`}
        style={{ color: dm ? '#71717a' : '#888' }}
      >
        {dm ? (size === 'lg' ? 'Switch to Light Mode' : 'Light Mode') : (size === 'lg' ? 'Switch to Dark Mode' : 'Dark Mode')}
      </span>
    </button>
  );

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
                className="w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: isActive
                    ? dm ? 'rgba(212,160,176,0.1)' : 'rgba(0,0,0,0.055)'
                    : 'transparent',
                  borderLeft: `3px solid ${isActive ? (dm ? '#D4A0B0' : '#111') : 'transparent'}`,
                }}
              >
                <p
                  className="text-[0.75rem] font-semibold tracking-[0.02em] leading-tight"
                  style={{ color: isActive ? (dm ? '#e4e4e7' : '#111') : (dm ? '#71717a' : '#aaa') }}
                >
                  {tab.label}
                </p>
                {isActive && (
                  <p className="text-[0.62rem] mt-0.5 leading-tight" style={{ color: dm ? '#52525b' : '#ccc' }}>
                    {tab.sub}
                  </p>
                )}
              </button>
            );
          })}
        </nav>

        {/* Utility actions at bottom of sidebar */}
        <div
          className="px-3 pb-6 pt-4 flex flex-col gap-0.5"
          style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#e8e2dc'}` }}
        >
          <DarkToggle size="sm" />

          <button
            onClick={onBackToSite}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-opacity hover:opacity-70 active:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#71717a' : '#aaa'} strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
            </svg>
            <span className="text-[0.7rem] font-medium" style={{ color: dm ? '#71717a' : '#aaa' }}>Back to Site</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-opacity hover:opacity-70 active:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            <span className="text-[0.7rem] font-medium text-red-400">Log Out</span>
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

        {/* Nav items — large serif text like Navigation.jsx */}
        <nav className="flex-1 overflow-y-auto px-6 pt-2">
          {ADMIN_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className="w-full text-left py-5 flex flex-col gap-1 active:opacity-60 transition-opacity"
                style={{ borderBottom: `1px solid ${dm ? '#2e2e38' : '#f0ebe6'}` }}
              >
                <span
                  className="font-serif font-light leading-none"
                  style={{
                    fontSize: 'clamp(1.7rem, 6vw, 2.1rem)',
                    color: isActive ? '#D4A0B0' : (dm ? '#e4e4e7' : '#111'),
                  }}
                >
                  {tab.label}
                </span>
                <span
                  className="text-[0.65rem] tracking-[0.12em] uppercase mt-0.5"
                  style={{ color: dm ? '#52525b' : '#bbb' }}
                >
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Utility actions at bottom */}
        <div
          className="px-6 pb-8 pt-6 flex flex-col gap-5 flex-shrink-0"
          style={{ borderTop: `1px solid ${dm ? '#2e2e38' : '#f0ebe6'}` }}
        >
          <DarkToggle size="lg" />

          <button
            onClick={() => { setMobileOpen(false); onBackToSite(); }}
            className="flex items-center gap-3 active:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#71717a' : '#888'} strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
            </svg>
            <span className="text-[0.82rem] font-medium" style={{ color: dm ? '#71717a' : '#888' }}>Back to Site</span>
          </button>

          <button
            onClick={() => { setMobileOpen(false); onLogout(); }}
            className="flex items-center gap-3 active:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            <span className="text-[0.82rem] font-medium text-red-400">Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
