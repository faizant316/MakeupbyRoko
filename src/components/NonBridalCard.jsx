import { bestFor, ctaLabel } from '@/lib/serviceCopy';

const PhotoBadge = ({ count }) => (
  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
    style={{ background: 'rgba(0,0,0,0.55)' }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" width={11} height={11}>
      <rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><circle cx="12" cy="14" r="2"/>
    </svg>
    <span style={{ fontSize: '0.6rem', color: '#fff', letterSpacing: '0.06em' }}>{count} photos</span>
  </div>
);

export default function NonBridalCard({ svc, onSelect, onOpenClassModal, onViewDetail }) {
  const isLessons = svc.category === 'lessons';
  const action = (e) => { e.stopPropagation(); if (isLessons) onOpenClassModal(); else onSelect(svc); };

  return (
    <div
      className="service-card group bg-white border border-[#eee] rounded-lg overflow-hidden hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] active:scale-[0.985] transition-all duration-300 flex flex-col sm:flex-row h-full sm:h-[320px] cursor-pointer"
      style={{ touchAction: 'manipulation' }}
      onClick={(e) => onViewDetail && onViewDetail(svc, e)}
    >
      {/* Photo — top on mobile, right on desktop */}
      <div className="sm:hidden w-full h-[220px] overflow-hidden bg-[#f5f5f5] flex-shrink-0 relative">
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          style={{ objectPosition: 'center 35%' }} />
        {svc.photos?.length > 1 && <PhotoBadge count={svc.photos.length} />}
      </div>

      {/* Text */}
      <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between min-w-0 z-10">
        <div>
          <h3 className="font-serif text-[1.22rem] font-normal text-[#111] leading-tight mb-1.5">{svc.title}</h3>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[0.92rem] font-medium text-[#111]">{svc.price}</span>
            <span className="text-[#ccc]">·</span>
            <span className="text-[0.8rem] text-[#7a7068]">{svc.duration}</span>
            {/* Courses are pay-in-full, so never surface a deposit line for them. */}
            {svc.deposit && !isLessons && <><span className="text-[#ccc]">·</span><span className="text-[0.78rem] text-[#7a7068]">{svc.deposit}</span></>}
          </div>

          {bestFor(svc) && (
            <p className="text-[0.76rem] text-[#8a7f79] leading-[1.5] mb-2">{bestFor(svc)}</p>
          )}

          {svc.includes?.length > 0 ? (
            <ul className="flex flex-col gap-1 mb-2.5">
              {svc.includes.slice(0, 2).map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.78rem] text-[#6d6460]">
                  <span className="text-[#D4A0B0] mt-px flex-shrink-0">✦</span>{item}
                </li>
              ))}
              {svc.includes.length > 2 && (
                <li className="text-[0.73rem] text-[#D4A0B0] pl-4">+{svc.includes.length - 2} more</li>
              )}
            </ul>
          ) : svc.desc ? (
            <p className="text-[0.78rem] text-[#6d6460] leading-[1.55] line-clamp-1 mb-2">{svc.desc}</p>
          ) : null}

          {/* One short logistics line. The old "must be booked within 1 month of
              the event" contradicted the calendar's "bookable at least 1 month
              out"; both the rule and the pricing note live in the detail sheet
              now, where a date is actually the subject. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-0.5">
            {(svc.category === 'event' || svc.category === 'creative') && (
              <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                Studio only · Mountain House, CA
              </span>
            )}
            {isLessons && (
              <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                Wednesdays · Zoom or in studio · pay in full
              </span>
            )}
          </div>
        </div>

        {/* Details vs Book: two explicit targets, same on every card. */}
        <div className="flex items-stretch gap-2.5 mt-5">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(svc, e); }}
            type="button"
            className="flex-shrink-0 px-5 py-3 text-[0.78rem] tracking-[0.02em] text-[#7a7068] bg-transparent border border-[#e6dcd7] rounded-[3px] hover:border-[#111] hover:text-[#111] active:scale-[0.97] transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            Details
          </button>
          <button
            onClick={action}
            type="button"
            className="flex-1 sm:flex-none sm:px-14 py-3 bg-[#111] text-white text-[0.78rem] font-medium tracking-[0.08em] uppercase rounded-[3px] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            {ctaLabel(svc)}
          </button>
        </div>
      </div>

      {/* Photo — right on desktop only */}
      <div className="hidden sm:block w-[30%] flex-shrink-0 overflow-hidden bg-[#f5f5f5] relative">
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          style={{ objectPosition: 'center 35%' }} />
        {svc.photos?.length > 1 && <PhotoBadge count={svc.photos.length} />}
      </div>
    </div>
  );
}
