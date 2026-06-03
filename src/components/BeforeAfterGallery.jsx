import { useState, useEffect } from 'react';

const TRANSFORMATIONS = [
  {
    id: 2,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/93fa7f670_image.png',
    type: 'side-by-side',
    label: 'Bridal',
    description: 'A full bridal transformation: soft glam with flawless skin, defined brows, and lashes that last all day. This look was created for a South Asian wedding ceremony.',
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
    description: 'A timeless bridal look built around the bride\'s natural features (enhanced, not covered). Skin-first approach with a satin finish and soft smoky eye.',
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
    label: 'Non-Bridal',
    description: 'A bold, editorial full glam look. Striking liner, voluminous lashes, and a flawless base that pops on camera and in person.',
  },
  {
    id: 7,
    image: 'https://media.base44.com/images/public/69dad1fca2043b3db56edb29/a93ed9a5c_IMG_1202.jpg',
    type: 'side-by-side',
    label: 'Non-Bridal',
    description: 'Side-by-side transformation showing the power of professional makeup. Natural skin prepped and transformed into a radiant, camera-ready full glam look.',
  },
];

const IconClose = ({ dark = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#111'} strokeWidth="2.5" strokeLinecap="round" width={14} height={14}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={14} height={14} style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

function LightboxModal({ item, onClose }) {
  useEffect(() => {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(7px)', padding: '40px 24px' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* ── DESKTOP: two-column card ── */}
      <div
        className="hidden sm:flex relative rounded-[24px] overflow-hidden"
        style={{
          width: 'min(900px, 92vw)',
          height: 'min(88vh, 700px)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* LEFT: photo panel */}
        <div className="relative flex-none" style={{ width: '50%', background: '#1a1a1a' }}>
          <img
            src={item.image}
            alt={item.label}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
          {/* Dark pill close on photo */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer' }}
          >
            <IconClose dark />
          </button>
        </div>

        {/* RIGHT: info panel */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: '#fff' }}>
          {/* X button row */}
          <div className="flex justify-end px-5 pt-4 pb-1 flex-none">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer' }}
            >
              <IconClose />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-7 pt-2 pb-4" style={{ scrollbarWidth: 'none' }}>
            <span className="inline-block px-2.5 py-1 bg-[#D4A0B0]/15 rounded-full text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-4">
              {item.label}
            </span>

            <h3 className="font-serif text-[1.45rem] font-normal text-[#111] leading-tight mb-5">
              Before <em className="text-[#D4A0B0] not-italic">&</em> After
            </h3>

            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2">
              Transformation
            </p>
            <p className="text-[0.87rem] text-[#666] leading-[1.78]">{item.description}</p>
          </div>

          {/* Pinned CTA */}
          <div className="flex-none px-6 py-4 border-t border-[#f0ebe6]">
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

      {/* ── MOBILE: stacked card ── */}
      <div
        className="sm:hidden flex flex-col rounded-[20px] overflow-hidden w-full"
        style={{ maxWidth: 480, maxHeight: '90dvh', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative flex-none" style={{ height: '54vw', maxHeight: 280, background: '#1a1a1a' }}>
          <img
            src={item.image}
            alt={item.label}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer' }}
          >
            <IconClose dark />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col bg-white overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="px-5 pt-5 pb-3">
            <span className="inline-block px-2.5 py-1 bg-[#D4A0B0]/15 rounded-full text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-3">
              {item.label}
            </span>
            <h3 className="font-serif text-[1.25rem] font-normal text-[#111] leading-tight mb-4">
              Before <em className="text-[#D4A0B0] not-italic">&</em> After
            </h3>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-2">Transformation</p>
            <p className="text-[0.84rem] text-[#666] leading-[1.75] mb-5">{item.description}</p>
          </div>
          <div className="px-5 pb-5 border-t border-[#f0ebe6] pt-4">
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
  );
}

export default function BeforeAfterGallery() {
  const [selected, setSelected] = useState(null);

  return (
    <section id="before-after" className="bg-[#F5F5F5]">
      <div className="px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]">
        <div className="max-w-[1200px] mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
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