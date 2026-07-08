import { useRef } from 'react';
import { useModalLenis } from '@/lib/modalLenis';
import { CLASS_FORMATS, classMeta } from '@/lib/classCatalog';
import { PLUM } from './classTheme';
import ClassStepper from './ClassStepper';

// Step 2 of the class flow: pick the class (format already chosen). Both
// classes sit side by side so they compare at a glance — the key facts live
// right on each card, so there's no separate wide table to scroll past. Tap to
// select, tap to unselect.

const CLASS_EXTRA = {
  private_basic_lesson: { bestFor: 'Doing your own makeup', leaveWith: 'Personalized product list' },
  masterclass: { bestFor: 'Aspiring & working artists', leaveWith: 'Certificate of completion' },
};

export default function ClassSelector({ classKeys, format, selected, onSelect, onBack, onClose, onNext }) {
  const scrollRef = useRef(null);
  useModalLenis(scrollRef);
  const selectedClass = selected ? classMeta(selected, format) : null;
  const fmt = CLASS_FORMATS[format];

  return (
    <>
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 sm:px-10 py-4 sm:py-5"
        style={{ borderBottom: `1px solid ${PLUM.border}` }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-[#f0eef0]"
            style={{ background: PLUM.tint2, color: PLUM.gray }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <span className="font-serif text-[1.1rem] tracking-tight text-[#111] block leading-tight">Select Your Class</span>
            <span className="text-[0.62rem] tracking-wide" style={{ color: PLUM.gray }}>{fmt?.short}</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#f0eef0]"
          style={{ background: PLUM.tint2, color: PLUM.gray }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="w-full sm:max-w-[900px] sm:mx-auto px-5 sm:px-10 pt-6 sm:pt-9 pb-4 flex flex-col gap-6">

          <ClassStepper current={2} />

          <div className="text-center">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM.rose }}>Step 2 of 3</p>
            <h2 className="font-serif text-[1.6rem] sm:text-[2rem] text-[#111] mb-2">Pick your class</h2>
            <p className="text-[0.8rem] leading-[1.6] max-w-[460px] mx-auto" style={{ color: PLUM.gray }}>
              {format === 'online'
                ? 'Both run live on Zoom. Choose one, then pick your Wednesday and start time.'
                : 'Both are held at the Mountain House studio. Choose one, then pick your Wednesday and start time.'}
            </p>
          </div>

          {/* Two classes side by side */}
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {classKeys.map(key => {
              const cls = classMeta(key, format);
              const extra = CLASS_EXTRA[key] || {};
              const isSelected = selected === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : key)}
                  className="rounded-2xl p-4 sm:p-6 text-left transition-all duration-200 border touch-manipulation flex flex-col relative hover:-translate-y-[3px] hover:shadow-[0_16px_36px_rgba(17,17,17,0.09)]"
                  style={{
                    background: isSelected ? PLUM.selBg : '#fff',
                    borderColor: isSelected ? PLUM.ink : PLUM.border,
                    borderWidth: isSelected ? 1.5 : 1,
                    boxShadow: isSelected ? '0 14px 34px rgba(17,17,17,0.10)' : undefined,
                  }}
                >
                  {/* radio */}
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ borderColor: isSelected ? PLUM.ink : PLUM.grayLt }}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLUM.pink }} />}
                  </div>

                  {/* best-for tag */}
                  <span className="inline-flex self-start text-[0.55rem] font-semibold tracking-[0.1em] uppercase px-2 py-1 rounded-full mb-2.5"
                    style={{ background: PLUM.noteBg, color: PLUM.rose }}>
                    {extra.bestFor}
                  </span>

                  <h4 className="font-serif text-[1.05rem] sm:text-[1.25rem] leading-tight pr-6 mb-1 text-[#111]">
                    {cls.title}
                  </h4>

                  <div className="flex items-baseline gap-1.5 mb-2.5">
                    <span className="font-serif text-[1.35rem] sm:text-[1.55rem] text-[#111]">${cls.price.toLocaleString()}</span>
                    <span className="text-[0.62rem]" style={{ color: PLUM.grayLt }}>paid in full</span>
                  </div>

                  <p className="text-[0.72rem] sm:text-[0.78rem] leading-[1.55] mb-3" style={{ color: PLUM.gray }}>
                    {cls.description}
                  </p>

                  {/* top highlights */}
                  <ul className="flex flex-col gap-1.5 mb-3">
                    {cls.includes.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[0.7rem] sm:text-[0.76rem] leading-[1.4]" style={{ color: PLUM.deep }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={PLUM.pink} strokeWidth="2.5" className="w-3 h-3 mt-[3px] flex-shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {item}
                      </li>
                    ))}
                    {cls.includes.length > 3 && (
                      <li className="text-[0.66rem] pl-[18px]" style={{ color: PLUM.rose }}>
                        +{cls.includes.length - 3} more
                      </li>
                    )}
                  </ul>

                  {/* footer facts */}
                  <div className="mt-auto pt-3 grid grid-cols-1 gap-1.5" style={{ borderTop: `1px solid ${PLUM.borderSoft}` }}>
                    <FactRow label="Length" value={cls.duration} />
                    {cls.durationMinutes >= 360 && (
                      <FactRow label="Break" value={format === 'in_person' ? '1-hr lunch break' : '30-min break'} />
                    )}
                    <FactRow label="You leave with" value={extra.leaveWith} />
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[0.68rem] text-center leading-[1.6]" style={{ color: PLUM.grayLt }}>
            Prices shown for {fmt?.label.toLowerCase()} classes · every class runs on a Wednesday, 11 AM – 7 PM, one client per day.
          </p>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: `1px solid ${PLUM.border}`, background: '#fff', padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full sm:max-w-[900px] sm:mx-auto">
          {selectedClass && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[0.7rem] font-semibold truncate pr-3 text-[#111]">
                {selectedClass.title} <span className="font-normal" style={{ color: PLUM.gray }}>· {fmt?.short}</span>
              </span>
              <div className="text-right flex-shrink-0">
                <span className="text-[0.65rem]" style={{ color: PLUM.gray }}>Total: </span>
                <span className="text-[0.8rem] font-semibold text-[#111]">${selectedClass.price.toLocaleString()}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => selectedClass && onNext()}
            disabled={!selectedClass}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all"
            style={selectedClass
              ? { background: PLUM.ink, color: '#fff', boxShadow: '0 4px 20px rgba(17,17,17,0.18)' }
              : { background: PLUM.disabled, color: PLUM.grayLt, cursor: 'not-allowed' }
            }
          >
            {selectedClass ? 'Continue →' : 'Select a class to continue'}
          </button>
          {selectedClass && (
            <p className="text-[0.65rem] text-center mt-2" style={{ color: PLUM.gray }}>
              Next: pick your Wednesday, time &amp; your details <span style={{ color: PLUM.pink }}>✦</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function FactRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[0.56rem] font-semibold tracking-[0.08em] uppercase flex-shrink-0" style={{ color: PLUM.grayLt }}>{label}</span>
      <span className="text-[0.68rem] font-medium text-right leading-tight" style={{ color: PLUM.deep }}>{value}</span>
    </div>
  );
}
