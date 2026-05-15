import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';

const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-[0.85rem] focus:border-[#D4A0B0] focus:ring-2 focus:ring-[#D4A0B0]/15 outline-none transition-all bg-white text-[#111] placeholder:text-gray-400";

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
        className={`w-full pl-4 pr-8 py-3 border rounded-xl text-[0.85rem] text-left transition-all bg-white cursor-pointer outline-none
          ${open ? 'border-[#D4A0B0] ring-2 ring-[#D4A0B0]/15' : 'border-gray-200 hover:border-gray-300'}
          ${selected ? 'text-[#111]' : 'text-gray-400'}`}
      >
        {selected ? selected.label : placeholder}
        <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none transition-transform duration-200"
          style={{ transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})` }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-[#e8e2dc] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] overflow-hidden"
          style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
          onMouseDown={e => e.preventDefault()}>
          <div className="max-h-[220px] overflow-y-auto py-1.5">
            {options.map(o => (
              <div key={o.value}
                onMouseDown={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-[0.8rem] transition-colors cursor-pointer select-none
                  ${o.value === value ? 'bg-[#D4A0B0]/10 text-[#A0785A] font-medium' : 'text-[#444] hover:bg-[#FAF8F6] hover:text-[#111]'}`}>
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
  const [form, setForm] = useState({ name: '', service: '', message: '', rating: 5 });
  const [submitted, setSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const { data: serviceEntities = [] } = useQuery({
    queryKey: ['public-services-review'],
    queryFn: () => base44.entities.Service.filter({ is_active: true }, 'sort_order', 50),
  });

  const SERVICES = serviceEntities.map(s => ({ label: s.title, value: s.title }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await base44.entities.Review.create({ ...form, status: 'pending' });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5" className="w-6 h-6">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="font-serif text-xl text-[#111] mb-1">Thank You!</h3>
        <p className="text-[0.8rem] text-[#999] max-w-[260px] leading-relaxed">
          Your review has been submitted. It means the world to me! 💕
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10 pointer-events-auto">
      {/* Star rating */}
      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-2">Your Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setForm({ ...form, rating: star })}
              className="transition-transform hover:scale-110"
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill={(hoveredStar || form.rating) >= star ? '#D4A0B0' : 'none'} stroke="#D4A0B0" strokeWidth="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Your Name *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Service</label>
        <CustomDropdown
          value={form.service}
          onChange={(v) => setForm({ ...form, service: v })}
          placeholder="Select a service (optional)"
          options={[{ value: '', label: 'Select a service (optional)' }, ...SERVICES]}
        />
      </div>

      <div>
        <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Your Review *</label>
        <textarea
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell me about your experience..."
          className={`${inputClass} resize-none h-[100px]`}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] transition-all"
      >
        Submit Review ✦
      </button>
      <p className="text-[0.65rem] text-center text-gray-400">Reviews are moderated before appearing on the site</p>
    </form>
  );
}