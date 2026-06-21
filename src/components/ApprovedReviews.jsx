import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';

function Stars({ n = 5 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" fill={i <= n ? '#D4A0B0' : 'none'} stroke="#D4A0B0" strokeWidth="1.4" className="w-3.5 h-3.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ApprovedReviews() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['public-approved-reviews'],
    queryFn: () => api.entities.Review.filter({ status: 'approved' }),
    staleTime: 60000,
  });

  // Quietly render nothing until there are approved reviews to show
  if (isLoading || reviews.length === 0) return null;

  return (
    <div className="mt-16 sm:mt-20">
      {/* Sub-header */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className="w-6 h-px bg-[#e0d6cf]" />
        <span className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-[#b5a99a]">In Their Words</span>
        <span className="w-6 h-px bg-[#e0d6cf]" />
      </div>

      {/* Masonry wall — handles varying review lengths gracefully */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
        {reviews.map(r => (
          <article
            key={r.id}
            className="break-inside-avoid mb-4 bg-white rounded-2xl p-5 border border-[#f0e9e4] shadow-[0_4px_24px_rgba(212,160,176,0.07)]"
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

            <p className="text-[0.86rem] text-[#555] leading-[1.75] mb-3.5">{r.message}</p>

            {r.highlights?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {r.highlights.map((h, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full text-[0.64rem] font-medium bg-[#FAF5F2] text-[#8a7f78] border border-[#efe4dd]">
                    {h}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-3.5 border-t border-[#f5efea]">
              <div className="w-7 h-7 rounded-full bg-[#F5ECEF] flex items-center justify-center text-[#C4849A] font-serif text-[0.82rem] flex-shrink-0">
                {(r.name || '?').charAt(0).toUpperCase()}
              </div>
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
    </div>
  );
}
