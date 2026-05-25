export default function NonBridalCard({ svc, onSelect, onOpenClassModal, onViewDetail }) {
  return (
    <div
      className="service-card group bg-white border border-[#eee] rounded-lg overflow-hidden hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] active:scale-[0.985] transition-all duration-300 flex flex-col sm:flex-row h-full sm:h-[260px] cursor-pointer"
      style={{ touchAction: 'manipulation' }}
      onClick={(e) => onViewDetail && onViewDetail(svc, e)}
    >
      {/* Photo — top on mobile, right on desktop */}
      <div className="sm:hidden w-full h-[220px] overflow-hidden bg-[#f5f5f5] flex-shrink-0">
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          style={{ objectPosition: 'center 35%' }} />
      </div>

      {/* Text */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between min-w-0 z-10">
        <div>
          <h3 className="font-serif text-[1.1rem] font-normal text-[#111] leading-tight mb-1.5">{svc.title}</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[0.85rem] font-medium text-[#111]">{svc.price}</span>
            <span className="text-[#ccc]">·</span>
            <span className="text-[0.75rem] text-[#999]">{svc.duration}</span>
            {svc.deposit && <><span className="text-[#ccc]">·</span><span className="text-[0.72rem] text-[#999]">{svc.deposit}</span></>}
          </div>
          <p className="text-[0.75rem] text-[#aaa] leading-[1.55] line-clamp-2">{svc.desc}</p>

          <div className="flex flex-col gap-1.5 mt-2.5">
            {(svc.category === 'event' || svc.category === 'creative') && (
              <div className="flex items-center gap-1.5 text-[0.68rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span>Studio only — Mountain House, CA</span>
              </div>
            )}
            {svc.category === 'event' && (
              <div className="flex items-center gap-1.5 text-[0.68rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span>Must be booked within <strong>1 month</strong> of the event — bookings made earlier are subject to bridal pricing</span>
              </div>
            )}
            {svc.category === 'lessons' && (
              <div className="flex items-center gap-1.5 text-[0.68rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span>Mon–Thu · 10 AM – 8 PM · 50% Zelle deposit to secure spot</span>
              </div>
            )}
          </div>
        </div>

        {svc.category === 'lessons' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenClassModal(); }}
            type="button"
            className="mt-4 sm:mt-0 w-full py-3 bg-[#111] text-white text-[0.75rem] font-medium tracking-[0.06em] uppercase rounded-[3px] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all text-center block"
            style={{ touchAction: 'manipulation' }}
          >
            View Available Classes →
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(svc); }}
            type="button"
            className="mt-4 sm:mt-0 w-full py-3 bg-[#111] text-white text-[0.75rem] font-medium tracking-[0.06em] uppercase rounded-[3px] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            Select & Book →
          </button>
        )}
      </div>

      {/* Photo — right on desktop only */}
      <div className="hidden sm:block w-[30%] flex-shrink-0 overflow-hidden bg-[#f5f5f5] pointer-events-none">
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          style={{ objectPosition: 'center 35%' }} />
      </div>
    </div>
  );
}
