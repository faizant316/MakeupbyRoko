import { useState, useRef, useCallback } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import MediaModal from './MediaModal';

// How many cards the desktop wall shows before "View all" reveals the rest, so a
// long review list never turns the home page into an endless scroll.
const DESKTOP_PREVIEW = 6;

function Stars({ n = 5, className = 'w-3.5 h-3.5' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" fill={i <= n ? '#D4A0B0' : 'none'} stroke="#D4A0B0" strokeWidth="1.4" className={className}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ name, size = 'w-7 h-7', text = 'text-[0.82rem]' }) {
  return (
    <div className={`${size} rounded-full bg-[#F5ECEF] flex items-center justify-center text-[#C4849A] font-serif ${text} flex-shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// One review card. `fullHeight` makes it fill its track cell (the mobile
// carousel) with the author pinned to the bottom so every card matches height;
// otherwise it flows naturally inside the desktop masonry wall.
function ReviewCard({ r, onOpen, fullHeight = false }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`${fullHeight ? 'h-full flex flex-col ' : 'break-inside-avoid mb-4 '}bg-white rounded-2xl p-5 border border-[#f0e9e4] shadow-[0_4px_24px_rgba(212,160,176,0.07)] cursor-pointer transition-all hover:shadow-[0_8px_30px_rgba(212,160,176,0.16)] hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between mb-3">
        <Stars n={r.rating || 5} />
        <span className="font-serif leading-none text-[#EDD8E0] select-none" style={{ fontSize: '1.7rem' }}>&rdquo;</span>
      </div>

      {r.photo && (
        <img
          src={r.photo}
          alt="Client look"
          loading="lazy"
          className="w-full rounded-xl object-cover max-h-[210px] mb-3.5"
        />
      )}

      <p className="text-[0.86rem] text-[#555] leading-[1.75] mb-3.5 line-clamp-5">{r.message}</p>

      {r.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {r.highlights.slice(0, 4).map((h, j) => (
            <span key={j} className="px-2.5 py-0.5 rounded-full text-[0.64rem] font-medium bg-[#FAF5F2] text-[#8a7f78] border border-[#efe4dd]">
              {h}
            </span>
          ))}
        </div>
      )}

      <div className={`flex items-center gap-2.5 pt-3.5 border-t border-[#f5efea] ${fullHeight ? 'mt-auto' : ''}`}>
        <Avatar name={r.name} />
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold text-[#111] truncate">{r.name}</p>
          {(r.service || r.location) && (
            <p className="text-[0.62rem] text-[#a89f97] truncate">
              {[r.service, r.location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ApprovedReviews() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['public-approved-reviews'],
    queryFn: () => api.entities.Review.filter({ status: 'approved' }),
    staleTime: 60000,
  });
  const [idx, setIdx] = useState(null);       // open review in the modal
  const [expanded, setExpanded] = useState(false); // desktop "view all"
  const [cardIdx, setCardIdx] = useState(0);  // active card in the mobile carousel
  const scrollRef = useRef(null);

  // Track which mobile card is centred so the indicator stays in sync.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    const card = el?.firstElementChild?.firstElementChild;
    if (!card) return;
    const stride = card.offsetWidth + 16; // card width + gap-4 (16px)
    const i = Math.min((reviews.length || 1) - 1, Math.max(0, Math.round(el.scrollLeft / stride)));
    setCardIdx(i);
  }, [reviews.length]);

  // Quietly render nothing until there are approved reviews to show
  if (isLoading || reviews.length === 0) return null;

  const sel = idx !== null ? reviews[idx] : null;
  const count = reviews.length;
  const goPrev = () => setIdx(i => (i - 1 + count) % count);
  const goNext = () => setIdx(i => (i + 1) % count);
  const desktopShown = expanded ? reviews : reviews.slice(0, DESKTOP_PREVIEW);

  return (
    <div className="mt-16 sm:mt-20">
      {/* Sub-header */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className="w-6 h-px bg-[#e0d6cf]" />
        <span className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-[#b5a99a]">In Their Words</span>
        <span className="w-6 h-px bg-[#e0d6cf]" />
      </div>

      {/* ── Mobile: a compact, swipeable strip — one card at a time, tap to read
          the full review — so the wall never becomes an endless scroll. ── */}
      <div className="sm:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="-mx-[clamp(1.25rem,5vw,3rem)] [&::-webkit-scrollbar]:hidden"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: 'clamp(1.25rem,5vw,3rem)',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div
            className="flex items-stretch gap-4 pb-2"
            style={{ paddingLeft: 'clamp(1.25rem,5vw,3rem)', paddingRight: 'clamp(1.25rem,5vw,3rem)' }}
          >
            {reviews.map((r, i) => (
              <div key={r.id} className="flex-shrink-0 w-[80vw] max-w-[320px] self-stretch" style={{ scrollSnapAlign: 'start' }}>
                <ReviewCard r={r} fullHeight onOpen={() => setIdx(i)} />
              </div>
            ))}
            {/* Trailing space so the last card can snap fully to the left edge. */}
            <div
              className="flex-shrink-0"
              style={{ width: 'max(1rem, calc(100vw - min(80vw, 320px) - 2 * clamp(1.25rem,5vw,3rem)))' }}
            />
          </div>
        </div>

        {/* Position indicator — dots for a few, a counter once there are many. */}
        {count > 1 && (
          count <= 7 ? (
            <div className="flex justify-center items-center gap-1.5 mt-4">
              {reviews.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i === cardIdx ? 18 : 6, background: i === cardIdx ? '#D4A0B0' : 'rgba(212,160,176,0.35)' }}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center mt-4">
              <span className="text-[0.66rem] tracking-[0.16em] uppercase text-[#b5a99a] tabular-nums">
                {cardIdx + 1} <span className="text-[#e0d6cf]">/</span> {count}
              </span>
            </div>
          )
        )}
      </div>

      {/* ── Desktop: masonry wall, capped at DESKTOP_PREVIEW with a reveal. ── */}
      <div className="hidden sm:block">
        <div className="columns-2 lg:columns-3 gap-4">
          {desktopShown.map((r, i) => (
            <ReviewCard key={r.id} r={r} onOpen={() => setIdx(i)} />
          ))}
        </div>

        {count > DESKTOP_PREVIEW && (
          <div className="flex justify-center mt-9">
            <button
              onClick={() => setExpanded(e => !e)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#EDD8E0] text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-[#8A4A63] bg-white hover:bg-[#FAF5F2] hover:border-[#D4A0B0] transition-colors"
            >
              {expanded ? 'Show fewer' : `View all ${count} reviews`}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {sel && (
        <MediaModal
          photo={sel.photo || null}
          imageFit="cover"
          index={idx}
          count={count}
          onPrev={goPrev}
          onNext={goNext}
          onClose={() => setIdx(null)}
          footer={
            <div className="flex items-center gap-3">
              <Avatar name={sel.name} size="w-9 h-9" text="text-[0.95rem]" />
              <div className="min-w-0">
                <p className="text-[0.82rem] font-semibold text-[#111] truncate">{sel.name}</p>
                {(sel.service || sel.location) && (
                  <p className="text-[0.66rem] text-[#a89f97] truncate">
                    {[sel.service, sel.location].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          }
        >
          <Stars n={sel.rating || 5} className="w-4 h-4" />
          <p className="font-serif italic text-[#444] leading-[1.7] mt-4 mb-5" style={{ fontSize: 'clamp(1rem, 1.4vw, 1.15rem)' }}>
            &ldquo;{sel.message}&rdquo;
          </p>
          {sel.highlights?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sel.highlights.map((h, j) => (
                <span key={j} className="px-2.5 py-1 rounded-full text-[0.7rem] font-medium bg-[#FAF5F2] text-[#8a7f78] border border-[#efe4dd]">
                  {h}
                </span>
              ))}
            </div>
          )}
        </MediaModal>
      )}
    </div>
  );
}
