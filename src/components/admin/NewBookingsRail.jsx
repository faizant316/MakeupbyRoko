import { useState } from 'react';
import StatusBadge from './StatusBadge';

// "2 new bookings — Ghazel · Luxury Bridal Look · 12h ago", tap to see them all.
//
// Its own component because it renders in two places and only ever one of them
// shows: inside the Appointments list on a laptop, where it sits with the rest
// of that workspace, and at the very top of the page on a phone, above the
// calendar. On a phone the appointments list is three scrolls down, which meant
// the one thing she opens the admin to check — did anyone book? — was the one
// thing she had to go looking for.
export default function NewBookingsRail({ bookings, loading = false, onSelect, darkMode: dm, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Created within the last 24 hours. Booksy imports are excluded — importing
  // 563 clients shouldn't wall the rail.
  const now = Date.now();
  const recent = (bookings || [])
    .filter(b => b.source !== 'booksy' && b.created_date && (now - new Date(b.created_date).getTime()) < 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // While the bookings are still in flight there's nothing to show and no way
  // to know whether there will be, so the rail holds its own space with a
  // placeholder the same height. Otherwise the calendar paints first and then
  // gets shoved down the moment the fetch lands, which is the jump she sees on
  // every refresh. When the answer turns out to be "no new bookings" the
  // placeholder folds away instead of snapping.
  if (loading) {
    return (
      <div className={className} aria-hidden="true">
        <div className="rounded-xl px-3.5 py-3 flex items-center gap-2.5"
          style={{ background: dm ? 'rgba(196,132,154,0.06)' : '#FBF7F9', border: `1px solid ${dm ? 'rgba(196,132,154,0.14)' : '#F3E9ED'}` }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dm ? 'rgba(196,132,154,0.4)' : '#EBD7E0' }} />
          <span className="min-w-0 flex-1">
            <span className="block h-3.5 w-32 rounded-full" style={{ background: dm ? 'rgba(255,255,255,0.07)' : '#F0E3E9' }} />
            <span className="block h-2.5 w-44 max-w-full rounded-full mt-2" style={{ background: dm ? 'rgba(255,255,255,0.05)' : '#F5EDF0' }} />
          </span>
        </div>
      </div>
    );
  }

  if (recent.length === 0) return null;

  const timeAgo = (iso) => {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  };

  const matches = (b) => !search || [b.name, b.service, b.email].some(f => f?.toLowerCase().includes(search.toLowerCase()));
  const shown = recent.filter(matches);

  return (
    <div className={`relative ${className}`}>
      {/* Written in the list's own language: the same small dot, serif label and
          grey count pill the group headers below it use. The version before this
          was a rounded-square badge with a red dot welded to its corner — the
          notification-chip cliché, belonging to no other part of this admin, and
          it read as a widget stapled on rather than the top of the list it
          introduces. The rose wash is all the emphasis it needs. */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors"
        style={{
          background: dm ? 'rgba(196,132,154,0.1)' : '#FCF4F8',
          border: `1px solid ${dm ? 'rgba(196,132,154,0.26)' : '#F1DFE8'}`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = dm ? 'rgba(196,132,154,0.16)' : '#F9EBF2'}
        onMouseLeave={e => e.currentTarget.style.background = dm ? 'rgba(196,132,154,0.1)' : '#FCF4F8'}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#C4849A' }} />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-serif text-[1.05rem] leading-none" style={{ color: dm ? '#f0dfe7' : '#8A4A63' }}>
              {recent.length === 1 ? 'New booking' : 'New bookings'}
            </span>
            <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 tabular-nums"
              style={{ background: dm ? 'rgba(255,255,255,0.08)' : 'rgba(160,96,122,0.1)', color: dm ? '#d8bcc9' : '#9C6A81' }}>
              {recent.length}
            </span>
          </span>
          <span className="block text-[0.75rem] mt-1 truncate" style={{ color: dm ? '#b79fac' : '#9C7686' }}>
            {(recent[0].name || 'Someone').split(' ')[0]}
            {recent[0].service ? ` · ${recent[0].service}` : ''}
            {` · ${timeAgo(recent[0].created_date)}`}
          </span>
        </span>

        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[0.78rem] font-medium" style={{ color: dm ? '#b79fac' : '#8A5F71' }}>
            {open ? 'Hide' : 'View'}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#b79fac' : '#8A5F71'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="w-3.5 h-3.5"
            style={{ transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {/* Animates max-height + opacity only, so it stays smooth on mobile where
          animating height / grid-rows forces per-frame layout + repaint. */}
      <div
        className="mt-2 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: dm ? '#27272a' : '#fff',
          border: `1px solid ${dm ? '#3f3f46' : '#EAEBF0'}`,
          maxHeight: open ? 'min(60vh, 420px)' : '0px',
          opacity: open ? 1 : 0,
          marginTop: open ? undefined : 0,
          borderWidth: open ? '1px' : '0px',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'max-height 320ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease, margin-top 320ms ease',
        }}
      >
        {/* A search box above a handful of rows is just clutter. */}
        {recent.length > 6 && (
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.06)' : 'rgba(113, 113, 122,0.1)'}` }}>
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="#a3a3ad" strokeWidth="1.5" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search recent clients…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-base sm:text-[0.8rem] outline-none transition-all"
                style={{ background: dm ? '#1e1e24' : '#FAFAFB', border: `1px solid ${dm ? '#3f3f46' : '#E8E9EE'}`, color: dm ? '#e4e4e7' : '#111' }}
                onClick={e => e.stopPropagation()}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#777] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {shown.map(b => (
            <button
              key={b.id}
              onClick={() => onSelect?.(b)}
              className="flex items-center gap-3.5 w-full text-left px-5 py-4 transition-colors"
              style={{ borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(113, 113, 122,0.08)'}` }}
              onMouseEnter={e => e.currentTarget.style.background = dm ? '#3f3f46' : '#FAFAFB'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: dm ? '#3a2e35' : '#F6E3EA' }}>
                <span className="font-serif text-[0.85rem]" style={{ color: dm ? '#e7c9d5' : '#A0607A' }}>
                  {(b.name || '?').trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.875rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.name}</p>
                <p className="text-[0.72rem] truncate mt-0.5" style={{ color: dm ? '#8e8e99' : '#a3a3ad' }}>
                  {b.service}
                  {b.date && <span style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>{' · '}{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[0.6rem] font-medium tabular-nums" style={{ color: dm ? '#a06070' : '#c48090' }}>
                  {timeAgo(b.created_date)}
                </span>
                <StatusBadge status={b.status} />
              </div>
            </button>
          ))}
          {search && shown.length === 0 && (
            <div className="py-6 text-center text-[0.78rem]" style={{ color: dm ? '#7a7a84' : '#bcbcc4' }}>No results for "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
