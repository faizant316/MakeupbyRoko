import { useRef } from 'react';
import { useModalLenis } from '@/lib/modalLenis';
import { CLASS_FORMATS, CLASS_CATALOG } from '@/lib/classCatalog';
import { PLUM } from './classTheme';
import ClassStepper from './ClassStepper';

// Step 1 of the class flow: choose HOW you want to learn. Online (Zoom) vs
// In Person (Mountain House studio), shown side by side so both are visible at
// once on mobile — tap to select, tap again to unselect.

const FORMAT_CONTENT = {
  online: {
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : PLUM.plum} strokeWidth="1.6" className="w-5 h-5">
        <rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: 'Online',
    sub: 'Live over Zoom, from anywhere',
    points: ['Zoom link instantly after checkout', 'Learn on your own makeup kit', 'One-on-one, zero travel'],
    fromPrice: CLASS_CATALOG.private_basic_lesson.formats.online.price,
  },
  in_person: {
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : PLUM.plum} strokeWidth="1.6" className="w-5 h-5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    title: 'In Person',
    sub: "Roko's studio · Mountain House",
    points: ['All products & tools provided', 'Side by side at her station', 'Address in your confirmation'],
    fromPrice: CLASS_CATALOG.private_basic_lesson.formats.in_person.price,
  },
};

export default function ClassFormatStep({ format, onFormat, onClose, onNext }) {
  const scrollRef = useRef(null);
  useModalLenis(scrollRef);

  return (
    <>
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 sm:px-10 py-4 sm:py-5"
        style={{ borderBottom: `1px solid ${PLUM.border}` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,160,176,0.14)' }}>
            <span style={{ color: PLUM.pink }} className="text-xs">✦</span>
          </div>
          <div>
            <span className="font-serif text-[1.1rem] tracking-tight text-[#1a1015] block leading-tight">Makeup Classes by Roko</span>
            <span className="text-[0.62rem] tracking-wide" style={{ color: PLUM.gray }}>Online or in person</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: PLUM.tint2, color: PLUM.plum }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="w-full sm:max-w-[720px] sm:mx-auto px-5 sm:px-10 pt-6 pb-6 flex flex-col gap-6">

          <ClassStepper current={1} />

          <div className="text-center">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM.pink }}>Step 1 of 3</p>
            <h2 className="font-serif text-[1.7rem] sm:text-[1.9rem] text-[#1a1015] mb-3">How would you like to learn?</h2>
            {/* Note-style description */}
            <div
              className="inline-flex items-start gap-2 text-left px-4 py-2.5 rounded-xl mx-auto"
              style={{ background: PLUM.tint, border: `1px solid ${PLUM.border}` }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={PLUM.rose} strokeWidth="1.7" className="w-4 h-4 flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p className="text-[0.76rem] leading-[1.55]" style={{ color: PLUM.deep }}>
                Every class is <strong style={{ color: PLUM.deep }}>private</strong>, one client per Wednesday. Take yours live on Zoom, or come into the studio in Mountain House.
              </p>
            </div>
          </div>

          {/* Both formats, side by side on every screen */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {Object.values(CLASS_FORMATS).map(f => {
              const c = FORMAT_CONTENT[f.key];
              const active = format === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onFormat(active ? null : f.key)}
                  className="rounded-2xl p-4 sm:p-5 text-left transition-all border touch-manipulation flex flex-col gap-3 relative"
                  style={{
                    background: active ? `linear-gradient(160deg, ${PLUM.ink}, ${PLUM.ink2})` : '#fff',
                    borderColor: active ? PLUM.ink : PLUM.border,
                    boxShadow: active ? '0 12px 34px rgba(42,22,32,0.22)' : '0 1px 0 rgba(0,0,0,0.02)',
                  }}
                >
                  {/* radio */}
                  <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ borderColor: active ? PLUM.pink : PLUM.grayLt }}>
                    {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLUM.pink }} />}
                  </div>

                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: active ? 'rgba(255,255,255,0.12)' : 'rgba(212,160,176,0.14)' }}>
                    {c.icon(active)}
                  </div>

                  <div>
                    <h3 className="font-serif text-[1.15rem] leading-tight mb-0.5" style={{ color: active ? '#fff' : '#1a1015' }}>{c.title}</h3>
                    <p className="text-[0.66rem] font-medium leading-snug" style={{ color: active ? PLUM.pink : PLUM.plum }}>{c.sub}</p>
                  </div>

                  <ul className="flex flex-col gap-1.5 mt-0.5">
                    {c.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[0.7rem] leading-[1.45]"
                        style={{ color: active ? 'rgba(255,255,255,0.72)' : PLUM.gray }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={PLUM.pink} strokeWidth="2.5" className="w-3 h-3 mt-[3px] flex-shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {p}
                      </li>
                    ))}
                  </ul>

                  <p className="text-[0.64rem] font-semibold tracking-[0.05em] uppercase mt-auto pt-1"
                    style={{ color: active ? 'rgba(255,255,255,0.5)' : PLUM.grayLt }}>
                    From ${c.fromPrice.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[0.72rem] justify-center" style={{ color: PLUM.plum }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLUM.pink }} />
            Wednesdays only · 11 AM – 7 PM · pay in full to reserve your day
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: `1px solid ${PLUM.border}`, background: '#fff', padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full sm:max-w-[720px] sm:mx-auto">
          <button
            onClick={() => format && onNext()}
            disabled={!format}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all"
            style={format
              ? { background: PLUM.ink, color: '#fff', boxShadow: '0 4px 20px rgba(42,22,32,0.22)' }
              : { background: PLUM.disabled, color: PLUM.grayLt, cursor: 'not-allowed' }
            }
          >
            {format ? `Continue with ${CLASS_FORMATS[format].label} →` : 'Choose online or in person'}
          </button>
          <p className="text-[0.65rem] text-center mt-2" style={{ color: PLUM.gray }}>
            Next: pick your class <span style={{ color: PLUM.pink }}>✦</span>
          </p>
        </div>
      </div>
    </>
  );
}
