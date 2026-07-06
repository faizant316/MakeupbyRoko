import { PLUM } from './classTheme';

// Subtle 1-2-3 timeline shown at the top of every class-flow step so the
// client always knows where they are. Kept small and quiet on purpose — a thin
// connective line with three dots, current one filled plum, done ones checked.
const STEPS = [
  { n: 1, label: 'Format' },
  { n: 2, label: 'Class' },
  { n: 3, label: 'Details' },
];

export default function ClassStepper({ current = 1, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-0 select-none ${className}`}>
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5" style={{ width: 58 }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: active ? PLUM.ink : done ? PLUM.rose : '#fff',
                  border: active || done ? 'none' : `1.5px solid ${PLUM.border}`,
                  boxShadow: active ? '0 3px 10px rgba(42,22,32,0.22)' : 'none',
                }}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="w-3 h-3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="text-[0.62rem] font-bold" style={{ color: active ? '#fff' : PLUM.grayLt }}>
                    {s.n}
                  </span>
                )}
              </div>
              <span
                className="text-[0.52rem] font-semibold tracking-[0.12em] uppercase"
                style={{ color: active ? PLUM.deep : done ? PLUM.plum : PLUM.grayLt }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px rounded-full -mt-4 transition-all"
                style={{ width: 26, background: s.n < current ? PLUM.rose : PLUM.border }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
