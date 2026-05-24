import { useState, useEffect, useRef } from 'react';

// Remove sentences that duplicate info already shown in a badge
function dedupeText(text, phrases) {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const filtered = sentences.filter(
    s => !phrases.some(p => s.toLowerCase().includes(p.toLowerCase()))
  );
  return filtered.length ? filtered.join(' ').trim() : text;
}

// SVG icons
const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BTN = 'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0';
const BTN_STYLE = { background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)' };

export default function ServiceDetailModal({ svc, onClose, onBook, onOpenClassModal }) {
  const [visible, setVisible]   = useState(false);
  const [closing, setClosing]   = useState(false);
  const mobileScrollRef         = useRef(null);
  const desktopScrollRef        = useRef(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => { cancelAnimationFrame(t); document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    if (mobileScrollRef.current)  mobileScrollRef.current.scrollTop  = 0;
    if (desktopScrollRef.current) desktopScrollRef.current.scrollTop = 0;
    setClosing(true);
    setVisible(false);
    setTimeout(onClose, 240);
  };

  if (!svc) return null;

  const isLessons = svc.category === 'lessons';
  const isBridal  = svc.category === 'bridal';

  const buttonLabel = isBridal
    ? 'Inquire About Bridal'
    : isLessons
    ? 'View Available Classes'
    : 'Select & Book';

  const handleAction = () => {
    handleClose();
    setTimeout(() => {
      if (isLessons) onOpenClassModal?.();
      else onBook(svc);
    }, 240);
  };

  // Strip repeated travel-fee copy for Luxury Bridal
  const dupeFilters  = svc.title === 'Luxury Bridal Look' ? ['travel fee', '$200'] : [];
  const descToShow   = dupeFilters.length ? dedupeText(svc.desc,             dupeFilters) : svc.desc;
  const expectToShow = dupeFilters.length ? dedupeText(svc.what_to_expect,   dupeFilters) : svc.what_to_expect;

  // Animation timing — fast on exit, smooth on enter
  const slideT = closing
    ? 'transform 0.22s cubic-bezier(0.4, 0, 1, 1)'
    : 'transform 0.40s cubic-bezier(0.32, 0.72, 0, 1)';
  const fadeT = closing
    ? 'background 0.18s ease, backdrop-filter 0.18s ease'
    : 'background 0.30s ease, backdrop-filter 0.30s ease';

  /* ── Inline JSX fragments ───────────────────────────────── */
  const badges = (
    <>
      {svc.title === 'Luxury Bridal Look' && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#FDF5F0] border border-[#f5e0d4] text-[0.72rem] text-[#A0785A] mb-4">
          <span className="flex-shrink-0">🚗</span>
          <span><strong>$200+ travel fee</strong> automatically added for services not held at the studio</span>
        </div>
      )}
      {svc.title === 'Full Day Service' && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#FDF5F0] border border-[#f5e0d4] text-[0.72rem] text-[#A0785A] mb-4">
          <span className="flex-shrink-0">📋</span>
          <span>Required for: bridal switch, location over <strong>1 hr from studio</strong>, or start time <strong>before 7 AM</strong></span>
        </div>
      )}
      {svc.title === 'Bridal Trial' && (
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#F5F0FD] border border-[#e0d4f5] text-[0.72rem] text-[#7A5AA0]">
            <span className="flex-shrink-0">🎨</span>
            <span><strong>Test your look before the big day</strong> — no surprises on your wedding day</span>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#FDF9F7] border border-[#f0ebe6] text-[0.72rem] text-[#A0785A]">
            <span className="flex-shrink-0">📅</span>
            <span>Recommended <strong>1–3 months before</strong> your wedding date</span>
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
      {descToShow && <p className="text-[0.87rem] text-[#666] leading-[1.78] mb-5">{descToShow}</p>}
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
      {/* ═══════════════════════════════════════════════════════════
          DESKTOP — large parallax modal
          Image fills top ~48% of the modal box.
          Content card scrolls up over the image from below.
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="hidden sm:flex fixed inset-0 z-[9990] items-center justify-center"
        style={{
          background:    visible ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0)',
          backdropFilter: visible ? 'blur(7px)' : 'blur(0px)',
          transition: fadeT,
          padding: '72px 24px 40px',
        }}
        onClick={handleClose}
      >
        <div
          className="relative rounded-[24px] overflow-hidden w-[700px] max-w-[94vw]"
          style={{
            height: '84vh',
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(22px) scale(0.96)',
            transition: closing
              ? 'opacity 0.18s ease, transform 0.22s cubic-bezier(0.4,0,1,1)'
              : 'opacity 0.28s ease, transform 0.38s cubic-bezier(0.32,0.72,0,1)',
            boxShadow: '0 32px 100px rgba(0,0,0,0.35)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Image layer (back) ── */}
          <div className="absolute top-0 left-0 right-0 z-0" style={{ height: '50%' }}>
            {svc.photo
              ? <img src={svc.photo} alt={svc.title} className="w-full h-full object-cover object-top" />
              : <div className="w-full h-full bg-[#f5f0ec]" />
            }
          </div>

          {/* ── Scrollable content (middle layer) ── */}
          <div
            ref={desktopScrollRef}
            className="absolute inset-0 overflow-y-auto z-10"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Spacer — transparent, shows image; click backdrop doesn't apply here */}
            <div style={{ height: '43%' }} />

            {/* White card slides up over image */}
            <div
              style={{
                background: '#fff',
                borderRadius: '22px 22px 0 0',
                minHeight: '62%',
              }}
            >
              {/* Drag pill */}
              <div className="mx-auto mt-3 w-9 h-1 rounded-full bg-black/10" />
              <div className="px-7 pt-5 pb-[84px]">{content}</div>
            </div>
          </div>

          {/* ── CTA footer (above scroll layer) ── */}
          {/* pointer-events: none so scroll still works over the footer area */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 px-6 py-4 border-t border-[#f0ebe6]"
            style={{ background: '#fff', pointerEvents: 'none' }}
          >
            <div style={{ pointerEvents: 'auto' }}>{ctaButton}</div>
          </div>

          {/* ── Close button (top layer) ── */}
          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 z-30 ${BTN}`}
            style={BTN_STYLE}
          >
            <IconClose />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE — parallax bottom sheet, fully optimised
          Fixed header (← back + × close) always visible at top.
          Image stays fixed behind the scrolling content card.
          ═══════════════════════════════════════════════════════════ */}
      <div className="sm:hidden fixed inset-0 z-[9990]">
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background:  visible ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0)',
            transition: fadeT,
          }}
        />

        {/* ── Fixed image layer (behind everything) ── */}
        <div className="absolute inset-x-0 top-0 z-0" style={{ height: '52vh' }}>
          {svc.photo
            ? <img src={svc.photo} alt={svc.title} className="w-full h-full object-cover object-top" />
            : <div className="w-full h-full bg-[#f5f0ec]" />
          }
        </div>

        {/* ── Header bar — ALWAYS on top (z-50), never scrolled away ──
             Gradient tint so buttons are legible over the image.
             Left: back arrow   Right: × close                          */}
        <div
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
          style={{
            height: '64px',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 100%)',
            // Slides in with the rest of the modal
            transform: visible ? 'translateY(0)' : 'translateY(-20px)',
            opacity:   visible ? 1 : 0,
            transition: closing
              ? 'opacity 0.16s ease, transform 0.20s ease'
              : 'opacity 0.32s ease 0.06s, transform 0.32s ease 0.06s',
          }}
        >
          {/* ← Back */}
          <button onClick={handleClose} className={BTN} style={BTN_STYLE}>
            <IconBack />
          </button>
          {/* × Close */}
          <button onClick={handleClose} className={BTN} style={BTN_STYLE}>
            <IconClose />
          </button>
        </div>

        {/* ── Scroll container (z-10 — above image, below header & CTA) ── */}
        <div
          ref={mobileScrollRef}
          className="absolute inset-0 z-10 overflow-y-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            transition: slideT,
          }}
        >
          {/* Transparent spacer — tap to close */}
          <div style={{ height: '44vh' }} onClick={handleClose} />

          {/* White content card — scrolls up over the image */}
          <div
            style={{
              background:   '#fff',
              borderRadius: '22px 22px 0 0',
              minHeight:    '62vh',
              position:     'relative',
            }}
          >
            {/* Drag handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-black/12" />
            <div className="px-5 pt-8 pb-24">{content}</div>
          </div>
        </div>

        {/* ── CTA pinned at bottom (z-20) ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-5 py-4 bg-white border-t border-[#f0ebe6]"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            // pointer-events: none on wrapper so content beneath stays scrollable
            // pointer-events: auto restored on inner button
            pointerEvents: 'none',
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            transition: slideT,
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>{ctaButton}</div>
        </div>
      </div>
    </>
  );
}
