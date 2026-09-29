import { useCallback, useEffect, useRef, useState } from 'react';
import { placeLine } from '@/lib/serviceCopy';
import CompareSlider from './CompareSlider';
import TransformationViewer from './TransformationViewer';

const INSTAGRAM_URL = 'https://www.instagram.com/makeupbyroko_/';

// Photos live in public/transformations rather than on the old Base44 media
// host, so the gallery no longer depends on an account from the previous
// platform staying alive.
//
// Two kinds of look:
// - 'compare': a before and an after of the same size, cropped out of one of
//   Roko's side-by-side posts and lined up on the face, so they can sit on top
//   of each other in a drag-to-compare slider. w/h are the crop's pixel size.
// - 'story': an Instagram story screenshot with the before already inset by
//   Instagram. It cannot be split, so it is shown whole.
//
// `service` is the services-table title the Book button opens, and `category`
// is the services filter to fall back to if that row is ever renamed or turned
// off in Supabase.
const TRANSFORMATIONS = [
  {
    id: 'south-asian-bride',
    type: 'compare',
    before: '/transformations/south-asian-bride-before.jpg',
    after: '/transformations/south-asian-bride-after.jpg',
    w: 234, h: 471,
    label: 'Bridal',
    service: 'Luxury Bridal Look',
    category: 'bridal',
    title: 'The South Asian Bride',
    occasion: 'Wedding ceremony',
    tags: ['Soft glam', 'Flawless skin', 'Long-wear lashes'],
    description: 'A full bridal transformation: soft glam with flawless skin, defined brows, and lashes that last all day. This look was created for a South Asian wedding ceremony.',
  },
  {
    id: 'sculpted-luminous',
    type: 'story',
    image: '/transformations/sculpted-luminous.jpg',
    label: 'Bridal',
    service: 'Luxury Bridal Look',
    category: 'bridal',
    title: 'Sculpted & Luminous',
    occasion: 'Bridal',
    tags: ['Sculpted contour', 'Bold lashes', 'Photo-ready'],
    description: 'Elegant bridal glam featuring a sculpted contour, bold lash set, and a luminous complexion tailored to photograph beautifully under all lighting.',
  },
  // This copy and the next used to be on each other's photos: the emerald
  // jewelry bride carried "soft smoky eye, satin finish" and the "No filter"
  // bride in the veil carried "rich jewel-toned eye".
  {
    id: 'drama-romance',
    type: 'story',
    image: '/transformations/drama-romance.jpg',
    label: 'Bridal',
    service: 'Luxury Bridal Look',
    category: 'bridal',
    title: 'Drama & Romance',
    occasion: 'Bridal',
    tags: ['Jewel-toned eye', 'Sculpted cheeks', 'All-day wear'],
    description: 'Full glam for a bride who wanted drama and romance. Rich jewel-toned eye with a flawless complexion and sculpted cheekbones that lasted from ceremony to reception.',
  },
  {
    id: 'naturally-enhanced',
    type: 'story',
    image: '/transformations/naturally-enhanced.jpg',
    label: 'Bridal',
    service: 'Luxury Bridal Look',
    category: 'bridal',
    title: 'Naturally Enhanced',
    occasion: 'Bridal',
    tags: ['Skin-first', 'Satin finish', 'Soft smoky eye'],
    description: 'A timeless bridal look built around the bride\'s natural features (enhanced, not covered). Skin-first approach with a satin finish and soft smoky eye.',
  },
  {
    id: 'editorial-glam',
    type: 'story',
    image: '/transformations/editorial-glam.jpg',
    label: 'Non-Bridal',
    service: 'Non-Bridal Makeup',
    category: 'event',
    title: 'Editorial Glam',
    occasion: 'Editorial / Event',
    tags: ['Striking liner', 'Volume lashes', 'Camera-ready'],
    description: 'A bold, editorial full glam look. Striking liner, voluminous lashes, and a flawless base that pops on camera and in person.',
  },
  {
    id: 'full-glam',
    type: 'compare',
    before: '/transformations/full-glam-before.jpg',
    after: '/transformations/full-glam-after.jpg',
    w: 450, h: 940,
    label: 'Non-Bridal',
    service: 'Non-Bridal Makeup',
    category: 'event',
    title: 'The Transformation',
    occasion: 'Full glam',
    tags: ['Skin prep', 'Radiant base', 'Camera-ready'],
    description: 'Natural skin, prepped and transformed into a radiant, camera-ready full glam look.',
  },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Bridal', label: 'Bridal' },
  { key: 'Non-Bridal', label: 'Non-Bridal' },
];

