const AURA_CLASSES = ['bridal-aura', 'fullday-aura', ''];
const LABELS = ['Featured Service', 'Premium Package', 'Trial Package'];
const BUTTON_LABELS = ['Inquire About Bridal →', 'Inquire About Full Day Service →', 'Inquire About Trial →'];

export default function BridalCard({ svc, idx, onSelect, onViewDetail }) {
  return (
    <div
      className={`service-card h-full relative z-0 cursor-pointer ${AURA_CLASSES[idx] || ''}`}
      onClick={(e) => onViewDetail && onViewDetail(svc, e)}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="group relative bg-white border-0 rounded-[var(--radius-lg)] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)] active:scale-[0.985] transition-all duration-300 flex flex-col h-full">
        {/* Photo */}
        <div className="aspect-[4/3] overflow-hidden bg-[#f5f5f5] flex-shrink-0 relative">
          <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            style={{ objectPosition: svc.title === 'Bridal Trial' ? 'center 22%' : 'top' }} />
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
        {/* Content */}
        <div className="flex flex-col justify-between p-6 flex-1">
          <div>
            <span className="label block mb-1.5" style={{ color: '#D4A0B0' }}>
              {LABELS[idx] || 'Bridal Service'}
            </span>
            <h3 className="font-serif text-[1.5rem] font-normal text-[#111] leading-tight mb-2">{svc.title}</h3>
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="font-serif text-[1.2rem] text-[#111]">{svc.price}</span>
              <span className="text-[#ddd]">·</span>
              <span className="text-[0.82rem] text-[#7a7068]">{svc.duration}</span>
              <span className="text-[#ddd]">·</span>
              <span className="text-[0.75rem] text-[#7a7068]">{svc.deposit}</span>
            </div>
            <div className="flex flex-col gap-2 mb-3">
              {svc.title === 'Luxury Bridal Look' && (
                <div className="px-3.5 py-2.5 rounded-lg bg-[#FBF5F7] border-l-2 border-[#C4849A] text-[0.72rem] text-[#6B4055]">
                  <strong>$200+ travel fee</strong> automatically added for services not held at the studio
                </div>
              )}
              {svc.title === 'Full Day Service' && (
                <div className="px-3.5 py-2.5 rounded-lg bg-[#FBF5F7] border-l-2 border-[#C4849A] text-[0.72rem] text-[#6B4055]">
                  Required for: bridal switch, location over <strong>1 hr from studio</strong>, or start time <strong>before 7 AM</strong>
                </div>
              )}
              {svc.title === 'Bridal Trial' && (
                <>
                  <div className="px-3.5 py-2.5 rounded-lg bg-[#FBF5F7] border-l-2 border-[#C4849A] text-[0.72rem] text-[#6B4055]">
                    <strong>Test your look before the big day.</strong> No surprises on your wedding day.
                  </div>
                  <div className="px-3.5 py-2.5 rounded-lg bg-[#F8F4F6] border-l-2 border-[#D4A0B0]/50 text-[0.72rem] text-[#8C6070]">
                    Recommended <strong>1–3 months before</strong> your wedding date
                  </div>
                </>
              )}
            </div>

            <ul className="flex flex-col gap-1 mb-4">
              {svc.includes.slice(0, 3).map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.82rem] text-[#6d6460]">
                  <span className="text-[#D4A0B0] mt-px flex-shrink-0">✦</span>{item}
                </li>
              ))}
              {svc.includes.length > 3 && (
                <li className="text-[0.75rem] text-[#D4A0B0] pl-4">+{svc.includes.length - 3} more (tap to see all)</li>
              )}
            </ul>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(svc); }}
            className="w-full py-2.5 bg-[#111] text-white text-[0.82rem] font-medium tracking-[0.04em] rounded-[var(--radius)] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            {BUTTON_LABELS[idx] || 'Inquire →'}
          </button>
        </div>
      </div>
    </div>
  );
}
