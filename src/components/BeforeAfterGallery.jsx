import { useState, useEffect, useCallback } from 'react';

const TRANSFORMATIONS = [
  {
    id: 2,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/93fa7f670_image.png',
    type: 'side-by-side',
    label: 'Bridal',
    title: 'The South Asian Bride',
    occasion: 'Wedding ceremony',
    tags: ['Soft glam', 'Flawless skin', 'Long-wear lashes'],
    description: 'A full bridal transformation: soft glam with flawless skin, defined brows, and lashes that last all day. This look was created for a South Asian wedding ceremony.',
  },
  {
    id: 3,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/938ee1ff3_IMG_1206.jpg',
    type: 'portrait',
    label: 'Bridal',
    title: 'Sculpted & Luminous',
    occasion: 'Bridal',
    tags: ['Sculpted contour', 'Bold lashes', 'Photo-ready'],
    description: 'Elegant bridal glam featuring a sculpted contour, bold lash set, and a luminous complexion tailored to photograph beautifully under all lighting.',
  },
  {
    id: 4,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/53e63ae52_IMG_1205.jpg',
    type: 'portrait',
    label: 'Bridal',
    title: 'Naturally Enhanced',
    occasion: 'Bridal',
    tags: ['Skin-first', 'Satin finish', 'Soft smoky eye'],
    description: 'A timeless bridal look built around the bride\'s natural features (enhanced, not covered). Skin-first approach with a satin finish and soft smoky eye.',
  },
  {
    id: 5,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/45f961a68_IMG_1204.jpg',
    type: 'portrait',
    label: 'Bridal',
    title: 'Drama & Romance',
    occasion: 'Bridal',
    tags: ['Jewel-toned eye', 'Sculpted cheeks', 'All-day wear'],
    description: 'Full glam for a bride who wanted drama and romance. Rich jewel-toned eye with a flawless complexion and sculpted cheekbones that lasted from ceremony to reception.',
  },
  {
    id: 6,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/1acef1b83_IMG_1203.jpg',
    type: 'portrait',
    label: 'Non-Bridal',
    title: 'Editorial Glam',
    occasion: 'Editorial / Event',
    tags: ['Striking liner', 'Volume lashes', 'Camera-ready'],
    description: 'A bold, editorial full glam look. Striking liner, voluminous lashes, and a flawless base that pops on camera and in person.',
  },
  {
    id: 7,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/a93ed9a5c_IMG_1202.jpg',
    type: 'side-by-side',
    label: 'Non-Bridal',
    title: 'The Transformation',
    occasion: 'Full glam',
    tags: ['Skin prep', 'Radiant base', 'Camera-ready'],
    description: 'Side-by-side transformation showing the power of professional makeup. Natural skin prepped and transformed into a radiant, camera-ready full glam look.',
  },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Bridal', label: 'Bridal' },
  { key: 'Non-Bridal', label: 'Non-Bridal' },
];

const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={14} height={14} style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

