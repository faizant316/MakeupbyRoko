import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalLenis } from '@/lib/modalLenis';
import { useScrollLock, useHideSiteNav } from '@/lib/useScrollLock';

const CloseIcon = ({ dark }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#111'} strokeWidth="2.2" strokeLinecap="round" width={15} height={15}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
    width={19} height={19} style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }}>
    {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);

/**
 * Shared detail modal — desktop two-column (photo left, scrollable content +
 * optional pinned footer right), mobile full-height viewer with the photo above
 * an information sheet.
 *
 * Rendered through a PORTAL onto document.body, and that is load-bearing rather
 * than tidiness. Its callers (the before/after gallery) live inside the page's
 * white content panel, which sets `position: relative; z-index: 10` and so opens
 * a stacking context. Inside it, no z-index this modal picks can beat the fixed
 * site nav at z-9999, so the nav painted straight over the top of the viewer:
 * the photo was clipped and the close button was underneath the hamburger, which
 * is why the lightbox looked like it could not be exited. The portal takes the
 * modal out to the body, and hiding the nav for the duration (the same thing the
 * booking sheets do) means nothing overlaps it either way.
 */
export default function MediaModal({ photo, imageFit = 'cover', index, count, onPrev, onNext, onClose, footer, children }) {
  const hasNav = count > 1 && onPrev && onNext;
  const desktopScrollRef = useRef(null);
  const photoAreaRef = useRef(null);
  const sheetScrollRef = useRef(null);
  // Which way the last move went, so the incoming photo slides in from the side
  // the swipe came from instead of just blinking.
  const [dir, setDir] = useState('next');
  const [mounted, setMounted] = useState(false);

  useModalLenis(desktopScrollRef);
  // Fully lock the page behind the modal, and take the site nav out of the way.
  useScrollLock();
  useHideSiteNav();

  useEffect(() => setMounted(true), []);

  const goPrev = () => { setDir('prev'); onPrev?.(); };
  const goNext = () => { setDir('next'); onNext?.(); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  // Swipe between photos on the mobile viewer. Native non-passive listeners so a
  // confirmed horizontal drag can preventDefault; an axis lock keeps a vertical
  // drag free to scroll the sheet. Same approach as the service detail sheet, so
  // both viewers feel identical under the thumb.
  useEffect(() => {
    const el = photoAreaRef.current;
    if (!el || !hasNav) return;
    let touch = null;

    const onStart = (e) => {
      const t = e.touches[0];
      touch = { x: t.clientX, y: t.clientY, locked: null };
    };
    const onMove = (e) => {
      if (!touch) return;
      const dx = e.touches[0].clientX - touch.x;
      const dy = e.touches[0].clientY - touch.y;
      if (touch.locked === null && Math.hypot(dx, dy) > 8) {
        touch.locked = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        if (touch.locked === 'y') { touch = null; return; }
      }
      if (touch?.locked === 'x') {
        e.preventDefault();
        // Follow the finger, damped, so the swipe feels attached to the photo.
        el.style.transform = `translateX(${dx * 0.35}px)`;
      }
    };
    const onEnd = (e) => {
      el.style.transform = '';
      if (!touch || touch.locked !== 'x') { touch = null; return; }
      const dx = touch.x - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) { dx > 0 ? goNext() : goPrev(); }
      touch = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [hasNav, onPrev, onNext]);

  if (!mounted) return null;

  const imgStyle = { objectFit: imageFit, objectPosition: imageFit === 'cover' ? 'center top' : 'center' };
  const slideIn = `${dir === 'prev' ? 'stepInLeft' : 'stepInRight'} 0.32s cubic-bezier(0.22, 1, 0.36, 1)`;

  const RoundBtn = ({ onClick, label, children, className = '', style = {} }) => (
    <button onClick={onClick} aria-label={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform ${className}`}
      style={{ background: 'rgba(0,0,0,0.5)', ...style }}>
      {children}
    </button>
  );

  const modal = (
    <>
      {/* ── DESKTOP ── */}
      <div className="hidden sm:flex fixed inset-0 z-[10000] items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.62)', padding: '32px 24px' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="relative flex rounded-[24px] overflow-hidden bg-white"
          style={{
            width: photo ? 'min(940px,92vw)' : 'min(540px,92vw)',
            height: photo ? 'min(660px, calc(100vh - 64px))' : 'auto',
            maxHeight: 'calc(100vh - 64px)',
            boxShadow: '0 32px 100px rgba(0,0,0,0.35)',
            animation: 'fadeSlideDown 0.3s ease-out',
          }}>
          {photo && (
            <div className="relative flex-none bg-[#0a0a0a] flex items-center justify-center overflow-hidden" style={{ width: '52%' }}>
              <img key={photo} src={photo} alt="" className="w-full h-full" style={{ ...imgStyle, animation: slideIn }} />
              {hasNav && (
                <>
                  <button onClick={goPrev} aria-label="Previous"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(0,0,0,0.45)' }}><Chevron dir="left" /></button>
                  <button onClick={goNext} aria-label="Next"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(0,0,0,0.45)' }}><Chevron dir="right" /></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-full text-[0.6rem] font-medium text-white tracking-wider"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    {index + 1} / {count}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex flex-col flex-1 min-w-0 bg-white">
            <div className="flex justify-end px-5 pt-4 pb-1 flex-none">
              <button onClick={onClose} aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 hover:bg-black/10 transition-all"
                style={{ background: 'rgba(0,0,0,0.06)' }}>
                <CloseIcon />
              </button>
            </div>
            <div ref={desktopScrollRef} className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'none' }}>
              <div className="px-7 pt-2 pb-5">{children}</div>
            </div>
            {footer && <div className="flex-none px-6 py-4 border-t border-[#f0ebe6]">{footer}</div>}
          </div>
        </div>
      </div>

      {/* ── MOBILE ──
          A column: bar, photo, sheet. The photo gets whatever is left and is
          object-contain inside it, so it is always whole. The old version stacked
          a 62vh photo under a 54vh spacer, which cropped every portrait shot. */}
      <div className="sm:hidden fixed inset-0 z-[10001] flex flex-col" style={{ background: photo ? '#0b0a0a' : '#fff' }}>
        <div className="flex-none flex items-center justify-between px-3 pb-2"
          style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
          {hasNav ? (
            <span className="px-3 py-1.5 rounded-full text-[0.66rem] font-medium tracking-[0.1em]"
              style={photo
                ? { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }
                : { background: 'rgba(0,0,0,0.05)', color: '#8a7f79' }}>
              {index + 1} / {count}
            </span>
          ) : <span />}
          <RoundBtn onClick={onClose} label="Close" style={{ background: photo ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.06)' }}>
            <CloseIcon dark={!!photo} />
          </RoundBtn>
        </div>

        {photo && (
          <div ref={photoAreaRef} className="flex-1 min-h-0 relative flex items-center justify-center px-3"
            style={{ transition: 'transform 0.2s ease-out', touchAction: 'pan-y' }}>
            <img key={photo} src={photo} alt=""
              className="max-w-full max-h-full rounded-lg"
              style={{ objectFit: 'contain', animation: slideIn }} />
            {hasNav && (
              <>
                <button onClick={goPrev} aria-label="Previous"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(0,0,0,0.42)' }}><Chevron dir="left" /></button>
                <button onClick={goNext} aria-label="Next"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(0,0,0,0.42)' }}><Chevron dir="right" /></button>
              </>
            )}
          </div>
        )}

        {/* Swipe cue, only while there is somewhere to swipe to */}
        {hasNav && photo && (
          <div className="flex-none flex items-center justify-center gap-1.5 py-2.5">
            {Array.from({ length: count }).map((_, i) => (
              <span key={i} className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === index ? 16 : 5, background: i === index ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        )}

        {/* Information sheet — capped so the photo always keeps the larger half.
            With no photo there is nothing to keep, so it takes the screen. */}
        <div className={`bg-white flex flex-col ${photo ? 'flex-none' : 'flex-1 min-h-0'}`}
          style={{
            borderRadius: photo ? '22px 22px 0 0' : '0',
            maxHeight: photo ? '44dvh' : 'none',
            animation: photo ? 'slideUpSheet 0.32s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          }}>
          {photo && (
            <div className="flex items-center justify-center pt-3 pb-1 flex-none">
              <div className="w-9 h-1 rounded-full bg-black/10" />
            </div>
          )}
          <div ref={sheetScrollRef} data-lenis-prevent className="overflow-y-auto min-h-0 px-5 pt-2 pb-4"
            style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
          {footer && (
            <div className="flex-none px-5 pt-3 border-t border-[#f0ebe6]"
              style={{ paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom, 0px))' }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
