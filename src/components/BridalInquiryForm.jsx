import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';

function useBookingCounts() {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    fetch('/api/booking-counts')
      .then(r => r.ok ? r.json() : {})
      .then(setCounts)
      .catch(() => setCounts({}));
  }, []);
  return counts;
}
import CustomSelect from './CustomSelect';
import { compressImage } from '@/lib/compressImage';
import FullDayIncludes from './FullDayIncludes';
import ZelleSuccessUpload from './ZelleSuccessUpload';
import ServiceFAQ from './ServiceFAQ';

const AVAILABLE_DAYS = [1, 2, 3, 4, 5, 6];
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function getMinBookingDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 14);
  return d;
}

const inputClass = "w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.825rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none touch-manipulation";
const labelClass = "block text-[0.6rem] font-semibold tracking-[0.14em] text-[#999] uppercase mb-1.5";

function CalDay({ day, year, month, minDate, selectedDate, handleDayClick, blockedSet, bookedDateMap, maxPerDay }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isPast = day.date < today;
  const isTooSoon = day.date < minDate;
  const isAvail = !isTooSoon && AVAILABLE_DAYS.includes(day.date.getDay());
  const key = dateKey(year, month, day.d);
  const isSel = selectedDate === key;
  const isBlocked = !isPast && blockedSet?.has(key);
  const bookingCount = bookedDateMap?.[key] || 0;
  const isFull = bookingCount >= maxPerDay;
  const isPartial = bookingCount > 0 && !isFull;
  const unavailable = isTooSoon || !isAvail || isBlocked || isFull;

  const isToday = day.date.getTime() === today.getTime();

  return (
    <button type="button" onClick={() => handleDayClick(day)}
      title={
        isBlocked ? 'Blocked'
        : isFull ? 'Fully booked'
        : unavailable ? 'Unavailable'
        : undefined
      }
      className={`w-full aspect-square max-w-[2.75rem] flex flex-col items-center justify-center text-[0.875rem] transition-all relative rounded-none ${
        isBlocked ? 'text-red-300 cursor-not-allowed line-through decoration-red-300'
        : isFull ? 'text-red-300 cursor-not-allowed'
        : unavailable ? 'text-gray-200 cursor-not-allowed'
        : isSel ? 'bg-[#111] text-white font-semibold rounded-sm'
        : isToday ? 'text-[#D4A0B0] font-bold'
        : isPartial ? 'text-[#555] font-medium hover:text-[#111]'
        : 'text-[#888] hover:text-[#111]'
      }`}>
      <span>{day.d}</span>
      {!unavailable && !isSel && isPartial && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#F0C27A]" />
      )}
      {!unavailable && !isSel && !isPartial && isAvail && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
      )}
      {isFull && !isBlocked && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-300" />
      )}
    </button>
  );
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function DateDropdown({ value, placeholder, options, onChange, width }) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const ref = useRef(null);

  // Sync internal value when external value changes
  useEffect(() => { setInternalValue(value); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
          <div className="max-h-[220px] overflow-y-auto py-1.5">
            {options.map(o => (
              <div
                key={o.value}
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

// Detect iOS
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function WeddingDatePicker({ value, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const [selMonth, setSelMonth] = useState('');
  const [selDay, setSelDay] = useState('');
  const [selYear, setSelYear] = useState('');

  const daysInMonth = (selMonth !== '' && selYear) ? new Date(Number(selYear), Number(selMonth) + 1, 0).getDate() : 31;

  const monthOptions = MONTHS.map((m, i) => ({ value: String(i), label: m }));
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  const yearOptions = years.map(y => ({ value: String(y), label: String(y) }));

  const handleChange = (newMonth, newDay, newYear) => {
    if (newMonth !== '' && newDay !== '' && newYear !== '') {
      const mm = String(Number(newMonth) + 1).padStart(2, '0');
      const dd = String(newDay).padStart(2, '0');
      onChange(`${newYear}-${mm}-${dd}`);
    } else {
      onChange('partial');
    }
  };

  // iOS: use native <select> elements — triggers the iOS drum-roll scroll wheel picker
  if (isIOS()) {
    return (
      <div className="flex gap-2">
        <div className="relative" style={{ width: '42%' }}>
          <select
            value={selMonth}
            onChange={e => { setSelMonth(e.target.value); handleChange(e.target.value, selDay, selYear); }}
            className="w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.825rem] outline-none bg-transparent text-[#111] appearance-none"
            style={{ WebkitAppearance: 'none' }}
          >
            <option value="">Month</option>
            {MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div className="relative" style={{ width: '25%' }}>
          <select
            value={selDay}
            onChange={e => { setSelDay(e.target.value); handleChange(selMonth, e.target.value, selYear); }}
            className="w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.825rem] outline-none bg-transparent text-[#111] appearance-none"
            style={{ WebkitAppearance: 'none' }}
          >
            <option value="">Day</option>
            {dayOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div className="relative" style={{ width: '33%' }}>
          <select
            value={selYear}
            onChange={e => { setSelYear(e.target.value); handleChange(selMonth, selDay, e.target.value); }}
            className="w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.825rem] outline-none bg-transparent text-[#111] appearance-none"
            style={{ WebkitAppearance: 'none' }}
          >
            <option value="">Year</option>
            {yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    );
  }

  // Desktop / Android: custom dropdowns
  return (
    <div className="flex gap-2">
      <DateDropdown width="42%" value={selMonth} placeholder="Month" options={monthOptions} onChange={v => { setSelMonth(v); handleChange(v, selDay, selYear); }} />
      <DateDropdown width="25%" value={selDay} placeholder="Day" options={dayOptions} onChange={v => { setSelDay(v); handleChange(selMonth, v, selYear); }} />
      <DateDropdown width="33%" value={selYear} placeholder="Year" options={yearOptions} onChange={v => { setSelYear(v); handleChange(selMonth, selDay, v); }} />
    </div>
  );
}

function BridalSuccess({ onClose, brideName, email, bookingId, uploadToken }) {
  const firstName = (brideName || '').split(' ')[0] || 'there';

  useEffect(() => {
    // Scroll the nearest scrollable ancestor to top
    const el = document.querySelector('[data-modal-scroll]');
    if (el) el.scrollTop = 0;
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 overflow-y-auto flex-1">
      <div className="max-w-[520px] mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="text-center py-2 flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#F7EEF2] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2" className="w-4 h-4">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-[0.58rem] font-semibold tracking-[0.2em] uppercase text-[#C4849A] mb-2">Bridal Inquiry Received</p>
            <h3 className="font-serif text-[1.9rem] font-light text-[#2C1A14] mb-1 leading-tight">
              Hey {firstName}, you're on <em className="italic text-[#C4849A]">the list!</em>
            </h3>
            <p className="font-serif italic text-[#A0785A] text-[0.9rem]">I can't wait to be part of your big day.</p>
          </div>
          {email && (
            <div className="flex items-center gap-2 text-[0.72rem] px-3 py-1.5 rounded-full" style={{ background: 'rgba(196,132,154,0.1)', color: '#A0607A' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              Receipt sent to {email}
            </div>
          )}
        </div>

        {/* What's next */}
        <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A]">What's Next</p>
          </div>
          <div className="px-5 pb-4 pt-2">
            <p className="text-[0.82rem] text-[#6E6058] leading-[1.75]">
              Your bridal inquiry has been received. I'll be in touch within <strong className="text-[#2C1A14]">24–48 hours</strong> to confirm everything and schedule your consultation.
            </p>
            <div className="mt-3 px-3 py-2.5 bg-[#F7F3F0] rounded-lg border-l-2 border-[#D4A0B0]">
              <p className="text-[0.72rem] text-[#A0785A] font-medium">Full deposit details sent to your email.</p>
            </div>
          </div>
        </div>

        {/* Before consultation */}
        <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A]">Before Your Consultation</p>
          </div>
          <div className="px-5 pb-4 pt-2 flex flex-col gap-2.5">
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
                text: <>A photo <strong>with makeup on</strong> and one <strong>without makeup</strong></>
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                text: <>Any <strong>inspiration photos</strong> for your bridal look</>
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
                text: <>Photos of your <strong>gown / outfit(s)</strong></>
              },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[0.78rem] text-[#444]">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-[#D4A0B0]/10 flex items-center justify-center">{icon}</span>
                <span className="mt-0.5">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Send photos to */}
        <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A]">With & Without Makeup Photos</p>
          </div>
          <div className="px-5 pb-4 pt-2">
            <p className="text-[0.75rem] text-[#6E6058] leading-[1.7] mb-3">
              If you uploaded photos in the form, you're all set! If you haven't yet — or want to add more — send them here:
            </p>
            <div className="flex flex-col gap-2.5">
              <a href="mailto:makeupbyroko22@gmail.com" className="flex items-center gap-2.5 text-[0.82rem] text-[#555] hover:text-[#C4849A] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                makeupbyroko22@gmail.com
              </a>
              <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[0.82rem] text-[#555] hover:text-[#C4849A] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#D4A0B0" stroke="none"/>
                  </svg>
                </div>
                @makeupbyroko_ (Instagram DM)
              </a>
            </div>
          </div>
        </div>

        {/* Sign off */}
        <div className="bg-white rounded-2xl border border-[#F0E0E9] px-5 py-5 text-center">
          <p className="font-serif italic text-[#C4849A] text-[1.1rem] mb-1">With love, Roko</p>
          <p className="text-[0.7rem] text-[#999999]">makeupbyroko22@gmail.com · @makeupbyroko_</p>
        </div>

        <div className="pb-4">
          <button onClick={onClose}
            className="w-full py-3.5 rounded-xl border border-gray-200 text-[0.8rem] font-medium text-gray-500 hover:border-[#2C1A14] hover:text-[#2C1A14] transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = async (q) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/places-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: q }),
      });
      const data = await res.json();
      const predictions = data.predictions || [];
      setSuggestions(predictions);
      setOpen(predictions.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
  };

  const handleSelect = (place) => {
    const main = place.structured_formatting?.main_text || '';
    const sub = place.structured_formatting?.secondary_text || '';
    const display = sub ? `${main}, ${sub}` : main;
    setQuery(display);
    onChange(display);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center gap-2.5 border-b border-gray-200 focus-within:border-[#D4A0B0] transition-colors pb-0.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0 mb-1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Venue name & city"
          className="flex-1 py-2.5 border-0 text-base sm:text-[0.825rem] outline-none bg-transparent text-[#111] placeholder:text-gray-300"
          autoComplete="off"
        />
        {loading && (
          <div className="mb-1.5">
            <div className="w-3.5 h-3.5 border-2 border-[#D4A0B0]/30 border-t-[#D4A0B0] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 2px 12px rgba(212,160,176,0.1)',
            border: '1px solid rgba(232,226,220,0.8)',
            animation: 'fadeSlideDown 0.15s ease-out',
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {suggestions.map((place, i) => {
            const main = place.structured_formatting?.main_text || place.description || '';
            const sub = place.structured_formatting?.secondary_text || '';
            return (
              <button
                key={place.place_id || i}
                type="button"
                onMouseDown={() => handleSelect(place)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAF8F6] group"
                style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
              >
                <div className="w-6 h-6 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3 h-3">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8rem] text-[#111] truncate font-medium">{main}</p>
                  {sub && <p className="text-[0.7rem] text-[#aaa] truncate mt-0.5">{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BridalInquiryForm({ onClose, service: passedService }) {
  const { data: bridalService } = useQuery({
    queryKey: ['bridal-service'],
    queryFn: async () => {
      const services = await api.entities.Service.filter({ category: 'bridal', is_active: true }, 'sort_order', 1);
      return services[0] || null;
    },
    enabled: !passedService,
  });

  const { data: blockedDates = [] } = useQuery({ queryKey: ['blocked-dates'], queryFn: () => api.entities.BlockedDate.list(), initialData: [] });
  const rawCounts = useBookingCounts();
  const bookedDateMap = rawCounts ?? {};
  const { data: capacitySettings = [] } = useQuery({ queryKey: ['booking-capacity'], queryFn: () => api.entities.AppSettings.filter({ key: 'max_bookings_per_day' }), staleTime: 30000 });
  const { data: dayCapacities = [] } = useQuery({ queryKey: ['day-capacities'], queryFn: () => api.entities.DayCapacity.list('-date', 200), staleTime: 30000 });

  const blockedSet = new Set(blockedDates.map(b => b.date));
  const DEFAULT_MAX = capacitySettings[0] ? parseInt(capacitySettings[0].value, 10) : 3;
  const dayCapacityMap = {};
  dayCapacities.forEach(d => { dayCapacityMap[d.date] = d.capacity; });
  const getMaxForDay = (key) => dayCapacityMap[key] ?? DEFAULT_MAX;

  const activeService = passedService || bridalService;
  const isFullDay = /full.?day/i.test(activeService?.title || '');
  const bridalPrice = activeService?.price || '$750';
  const bridalDeposit = activeService?.deposit || '$375 deposit';
  const bridalIncludes = activeService?.includes?.length ? activeService.includes : ['Full bridal makeup application','Lash application included','Professional touch-up kit','30-min Zoom consultation included','Bridesmaid add-ons available'];
  const bridalTitle = activeService?.title || 'Bridal Package';

  const minDate = getMinBookingDate();
  const [calDate, setCalDate] = useState(new Date(minDate.getFullYear(), minDate.getMonth()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [newBookingId, setNewBookingId] = useState(null);
  const [uploadToken, setUploadToken] = useState(null);
  const [inspoPhotos, setInspoPhotos] = useState([]);
  const [inspoUploading, setInspoUploading] = useState(false);
  const [form, setForm] = useState({
    bride_name: '', soon_to_be_last_name: '', email: '', phone: '',
    instagram_handle: '', wedding_date: '', event_location: '',
    event_start_time: '', photographer: '', hairstylist: '',
    venue_access_time: '', num_people_glam: '', additional_details: '', how_heard: '',
    ready_by_time: '', photographer_arrival_time: '', out_of_state: undefined
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthName = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push({ d, date: new Date(year, month, d) });

  const handleDayClick = (day) => {
    if (!day) return;
    const isTooSoon = day.date < minDate;
    const isAvail = !isTooSoon && AVAILABLE_DAYS.includes(day.date.getDay());
    if (!isAvail) return;
    const key = dateKey(year, month, day.d);
    if (blockedSet.has(key)) return;
    if ((bookedDateMap[key] || 0) >= getMaxForDay(key)) return;
    setSelectedDate(key);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bride_name) { alert('Please enter the bride\'s name.'); return; }
    if (!form.email) { alert('Please enter your email address.'); return; }
    if (!form.phone) { alert('Please enter your phone number.'); return; }
    if (!form.wedding_date || form.wedding_date === 'partial') { alert('Please select a complete wedding date (month, day, and year).'); return; }
    if (!selectedDate) { alert('Please select a preferred appointment date from the calendar.'); return; }
    if (!form.event_location) { alert('Please enter the event location.'); return; }
    if (!form.event_start_time) { alert('Please enter the event start time.'); return; }
    if (!form.venue_access_time) { alert('Please enter the venue access time.'); return; }

    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Create bridal inquiry record (carries all the wedding details shown in admin)
    const inquiryRes = await fetch('/api/bridal-inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, preferred_date: selectedDate || '', preferred_time: '', status: 'new', upload_token: token }),
    });
    if (!inquiryRes.ok) {
      // Don't block the booking, but make the failure loud instead of silent.
      console.error('Bridal inquiry insert failed:', await inquiryRes.text().catch(() => inquiryRes.status));
    }

    // Create associated booking record (carries the upload token + inspo photos)
    const bookingRes = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.bride_name,
        email: form.email,
        phone: form.phone,
        service: bridalTitle,
        date: selectedDate || '',
        time: '',
        notes: `Ready by: ${form.ready_by_time || 'Not specified'}. ${form.additional_details || ''}`.trim(),
        status: 'pending',
        upload_token: token,
        reference_photos: inspoPhotos,
      }),
    });
    const newBooking = await bookingRes.json();
    setNewBookingId(newBooking.id);
    setUploadToken(token);

    // Use the stable public production URL, not window.location.origin, so the
    // email link never points at a protected *.vercel.app deployment URL (which
    // would force clients into a Vercel login wall on mobile).
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
    const uploadUrl = `${siteBase}/upload-zelle?id=${newBooking.id}&token=${token}`;
    const bridalDateFormatted = selectedDate
      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'your requested date';
    const brideFirst = (form.bride_name || '').split(' ')[0] || 'there';

    fetch('/api/send-booking-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingType: 'bridal',
        to: form.email,
        firstName: brideFirst,
        phone: form.phone,
        bridalTitle,
        bridalDeposit,
        bridalDateFormatted,
        uploadUrl,
        eventLocation: form.event_location,
        eventStartTime: form.event_start_time,
        venueAccessTime: form.venue_access_time,
        numPeopleGlam: form.num_people_glam,
        outOfState: form.out_of_state,
        weddingDate: form.wedding_date,
      }),
    }).catch(err => console.error('bridal email error:', err));

    setSubmitted(true);
  };

  if (submitted) return <BridalSuccess onClose={onClose} brideName={form.bride_name} email={form.email} bookingId={newBookingId} uploadToken={uploadToken} />;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">

      {/* Hero Banner */}
      <div className="relative h-[160px] overflow-hidden flex-shrink-0">
        <img src="/IMG_9891.jpeg" alt="Bridal" className="w-full h-full object-cover object-[center_30%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <p className="text-[0.6rem] font-medium tracking-[0.14em] uppercase mb-1 text-white/60">{bridalTitle} — {bridalPrice}</p>
          <h2 className="font-serif text-[1.3rem] leading-tight font-normal">
            {isFullDay ? 'Your full day, flawlessly covered.' : 'Your big day deserves perfection.'}
          </h2>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex-shrink-0">
        {isFullDay ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Package Price</p>
                <p className="font-serif text-[1.1rem] text-[#111] leading-tight">{bridalPrice}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Deposit to Book</p>
                <p className="font-serif text-[1.1rem] text-[#D4A0B0] leading-tight">{bridalDeposit}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Coverage</p>
                <p className="text-[0.78rem] font-medium text-[#111] leading-tight">All Day</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Travel</p>
                <p className="text-[0.78rem] font-medium text-[#111] leading-tight">Included</p>
              </div>
            </div>
            <p className="text-[0.68rem] text-gray-400">Confirmed within 24–48 hrs · Private consultation 1 month before</p>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Package Price</p>
                <p className="font-serif text-[1.1rem] text-[#111] leading-tight">{bridalPrice}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Deposit to Book</p>
                <p className="font-serif text-[1.1rem] text-[#D4A0B0] leading-tight">{bridalDeposit}</p>
              </div>
            </div>
            <p className="text-[0.68rem] text-gray-400">Confirmed within 24–48 hrs · Consultation 1 month before event</p>
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* LEFT — Calendar + Includes */}
        <div className="lg:w-[48%] p-6 lg:p-7 border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/30 flex flex-col gap-5 relative overflow-hidden" id="bridal-left-panel">

          {/* Glow accents */}
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-[0.07] pointer-events-none" style={{ background: 'radial-gradient(circle, #D4A0B0, transparent 70%)' }} />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.05] pointer-events-none" style={{ background: 'radial-gradient(circle, #B8A0D4, transparent 70%)' }} />

          {/* Calendar heading */}
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <span className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-[#888]">Preferred Appointment Date</span>
          </div>

          {/* 30-day notice */}
          <div className="bg-white border-2 border-[#D4A0B0] rounded-xl px-4 py-2.5 relative z-10">
            <p className="text-[0.72rem] text-[#888]">
              Bridal bookings must be at least <strong className="text-[#555]">2 weeks in advance</strong>. Earliest: <strong className="text-[#555]">{minDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong>
            </p>
          </div>

          {/* Calendar */}
          <div className="relative z-10">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <button type="button" onClick={() => setCalDate(new Date(year, month - 1))} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl">‹</button>
              <span className="font-serif text-[1.2rem] text-[#111] tracking-tight">{monthName}</span>
              <button type="button" onClick={() => setCalDate(new Date(year, month + 1))} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl">›</button>
            </div>

            {/* Month availability summary */}
            {(() => {
              const _today = new Date(); _today.setHours(0, 0, 0, 0);
              let openCount = 0, fillingCount = 0, fullCount = 0;
              calDays.forEach(day => {
                if (!day) return;
                if (day.date < _today) return;
                const isTooSoon = day.date < minDate;
                const isAvail = !isTooSoon && AVAILABLE_DAYS.includes(day.date.getDay());
                if (!isAvail) return;
                const key = dateKey(year, month, day.d);
                if (blockedSet?.has(key)) return;
                const count = bookedDateMap?.[key] || 0;
                if (count >= getMaxForDay(key)) fullCount++;
                else if (count > 0) fillingCount++;
                else openCount++;
              });
              if (openCount + fillingCount + fullCount === 0) return null;
              return (
                <div className="flex items-center gap-2 flex-wrap mt-3 mb-2">
                  {openCount > 0 && (
                    <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{openCount} open
                    </span>
                  )}
                  {fillingCount > 0 && (
                    <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,194,122,0.15)', color: '#92400e' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F0C27A] inline-block" />{fillingCount} filling
                    </span>
                  )}
                  {fullCount > 0 && (
                    <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#b91c1c' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" />{fullCount} full
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-7 gap-1.5 text-center mt-4 mb-3">
              {['SU','MO','TU','WE','TH','FR','SA'].map((d, i) => (
                <div key={i} className="text-[0.6rem] font-semibold text-gray-400 uppercase py-2 tracking-[0.08em]">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {calDays.map((day, idx) => !day
                ? <div key={`e-${idx}`} className="w-11 h-11" />
                : <CalDay key={dateKey(year, month, day.d)} day={day} year={year} month={month} minDate={minDate} selectedDate={selectedDate} handleDayClick={handleDayClick} blockedSet={blockedSet} bookedDateMap={bookedDateMap} maxPerDay={getMaxForDay(dateKey(year, month, day.d))} />
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Open
              </span>
              <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F0C27A] inline-block"></span> Filling
              </span>
              <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block"></span> Booked
              </span>
              <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#111] inline-block"></span> Selected
              </span>
            </div>
          </div>

          {/* Includes */}
          <div className="border-t border-gray-100 pt-5 relative z-10">
            {isFullDay ? (
              <FullDayIncludes bridalIncludes={bridalIncludes} />
            ) : (
              <>
                <span className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-2.5">What's Included</span>
                <ul className="flex flex-col gap-1.5">
                  {bridalIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[0.75rem] text-gray-500">
                      <span className="text-[#D4A0B0] text-[0.65rem] mt-0.5">✦</span>{item}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="lg:w-[52%] p-6 lg:p-7 flex flex-col gap-4 overflow-y-auto">

          {/* Selection summary */}
          {selectedDate && (
            <div className="bg-gradient-to-r from-[#D4A0B0]/8 to-[#B8A0D4]/8 border border-[#D4A0B0]/15 rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ boxShadow: '0 0 20px rgba(212,160,176,0.08)' }}>
              <div className="w-9 h-9 rounded-xl bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-0.5">Preferred Date</p>
                <p className="text-[0.82rem] text-[#333]">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-serif text-[1.4rem] text-[#111] mb-1">
              {isFullDay
                ? <>Tell me about your <em className="text-[#D4A0B0] not-italic">full day</em></>
                : <>Tell me about your <em className="text-[#D4A0B0] not-italic">day</em></>
              }
            </h3>
            {isFullDay && (
              <div className="mb-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#D4A0B0] text-[0.6rem]">✦</span>
                  <span className="text-[0.6rem] font-bold tracking-[0.14em] uppercase text-[#D4A0B0]">Full Day Coverage</span>
                </div>
                <p className="text-[0.75rem] text-[#555] leading-[1.7] mb-3">
                  Roko stays with you from <strong>prep through ceremony</strong> — no rushing, no handoffs. Perfect for early start times, bridal switch looks, or venues over 1 hour from the studio.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] text-[#b5a99a]">Package Price</span>
                  <span className="font-serif text-[1.1rem] text-[#111]">{bridalPrice} <span className="text-[0.7rem] font-sans text-[#b5a99a]">· {bridalDeposit}</span></span>
                </div>
              </div>
            )}
            <p className="text-[0.8rem] text-gray-400">Fields marked * are required.</p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Bride's First Name *</label>
              <input value={form.bride_name} onChange={e => set('bride_name', e.target.value)} placeholder="First name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input value={form.soon_to_be_last_name} onChange={e => set('soon_to_be_last_name', e.target.value)} placeholder="Last name" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone *</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Instagram / TikTok Handle</label>
            <input value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)} placeholder="@yourusername" className={inputClass} />
          </div>

          <div className="w-full h-px bg-gray-100" />

          <div>
            <label className={labelClass}>Wedding Date *</label>
            <WeddingDatePicker value={form.wedding_date} onChange={v => set('wedding_date', v)} />
          </div>

          <div>
            <label className={labelClass}>Event Start Time *</label>
            <input value={form.event_start_time} onChange={e => set('event_start_time', e.target.value)} placeholder="e.g. 2:00 PM" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Makeup Artist Arrive By *</label>
              <input value={form.ready_by_time} onChange={e => set('ready_by_time', e.target.value)} placeholder="e.g. 10:00 AM" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Photographer Arrives</label>
              <input value={form.photographer_arrival_time} onChange={e => set('photographer_arrival_time', e.target.value)} placeholder="e.g. 11:00 AM" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Event Location *</label>
            <LocationAutocomplete value={form.event_location} onChange={v => set('event_location', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Photographer</label>
              <input value={form.photographer} onChange={e => set('photographer', e.target.value)} placeholder="Share their Instagram" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hairstylist</label>
              <input value={form.hairstylist} onChange={e => set('hairstylist', e.target.value)} placeholder="Share their Instagram" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Venue Access Time *</label>
              <input value={form.venue_access_time} onChange={e => set('venue_access_time', e.target.value)} placeholder="e.g. 10:00 AM" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>How Many Need Glam?</label>
              <input value={form.num_people_glam} onChange={e => set('num_people_glam', e.target.value)} placeholder="Bridal party, MOB, etc." className={inputClass} />
            </div>
          </div>

          <div className="w-full h-px bg-gray-100" />

          <div>
            <label className={labelClass}>Makeup Vision & Additional Details</label>
            <textarea value={form.additional_details} onChange={e => set('additional_details', e.target.value)} placeholder="What do I need to know about your day? Your makeup vision? Any inspo images?" className={`${inputClass} resize-none h-[80px] border-b`} />
          </div>

          {/* Before & After Photos — moved here, right next to makeup vision */}
          <div>
            <label className={labelClass}>Photos of You (With & Without Makeup) <span className="text-gray-300 normal-case tracking-normal font-normal">— optional</span></label>
            <p className="text-[0.68rem] text-gray-400 mb-3">Send a couple of recent photos of yourself with and without makeup so I can get a feel for your features.</p>

            {inspoPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {inspoPhotos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={url} alt={`Inspo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setInspoPhotos(p => p.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-2.5 h-2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition-colors w-fit ${inspoUploading ? 'opacity-50 pointer-events-none' : 'hover:border-[#D4A0B0] hover:text-[#A0785A]'}`}
              style={{ borderColor: '#e8e2dc', color: '#aaa' }}>
              {inspoUploading ? (
                <><div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /><span className="text-[0.72rem]">Uploading…</span></>
              ) : (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span className="text-[0.72rem] font-medium">Add photos</span></>
              )}
              <input type="file" accept="image/*" multiple className="hidden" disabled={inspoUploading}
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (!files.length) return;
                  setInspoUploading(true);
                  try {
                    const urls = await Promise.all(files.map(async (f) => {
                      // Shrink large photos so they stay under the upload size limit.
                      const compressed = await compressImage(f);
                      const fd = new FormData();
                      fd.append('file', compressed);
                      const res = await fetch('/api/upload-inspo-photo', { method: 'POST', body: fd });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || `Upload failed (${res.status})`);
                      }
                      const data = await res.json();
                      return data.url;
                    }));
                    setInspoPhotos(p => [...p, ...urls]);
                  } catch (err) {
                    alert('Photo upload failed. Please try again.');
                  } finally {
                    setInspoUploading(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>

          <div>
            <CustomSelect
              label="How Did You Hear About Me?"
              labelClass={labelClass}
              value={form.how_heard}
              onChange={(v) => set('how_heard', v)}
              placeholder="Select an option"
              options={['Instagram','TikTok','Facebook','Vendor Referral','Client Referral','Google','Other']}
            />
          </div>

          {/* Out-of-State Section */}
          <div className="w-full h-px bg-gray-100" />

          <div>
            <label className={labelClass}>Is this an out-of-state event?</label>
            <p className="text-[0.68rem] text-gray-400 mt-0.5 mb-2">Local = California &nbsp;·&nbsp; Out of state = outside CA</p>
            <div className="flex gap-3 mt-1">
              {['No', 'Yes'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set('out_of_state', opt === 'Yes')}
                  className={`flex-1 py-2.5 rounded-xl text-[0.78rem] font-medium border transition-all ${
                    (opt === 'Yes' ? form.out_of_state === true : form.out_of_state === false && form.out_of_state !== undefined)
                      ? 'bg-[#111] text-white border-[#111]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {opt === 'Yes' ? 'Yes, out of state' : 'No, local event'}
                </button>
              ))}
            </div>

            {form.out_of_state === true && (
              <div className="mt-3 bg-white border border-[#E2C4D2] rounded-xl p-4 flex flex-col gap-2">
                <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-0.5">Out-of-State Requirements</p>
                <p className="text-[0.75rem] text-[#555] leading-[1.7]">
                  Roko loves destination events! For out-of-state bookings, the following are required and must be covered by the client:
                </p>
                <ul className="flex flex-col gap-1.5 mt-1">
                  <li className="flex items-start gap-2 text-[0.75rem] text-[#444]">
                    <span className="mt-0.5 text-[#D4A0B0]">✦</span>
                    <span><strong>Round-trip flight</strong> for Roko + 1 add-on person</span>
                  </li>
                  <li className="flex items-start gap-2 text-[0.75rem] text-[#444]">
                    <span className="mt-0.5 text-[#D4A0B0]">✦</span>
                    <span><strong>Hotel accommodation</strong> — minimum 2 nights</span>
                  </li>
                  <li className="flex items-start gap-2 text-[0.75rem] text-[#444]">
                    <span className="mt-0.5 text-[#D4A0B0]">✦</span>
                    <span><strong>Add-on person fee</strong> — Roko does not travel alone</span>
                  </li>
                </ul>
                <div className="mt-2 pt-2.5 border-t border-[#EDD5E2]">
                  <p className="text-[0.72rem] text-[#999]">
                    For pricing & details on out-of-state bookings, email us at{' '}
                    <a href="mailto:makeupbyroko22@gmail.com" className="text-[#D4A0B0] hover:underline font-medium">makeupbyroko22@gmail.com</a>
                    {' '}or DM{' '}
                    <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer" className="text-[#D4A0B0] hover:underline font-medium">@makeupbyroko_</a>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-2">
            <button type="submit" className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] transition-all">
              Submit Bridal Inquiry →
            </button>
            <p className="text-[0.65rem] text-center text-gray-400 mt-2">
              Roko will confirm within 24–48 hours · {bridalDeposit} secures your date <span className="text-[#D4A0B0]">✦</span>
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      {activeService && (
        <div className="px-6 lg:px-8 py-6 border-t border-gray-100">
          <ServiceFAQ service={activeService} />
        </div>
      )}
    </form>
  );
}