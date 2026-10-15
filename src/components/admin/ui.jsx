'use client';
// The dashboard's small parts. Square cards on hairlines, 4px corners on the
// things you press or type into, no shadows doing the work a 1px line can do.
// Colours come from the variables in admin.css, so nothing here needs to know
// whether dark mode is on.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '@/lib/useScrollLock';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

// ---- buttons -----------------------------------------------------------------------

const VARIANTS = {
  solid: 'bg-ink text-paper hover:bg-ink/85',
  quiet: 'border border-line-strong bg-paper text-ink hover:border-ink/50',
  ghost: 'text-ink-soft hover:bg-canvas hover:text-ink',
  rose: 'bg-rose text-paper hover:bg-rose/90',
  danger: 'border border-line-strong bg-paper text-tone-alert hover:border-tone-alert/60',
  // The destructive action itself, once she's been asked (Delete, Close the day).
  alert: 'bg-tone-alert text-paper hover:bg-tone-alert/90',
};

const SIZES = {
  sm: 'h-9 gap-1.5 px-3.5 text-[0.8rem]',
  md: 'h-10 gap-2 px-4 text-[0.84rem]',
  lg: 'h-12 gap-2 px-6 text-[0.9rem]',
};

export const buttonClass = (variant = 'quiet', size = 'md', className) => cx(
  'press inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-ctl font-medium tracking-[-0.005em]',
  'disabled:pointer-events-none disabled:opacity-40',
  VARIANTS[variant],
  SIZES[size],
  className,
);

export function Button({ variant = 'quiet', size = 'md', icon: Icon, className, children, type = 'button', ...rest }) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {Icon ? <Icon aria-hidden className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : null}
      {children}
    </button>
  );
}

