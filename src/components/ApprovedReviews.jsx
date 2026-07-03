import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import MediaModal from './MediaModal';

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

export default function ApprovedReviews() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['public-approved-reviews'],
    queryFn: () => api.entities.Review.filter({ status: 'approved' }),
    staleTime: 60000,
  });
  const [idx, setIdx] = useState(null);

  // Quietly render nothing until there are approved reviews to show
  if (isLoading || reviews.length === 0) return null;

  const sel = idx !== null ? reviews[idx] : null;
  const count = reviews.length;
  const goPrev = () => setIdx(i => (i - 1 + count) % count);
  const goNext = () => setIdx(i => (i + 1) % count);

  return (
    <div className="mt-16 sm:mt-20">
      {/* Sub-header */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className="w-6 h-px bg-[#e0d6cf]" />
        <span className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-[#b5a99a]">In Their Words</span>
        <span className="w-6 h-px bg-[#e0d6cf]" />
      </div>

      {/* Masonry wall — tap any card to open it */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
        {reviews.map((r, i) => (
          <article
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => setIdx(i)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIdx(i); } }}
            className="break-inside-avoid mb-4 bg-white rounded-2xl p-5 border border-[#f0e9e4] shadow-[0_4px_24px_rgba(212,160,176,0.07)] cursor-pointer transition-all hover:shadow-[0_8px_30px_rgba(212,160,176,0.16)] hover:-translate-y-0.5"
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
                className="w-full rounded-xl object-cover max-h-[230px] mb-3.5"
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

            <div className="flex items-center gap-2.5 pt-3.5 border-t border-[#f5efea]">
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
        ))}
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
