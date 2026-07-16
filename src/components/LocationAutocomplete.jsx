import { useState, useEffect, useRef } from 'react';

// Google Places autocomplete for venue / event locations, backed by the
// /api/places-autocomplete route. Shared by the public bridal form and the
// admin Add Client modal so both get the same type-ahead address suggestions.
export default function LocationAutocomplete({ value, onChange, placeholder = 'Venue name & city' }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Keep the visible text in sync when the parent resets/prefills the value.
  useEffect(() => { setQuery(value || ''); }, [value]);

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
          placeholder={placeholder}
          className="flex-1 py-3 border-0 text-base sm:text-[0.95rem] outline-none bg-transparent text-[#111] placeholder:text-gray-300"
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
