'use client';
import { useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { lockScroll, unlockScroll } from '@/lib/useScrollLock';
import { cx } from './ui';

export const ADMIN_TABS = [
  { key: 'bookings',     label: 'Home',           sub: 'Overview & appointments', icon: 'home'     },
  { key: 'clients',      label: 'Clients',        sub: 'Directory & smart groups', icon: 'users'    },
  { key: 'availability', label: 'Calendar',       sub: 'Appointments & days off', icon: 'calendar' },
  { key: 'services',     label: 'Services',       sub: 'Edit & update offerings',  icon: 'sparkles' },
  { key: 'reviews',      label: 'Reviews',        sub: 'Approve & manage',        icon: 'star'     },
  { key: 'classes',      label: 'Class Sign-Ups', sub: 'Registrations',           icon: 'cap'      },
  { key: 'reports',      label: 'Reports',        sub: 'Revenue & traffic',       icon: 'reports'  },
];

// Per-device saved nav order. The saved order wins for tabs it knows about; any
// tab added to ADMIN_TABS later that isn't in the saved list is appended, so a
// new section can never disappear because of an old saved order.
const NAV_ORDER_KEY = 'admin-nav-order-v1';

function loadNavOrder() {
  const known = ADMIN_TABS.map(t => t.key);
  if (typeof window === 'undefined') return known;
  try {
    const saved = JSON.parse(localStorage.getItem(NAV_ORDER_KEY));
    if (Array.isArray(saved)) {
      const ordered = saved.filter(k => known.includes(k));
      const missing = known.filter(k => !ordered.includes(k));
      return [...ordered, ...missing];
    }
  } catch { /* ignore corrupt value */ }
  return known;
}

// The order Roko dragged the sidebar into, shared by the drawer so the phone
// menu lists sections the same way.
export function useNavOrder() {
  const [order, setOrder] = useState(() => loadNavOrder());
  useEffect(() => {
    try { localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order)); } catch { /* private mode */ }
  }, [order]);
  const tabs = order.map(k => ADMIN_TABS.find(t => t.key === k)).filter(Boolean);
  return [tabs, setOrder];
}

// Line icons on a 24px grid. stroke is currentColor so each inherits its row.
export function NavIcon({ name, className, strokeWidth = 1.6 }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>;
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
        </svg>
      );
    case 'star':
      return <svg {...common}><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95z" /></svg>;
    case 'cap':
      return (
        <svg {...common}>
          <path d="M22 10 12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
          <path d="M22 10v6" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...common}>
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path d="M8 17v-5M12.5 17V8M17 17V5" />
        </svg>
      );
    case 'moon':
      return <svg {...common}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;
    case 'site':
      return <svg {...common}><path d="M7 17 17 7M8 7h9v9" /></svg>;
    case 'logout':
      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
    default:
      return null;
  }
}

