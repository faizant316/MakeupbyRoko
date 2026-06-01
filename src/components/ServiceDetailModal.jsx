import { useState, useEffect, useRef } from 'react';

function dedupeText(text, phrases) {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const filtered = sentences.filter(
    s => !phrases.some(p => s.toLowerCase().includes(p.toLowerCase()))
  );
  return filtered.length ? filtered.join(' ').trim() : text;
}

const IconBack = ({ dark = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#111'} strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconClose = ({ dark = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#111'} strokeWidth="2.5"
    strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const darkPill = {
  background: 'rgba(0,0,0,0.38)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  width: 36, height: 36,
  borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', outline: 'none',
  WebkitTapHighlightColor: 'transparent',
  border: 'none', padding: 0, flexShrink: 0,
};

// Pure image crossfader — no controls, just the slides
function PhotoCarousel({ photos, idx }) {
  if (!photos?.length) return <div className="w-full h-full bg-[#f5f0ec]" />;
  return (
    <div className="relative w-full h-full overflow-hidden">
      {photos.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-top select-none"
          style={{ opacity: i === idx ? 1 : 0, transition: 'opacity 0.38s ease', zIndex: i === idx ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

// Dot row — rendered externally at a z-level that clears the scroll container
function Dots({ count, idx, onSet }) {
  if (count <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={e => { e.stopPropagation(); onSet(i); }}
          style={{
            width: i === idx ? 20 : 6, height: 6,
            borderRadius: 999,
            background: i === idx ? '#fff' : 'rgba(255,255,255,0.55)',
            transition: 'all 0.25s ease',
            border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

export default function ServiceDetailModal({ svc, onClose, onBook, onOpenClassModal, originPoint }) {
  const [visible, setVisible]   = useState(false);
  const [closing, setClosing]   = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const mobileScrollRef         = useRef(null);
  const desktopScrollRef        = useRef(null);
  const modalCardRef            = useRef(null);
  const mobileInnerRef          = useRef(null);
  const swipeRef                = useRef(null); // { x, y } on touchstart

  const photos   = svc?.photos?.length > 0 ? svc.photos : svc?.photo ? [svc.photo] : [];
  const photoPrev = () => setPhotoIdx(i => (i - 1 + photos.length) % photos.length);
  const photoNext = () => setPhotoIdx(i => (i + 1) % photos.length);

  // Reset gallery when service changes
  useEffect(() => { setPhotoIdx(0); }, [svc?.key]);

  useEffect(() => {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    document.body.style.overflow = 'hidden';

    function initFlip(el) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ox = originPoint != null ? `${originPoint.x - rect.left}px` : '50%';
      const oy = originPoint != null ? `${originPoint.y - rect.top}px`  : '50%';
      el.style.transformOrigin = `${ox} ${oy}`;
      el.style.transition = 'none';
      el.style.transform  = 'scale(0.07)';
      el.style.opacity    = '0';
    }
    initFlip(modalCardRef.current);
    initFlip(mobileInnerRef.current);

    const t = requestAnimationFrame(() => {
      setVisible(true);
      requestAnimationFrame(() => {
        const enter = 'transform 0.52s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease';
        for (const r of [modalCardRef, mobileInnerRef]) {
          if (!r.current) continue;
          r.current.style.transition = enter;
          r.current.style.transform  = 'scale(1)';
          r.current.style.opacity    = '1';
        }
      });
    });

    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow     = '';
      document.body.style.paddingRight = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (mobileScrollRef.current)  mobileScrollRef.current.scrollTop  = 0;
    if (desktopScrollRef.current) desktopScrollRef.current.scrollTop = 0;
    const exit = 'transform 0.26s cubic-bezier(0.4, 0, 1, 1), opacity 0.18s ease';
    for (const r of [modalCardRef, mobileInnerRef]) {
      if (!r.current) continue;
      r.current.style.transition = exit;
      r.current.style.transform  = 'scale(0.07)';
      r.current.style.opacity    = '0';
    }
    setClosing(true);
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!svc) return null;

  const isLessons = svc.category === 'lessons';
  const isBridal  = svc.category === 'bridal';
  const buttonLabel = isBridal ? 'Inquire About Bridal' : isLessons ? 'View Available Classes' : 'Select & Book';

  const handleAction = () => {
    handleClose();
    setTimeout(() => {
      if (isLessons) onOpenClassModal?.();
      else onBook(svc);
    }, 300);
  };

  const dupeFilters  = svc.title === 'Luxury Bridal Look' ? ['travel fee', '$200'] : [];
  const descToShow   = dupeFilters.length ? dedupeText(svc.desc,           dupeFilters) : svc.desc;
  const expectToShow = dupeFilters.length ? dedupeText(svc.what_to_expect, dupeFilters) : svc.what_to_expect;
  const fadeT        = closing
    ? 'background 0.18s ease, backdrop-filter 0.18s ease'
    : 'background 0.30s ease, backdrop-filter 0.30s ease';

  const badges = (
    <>
      {svc.title === 'Luxury Bridal Look' && (
        <div className="px-3.5 py-2.5 rounded-lg bg-[#FBF5F7] border-l-2 border-[#C4849A] text-[0.68rem] text-[#6B4055] mb-4">
          <strong>$200+ travel fee</strong> automatically added for services not held at the studio
        </div>
      )}
      {svc.title === 'Full Day Service' && (
        <div className="px-3.5 py-2.5 rounded-lg bg-[#FBF5F7] border-l-2 border-[#C4849A] text-[0.68rem] text-[#6B4055] mb-4">
          Required for: bridal switch, location over <strong>1 hr from studio</strong>, or start time <strong>before 7 AM</strong>
        </div>
      )}
      {svc.title === 'Bridal Trial' && (
        <div className="flex flex-col gap-2 mb-4">
          <div className="px-3.5 py-2.5 rounded-lg bg-[#FBF5F7] border-l-2 border-[#C4849A] text-[0.68rem] text-[#6B4055]">
            <strong>Test your look before the big day.</strong> No surprises on your wedding day.
          </div>
          <div className="px-3.5 py-2.5 rounded-lg bg-[#FBF5F7] border-l-2 border-[#C4849A] text-[0.68rem] text-[#6B4055]">
            Recommended <strong>1–3 months before</strong> your wedding date
          </div>
        </div>
      )}
    </>
  );

  const content = (
    <>
      <h3 className="font-serif text-[1.45rem] font-normal text-[#111] leading-tight mb-2">{svc.title}</h3>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="font-serif text-lg text-[#111]">{svc.price}</span>
        {svc.duration && <><span className="text-[#ddd]">·</span><span className="text-[0.78rem] text-[#888]">{svc.duration}</span></>}
        {svc.deposit  && <><span className="text-[#ddd]">·</span><span className="text-[0.7rem]  text-[#aaa]">{svc.deposit}</span></>}
      </div>
      {badges}
      {descToShow   && <p className="text-[0.87rem] text-[#666] leading-[1.78] mb-5">{descToShow}</p>}
      {expectToShow && (
        <div className="mb-5">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2">What to Expect</p>
          <p className="text-[0.85rem] text-[#666] leading-[1.72]">{expectToShow}</p>
        </div>
      )}
      {svc.key_features?.length > 0 && (
        <div className="mb-5">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2.5">Highlights</p>
          <ul className="flex flex-col gap-1.5">
            {svc.key_features.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.85rem] text-[#666]">
                <span className="text-[#D4A0B0] mt-[3px] flex-shrink-0 text-[0.55rem]">●</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {svc.includes?.length > 0 && (
        <div className="mb-2">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2.5">What's Included</p>
          <ul className="flex flex-col gap-1.5">
            {svc.includes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.85rem] text-[#555]">
                <span className="text-[#D4A0B0] mt-px flex-shrink-0">✦</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const ctaButton = (
    <button
      onClick={handleAction}
      className="w-full py-3.5 bg-[#111] text-white text-[0.78rem] font-medium tracking-[0.06em] rounded-xl hover:bg-[#222] active:scale-[0.98] active:bg-[#333] transition-all"
      style={{ touchAction: 'manipulation' }}
    >
      {buttonLabel} →
    </button>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          DESKTOP
          Image = top 55% of modal card
          Scroll container = full card, transparent for top 47%
          Arrows + dots = z-[25] siblings of scroll container
          so they sit above it and receive pointer events
          ═══════════════════════════════════════════════════ */}
      <div
        className="hidden sm:flex fixed inset-0 z-[9990] items-center justify-center"
        style={{
          background:     visible ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0)',
          backdropFilter: visible ? 'blur(7px)' : 'blur(0px)',
          transition: fadeT,
          padding: '72px 24px 40px',
        }}
        onClick={handleClose}
      >
        <div
          ref={modalCardRef}
          className="relative rounded-[24px] overflow-hidden w-[700px] max-w-[94vw]"
          style={{ height: '84vh', boxShadow: '0 32px 100px rgba(0,0,0,0.35)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Photo strip (top 55%) ── */}
          <div className="absolute top-0 left-0 right-0 z-0" style={{ height: '55%' }}>
            <PhotoCarousel photos={photos} idx={photoIdx} />
          </div>

          {/* ── Scrollable content ── */}
          <div ref={desktopScrollRef} className="absolute inset-0 overflow-y-auto z-10" style={{ scrollbarWidth: 'none' }}>
            {/* transparent spacer — pointer-events:none so arrows/dots behind it still click */}
            <div style={{ height: '48%', pointerEvents: 'none' }} />
            <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', minHeight: '62%' }}>
              <div className="mx-auto mt-3 w-9 h-1 rounded-full bg-black/10" />
              <div className="px-7 pt-5 pb-[84px]">{content}</div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-4 border-t border-[#f0ebe6]"
            style={{ background: '#fff', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>{ctaButton}</div>
          </div>

          {/* ── Carousel arrows — z-25 clears the scroll container's z-10 ── */}
          {photos.length > 1 && (
            <>
              <button
                onClick={photoPrev}
                className="absolute z-[25] flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                style={{ ...darkPill, left: 12, top: '27.5%', transform: 'translateY(-50%)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" width={14} height={14}>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={photoNext}
                className="absolute z-[25] flex items-center justify-center transition-all hover:scale-105 active:scale-90"
                style={{ ...darkPill, right: 12, top: '27.5%', transform: 'translateY(-50%)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" width={14} height={14}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          {/* ── Dots — z-25, just above the content sheet divider ── */}
          {photos.length > 1 && (
            <div
              className="absolute z-[25] left-1/2"
              style={{ top: 'calc(55% - 20px)', transform: 'translateX(-50%)' }}
            >
              <Dots count={photos.length} idx={photoIdx} onSet={setPhotoIdx} />
            </div>
          )}

          {/* ── Nav buttons ── */}
          <button onClick={handleClose}
            className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)' }}>
            <IconBack dark />
          </button>
          <button onClick={handleClose}
            className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)' }}>
            <IconClose dark />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE backdrop
          ═══════════════════════════════════════════════════ */}
      <div
        className="sm:hidden fixed inset-0 z-[10000]"
        style={{ background: visible ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0)', transition: fadeT }}
      />

      {/* ═══════════════════════════════════════════════════
          MOBILE modal
          Image = 72vh  |  Spacer = 62vh  |  Peek = 10vh
          Dots rendered as sibling at z-[15] so they clear
          the scroll container (z-10) and are always visible
          ═══════════════════════════════════════════════════ */}
      <div className="sm:hidden fixed inset-0 z-[10001]">
        <div ref={mobileInnerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>

          {/* ── Photo strip ── */}
          <div className="absolute inset-x-0 top-0 z-0" style={{ height: '72vh' }}>
            <PhotoCarousel photos={photos} idx={photoIdx} />
          </div>

          {/* ── Dots — z-15, floats above scroll container (z-10) ──
               Positioned 18px above the sheet peek edge (62vh) so they
               sit clearly in the image area. ── */}
          {photos.length > 1 && (
            <div
              className="absolute left-1/2 z-[15]"
              style={{ top: 'calc(72vh - 36px)', transform: 'translateX(-50%)' }}
            >
              <Dots count={photos.length} idx={photoIdx} onSet={setPhotoIdx} />
            </div>
          )}

          {/* ── Scroll container ──
               Spacer = 62vh so 10vh of white peeks at bottom.
               Swipe detection only fires when touch starts in the
               image area (top 72% of screen) to avoid interfering
               with the content scroll. ── */}
          <div
            ref={mobileScrollRef}
            className="absolute inset-0 z-10 overflow-y-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onTouchStart={e => {
              if (photos.length > 1 && e.touches[0].clientY < window.innerHeight * 0.72) {
                swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }
            }}
            onTouchEnd={e => {
              if (!swipeRef.current) return;
              const dx = swipeRef.current.x - e.changedTouches[0].clientX;
              const dy = swipeRef.current.y - e.changedTouches[0].clientY;
              if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                dx > 0 ? photoNext() : photoPrev();
              }
              swipeRef.current = null;
            }}
          >
            {/* Tap transparent area to close */}
            <div style={{ height: '62vh', pointerEvents: 'auto' }} onClick={handleClose} />

            {/* White content sheet */}
            <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', minHeight: '100vh' }}>
              <div className="flex items-center justify-center pt-3.5 pb-1">
                <div className="w-9 h-1 rounded-full bg-black/10" />
              </div>
              <div className="px-5 pt-4 pb-28">{content}</div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 px-5 py-4 bg-white border-t border-[#f0ebe6]"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          >
            {ctaButton}
          </div>
        </div>

        {/* ── Nav buttons (z-30, outside FLIP wrapper) ── */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            paddingLeft: '16px', paddingRight: '16px', paddingBottom: '10px',
            pointerEvents: 'none',
            opacity: visible ? 1 : 0,
            transition: closing ? 'opacity 0.15s ease' : 'opacity 0.30s ease 0.18s',
          }}
        >
          <button onClick={handleClose} style={{ ...darkPill, pointerEvents: 'auto' }}><IconBack dark /></button>
          <button onClick={handleClose} style={{ ...darkPill, pointerEvents: 'auto' }}><IconClose dark /></button>
        </div>
      </div>
    </>
  );
}
