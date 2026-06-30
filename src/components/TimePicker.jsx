import { useState, useEffect, useRef } from 'react';

const inputClass = "w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.85rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none touch-manipulation";

function DateDropdown({ value, placeholder, options, onChange, width }) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const ref = useRef(null);
  const listRef = useRef(null);

  // Sync internal value when external value changes
  useEffect(() => { setInternalValue(value); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // When opened with a value already chosen, center it in view so long lists
  // (e.g. the time picker) don't always start scrolled to the top.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    if (el) listRef.current.scrollTop = el.offsetTop - listRef.current.clientHeight / 2 + el.clientHeight / 2;
  }, [open]);

  const selected = options.find(o => String(o.value) === String(internalValue));

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full pl-0 pr-6 py-2.5 border-0 border-b text-base sm:text-[0.825rem] text-left transition-all bg-transparent cursor-pointer outline-none rounded-none
          ${open ? 'border-[#D4A0B0]' : 'border-gray-200 hover:border-gray-300'}
          ${selected ? 'text-[#111]' : 'text-gray-300'}`}
      >
        {selected ? selected.label : <span className="text-gray-400">{placeholder}</span>}
        <svg
          viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none transition-transform duration-200"
          style={{ transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})` }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-[#e8e2dc] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] overflow-hidden"
          style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
          onMouseDown={e => e.preventDefault()}
        >
          <div ref={listRef} data-lenis-prevent className="max-h-[220px] overflow-y-auto overscroll-contain py-1.5">
            {options.map(o => (
              <div
                key={o.value}
                data-selected={String(o.value) === String(internalValue)}
                onMouseDown={e => { e.preventDefault(); setInternalValue(o.value); onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-[0.8rem] transition-colors cursor-pointer select-none
                  ${String(o.value) === String(internalValue)
                    ? 'bg-[#D4A0B0]/10 text-[#A0785A] font-medium'
                    : 'text-[#444] hover:bg-[#FAF8F6] hover:text-[#111]'
                  }`}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Time options across a sensible event window (5 AM – 11:45 PM, 15-min steps).
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      const ampm = h < 12 ? 'AM' : 'PM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${h12}:${String(m).padStart(2, '0')} ${ampm}`);
    }
  }
  return out;
})();

// "2:00 PM" → "14:00" (for native <input type="time">)
function timeTo24(val) {
  if (!val) return '';
  const m = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return '';
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

// "14:00" → "2:00 PM"
function timeFrom24(val) {
  if (!val) return '';
  const [hs, ms = '00'] = val.split(':');
  const h = parseInt(hs, 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${ms} ${ampm}`;
}

// Tap-to-pick time selector: native time wheel on mobile (iOS/Android),
// a styled scroll dropdown on desktop. Stores a display string like "2:00 PM".
export default function TimePicker({ value, onChange, placeholder = 'Select time' }) {
  const options = TIME_OPTIONS.map(t => ({ value: t, label: t }));
  return (
    <>
      {/* Mobile — native time wheel */}
      <div className="block sm:hidden">
        <input
          type="time"
          value={timeTo24(value)}
          onChange={e => onChange(timeFrom24(e.target.value))}
          className={inputClass}
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
        />
      </div>
      {/* Desktop — styled dropdown */}
      <div className="hidden sm:block">
        <DateDropdown width="100%" value={value} placeholder={placeholder} options={options} onChange={onChange} />
      </div>
    </>
  );
}
