import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Month / year jump for the booking calendar.
 *
 * The calendar panel is `overflow-hidden` (it clips the soft glow accents), so
 * a normally-positioned dropdown would get cut off — which is why this used to
 * fall back to a raw native <select> that looks rough on desktop. This renders
 * its menu into <body> via a portal so it escapes that clipping while staying
 * fully styleable. On touch devices it uses the native <select> wheel, which is
 * genuinely nicer to operate with a thumb.
 */
/**
 * `hideChevron` drops this trigger's own chevron. Used for the month half of the
 * month+year pair: two chevrons side by side read as two controls, when the pair
 * is really one "which month am I looking at" affordance.
 */
export default function CalendarNavSelect({ value, options, onChange, ariaLabel, align = 'center', menuMinWidth = 150, hideChevron = false }) {
  const [open, setOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    // Coarse pointer = phone/tablet → prefer the native wheel picker.
    setIsTouch(typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
  }, []);

  const selected = options.find(o => String(o.value) === String(value));

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(r.width + 28, menuMinWidth);
    let left = align === 'right' ? r.right - w : align === 'left' ? r.left : r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    // Flip above the trigger if there isn't room below.
    const below = window.innerHeight - r.bottom;
    const openUp = below < 300 && r.top > below;
    setCoords({ left, width: w, openUp, top: r.bottom + 8, bottom: window.innerHeight - r.top + 8 });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const reposition = () => place();
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Center the selected row when opening a long list (years).
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    if (el) listRef.current.scrollTop = el.offsetTop - listRef.current.clientHeight / 2 + el.clientHeight / 2;
  }, [open, coords]);

  // Touch: native wheel, but keep the same serif trigger look.
  if (isTouch) {
    return (
      <div className="relative inline-flex items-center">
        <span className="font-serif text-[1.2rem] text-[#111] tracking-tight inline-flex items-center gap-1.5 pointer-events-none">
          {selected?.label}
          {!hideChevron && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-[#C4849A]"><polyline points="6 9 12 15 18 9" /></svg>
          )}
        </span>
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={e => onChange(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ WebkitAppearance: 'none' }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`group inline-flex items-center gap-1.5 font-serif text-[1.2rem] text-[#111] tracking-tight rounded-lg px-2.5 py-1 transition-colors cursor-pointer outline-none
          ${open ? 'bg-[#D4A0B0]/12' : 'hover:bg-[#F6EEF1]'}`}
      >
        {selected?.label}
        {!hideChevron && (
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-3.5 h-3.5 text-[#C4849A] transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="fixed z-[9999] bg-white border border-[#EFE4E9] rounded-2xl shadow-[0_14px_44px_rgba(70,35,48,0.18)] overflow-hidden"
          style={{
            left: coords.left,
            width: coords.width,
            ...(coords.openUp ? { bottom: coords.bottom } : { top: coords.top }),
            animation: 'fadeSlideDown 0.15s ease-out',
          }}
        >
          <div ref={listRef} data-lenis-prevent className="max-h-[268px] overflow-y-auto overscroll-contain py-1.5">
            {options.map(o => {
              const isSel = String(o.value) === String(value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  data-selected={isSel}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between text-left px-4 py-2.5 font-serif text-[0.92rem] transition-colors cursor-pointer select-none
                    ${isSel ? 'bg-[#D4A0B0]/12 text-[#B06883]' : 'text-[#3A2C26] hover:bg-[#FAF4F7]'}`}
                >
                  {o.label}
                  {isSel && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
