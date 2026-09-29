'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock, useHideSiteNav } from '@/lib/useScrollLock';
import CompareSlider from './CompareSlider';
import CtaArrow from './CtaArrow';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CloseIcon = ({ light }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : '#111'} strokeWidth="2.2" strokeLinecap="round" width={15} height={15} aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden="true">
    {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);
export const IconInstagram = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size} style={{ flexShrink: 0 }} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// One look inside the viewer. A compare pair gets a frame at the photos' own
// aspect ratio so the divider spans the photo exactly, not the letterbox
// around it. A story screenshot already has its before inset baked in by
// Instagram, so it is shown whole.
function Slide({ it, active, near }) {
  if (it.type === 'compare') {
    return (
      <div className="relative h-full max-w-full rounded-lg sm:rounded-none overflow-hidden" style={{ aspectRatio: `${it.w} / ${it.h}` }}>
        <CompareSlider
          before={it.before}
          after={it.after}
          alt={it.title}
          mode="drag"
          peek={active}
          peekDelay={350}
          focusable={active}
          loading={near ? 'eager' : 'lazy'}
          position="center"
          className="w-full h-full"
        />
      </div>
    );
  }
  return (
    <img
      src={it.image}
      alt={`${it.title}, before and after`}
      loading={near ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className="max-w-full max-h-full object-contain rounded-lg sm:rounded-none select-none"
    />
  );
}

/**
 * Full-screen transformation viewer.
 *
 * The photos sit on ONE horizontal scroll-snap track, at every width. That is
 * the whole reason swiping feels attached to the finger now: the browser does
 * the drag, the momentum and the snap natively, on the compositor, with the
 * neighbouring look visibly sliding in. The old viewer faked it by nudging a
 * single photo 35% of the finger's distance and swapping the src on release.
 * scroll-snap-stop keeps a hard flick to one look at a time, like Instagram.
 *
 * Phone layout is a column: close bar, photo, dots, then a white sheet holding
 * the title and the Book button. The sheet's description folds away so the
 * photo keeps most of the screen, and opens with a tap or an upward swipe on
 * the title. Swiping down on the photo closes the viewer.
 *
 * Laptop layout is the same tree laid out as a card: photo left, details right,
 * thumbnails to jump between looks, arrows and the keyboard.
 *
 * Portalled onto document.body for the same reason MediaModal is: the gallery
 * lives inside the page's white content panel, which opens a stacking context
 * that the fixed site nav would otherwise paint over.
 */
export default function TransformationViewer({ items, startIndex = 0, onClose, getBooking, instagramUrl }) {
  const count = items.length;
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const indexRef = useRef(startIndex);
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const cardRef = useRef(null);
  const backdropRef = useRef(null);
  const scrollRaf = useRef(0);
  const sheetSwipe = useRef(null);

  useScrollLock();
  useHideSiteNav();
  useEffect(() => setMounted(true), []);

  // Land on the tapped look before the first paint, without animating there.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
  }, [mounted, startIndex]);

  // Keyboard focus moves into the viewer, and goes back to the photo that
  // opened it when the viewer closes.
  useEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement;
    cardRef.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, [mounted]);

  const onTrackScroll = () => {
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      const el = trackRef.current;
      if (!el || !el.clientWidth) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== indexRef.current) { indexRef.current = i; setIndex(i); }
    });
  };

  const goTo = useCallback((i) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [count]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      // The compare handle owns the arrow keys while it has focus.
      if (e.target?.closest?.('[role="slider"]')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(indexRef.current - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(indexRef.current + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goTo]);

  // Rotating a phone or resizing a window changes the slide width, so put the
  // track back on the current look.
  useEffect(() => {
    const onResize = () => {
      const el = trackRef.current;
      if (el) el.scrollLeft = indexRef.current * el.clientWidth;
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(scrollRaf.current);
    };
  }, []);

  // Swipe down on the photo to close. The track only claims horizontal pans
  // (touch-action: pan-x), so a vertical drag is free to move the whole card.
  // It follows the finger 1:1, then either springs back or leaves, and a quick
  // flick counts even if it was short.
  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    const back = backdropRef.current;
    if (!mounted || !stage || !card) return;
    let t = null;

    const onStart = (e) => {
      if (e.touches.length !== 1 || e.target.closest('[data-ba-handle]')) { t = null; return; }
      const p = e.touches[0];
      t = { x: p.clientX, y: p.clientY, axis: null, dy: 0, lastY: p.clientY, lastT: e.timeStamp, v: 0 };
    };
    const onMove = (e) => {
      if (!t) return;
      const p = e.touches[0];
      const dx = p.clientX - t.x;
      const dy = p.clientY - t.y;
      if (!t.axis) {
        if (Math.hypot(dx, dy) < 10) return;
        t.axis = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2 ? 'y' : 'x';
        if (t.axis === 'y') {
          card.style.transition = 'none';
          if (back) back.style.transition = 'none';
        }
      }
      if (t.axis !== 'y') return;
      const dt = e.timeStamp - t.lastT;
      if (dt > 0) t.v = (p.clientY - t.lastY) / dt;
      t.lastY = p.clientY;
      t.lastT = e.timeStamp;
      t.dy = Math.max(0, dy);
      card.style.transform = `translate3d(0, ${t.dy}px, 0)`;
      if (back) back.style.opacity = String(Math.max(0, 1 - t.dy / 520));
    };
    const onEnd = () => {
      if (!t || t.axis !== 'y') { t = null; return; }
      const { dy, v } = t;
      t = null;
      const leave = dy > 120 || (v > 0.5 && dy > 30);
      card.style.transition = `transform ${leave ? 0.24 : 0.45}s var(--spring-smooth)`;
      if (back) back.style.transition = 'opacity 0.24s ease-out';
      if (leave) {
        card.style.transform = 'translate3d(0, 100%, 0)';
        if (back) back.style.opacity = '0';
        setTimeout(onClose, 220);
      } else {
        card.style.transform = '';
        if (back) back.style.opacity = '';
      }
    };

    stage.addEventListener('touchstart', onStart, { passive: true });
    stage.addEventListener('touchmove', onMove, { passive: true });
    stage.addEventListener('touchend', onEnd, { passive: true });
    stage.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      stage.removeEventListener('touchstart', onStart);
      stage.removeEventListener('touchmove', onMove);
      stage.removeEventListener('touchend', onEnd);
      stage.removeEventListener('touchcancel', onEnd);
    };
  }, [mounted, onClose]);

  if (!mounted || !count) return null;

  const item = items[Math.min(index, count - 1)];
  const booking = getBooking(item);
  const thumbOf = (it) => (it.type === 'compare' ? it.after : it.image);

  const arrowBase = 'absolute top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center active:scale-90 transition-[transform,opacity] disabled:opacity-0 disabled:pointer-events-none';

  const viewer = (
    <div
      className="fixed inset-0 z-[10001] sm:flex sm:items-center sm:justify-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Before and after"
      data-lenis-prevent
    >
      <div ref={backdropRef} className="ba-fade-in absolute inset-0 bg-[#0b0a0a] sm:bg-black/60" onClick={onClose} />

      <div
        ref={cardRef}
        tabIndex={-1}
        className="ba-viewer-in relative flex flex-col w-full h-full bg-[#0b0a0a] outline-none sm:flex-row sm:w-[min(920px,100%)] sm:h-[min(680px,100%)] sm:rounded-[24px] sm:overflow-hidden sm:bg-white sm:shadow-[0_32px_100px_rgba(0,0,0,0.35)]"
      >
        {/* Phone: counter and close above the photo */}
        <div className="sm:hidden flex-none flex items-center justify-between px-3 pb-2" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
          {count > 1 ? (
            <span className="px-3 py-1.5 rounded-full text-[0.66rem] font-medium tracking-[0.1em] text-white/90" style={{ background: 'rgba(255,255,255,0.12)' }}>
              {index + 1} / {count}
            </span>
          ) : <span />}
          <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <CloseIcon light />
          </button>
        </div>

        {/* Stage */}
        <div ref={stageRef} className="relative flex-1 min-h-0 bg-[#0b0a0a] sm:flex-none sm:w-1/2 sm:h-full">
          <div
            ref={trackRef}
            onScroll={onTrackScroll}
            className="ba-track absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
            style={{ touchAction: 'pan-x' }}
          >
            {items.map((it, i) => (
              <div
                key={it.id}
                className="relative flex-none w-full h-full snap-center flex items-center justify-center px-3 py-1 sm:p-0"
                style={{ scrollSnapStop: 'always' }}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${it.title}`}
              >
                <Slide it={it} active={i === index} near={Math.abs(i - index) <= 1} />
              </div>
            ))}
          </div>

          {count > 1 && (
            <>
              <button onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous look"
                className={`${arrowBase} left-2 sm:left-3`} style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Chevron dir="left" />
              </button>
              <button onClick={() => goTo(index + 1)} disabled={index === count - 1} aria-label="Next look"
                className={`${arrowBase} right-2 sm:right-3`} style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Chevron dir="right" />
              </button>
              <div className="hidden sm:block absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full text-[0.6rem] font-medium text-white tracking-wider pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                {index + 1} / {count}
              </div>
            </>
          )}
        </div>

        {/* Phone: position dots between the photo and the sheet */}
        {count > 1 && (
          <div className="sm:hidden flex-none flex items-center justify-center gap-1.5 py-2.5" aria-hidden="true">
            {items.map((it, i) => (
              <span key={it.id} className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === index ? 16 : 5, background: i === index ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        )}

        {/* Details: a bottom sheet on a phone, the right-hand column on a laptop */}
        <div className="relative flex-none flex flex-col min-h-0 max-h-[62dvh] bg-white rounded-t-[22px] sm:flex-1 sm:min-w-0 sm:max-h-none sm:rounded-none">
          <div className="hidden sm:flex justify-end px-5 pt-4 flex-none">
            <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 hover:bg-black/10 transition-all" style={{ background: 'rgba(0,0,0,0.06)' }}>
              <CloseIcon />
            </button>
          </div>

          {/* Title block. On a phone the whole block is the toggle for the
              description, by tap or by swiping it up or down. */}
          <div className="relative flex-none px-5 pt-2.5 pb-4 sm:px-7 sm:pt-0 sm:pb-0">
            <span className="sm:hidden block mx-auto w-9 h-1 rounded-full bg-black/10 mb-3" aria-hidden="true" />
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block px-2.5 py-1 bg-[#D4A0B0]/15 rounded-full text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-[#8A4A63]">
                {item.label}
              </span>
              {item.occasion && <span className="text-[0.72rem] tracking-[0.04em] text-[#998d85] truncate">{item.occasion}</span>}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-[#111] leading-tight" style={{ fontSize: 'clamp(1.25rem, 2.6vw, 1.7rem)', fontWeight: 300 }}>
                {item.title}
              </h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="#8a7f79" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="sm:hidden w-5 h-5 mt-1 flex-shrink-0 transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'none' }} aria-hidden="true">
                <polyline points="6 15 12 9 18 15" />
              </svg>
            </div>
            <button
              type="button"
              className="sm:hidden absolute inset-0 w-full"
              aria-expanded={open}
              aria-label={open ? 'Hide details' : 'Show details'}
              onClick={() => setOpen(o => !o)}
              onTouchStart={(e) => { sheetSwipe.current = e.touches[0].clientY; }}
              onTouchEnd={(e) => {
                const y0 = sheetSwipe.current;
                sheetSwipe.current = null;
                if (y0 == null) return;
                const dy = e.changedTouches[0].clientY - y0;
                if (Math.abs(dy) > 24) { e.preventDefault(); setOpen(dy < 0); }
              }}
            />
          </div>

          <div className={`ba-sheet-body grid flex-auto min-h-0 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'} sm:grid-rows-[1fr]`}>
            <div className="min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              <div className="px-5 pt-0 pb-3 sm:px-7 sm:pt-3 sm:pb-6">
                <p className="text-[#666] leading-[1.75] mb-4" style={{ fontSize: 'clamp(0.82rem, 1.2vw, 0.88rem)' }}>
                  {item.description}
                </p>
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-full text-[0.68rem] font-medium bg-[#FAF5F2] text-[#8a7f78] border border-[#efe4dd]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {count > 1 && (
                  <div className="hidden sm:block mt-7">
                    <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b3a9a3] mb-2.5">More looks</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((it, i) => (
                        <button
                          key={it.id}
                          onClick={() => goTo(i)}
                          aria-label={`Show ${it.title}`}
                          aria-current={i === index ? 'true' : undefined}
                          className="w-[52px] h-[64px] rounded-md overflow-hidden bg-[#eee] transition-[opacity,box-shadow] duration-200 hover:opacity-100"
                          style={{ opacity: i === index ? 1 : 0.62, boxShadow: i === index ? '0 0 0 2px #fff, 0 0 0 3.5px #111' : 'none' }}
                        >
                          <img src={thumbOf(it)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" style={{ objectPosition: 'center 30%' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* The point of the whole gallery: from a look she likes straight
              into the booking sheet for the service that made it. */}
          <div className="flex-none px-5 pt-3 sm:px-6 sm:pt-4 border-t border-[#f0ebe6]" style={{ paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom, 0px))' }}>
            {booking.caption && (
              <p className="text-[0.7rem] tracking-[0.02em] text-[#8a7f79] mb-2 truncate">{booking.caption}</p>
            )}
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={booking.onBook}
                className="flex-1 inline-flex items-center justify-center gap-2 py-4 sm:py-3.5 bg-[#111] text-white text-[0.78rem] font-medium tracking-[0.08em] uppercase rounded-xl hover:bg-[#222] active:scale-[0.98] active:bg-[#333] transition-all"
                style={{ touchAction: 'manipulation' }}
              >
                {booking.label}
                <CtaArrow />
              </button>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="See more on Instagram"
                title="See more on Instagram"
                className="flex-none w-[52px] inline-flex items-center justify-center rounded-xl border border-[#e6dcd7] text-[#111] hover:border-[#111] active:scale-[0.96] transition-all"
              >
                <IconInstagram size={18} />
              </a>
            </div>
            {booking.alt && (
              <button type="button" onClick={booking.alt.onBook} className="mt-2.5 w-full text-left text-[0.72rem] leading-[1.45] text-[#8a7f79]">
                {booking.alt.lead}{' '}
                <span className="font-semibold text-[#6B4055] underline underline-offset-2 decoration-[#6B4055]/40">{booking.alt.label}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
}
