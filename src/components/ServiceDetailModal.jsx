import { useState, useEffect } from 'react';

export default function ServiceDetailModal({ svc, onClose, onBook, onOpenClassModal }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation after mount
    const t = requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
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
    }, 320);
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center"
      style={{
        background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
      }}
      onClick={handleClose}
    >
      <div
        className="relative w-full sm:w-[480px] sm:max-w-[92vw] max-h-[92vh] overflow-hidden flex flex-col rounded-t-[22px] sm:rounded-[22px]"
        style={{
          background: '#fff',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.2), 0 40px 80px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden absolute top-3 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-black/15 z-10" />

        {/* Photo */}
        <div className="relative flex-shrink-0 overflow-hidden bg-[#f5f5f5]" style={{ aspectRatio: '4/3' }}>
          {svc.photo && (
            <img
              src={svc.photo}
              alt={svc.title}
              className="w-full h-full object-cover object-top"
            />
          )}
          {/* Close button */}
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
          {/* Title + price */}
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

          {/* Notes / badges for specific services */}
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

          {/* Full description */}
          {svc.desc && (
            <p className="text-[0.85rem] text-[#666] leading-[1.75] mb-5">{svc.desc}</p>
          )}

          {/* What to expect */}
          {svc.what_to_expect && (
            <div className="mb-5">
              <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2">What to Expect</p>
              <p className="text-[0.83rem] text-[#666] leading-[1.7]">{svc.what_to_expect}</p>
            </div>
          )}

          {/* Key features */}
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

          {/* Includes */}
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
        </div>

        {/* Sticky footer with CTA */}
        <div
          className="flex-shrink-0 px-5 py-4 border-t border-[#f0ebe6]"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={handleAction}
            className="w-full py-3.5 bg-[#111] text-white text-[0.78rem] font-medium tracking-[0.06em] rounded-xl hover:bg-[#222] active:scale-[0.98] active:bg-[#333] transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            {buttonLabel} →
          </button>
        </div>
      </div>
    </div>
  );
}
