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

export default function ServiceDetailModal({ svc, onClose, onBook, onOpenClassModal }) {
  const [visible, setVisible] = useState(false);
  const mobileScrollRef = useRef(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = 0;
    setVisible(false);
    setTimeout(onClose, 340);
  };

  if (!svc) return null;

  const isLessons = svc.category === 'lessons';
  const isBridal = svc.category === 'bridal';

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
    }, 340);
  };

  // Deduplicate content that's already shown in the badge for Luxury Bridal
  const dupeFilters = svc.title === 'Luxury Bridal Look' ? ['travel fee', '$200'] : [];
  const descToShow    = dupeFilters.length ? dedupeText(svc.desc, dupeFilters) : svc.desc;
  const expectToShow  = dupeFilters.length ? dedupeText(svc.what_to_expect, dupeFilters) : svc.what_to_expect;

  /* ── Shared sub-components ─────────────────────────────── */
  const Badges = () => (
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

  const Content = () => (
    <>
      <h3 className="font-serif text-[1.35rem] font-normal text-[#111] leading-tight mb-2">{svc.title}</h3>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="font-serif text-lg text-[#111]">{svc.price}</span>
        {svc.duration && (
          <><span className="text-[#ddd]">·</span><span className="text-[0.78rem] text-[#888]">{svc.duration}</span></>
        )}
        {svc.deposit && (
          <><span className="text-[#ddd]">·</span><span className="text-[0.7rem] text-[#aaa]">{svc.deposit}</span></>
        )}
      </div>
      <Badges />
      {descToShow && (
        <p className="text-[0.85rem] text-[#666] leading-[1.75] mb-5">{descToShow}</p>
      )}
      {expectToShow && (
        <div className="mb-5">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2">What to Expect</p>
          <p className="text-[0.83rem] text-[#666] leading-[1.7]">{expectToShow}</p>
        </div>
      )}
      {svc.key_features && svc.key_features.length > 0 && (
        <div className="mb-5">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2.5">Highlights</p>
          <ul className="flex flex-col gap-1.5">
            {svc.key_features.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.83rem] text-[#666]">
                <span className="text-[#D4A0B0] mt-[3px] flex-shrink-0 text-[0.55rem]">●</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {svc.includes && svc.includes.length > 0 && (
        <div className="mb-2">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2.5">What's Included</p>
          <ul className="flex flex-col gap-1.5">
            {svc.includes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.83rem] text-[#555]">
                <span className="text-[#D4A0B0] mt-px flex-shrink-0">✦</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const CtaButton = () => (
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
          DESKTOP — centered modal, image at top, proper top gap
          ═══════════════════════════════════════════════════ */}
      <div
        className="hidden sm:flex fixed inset-0 z-[9990] items-center justify-center"
        style={{
          background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
          backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
          // Asymmetric padding: more on top so modal sits in lower-center area, away from header
          paddingTop: '96px',
          paddingBottom: '48px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
        onClick={handleClose}
      >
        <div
          className="relative w-[500px] max-w-[92vw] overflow-hidden flex flex-col rounded-[22px]"
          style={{
            background: '#fff',
            maxHeight: 'calc(100vh - 144px)',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.26s ease',
            boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Photo — 16:9 on desktop */}
          <div className="relative flex-shrink-0 overflow-hidden bg-[#f5f5f5]" style={{ aspectRatio: '16/9' }}>
            {svc.photo && (
              <img src={svc.photo} alt={svc.title} className="w-full h-full object-cover object-top" />
            )}
            <button
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-3.5 h-3.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 py-5">
            <Content />
          </div>

          {/* Sticky footer */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-[#f0ebe6]">
            <CtaButton />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE — sticky image, content card scrolls over it
          ═══════════════════════════════════════════════════ */}
      <div className="sm:hidden fixed inset-0 z-[9990]">
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
            transition: 'background 0.35s ease',
          }}
        />

        {/* Image layer — fixed, stays behind the scrolling card */}
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: '52vh' }}
        >
          {svc.photo ? (
            <img src={svc.photo} alt={svc.title} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full" style={{ background: '#f5f0ec' }} />
          )}
          {/* Close button on image */}
          <button
            onClick={handleClose}
            className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              top: 'max(48px, calc(env(safe-area-inset-top, 0px) + 14px))',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable container — slides up from bottom on open */}
        <div
          ref={mobileScrollRef}
          className="absolute inset-0 overflow-y-auto"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Transparent spacer — user can tap to close, scrolling over this reveals the card */}
          <div
            style={{ height: '44vh', flexShrink: 0 }}
            onClick={handleClose}
          />

          {/* White content card — scrolls up over the image */}
          <div
            style={{
              background: '#fff',
              borderRadius: '22px 22px 0 0',
              minHeight: '62vh',
              position: 'relative',
            }}
          >
            {/* Drag handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-black/15 z-10" />

            {/* Content with bottom padding so last items aren't hidden under CTA */}
            <div className="px-5 pt-8 pb-24">
              <Content />
            </div>
          </div>
        </div>

        {/* CTA — fixed at screen bottom, animates in with modal */}
        <div
          className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-[#f0ebe6]"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
            zIndex: 10,
          }}
        >
          <CtaButton />
        </div>
      </div>
    </>
  );
}