// A 44px square target around a small icon, for bars and headers.
export function IconButton({ label, className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx('press flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-ink', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---- surfaces ----------------------------------------------------------------------

// A white panel on the canvas: square, one hairline, no shadow. `title` is set
// the way an app titles a group: sentence case, semibold.
export function Panel({ title, sub, action, children, className, bodyClassName, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={cx('rounded-card border border-line bg-paper', className)} {...rest}>
      {title || action ? (
        <header className="flex min-h-[52px] items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="truncate text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">{title}</h2> : null}
            {sub ? <p className="mt-0.5 truncate text-[0.76rem] text-ink-muted">{sub}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

// The small uppercase label over a field or a group.
export function Label({ children, className, ...rest }) {
  return (
    <span className={cx('text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted', className)} {...rest}>
      {children}
    </span>
  );
}

// Boxed inputs. 16px on a phone: anything smaller and iOS zooms the page in
// when the field is tapped.
export const inputClass =
  'h-11 w-full rounded-ctl border border-line bg-paper px-3 text-[16px] text-ink placeholder:text-ink-muted/70 transition-colors duration-200 focus:border-ink/60 focus:outline-none sm:text-[0.9rem]';

// A group of rows in one panel, on hairlines: square, no shadows, the whole
// row is the target. Rows inside should pad px-4 sm:px-5.
export function RowPanel({ children, className, ...rest }) {
  return <div className={cx('divide-y divide-line overflow-hidden rounded-card border border-line bg-paper', className)} {...rest}>{children}</div>;
}

// A small uppercase tag beside a name (Bridal, Booksy, Signed). Pass the tone
// as classes, e.g. "bg-rose/10 text-rose", or leave it neutral.
export function Tag({ className, children, title }) {
  return (
    <span title={title} className={cx('inline-flex h-[18px] shrink-0 items-center gap-1 rounded-full px-2 text-[0.56rem] font-semibold uppercase tracking-[0.1em]', className || 'text-ink-muted shadow-[inset_0_0_0_1px_rgb(var(--c-line-strong))]')}>
      {children}
    </span>
  );
}

// ---- segmented control ---------------------------------------------------------------

// iOS-style, squared off. The selected segment is a white tile on the canvas.
export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div role="tablist" className={cx('inline-flex rounded-ctl border border-line bg-canvas', size === 'lg' ? 'p-1' : 'p-0.5', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex items-center gap-1.5 rounded-[6px] font-medium transition-[color,background-color,box-shadow] duration-200',
              size === 'sm' ? 'h-7 px-2.5 text-[0.74rem]'
                : size === 'lg' ? 'h-10 px-4 text-[0.92rem] sm:px-5'
                : 'h-8 px-3 text-[0.78rem] sm:px-3.5',
              on ? 'bg-paper text-ink shadow-[0_0_0_1px_rgb(var(--c-line))]' : 'text-ink-muted hover:text-ink',
            )}
          >
            {o.label}
            {o.count != null ? <span className="tabular-nums text-ink-muted">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ---- fold ------------------------------------------------------------------------------

// A section that opens and shuts (see .fold in admin.css). `lazy` builds the
// body the first time it opens and keeps it after, so a closed section costs
// nothing on the way in.
export function Fold({ open, lazy = false, className, children }) {
  const [seen, setSeen] = useState(open);
  useEffect(() => {
    if (open) setSeen(true);
  }, [open]);
  return (
    <div className={cx('fold', className)} data-open={open ? 'true' : 'false'}>
      <div>
        <div>{!lazy || seen ? children : null}</div>
      </div>
    </div>
  );
}

// The chevron every fold header carries. Turns with the fold.
export function Chevron({ open, className }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('h-4 w-4 shrink-0 transition-transform duration-500 ease-quint', open && 'rotate-180', className)}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ---- sheets ------------------------------------------------------------------------------

// Keeps something mounted for `ms` after it is told to close, so it can play
// its exit. state is 'open' while shown and 'closing' while it leaves.
export function usePresence(open, ms = 260) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState(open ? 'open' : 'closed');
  useEffect(() => {
    if (open) {
      setMounted(true);
      setState('open');
      return undefined;
    }
    if (!mounted) return undefined;
    setState('closing');
    const t = setTimeout(() => {
      setMounted(false);
      setState('closed');
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return { mounted, state };
}

// Every pop-up: a sheet from the bottom on a phone, a centred panel on a
// laptop. Owns the things each one has to get right: the page underneath must
// not move, Escape closes, focus goes in and comes back to whatever opened it,
// and it leaves the way it came instead of vanishing.
//
// `footer` is pinned below the scrolling body, clear of the phone's home bar.
// `size` sets the laptop width.
const WIDTHS = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[560px]', lg: 'sm:max-w-[680px]', xl: 'sm:max-w-[880px]' };

export function Sheet({ open, onClose, title, eyebrow, children, footer, size = 'md', bodyClassName, headerExtra, closeLabel = 'Close' }) {
  const { mounted, state } = usePresence(open, 260);
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  // Held in a ref: an inline onClose changes identity every render, and
  // re-running the effect below would pull focus out of a field mid-typing.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => closeRef.current?.(), []);

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement;
    lockScroll();
    const t = setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      unlockScroll();
      // preventScroll: focus() scrolls its target into view by default, which
      // would yank the page back to the button that opened the sheet.
      if (restoreRef.current?.isConnected) restoreRef.current.focus({ preventScroll: true });
    };
  }, [open, close]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="sheet admin-ui fixed inset-0 z-[400]" data-state={state}>
      {/* A plain dim, no blur. A full-screen backdrop-filter costs a fresh blur
          of the whole page on every frame of the entrance, and that is most of
          the stutter a sheet can have on an older phone. */}
      <div aria-hidden className="sheet-scrim absolute inset-0 bg-black/50" onClick={close} />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          tabIndex={-1}
          className={cx('sheet-panel pointer-events-auto flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[18px] bg-paper sm:rounded-card text-ink outline-none sm:max-h-[88svh] sm:border sm:border-line', WIDTHS[size])}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
            <div className="min-w-0">
              {eyebrow ? <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-rose">{eyebrow}</p> : null}
              {title ? <h2 className="mt-1 text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[1.55rem]">{title}</h2> : null}
              {headerExtra}
            </div>
            <IconButton label={closeLabel} onClick={close} className="-mr-3 -mt-2 text-ink-muted hover:text-ink">
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
          <div className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain', bodyClassName ?? 'px-5 py-5 sm:px-7 sm:py-6')} data-lenis-prevent>
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-line bg-paper px-5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---- search ------------------------------------------------------------------------------

// Search as a line, not a box: the glass, a hairline that darkens on focus,
// and the word Search.
export function SearchLine({ value, onChange, inputRef, className, placeholder = 'Search', size = 'md' }) {
  const lg = size === 'lg';
  return (
    <div className={cx('group flex items-center border-b border-line transition-colors duration-200 focus-within:border-ink/40', lg ? 'gap-3 pb-3' : 'gap-2.5 pb-2', className)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={cx('shrink-0 text-ink-muted transition-colors group-focus-within:text-ink-soft', lg ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx('min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-ink outline-none placeholder:text-ink-muted/80 [&::-webkit-search-cancel-button]:hidden', lg ? 'text-[16px] sm:text-[0.98rem]' : 'text-[16px] sm:text-[0.86rem]')}
        onClick={e => e.stopPropagation()}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="press -mr-1 flex h-6 w-6 shrink-0 items-center justify-center text-ink-muted hover:text-ink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
