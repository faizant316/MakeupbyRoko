export default function NonBridalCard({ svc, onSelect, onOpenClassModal, onViewDetail }) {
  return (
    <div
      className="service-card group bg-white border border-[#eee] rounded-lg overflow-hidden hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] active:scale-[0.985] transition-all duration-300 flex flex-col sm:flex-row h-full sm:h-[280px] cursor-pointer"
      style={{ touchAction: 'manipulation' }}
      onClick={(e) => onViewDetail && onViewDetail(svc, e)}
    >
      {/* Photo — top on mobile, right on desktop */}
      <div className="sm:hidden w-full h-[220px] overflow-hidden bg-[#f5f5f5] flex-shrink-0 relative">
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          style={{ objectPosition: 'center 35%' }} />
        {svc.photos?.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(4px)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" width={11} height={11}>
              <rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><circle cx="12" cy="14" r="2"/>
            </svg>
            <span style={{ fontSize: '0.6rem', color: '#fff', letterSpacing: '0.06em' }}>{svc.photos.length} photos</span>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between min-w-0 z-10">
        <div>
          <h3 className="font-serif text-[1.22rem] font-normal text-[#111] leading-tight mb-1.5">{svc.title}</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[0.92rem] font-medium text-[#111]">{svc.price}</span>
            <span className="text-[#ccc]">·</span>
            <span className="text-[0.8rem] text-[#7a7068]">{svc.duration}</span>
            {svc.deposit && <><span className="text-[#ccc]">·</span><span className="text-[0.78rem] text-[#7a7068]">{svc.deposit}</span></>}
          </div>
          {svc.includes?.length > 0 ? (
            <ul className="flex flex-col gap-1 mb-2.5">
              {svc.includes.slice(0, 2).map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.78rem] text-[#6d6460]">
                  <span className="text-[#D4A0B0] mt-px flex-shrink-0">✦</span>{item}
                </li>
              ))}
              {svc.includes.length > 2 && (
                <li className="text-[0.73rem] text-[#D4A0B0] pl-4">+{svc.includes.length - 2} more (tap to see all)</li>
              )}
            </ul>
          ) : svc.desc ? (
            <p className="text-[0.78rem] text-[#6d6460] leading-[1.55] line-clamp-1 mb-2">{svc.desc}</p>
          ) : null}
          <div className="flex flex-col gap-1.5 mt-0.5">
            {(svc.category === 'event' || svc.category === 'creative') && (
              <div className="flex items-center gap-1.5 text-[0.72rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span>Studio only · Mountain House, CA</span>
              </div>
            )}
            {svc.category === 'event' && (
              <div className="flex items-center gap-1.5 text-[0.72rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span>Must be booked within <strong>1 month</strong> of the event (bookings made earlier are subject to bridal pricing)</span>
              </div>
            )}
            {svc.category === 'lessons' && (
              <div className="flex items-center gap-1.5 text-[0.72rem] text-[#A0785A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                <span>Wednesdays only · 10 AM – 8 PM · 50% Zelle deposit to secure spot</span>
              </div>
            )}
          </div>
        </div>

        {svc.category === 'lessons' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenClassModal(); }}
            type="button"
            className="mt-4 w-full py-3 bg-[#111] text-white text-[0.8rem] font-medium tracking-[0.06em] uppercase rounded-[3px] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all text-center block"
            style={{ touchAction: 'manipulation' }}
          >
            View Available Classes →
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(svc); }}
            type="button"
            className="mt-4 w-full py-3 bg-[#111] text-white text-[0.8rem] font-medium tracking-[0.06em] uppercase rounded-[3px] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            Select & Book →
          </button>
        )}
      </div>

      {/* Photo — right on desktop only */}
      <div className="hidden sm:block w-[30%] flex-shrink-0 overflow-hidden bg-[#f5f5f5] relative">
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          style={{ objectPosition: 'center 35%' }} />
        {svc.photos?.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(4px)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" width={11} height={11}>
              <rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><circle cx="12" cy="14" r="2"/>
            </svg>
            <span style={{ fontSize: '0.6rem', color: '#fff', letterSpacing: '0.06em' }}>{svc.photos.length} photos</span>
          </div>
        )}
      </div>
    </div>
  );
}
