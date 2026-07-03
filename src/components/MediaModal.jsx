import { useEffect, useRef } from 'react';
import { useModalLenis } from '@/lib/modalLenis';
import { useScrollLock } from '@/lib/useScrollLock';

const CloseIcon = ({ dark }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#111'} strokeWidth="2.2" strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
    width={20} height={20} style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }}>
    {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);

/**
 * Shared detail modal — desktop two-column (photo left, scrollable content +
 * optional pinned footer right), mobile slide-up sheet over the full photo.
 * Mirrors the Services detail modal so all detail views feel consistent.
 */
export default function MediaModal({ photo, imageFit = 'cover', index, count, onPrev, onNext, onClose, footer, children }) {
  const hasNav = count > 1 && onPrev && onNext;
  const desktopScrollRef = useRef(null);
  useModalLenis(desktopScrollRef);
  // Fully lock the page behind the modal so the background can't scroll.
  useScrollLock();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const imgStyle = { objectFit: imageFit, objectPosition: imageFit === 'cover' ? 'center top' : 'center' };

  const NavArrows = () => !hasNav ? null : (
    <>
      <button onClick={onPrev} aria-label="Previous"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)' }}>
        <Chevron dir="left" />
      </button>
      <button onClick={onNext} aria-label="Next"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)' }}>
        <Chevron dir="right" />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-full text-[0.6rem] font-medium text-white tracking-wider"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
        {index + 1} / {count}
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP ──
          The fixed 52px nav sits above this overlay (z 9999 > 9990), so we pad the
          top past it (60px) and cap the card height to the remaining space. The card
          then always centers below the header, never tucking under it. */}
      <div className="hidden sm:flex fixed inset-0 z-[9990] items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(7px)', padding: '60px 24px 32px' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="relative flex rounded-[24px] overflow-hidden bg-white"
          style={{
            width: photo ? 'min(900px,92vw)' : 'min(540px,92vw)',
            height: photo ? 'min(640px, calc(100vh - 92px))' : 'auto',
            maxHeight: 'calc(100vh - 92px)',
            boxShadow: '0 32px 100px rgba(0,0,0,0.35)',
            animation: 'fadeSlideDown 0.3s ease-out',
          }}>
          {photo && (
            <div className="relative flex-none bg-[#0a0a0a] flex items-center justify-center" style={{ width: '50%' }}>
              <img src={photo} alt="" className="w-full h-full" style={imgStyle} />
              <NavArrows />
            </div>
          )}
          <div className="flex flex-col flex-1 min-w-0 bg-white">
            <div className="flex justify-end px-5 pt-4 pb-1 flex-none">
              <button onClick={onClose} aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'rgba(0,0,0,0.07)' }}>
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

      {/* ── MOBILE ── */}
      <div className="sm:hidden fixed inset-0 z-[10000]" style={{ background: 'rgba(0,0,0,0.5)' }} />
      <div className="sm:hidden fixed inset-0 z-[10001]">
        {photo && (
          <div className="absolute inset-x-0 top-0 z-0" style={{ height: '62vh' }}>
            <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
              <img src={photo} alt="" className="w-full h-full" style={imgStyle} />
            </div>
            <NavArrows />
          </div>
        )}

        <div data-lenis-prevent className="absolute inset-0 z-10 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {photo && <div style={{ height: '54vh' }} onClick={onClose} />}
          <div style={{ background: '#fff', borderRadius: photo ? '22px 22px 0 0' : '0', minHeight: photo ? 'auto' : '100vh' }}>
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-black/10" />
            </div>
            <div className="px-5 pt-3" style={{ paddingBottom: footer ? '7rem' : '2rem' }}>{children}</div>
          </div>
        </div>

        {footer && (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-5 py-4 bg-white border-t border-[#f0ebe6]"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
            {footer}
          </div>
        )}

        {/* Close button */}
        <div className="absolute top-0 right-0 z-30 p-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <button onClick={onClose} aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)' }}>
            <CloseIcon dark />
          </button>
        </div>
      </div>
    </>
  );
}