// "Over an hour from Mountain House, CA" -> "Getting ready over an hour from
// Mountain House, CA?" Built from placeLine, the same line the Full Day card
// carries, so this cannot promise something the travel gate does not enforce.
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// Each transformation develops in as it enters view: blurred and a touch
// oversized, settling to sharp (see .gal-img in index.css).
//
// Gated on intersection AND decode, not just intersection. These are lazy-loaded
// images, so revealing on visibility alone would resolve the blur on an empty
// box and then pop the photo in afterwards. A compare pair counts as loaded once
// BOTH of its photos are (CompareSlider's onReady).
//
// The reveal sits on a wrapper rather than the <img> so the image keeps its own
// hover transform and 500ms transition untouched; putting both on one element
// would have the reveal's longer transition swallow the hover.
function GalleryCell({ t, onOpen }) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const [seen, setSeen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Compositor layer for the develop, held ONLY between "about to reveal" and
  // "finished revealing". See .gal-arm in index.css for why it can't just live
  // on .gal-img: six blurred full-size layers from first paint is a real cost
  // on the way down the page, paid before a single photo is even in view.
  const [settled, setSettled] = useState(false);
  const isCompare = t.type === 'compare';

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSeen(true); io.disconnect(); } },
      // Start a little before the edge so the develop is already underway by the
      // time the photo is properly on screen.
      { rootMargin: '80px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A cached image can finish decoding before onLoad is ever attached, in which
  // case the event never fires and the photo would stay blurred forever.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const revealed = seen && loaded;

  // Drop the layer once the develop has finished. A timer rather than
  // transitionend because under prefers-reduced-motion there is no filter
  // transition to end, and the layer would then be held for the life of the
  // page. 1100ms clears the longest leg (the 0.95s transform) with slack.
  useEffect(() => {
    if (!revealed) return;
    const tm = setTimeout(() => setSettled(true), 1100);
    return () => clearTimeout(tm);
  }, [revealed]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${t.title}, ${t.label} before and after`}
      className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] bg-[#e9e5e2] cursor-pointer text-left"
    >
      <span
        ref={wrapRef}
        className={`absolute inset-0 block gal-img ${seen && !settled ? 'gal-arm' : ''} ${revealed ? 'gal-in' : ''}`}
      >
        {isCompare ? (
          // The peek waits for the develop to finish, so the two motions play
          // one after the other instead of on top of each other.
          <CompareSlider
            before={t.before}
            after={t.after}
            alt={t.title}
            mode="hover"
            small
            peek={revealed}
            peekDelay={900}
            onReady={() => setLoaded(true)}
            className="w-full h-full"
          />
        ) : (
          <img
            ref={imgRef}
            src={t.image}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        )}
      </span>

      {/* Story shots: title and a view cue on hover. Compare shots skip it,
          because on those the hover is already doing something better. */}
      {!isCompare && (
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)' }}
        >
          <span className="p-3 block">
            <span className="block text-white font-serif leading-tight" style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.05rem)' }}>{t.title}</span>
            <span className="flex items-center gap-1.5 mt-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" className="w-3 h-3" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="text-white/85 text-[0.6rem] font-medium tracking-[0.08em] uppercase">View look</span>
            </span>
          </span>
        </span>
      )}

      <span className={`absolute top-2 left-2 px-2.5 py-0.5 bg-white/90 rounded-full pointer-events-none transition-opacity ${isCompare ? '' : 'group-hover:opacity-0'}`}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>
          {t.label}
        </span>
      </span>

      {/* Expand cue, so a phone (which never sees the hover) knows a tap opens
          the look up close. */}
      <span className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(0,0,0,0.45)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
          <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </span>
    </button>
  );
}

export default function BeforeAfterGallery({ services = [], onBook }) {
  const [filter, setFilter] = useState('all');
  const [idx, setIdx] = useState(null);

  const filtered = filter === 'all' ? TRANSFORMATIONS : TRANSFORMATIONS.filter(t => t.label === filter);
  const selectFilter = (key) => { setFilter(key); setIdx(null); };
  const close = useCallback(() => setIdx(null), []);

  // What the viewer's Book button does for a given look.
  //
  // Bridal looks open the Luxury Bridal Look, the package most brides are in,
  // and carry the same "getting ready over an hour away?" line the bridal cards
  // do, pointing at Full Day. Without it this button would be a way round the
  // fork on the services grid, and a bride three hours out would only find out
  // at the travel gate in step 2.
  //
  // If the service row is missing (renamed or switched off in Supabase), the
  // button still works: it filters the services grid to that category and
  // scrolls there.
  const getBooking = (item) => {
    const byTitle = (title) => services.find(s => s.title === title);
    const svc = byTitle(item.service);
    const toCategory = () => {
      close();
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('roko:selectCategory', { detail: item.category })));
    };
    if (!svc || !onBook) return { label: 'See services', caption: '', onBook: toCategory, alt: null };

    const fullDay = item.service === 'Luxury Bridal Look' ? byTitle('Full Day Service') : null;
    const place = fullDay && placeLine(fullDay);
    return {
      label: 'Book this look',
      caption: [svc.title, svc.price].filter(Boolean).join(' · '),
      onBook: () => { close(); onBook(svc); },
      alt: place ? {
        lead: `Getting ready ${lowerFirst(place.value)}?`,
        label: fullDay.title,
        onBook: () => { close(); onBook(fullDay); },
      } : null,
    };
  };

  return (
    <section id="before-after" className="bg-[#F5F5F5]">
      <div className="px-[clamp(1.25rem,5vw,3rem)] py-[clamp(3rem,6vw,5rem)]">
        <div className="max-w-[1080px] mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <span className="label block mb-1" style={{ color: '#D4A0B0' }}>Transformations</span>
              <h2 className="font-serif" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 300, color: '#111', lineHeight: 1.1 }}>
                Before <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>&</em> After
              </h2>
              <p className="mt-2 text-[0.82rem] leading-[1.7] text-[#7a7068] max-w-[420px]">
                Real clients from Roko's chair. Tap any look to see it up close.
              </p>
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[0.7rem] font-medium tracking-[0.08em] uppercase text-[#999] hover:text-[#D4A0B0] transition-colors"
            >
              See more on Instagram
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
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

          {/* Grid. Every cell is the same portrait shape, so any filter's count
              (6, 4 or 2) lays out as full rows. Re-keyed on the filter so a
              switch replays the develop and confirms the tap landed. */}
          <div key={filter} className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {filtered.map((t, i) => (
              <GalleryCell key={t.id} t={t} onOpen={() => setIdx(i)} />
            ))}
          </div>

        </div>
      </div>

      {idx !== null && (
        <TransformationViewer
          items={filtered}
          startIndex={idx}
          onClose={close}
          getBooking={getBooking}
          instagramUrl={INSTAGRAM_URL}
        />
      )}
    </section>
  );
}