function LightboxModal({ items, index, setIndex, onClose }) {
  const item = items[index];
  const count = items.length;
  const goPrev = useCallback(() => setIndex(i => (i - 1 + count) % count), [count, setIndex]);
  const goNext = useCallback(() => setIndex(i => (i + 1) % count), [count, setIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row w-full"
        style={{ maxWidth: '880px', maxHeight: '92dvh' }}
      >
        {/* Image */}
        <div className="relative flex-shrink-0 bg-[#0a0a0a] flex items-center justify-center w-full sm:w-[55%] h-[40dvh] sm:h-auto sm:self-stretch">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-contain"
          />
          {/* Carousel arrows */}
          {count > 1 && (
            <>
              <button onClick={goPrev} aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button onClick={goNext} aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {/* Counter */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[0.6rem] font-medium text-white tracking-wider"
                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
                {index + 1} / {count}
              </div>
            </>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col flex-1 min-h-0 sm:w-[45%]">
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ padding: 'clamp(1.1rem, 3vw, 2rem)' }}>
            {/* Close */}
            <button
              onClick={onClose}
              className="mb-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600 ml-auto flex-shrink-0"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <span className="inline-block px-2.5 py-1 bg-[#D4A0B0]/15 rounded-full text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-[#8A4A63] mb-3 self-start">
              {item.label}
            </span>

            <h3 className="font-serif text-[#111] leading-tight mb-1.5" style={{ fontSize: 'clamp(1.25rem, 2.6vw, 1.7rem)', fontWeight: 300 }}>
              {item.title}
            </h3>

            {item.occasion && (
              <div className="flex items-center gap-1.5 mb-3.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-3.5 h-3.5">
                  <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="text-[0.72rem] tracking-[0.04em] text-[#998d85]">{item.occasion}</span>
              </div>
            )}

            <p className="text-[#666] leading-[1.75] mb-4" style={{ fontSize: 'clamp(0.78rem, 1.2vw, 0.85rem)' }}>
              {item.description}
            </p>

            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.tags.map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-full text-[0.68rem] font-medium bg-[#FAF5F2] text-[#8a7f78] border border-[#efe4dd]">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-5">
              <a
                href="https://www.instagram.com/makeupbyroko_/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#111] text-white text-[0.78rem] font-medium tracking-[0.06em] rounded-xl hover:bg-[#222] active:scale-[0.98] transition-all"
              >
                <IconInstagram />
                See More on Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BeforeAfterGallery() {
  const [filter, setFilter] = useState('all');
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const filtered = filter === 'all' ? TRANSFORMATIONS : TRANSFORMATIONS.filter(t => t.label === filter);

  // Close the lightbox if the filter changes underneath it
  const selectFilter = (key) => { setFilter(key); setLightboxIdx(null); };

  return (
    <section id="before-after" className="bg-[#F5F5F5]">
      <div className="px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]">
        <div className="max-w-[1200px] mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <span className="label block mb-1" style={{ color: '#D4A0B0' }}>Transformations</span>
              <h2 className="font-serif" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 300, color: '#111', lineHeight: 1.1 }}>
                Before <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>&</em> After
              </h2>
            </div>
            <a
              href="https://www.instagram.com/makeupbyroko_/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[0.7rem] font-medium tracking-[0.08em] uppercase text-[#999] hover:text-[#D4A0B0] transition-colors"
            >
              See more on Instagram
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1.5 mb-6">
            {FILTERS.map(f => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => selectFilter(f.key)}
                  className="px-3.5 py-1.5 rounded-full text-[0.66rem] font-semibold tracking-[0.08em] uppercase transition-all"
                  style={active
                    ? { background: 'rgba(212,160,176,0.16)', color: '#8A4A63' }
                    : { background: 'transparent', color: '#a89f97' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#ece6e1'; e.currentTarget.style.color = '#6b6259'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a89f97'; } }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map((item, i) => {
              const isWide = item.type === 'side-by-side';
              return (
                <button
                  key={item.id}
                  onClick={() => setLightboxIdx(i)}
                  className={`group relative overflow-hidden rounded-[var(--radius-lg)] bg-[#eee] cursor-pointer text-left ${isWide ? 'col-span-2' : 'col-span-1'}`}
                >
                  <div className={`relative overflow-hidden ${isWide ? 'aspect-[4/3] sm:aspect-[16/10]' : 'aspect-[3/4]'}`}>
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    {/* Hover overlay — title + view cue */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)' }}>
                      <div className="p-3">
                        <p className="text-white font-serif leading-tight" style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.05rem)' }}>{item.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" className="w-3 h-3">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          </svg>
                          <span className="text-white/85 text-[0.6rem] font-medium tracking-[0.08em] uppercase">View look</span>
                        </div>
                      </div>
                    </div>
                    {/* Label */}
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-full group-hover:opacity-0 transition-opacity">
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {lightboxIdx !== null && (
        <LightboxModal items={filtered} index={lightboxIdx} setIndex={setLightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </section>
  );
}
