const AURA_CLASSES = ['bridal-aura', 'fullday-aura', ''];
const LABELS = ['Featured Service', 'Premium Package', 'Trial Package'];
const BUTTON_LABELS = ['Inquire About Bridal →', 'Inquire About Full Day Service →', 'Inquire About Trial →'];

export default function BridalCard({ svc, idx, onSelect }) {
  return (
    <div className={`service-card h-full relative z-0 ${AURA_CLASSES[idx] || ''}`}>
      <div className="group relative bg-white border-0 rounded-[var(--radius-lg)] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)] active:scale-[0.985] transition-all duration-300 flex flex-col h-full"
        style={{ touchAction: 'manipulation' }}>
        {/* Photo */}
        <div className="aspect-[4/3] overflow-hidden bg-[#f5f5f5] flex-shrink-0">
          <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500" />
        </div>
        {/* Content */}
        <div className="flex flex-col justify-between p-6 flex-1">
          <div>
            <span className="label block mb-1.5" style={{ color: '#D4A0B0' }}>
              {LABELS[idx] || 'Bridal Service'}
            </span>
            <h3 className="font-serif text-[1.35rem] font-normal text-[#111] leading-tight mb-2">{svc.title}</h3>
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="font-serif text-lg text-[#111]">{svc.price}</span>
              <span className="text-[#ddd]">·</span>
              <span className="text-[0.75rem] text-[#888]">{svc.duration}</span>
              <span className="text-[#ddd]">·</span>
              <span className="text-[0.68rem] text-[#999]">{svc.deposit}</span>
            </div>
            <p className="text-[0.78rem] text-[#999] leading-[1.65] mb-2.5 line-clamp-2">{svc.desc}</p>

            <div className="flex flex-col gap-1.5 mb-3">
              {svc.title === 'Luxury Bridal Look' && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FDF5F0] border border-[#f5e0d4] text-[0.68rem] text-[#A0785A]">
                  <span className="flex-shrink-0 mt-px">🚗</span>
                  <span><strong>$200+ travel fee</strong> automatically added for services not held at the studio</span>
                </div>
              )}
              {svc.title === 'Full Day Service' && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FDF5F0] border border-[#f5e0d4] text-[0.68rem] text-[#A0785A]">
                  <span className="flex-shrink-0 mt-px">📋</span>
                  <span>Required for: bridal switch, location over <strong>1 hr from studio</strong>, or start time <strong>before 7 AM</strong></span>
                </div>
              )}
              {svc.title === 'Bridal Trial' && (
                <>
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#F5F0FD] border border-[#e0d4f5] text-[0.68rem] text-[#7A5AA0]">
                    <span className="flex-shrink-0 mt-px">🎨</span>
                    <span><strong>Test your look before the big day</strong> — no surprises on your wedding day</span>
                  </div>
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#FDF9F7] border border-[#f0ebe6] text-[0.68rem] text-[#A0785A]">
                    <span className="flex-shrink-0 mt-px">📅</span>
                    <span>Recommended <strong>1–3 months before</strong> your wedding date</span>
                  </div>
                </>
              )}
            </div>

            <ul className="flex flex-col gap-1 mb-4">
              {svc.includes.slice(0, 3).map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.75rem] text-[#999]">
                  <span className="text-[#D4A0B0] mt-px flex-shrink-0">✦</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => onSelect(svc)}
            className="w-full py-2.5 bg-[#111] text-white text-[0.75rem] font-medium tracking-[0.04em] rounded-[var(--radius)] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            {BUTTON_LABELS[idx] || 'Inquire →'}
          </button>
        </div>
      </div>
    </div>
  );
}