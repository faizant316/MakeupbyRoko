import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder = 'Select an option', label, labelClass }) {
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Detect iOS after mount to avoid SSR/hydration mismatches.
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const displayLabel = selected ? (typeof selected === 'string' ? selected : selected.label) : null;

  // iOS: native <select> triggers the native drum-roll wheel picker (matches the wedding date field).
  if (isIOS) {
    return (
      <div className="relative">
        {label && <label className={labelClass}>{label}</label>}
        <div className="relative">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.825rem] outline-none bg-transparent appearance-none ${value ? 'text-[#111]' : 'text-gray-400'}`}
            style={{ WebkitAppearance: 'none' }}
          >
            <option value="" disabled>{placeholder}</option>
            {options.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return <option key={optValue} value={optValue}>{optLabel}</option>;
            })}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#bbb] absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {label && <label className={labelClass}>{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-0 py-2.5 border-0 border-b text-base sm:text-[0.825rem] text-left flex items-center justify-between transition-all bg-transparent rounded-none outline-none ${
          open ? 'border-[#D4A0B0]' : 'border-gray-200 hover:border-gray-300'
        } ${displayLabel ? 'text-[#111]' : 'text-gray-400'}`}
      >
        <span className="truncate">{displayLabel || placeholder}</span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`w-4 h-4 text-[#bbb] flex-shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div
          data-lenis-prevent
          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 py-1.5 z-50 max-h-[240px] overflow-y-auto overscroll-contain"
          style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
        >
          {options.map((opt) => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            const isSelected = optValue === value;

            return (
              <button
                key={optValue}
                type="button"
                onClick={() => { onChange(optValue); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[0.8rem] transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#D4A0B0]/8 text-[#111] font-medium'
                    : 'text-[#666] hover:bg-[#FAF5F2] hover:text-[#333]'
                }`}
              >
                <span>{optLabel}</span>
                {isSelected && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2.5" className="w-3.5 h-3.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}