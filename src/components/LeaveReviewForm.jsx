import { useState, useRef, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';

const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-lg text-[0.85rem] focus:border-[#D4A0B0] focus:ring-2 focus:ring-[#D4A0B0]/10 outline-none transition-all bg-white text-[#111] placeholder:text-gray-400";

const RATING_LABELS = { 0: '', 1: 'Not for me', 2: 'It was okay', 3: 'Pretty good', 4: 'Really great!', 5: 'Absolutely loved it!' };

const HIGHLIGHTS = [
  'Flawless skin', 'Long-lasting', 'Lashes on point', 'Made me feel beautiful',
  'On time', 'Calming vibe', 'Great communication', 'Worth every penny',
];

function CustomDropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full pl-4 pr-8 py-3 border rounded-lg text-[0.85rem] text-left transition-all bg-white cursor-pointer outline-none
          ${open ? 'border-[#D4A0B0] ring-2 ring-[#D4A0B0]/10' : 'border-gray-200 hover:border-gray-300'}
          ${selected && selected.value ? 'text-[#111]' : 'text-gray-400'}`}
      >
        {selected ? selected.label : placeholder}
        <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none transition-transform duration-200"
          style={{ transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})` }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-[#EDD8E0]/60 rounded-xl shadow-[0_8px_30px_rgba(212,160,176,0.12),_0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden"
          style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
          onMouseDown={e => e.preventDefault()}>
          <div className="max-h-[220px] overflow-y-auto py-1.5">
            {options.map(o => (
              <div key={o.value}
                onMouseDown={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-[0.8rem] transition-colors cursor-pointer select-none
                  ${o.value === value ? 'bg-[#D4A0B0]/10 text-[#8A4A63] font-medium' : 'text-[#444] hover:bg-[#FAF8F6] hover:text-[#111]'}`}>
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaveReviewForm() {
  const [form, setForm] = useState({ name: '', service: '', message: '', rating: 5, highlights: [], location: '', photo: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [lockedHeight, setLockedHeight] = useState(null);
  const photoRef = useRef(null);
  const formRef = useRef(null);

  const { data: serviceEntities = [] } = useQuery({
    queryKey: ['public-services-review'],
    queryFn: () => api.entities.Service.filter({ is_active: true }, 'sort_order', 50),
  });

  const SERVICES = serviceEntities.map(s => ({ label: s.title, value: s.title }));
  const shownRating = hoveredStar || form.rating;

  const toggleHighlight = (h) => setForm(f => ({
    ...f,
    highlights: f.highlights.includes(h)
      ? f.highlights.filter(x => x !== h)
      : (f.highlights.length >= 6 ? f.highlights : [...f.highlights, h]),
  }));

  const uploadPhoto = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-review-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm(f => ({ ...f, photo: data.url }));
    } catch (err) {
      alert('Photo upload failed: ' + err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    // Capture the form's current height so the thank-you state keeps the same
    // footprint — prevents the page from jumping when the layout shortens.
    const h = formRef.current?.offsetHeight;
    setSubmitting(true);
    try {
      await api.entities.Review.create({ ...form, status: 'pending' });
      if (h) setLockedHeight(h);
      setSubmitted(true);
    } catch (err) {
      alert('Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10"
        style={lockedHeight ? { minHeight: lockedHeight } : undefined}>
        <div className="w-14 h-14 rounded-full bg-[#FBF5F7] flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.5" className="w-6 h-6">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="font-serif text-xl text-[#111] mb-1.5" style={{ fontWeight: 300 }}>Thank You!</h3>
        <p className="text-[0.8rem] text-[#999] max-w-[260px] leading-relaxed">
          Your review has been submitted and will appear on the site after moderation. It means the world ✦
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10 pointer-events-auto">
      {/* Star rating with live label */}
      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#6E6660] mb-2">Your Rating</label>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setForm({ ...form, rating: star })}
                className="transition-transform hover:scale-110 active:scale-95"
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill={shownRating >= star ? '#D4A0B0' : 'none'} stroke="#D4A0B0" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>
          <span className="text-[0.8rem] font-medium text-[#D4A0B0] transition-all" style={{ minWidth: '7rem' }}>
            {RATING_LABELS[shownRating]}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#6E6660] mb-1.5">Your Name *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
          className={inputClass}
        />
      </div>

      {/* Service + Location side by side on wider screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#6E6660] mb-1.5">Service</label>
          {/* Mobile: native select — triggers iOS wheel picker / Android dialog */}
          <div className="relative md:hidden">
            <select
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              className={`${inputClass} pr-8`}
              style={{ WebkitAppearance: 'none', appearance: 'none' }}
            >
              <option value="">Select a service (optional)</option>
              {SERVICES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {/* Desktop: custom styled dropdown */}
          <div className="hidden md:block">
            <CustomDropdown
              value={form.service}
              onChange={(v) => setForm({ ...form, service: v })}
              placeholder="Select a service (optional)"
              options={[{ value: '', label: 'Select a service (optional)' }, ...SERVICES]}
            />
          </div>
        </div>

        <div>
          <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#6E6660] mb-1.5">Occasion / Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Wedding · NYC"
            className={inputClass}
          />
        </div>
      </div>

      {/* Highlight chips */}
      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#6E6660] mb-2">
          What did you love? <span className="font-normal lowercase tracking-normal text-[#bbb]">· optional</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {HIGHLIGHTS.map(h => {
            const on = form.highlights.includes(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => toggleHighlight(h)}
                className="px-3 py-1.5 rounded-full text-[0.72rem] font-medium transition-all active:scale-95"
                style={on
                  ? { background: '#D4A0B0', color: '#fff', border: '1px solid #D4A0B0' }
                  : { background: '#fff', color: '#8a7f78', border: '1px solid #e7ddd6' }}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#6E6660] mb-1.5">Your Review *</label>
        <textarea
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell me about your experience..."
          className={`${inputClass} resize-none h-[100px]`}
        />
      </div>

      {/* Optional photo */}
      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#6E6660] mb-1.5">
          Add a Photo <span className="font-normal lowercase tracking-normal text-[#bbb]">· optional</span>
        </label>
        {form.photo ? (
          <div className="relative inline-block">
            <img src={form.photo} alt="Your look" className="w-20 h-20 rounded-lg object-cover border border-[#e7ddd6]" />
            <button
              type="button"
              onClick={() => setForm({ ...form, photo: '' })}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#111] text-white flex items-center justify-center text-xs shadow-md hover:bg-[#333] transition-colors"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={photoUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#e0d6cf] text-[0.78rem] text-[#8a7f78] hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all disabled:opacity-60"
          >
            {photoUploading ? (
              <span className="w-4 h-4 border-2 border-[#D4A0B0] border-t-transparent rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
            {photoUploading ? 'Uploading…' : 'Share a photo of your look'}
          </button>
        )}
        <input ref={photoRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-lg text-[0.8rem] font-medium tracking-[0.04em] bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.18)] active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Review ✦'}
      </button>
      <p className="text-[0.65rem] text-center text-gray-400">Reviews are moderated before appearing on the site</p>
    </form>
  );
}