function Count({ n, className }) {
  if (!n) return null;
  return (
    <span className={cx('min-w-[20px] bg-ink px-1.5 py-0.5 text-center text-[0.66rem] font-semibold tabular-nums leading-none text-paper', className)}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

// A small on/off switch, the one round control in the dashboard (it is what
// a switch looks like everywhere else, so it reads instantly).
function Switch({ on }) {
  return (
    <span aria-hidden className={cx('relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors duration-300', on ? 'bg-ink' : 'bg-line-strong')}>
      <span className={cx('absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-paper transition-transform duration-300 ease-quint', on && 'translate-x-[14px]')} />
    </span>
  );
}

// ---- laptop ---------------------------------------------------------------------------

// Pinned down the left, full height. Drag a row's grip to reorder; the order is
// saved on this device and the phone menu follows it.
export default function AdminSidebar({ activeTab, setActiveTab, counts = {}, darkMode: dm, onDarkModeToggle, onBackToSite, onLogout, tabs, setOrder }) {
  const onDragEnd = (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return next;
    });
  };

  return (
    <aside className="sticky top-0 hidden h-[100svh] w-[244px] shrink-0 flex-col border-r border-line bg-paper lg:flex">
      <a href="/" className="block px-6 pb-6 pt-7">
        <span className="block text-[1.12rem] font-semibold leading-none tracking-[-0.02em] text-ink">Roqia Moshref</span>
        <span className="mt-2 block text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-rose">Studio dashboard</span>
      </a>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="admin-nav">
          {(drop) => (
            <nav ref={drop.innerRef} {...drop.droppableProps} aria-label="Dashboard" className="flex-1 overflow-y-auto border-t border-line px-3 py-4">
              {tabs.map((tab, index) => {
                const on = activeTab === tab.key;
                return (
                  <Draggable key={tab.key} draggableId={tab.key} index={index}>
                    {(drag, snap) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={cx(
                          'group relative flex items-center transition-colors duration-200',
                          snap.isDragging ? 'bg-paper shadow-[0_8px_24px_rgba(0,0,0,0.14)]' : on ? 'bg-canvas' : 'hover:bg-canvas/70',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveTab(tab.key)}
                          aria-current={on ? 'page' : undefined}
                          className={cx(
                            'flex h-10 min-w-0 flex-1 items-center gap-3 pl-3 pr-2 text-left text-[0.88rem] transition-colors',
                            on ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink',
                          )}
                        >
                          <NavIcon name={tab.icon} strokeWidth={on ? 1.9 : 1.6} className="h-[18px] w-[18px] shrink-0" />
                          <span className="flex-1 truncate">{tab.label}</span>
                          <Count n={counts[tab.key]} />
                        </button>
                        <span
                          {...drag.dragHandleProps}
                          aria-label={`Reorder ${tab.label}`}
                          className="flex h-10 w-6 shrink-0 cursor-grab items-center justify-center text-ink-muted/60 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
                            <circle cx="9" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" />
                            <circle cx="15" cy="6" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="15" cy="18" r="1.4" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {drop.placeholder}
            </nav>
          )}
        </Droppable>
      </DragDropContext>

      <div className="border-t border-line px-3 py-3">
        <button type="button" onClick={onDarkModeToggle} aria-pressed={dm} className="flex h-10 w-full items-center gap-3 px-3 text-[0.84rem] text-ink-muted transition-colors hover:bg-canvas/70 hover:text-ink">
          <NavIcon name="moon" className="h-[17px] w-[17px] shrink-0" />
          <span className="flex-1 text-left">Dark mode</span>
          <Switch on={dm} />
        </button>
        <button type="button" onClick={onBackToSite} className="flex h-10 w-full items-center gap-3 px-3 text-[0.84rem] text-ink-muted transition-colors hover:bg-canvas/70 hover:text-ink">
          <NavIcon name="site" className="h-[17px] w-[17px] shrink-0" />
          View the website
        </button>
        <button type="button" onClick={onLogout} className="flex h-10 w-full items-center gap-3 px-3 text-[0.84rem] text-ink-muted transition-colors hover:bg-canvas/70 hover:text-tone-alert">
          <NavIcon name="logout" className="h-[17px] w-[17px] shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}

// ---- phone -------------------------------------------------------------------------------

const today = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// The phone's menu. Slides in from the left over a dimmed page, frosted so the
// screen you came from still shows through. Swipe it back to the left, tap
// outside it, press Escape or pick a section to close it.
export function AdminDrawer({ open, onClose, activeTab, setActiveTab, counts = {}, darkMode: dm, onDarkModeToggle, onBackToSite, onLogout, tabs }) {
  const root = useRef(null);
  const closeButton = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lockScroll();
    const t = setTimeout(() => closeButton.current?.focus({ preventScroll: true }), 60);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      unlockScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Follow the finger while it drags the panel left, then decide on release:
  // far enough or fast enough closes, anything less springs back. The offset
  // goes straight to a CSS variable, so a drag never re-renders React.
  const setDrag = (px) => root.current?.style.setProperty('--drag', `${px}px`);
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse') return;
    drag.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, live: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.live) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      d.live = true;
      root.current?.setAttribute('data-dragging', 'true');
    }
    d.dx = Math.min(0, dx);
    setDrag(d.dx);
  };
  const onPointerEnd = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.live) return;
    root.current?.removeAttribute('data-dragging');
    const v = d.dx / Math.max(1, e.timeStamp - d.t);
    setDrag(0);
    if (d.dx < -80 || v < -0.45) onClose();
    // The drag ended on whatever was under the finger. It was a swipe, not a tap.
    const swallow = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 50);
  };

  const pick = (key) => {
    setActiveTab(key);
    onClose();
  };

  let i = 0;
  const row = 'drawer-item press flex h-12 w-full items-center gap-3.5 px-3 text-left text-[0.92rem] text-ink-soft active:bg-ink/[0.04]';

  return (
    <div ref={root} className="drawer lg:hidden" data-open={open ? 'true' : 'false'}>
      <div aria-hidden className="drawer-scrim fixed inset-0 z-[300] bg-black/35" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="drawer-panel fixed inset-y-0 left-0 z-[301] flex w-[min(86vw,340px)] touch-pan-y flex-col border-r border-paper/60 bg-paper/[0.84] shadow-[inset_-1px_0_0_rgb(var(--c-ink)/0.06)] backdrop-blur-2xl backdrop-saturate-[1.8]"
      >
        <div className="flex items-center gap-1 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="press flex h-11 w-11 shrink-0 items-center justify-center text-ink"
          >
            <span className="burger" data-x={open ? 'true' : 'false'}><i /><i /><i /></span>
          </button>
          <div className="min-w-0 pl-1">
            <span className="block truncate text-[1.08rem] font-semibold leading-none tracking-[-0.02em] text-ink">Roqia Moshref</span>
            <span className="mt-1.5 block truncate text-[0.72rem] text-ink-muted">{today()}</span>
          </div>
        </div>

        <nav aria-label="Dashboard" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3">
          {tabs.map((tab) => {
            const on = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => pick(tab.key)}
                aria-current={on ? 'page' : undefined}
                style={{ '--i': i++ }}
                className={cx(
                  'drawer-item press flex h-[52px] w-full items-center gap-3.5 px-3 text-left text-[0.98rem]',
                  on ? 'bg-ink/[0.06] font-semibold text-ink' : 'text-ink-soft active:bg-ink/[0.04]',
                )}
              >
                <span
                  className={cx(
                    'flex h-9 w-9 shrink-0 items-center justify-center transition-colors duration-300',
                    on ? 'bg-ink text-paper' : 'bg-paper/80 text-ink-soft shadow-[0_0_0_1px_rgb(var(--c-ink)/0.08)]',
                  )}
                >
                  <NavIcon name={tab.icon} strokeWidth={on ? 1.9 : 1.6} className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 truncate">{tab.label}</span>
                <Count n={counts[tab.key]} className="text-[0.7rem]" />
              </button>
            );
          })}

          <div className="drawer-item mx-3 my-3 h-px bg-ink/10" style={{ '--i': i++ }} />

          <button type="button" onClick={onDarkModeToggle} aria-pressed={dm} className={row} style={{ '--i': i++ }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center"><NavIcon name="moon" className="h-[18px] w-[18px]" /></span>
            <span className="flex-1">Dark mode</span>
            <Switch on={dm} />
          </button>
          <button type="button" onClick={() => { onClose(); onBackToSite(); }} className={row} style={{ '--i': i++ }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center"><NavIcon name="site" className="h-[18px] w-[18px]" /></span>
            View the website
          </button>
        </nav>

        <div className="drawer-item flex items-center gap-3 border-t border-ink/10 px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3.5" style={{ '--i': i++ }}>
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-wash text-[0.8rem] font-semibold text-rose">R</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.88rem] font-medium text-ink">Roqia</p>
            <p className="truncate text-[0.74rem] text-ink-muted">Makeup by Roko</p>
          </div>
          <button type="button" onClick={() => { onClose(); onLogout(); }} className="press -mr-2 h-10 px-2 text-[0.8rem] font-medium text-ink-muted">
            Log out
          </button>
        </div>
      </aside>
    </div>
  );
}
