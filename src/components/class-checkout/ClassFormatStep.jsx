import { useRef } from 'react';
import { useModalLenis } from '@/lib/modalLenis';
import { CLASS_FORMATS, CLASS_CATALOG } from '@/lib/classCatalog';

// Step 1 of the class flow: choose HOW you want to learn. Full-screen choice
// between Online (Zoom) and In Person (Mountain House studio), each with its
// own pitch, before any class is picked.

const FORMAT_CONTENT = {
  online: {
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A0785A'} strokeWidth="1.5" className="w-6 h-6">
        <rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: 'Online',
    sub: 'Live over Zoom, from anywhere',
    points: [
      'Your Zoom link arrives instantly after checkout',
      'Learn hands-on using your own makeup kit',
      'Same personal, one-on-one class, no travel',
    ],
    fromPrice: CLASS_CATALOG.private_basic_lesson.formats.online.price,
  },
  in_person: {
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A0785A'} strokeWidth="1.5" className="w-6 h-6">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    title: 'In Person',
    sub: "At Roko's studio · Mountain House, CA",
    points: [
      'Address and directions in your confirmation email',
      'All products and tools provided at the studio',
      'Work side by side with Roko at her own station',
    ],
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
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#D4A0B0]/12 flex items-center justify-center">
            <span className="text-[#D4A0B0] text-xs">✦</span>
          </div>
          <div>
            <span className="font-serif text-[1.1rem] tracking-tight text-[#111] block leading-tight">Makeup Classes by Roko</span>
            <span className="text-[0.62rem] text-[#c5bdb5] tracking-wide">Online or in person</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#999] hover:text-[#111] transition-all"
          style={{ background: 'rgba(0,0,0,0.06)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="w-full sm:max-w-[860px] sm:mx-auto px-6 sm:px-10 pt-10 pb-6 flex flex-col gap-8">
          <div className="text-center sm:text-left">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Step 1 of 3</p>
            <h2 className="font-serif text-[1.8rem] text-[#111] mb-2">How would you like to learn?</h2>
            <p className="text-[0.85rem] text-gray-400 leading-[1.7] max-w-[480px] mx-auto sm:mx-0">
              Every class is private, one client per Wednesday. Take yours live over Zoom, or come into the studio in Mountain House.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(CLASS_FORMATS).map(f => {
              const c = FORMAT_CONTENT[f.key];
              const active = format === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onFormat(f.key)}
                  className="rounded-2xl p-6 text-left transition-all border touch-manipulation flex flex-col gap-4"
                  style={{
                    background: active ? '#111' : '#FAFAF9',
                    borderColor: active ? '#111' : '#ede8e4',
                    boxShadow: active ? '0 10px 34px rgba(0,0,0,0.18)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: active ? 'rgba(255,255,255,0.14)' : 'rgba(212,160,176,0.14)' }}>
                      {c.icon(active)}
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-1"
                      style={{ borderColor: active ? '#D4A0B0' : '#d0c8c0' }}
                    >
                      {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#D4A0B0' }} />}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-[1.25rem] mb-0.5" style={{ color: active ? '#fff' : '#111' }}>{c.title}</h3>
                    <p className="text-[0.72rem] font-medium" style={{ color: active ? '#D4A0B0' : '#A0785A' }}>{c.sub}</p>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {c.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-[0.74rem] leading-[1.6]"
                        style={{ color: active ? 'rgba(255,255,255,0.72)' : '#8a7e74' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#D4A0B0' : '#D4A0B0'} strokeWidth="2.5" className="w-3 h-3 mt-[3px] flex-shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.68rem] font-semibold tracking-[0.06em] uppercase mt-auto pt-1"
                    style={{ color: active ? 'rgba(255,255,255,0.55)' : '#c5bdb5' }}>
                    Classes from ${c.fromPrice.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[0.72rem] text-[#A0785A] justify-center sm:justify-start">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]" />
            Wednesdays only · 11 AM – 7 PM · pay in full to reserve your day
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: '#fff', padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full sm:max-w-[860px] sm:mx-auto">
          <button
            onClick={() => format && onNext()}
            disabled={!format}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all"
            style={format
              ? { background: '#111', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
              : { background: '#f0ece8', color: '#bbb', cursor: 'not-allowed' }
            }
          >
            {format ? `Continue with ${CLASS_FORMATS[format].label} →` : 'Choose online or in person'}
          </button>
          <p className="text-[0.65rem] text-center text-gray-400 mt-2">
            Next: pick your class <span className="text-[#D4A0B0]">✦</span>
          </p>
        </div>
      </div>
    </>
  );
}
