import { useState, useEffect, useRef } from 'react';

// Google Places autocomplete for venue / event locations, backed by the
// /api/places-autocomplete route. Shared by the public bridal form and the
// admin Add Client modal so both get the same type-ahead address suggestions.
//
// `dm` themes it for the admin's dark mode. Everything here used to be
// hardcoded light (text-[#111] on a transparent input, a white dropdown), which
// on a dark admin panel meant black text on a near-black field: the address was
// there the whole time and unreadable. Defaults to false so the two public
// forms, which are always light, are untouched.
export default function LocationAutocomplete({ value, onChange, placeholder = 'Venue name & city', dm = false }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Set when Google refuses the lookup rather than merely finding nothing.
  // Without this the two are indistinguishable on screen, which is how a
  // billing lapse once passed for "no matches" and went unnoticed.
  const [failed, setFailed] = useState(false);
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
    if (q.length < 2) { setSuggestions([]); setOpen(false); setFailed(false); return; }
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
      setFailed(Boolean(data.error));
      setOpen(predictions.length > 0 || Boolean(data.error));
    } catch {
      setSuggestions([]);
      setFailed(true);
      setOpen(true);
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
      <div className="relative flex items-center gap-2.5 border-b focus-within:border-[#D4A0B0] transition-colors pb-0.5"
        style={{ borderColor: dm ? '#52525e' : '#E5E7EB' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0 mb-1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => (suggestions.length > 0 || failed) && setOpen(true)}
          placeholder={placeholder}
          className={`flex-1 py-3 border-0 text-base sm:text-[0.95rem] outline-none bg-transparent ${dm ? 'placeholder:text-[#787885]' : 'placeholder:text-gray-300'}`}
          style={{ color: dm ? '#ECEDF1' : '#111' }}
          autoComplete="off"
        />
        {loading && (
          <div className="mb-1.5">
            <div className="w-3.5 h-3.5 border-2 border-[#D4A0B0]/30 border-t-[#D4A0B0] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && (suggestions.length > 0 || failed) && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
          style={{
            background: dm ? '#26262d' : '#fff',
            boxShadow: dm
              ? '0 8px 40px rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.3)'
              : '0 8px 40px rgba(0,0,0,0.14), 0 2px 12px rgba(212,160,176,0.1)',
            border: `1px solid ${dm ? '#3a3a48' : 'rgba(232,226,220,0.8)'}`,
            animation: 'fadeSlideDown 0.15s ease-out',
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {failed && suggestions.length === 0 && (
            <p className="px-4 py-3 text-[0.75rem] leading-relaxed" style={{ color: dm ? '#8b8b95' : '#999' }}>
              Address suggestions aren't loading right now — type the full address
              and it'll save just fine.
            </p>
          )}
          {suggestions.map((place, i) => {
            const main = place.structured_formatting?.main_text || place.description || '';
            const sub = place.structured_formatting?.secondary_text || '';
            return (
              <button
                key={place.place_id || i}
                type="button"
                onMouseDown={() => handleSelect(place)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors group ${dm ? 'hover:bg-[#31313a]' : 'hover:bg-[#FAF8F6]'}`}
                style={{ borderBottom: i < suggestions.length - 1 ? `1px solid ${dm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` : 'none' }}
              >
                <div className="w-6 h-6 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3 h-3">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8rem] truncate font-medium" style={{ color: dm ? '#ECEDF1' : '#111' }}>{main}</p>
                  {sub && <p className="text-[0.7rem] truncate mt-0.5" style={{ color: dm ? '#8b8b95' : '#aaa' }}>{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
