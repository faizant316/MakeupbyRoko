import { useState, useEffect } from 'react';

const TRANSFORMATIONS = [
  {
    id: 2,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/93fa7f670_image.png',
    type: 'side-by-side',
    label: 'Bridal',
    description: 'A full bridal transformation — soft glam with flawless skin, defined brows, and lashes that last all day. This look was created for a South Asian wedding ceremony.',
  },
  {
    id: 3,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/938ee1ff3_IMG_1206.jpg',
    type: 'portrait',
    label: 'Bridal',
    description: 'Elegant bridal glam featuring a sculpted contour, bold lash set, and a luminous complexion tailored to photograph beautifully under all lighting.',
  },
  {
    id: 4,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/53e63ae52_IMG_1205.jpg',
    type: 'portrait',
    label: 'Bridal',
    description: 'A timeless bridal look built around the bride\'s natural features — enhanced, not covered. Skin-first approach with a satin finish and soft smoky eye.',
  },
  {
    id: 5,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/45f961a68_IMG_1204.jpg',
    type: 'portrait',
    label: 'Bridal',
    description: 'Full glam for a bride who wanted drama and romance. Rich jewel-toned eye with a flawless complexion and sculpted cheekbones that lasted from ceremony to reception.',
  },
  {
    id: 6,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/1acef1b83_IMG_1203.jpg',
    type: 'portrait',
    label: 'Full Glam',
    description: 'A bold, editorial full glam look — striking liner, voluminous lashes, and a flawless base that pops on camera and in person.',
  },
  {
    id: 7,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/a93ed9a5c_IMG_1202.jpg',
    type: 'side-by-side',
    label: 'Full Glam',
    description: 'Side-by-side transformation showing the power of professional makeup. Natural skin prepped and transformed into a radiant, camera-ready full glam look.',
  },
];

function LightboxModal({ item, onClose }) {
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
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6 sm:pt-16"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Two-column card — image left, details right — on ALL screen sizes */}
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-row w-full"
        style={{ maxWidth: '860px', maxHeight: '90dvh' }}
      >
        {/* LEFT: Image — contains full image without cropping */}
        <div className="flex-shrink-0 bg-[#0a0a0a] flex items-center justify-center" style={{ width: '55%' }}>
          <img
            src={item.image}
            alt={item.label}
            className="w-full h-full"
            style={{ objectFit: 'contain', maxHeight: '90dvh' }}
          />
        </div>

        {/* RIGHT: Details */}
        <div className="flex flex-col overflow-y-auto" style={{ width: '45%' }}>
          <div className="flex flex-col flex-1 min-h-0" style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
            {/* Close button */}
            <button
              onClick={onClose}
              className="mb-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600 ml-auto flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <span className="inline-block px-2.5 py-1 bg-[#D4A0B0]/15 rounded-full text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-3 self-start">
              {item.label}
            </span>

            <h3 className="font-serif text-[#111] mb-3 leading-tight" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
              Before <em className="text-[#D4A0B0] not-italic">&</em> After
            </h3>

            <p className="text-[#666] leading-[1.75] flex-1" style={{ fontSize: 'clamp(0.72rem, 1.2vw, 0.84rem)' }}>
              {item.description}
            </p>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <a
                href="https://www.instagram.com/makeupbyroko_/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium tracking-[0.06em] uppercase text-[#999] hover:text-[#D4A0B0] transition-colors"
                style={{ fontSize: 'clamp(0.6rem, 1vw, 0.72rem)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-shrink-0">
                  <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
                See more on Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BeforeAfterGallery() {
  const [selected, setSelected] = useState(null);

  return (
    <section id="before-after" className="bg-[#0D0B0C]">
      <div className="px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]">
        <div className="max-w-[1200px] mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <span className="label block mb-1" style={{ color: '#D4A0B0' }}>Transformations</span>
              <h2 className="font-serif" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 300, color: '#F5F0EB', lineHeight: 1.1 }}>
                Before <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>&</em> After
              </h2>
            </div>
            <a
              href="https://www.instagram.com/makeupbyroko_/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[0.7rem] font-medium tracking-[0.08em] uppercase text-[#666] hover:text-[#D4A0B0] transition-colors"
            >
              See more on Instagram
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {TRANSFORMATIONS.map((item) => {
              const isWide = item.type === 'side-by-side';
              return (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`group relative overflow-hidden rounded-[var(--radius-lg)] bg-[#eee] cursor-pointer text-left ${isWide ? 'col-span-2' : 'col-span-1'}`}
                >
                  <div className={`relative overflow-hidden ${isWide ? 'aspect-[4/3] sm:aspect-[16/10]' : 'aspect-[3/4]'}`}>
                    <img
                      src={item.image}
                      alt={item.label}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" className="w-4 h-4">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                      </div>
                    </div>
                    {/* Label */}
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-full">
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

      {selected && <LightboxModal item={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}