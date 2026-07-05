import { useRef } from 'react';
import { useModalLenis } from '@/lib/modalLenis';
import { CLASS_FORMATS, classMeta } from '@/lib/classCatalog';

// Format icons for the Online / In Person switch.
const FormatIcon = ({ type, active }) => type === 'online' ? (
  <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A0785A'} strokeWidth="1.6" className="w-[18px] h-[18px]">
    <rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A0785A'} strokeWidth="1.6" className="w-[18px] h-[18px]">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

export default function ClassSelector({ classKeys, format, onFormat, selected, onSelect, onClose, onNext }) {
  const scrollRef = useRef(null);
  useModalLenis(scrollRef);
  const selectedClass = selected ? classMeta(selected, format) : null;

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
            <span className="text-[0.62rem] text-[#c5bdb5] tracking-wide">Choose your class</span>
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

      {/* Scrollable content — leave bottom padding for sticky bar */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="w-full sm:max-w-[860px] sm:mx-auto px-6 sm:px-10 pt-8 pb-4 flex flex-col gap-7">
          {/* Intro */}
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Service Menu</p>
            <h2 className="font-serif text-[1.6rem] text-[#111] mb-2">Makeup Classes by <em className="text-[#D4A0B0] not-italic">MakeupbyRoko</em></h2>
            <p className="text-[0.85rem] text-gray-400 leading-[1.7]">
              Learn online over Zoom, or in person at the studio in Mountain House. Pick your format and class, then choose your Wednesday and time.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[0.72rem] text-[#A0785A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]" />
              Wednesdays only · pay in full to reserve your seat
            </div>
          </div>

          {/* Format switch — Online vs In Person */}
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-3">Step 1 · How would you like to learn?</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(CLASS_FORMATS).map(f => {
                const active = format === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => onFormat(f.key)}
                    className="rounded-xl p-4 text-left transition-all border touch-manipulation"
                    style={{
                      background: active ? '#111' : '#FAFAF9',
                      borderColor: active ? '#111' : '#ede8e4',
                      boxShadow: active ? '0 6px 22px rgba(0,0,0,0.16)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: active ? 'rgba(255,255,255,0.14)' : 'rgba(212,160,176,0.14)' }}>
                        <FormatIcon type={f.key} active={active} />
                      </div>
                      <span className="text-[0.86rem] font-semibold" style={{ color: active ? '#fff' : '#111' }}>{f.label}</span>
                    </div>
                    <p className="text-[0.68rem] leading-[1.6]" style={{ color: active ? 'rgba(255,255,255,0.72)' : '#a5998e' }}>
                      {f.key === 'online' ? 'Live over Zoom, from anywhere' : 'At the studio · Mountain House, CA'}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-[0.68rem] text-gray-400 mt-2.5 leading-[1.6]">
              {CLASS_FORMATS[format].blurb}
            </p>
          </div>

          {/* Class cards */}
          <div className="flex flex-col gap-4">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-0">Step 2 · Select a Class</p>
            {classKeys.map(key => {
              const cls = classMeta(key, format);
              const isSelected = selected === key;
              return (
                <div
                  key={key}
                  onClick={() => onSelect(key)}
                  className="rounded-xl p-5 cursor-pointer transition-all border"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, rgba(212,160,176,0.06), rgba(184,160,212,0.06))' : '#FAFAF9',
                    borderColor: isSelected ? '#D4A0B0' : '#ede8e4',
                    boxShadow: isSelected ? '0 0 0 1px #D4A0B080' : 'none',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{ borderColor: isSelected ? '#D4A0B0' : '#d0c8c0' }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#D4A0B0' }} />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1.5">
                        <h4 className="font-serif text-[1rem] text-[#111]">{cls.title}</h4>
                        <span
                          className="text-[0.6rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                          style={{ background: isSelected ? '#D4A0B0' : '#ede8e4', color: isSelected ? '#fff' : '#a5998e' }}
                        >
                          ${cls.price.toLocaleString()}
                        </span>
                        <span
                          className="text-[0.58rem] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(160,120,90,0.1)', color: '#A0785A' }}
                        >
                          {CLASS_FORMATS[format].short}
                        </span>
                      </div>
                      <p className="text-[0.65rem] font-medium text-[#A0785A] mb-2">
                        {cls.duration} · {cls.dayNote} · <span className="text-[#A0785A]">paid in full</span>
                      </p>
                      <p className="text-[0.78rem] text-gray-500 leading-[1.7]">{cls.description}</p>
                      {cls.includes && (
                        <ul className="mt-2 flex flex-col gap-1">
                          {cls.includes.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[0.74rem] text-gray-500">
                              <span className="text-[#D4A0B0] mt-[2px] flex-shrink-0">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: '#fff', padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full sm:max-w-[860px] sm:mx-auto">
          {selectedClass && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[0.7rem] font-semibold text-[#111] truncate pr-3">
                {selectedClass.title} <span className="font-normal text-[#A0785A]">· {CLASS_FORMATS[format].short}</span>
              </span>
              <div className="text-right flex-shrink-0">
                <span className="text-[0.65rem] text-gray-400">Total: </span>
                <span className="text-[0.8rem] font-semibold text-[#111]">${selectedClass.price.toLocaleString()}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => selectedClass && onNext()}
            disabled={!selectedClass}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all"
            style={selectedClass
              ? { background: '#111', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
              : { background: '#f0ece8', color: '#bbb', cursor: 'not-allowed' }
            }
          >
            {selectedClass ? 'Continue →' : 'Select a class to continue'}
          </button>
          {selectedClass && (
            <p className="text-[0.65rem] text-center text-gray-400 mt-2">
              Next: pick your Wednesday, time &amp; your details <span className="text-[#D4A0B0]">✦</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
