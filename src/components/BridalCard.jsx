import { bestFor, ctaLabel, travelFit } from '@/lib/serviceCopy';
import ServiceSpecs from './ServiceSpecs';
import CtaArrow from './CtaArrow';

// Luxury and Full Day are now the same size on desktop, so the aura is what
// marks the default rather than the layout. Full Day had its own red/gold aura
// back when it sat on a separate row; side by side, two differently coloured
// 24px blurs breathing at each other across a 20px gutter read as noise, and a
// second glow would have cancelled out the only signal saying which package
// most brides want.
const AURA_CLASSES = ['bridal-aura', '', ''];
const LABELS = ['Most Brides', 'Premium Package', 'Trial Package'];

// Resting + hover elevation. A tight contact shadow layered over a soft ambient
// one reads as real depth; the hover state lifts the card and deepens both.
const CARD_CLASS =
  'group relative bg-white rounded-[var(--radius-lg)] overflow-hidden border border-[#f1e7e2] shadow-[0_1px_2px_rgba(31,20,25,0.04),0_10px_34px_rgba(31,20,25,0.07)] transition-all duration-300 ease-out lg:hover:shadow-[0_3px_10px_rgba(31,20,25,0.07),0_28px_60px_rgba(31,20,25,0.15)] active:scale-[0.985] flex flex-col h-full';

export default function BridalCard({ svc, idx, onSelect, onViewDetail }) {
  const remaining = svc.includes.length - 3;

  return (
    <div
      className={`service-card h-full relative z-0 cursor-pointer transition-transform duration-300 ease-out lg:hover:-translate-y-1.5 ${AURA_CLASSES[idx] || ''}`}
      onClick={(e) => onViewDetail && onViewDetail(svc, e)}
      style={{ touchAction: 'manipulation' }}
    >
      <div className={CARD_CLASS}>
        {/* Photo. Wider crop on desktop, where these sit two to a row rather
            than three and a 4:3 would run tall enough to push the CTA under
            the fold. */}
        <div className="aspect-[4/3] lg:aspect-[16/10] overflow-hidden bg-[#f5f5f5] flex-shrink-0 relative">
          <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            style={{ objectPosition: svc.title === 'Bridal Trial' ? 'center 42%' : 'top' }} />
          {svc.photos?.length > 1 && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" width={11} height={11}>
                <rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><circle cx="12" cy="14" r="2"/>
              </svg>
              <span style={{ fontSize: '0.6rem', color: '#fff', letterSpacing: '0.06em' }}>{svc.photos.length} photos</span>
            </div>
          )}
        </div>
        {/* Content */}
        <div className="flex flex-col justify-between p-6 lg:p-7 flex-1">
          <div>
            <span className="label block mb-1.5" style={{ color: '#D4A0B0' }}>
              {LABELS[idx] || 'Bridal Service'}
            </span>
            <h3 className="font-serif text-[1.5rem] lg:text-[1.7rem] font-normal text-[#111] leading-tight mb-2">{svc.title}</h3>

            {/* Who it's for, in one line. The three bridal options are the hardest
                choice on the page; this is the answer BridalComparison used to be
                the only place to find. It reads ahead of the numbers now, so the
                card answers "is this me?" before "what does it cost?". */}
            {bestFor(svc) && (
              <p className={`text-[0.82rem] text-[#8a7f79] leading-[1.5] ${travelFit(svc) ? 'mb-2' : 'mb-4'}`}>
                {bestFor(svc)}
              </p>
            )}

            {/* How far away this package is for. The same dot-chip the
                non-bridal cards use for "Studio only, Mountain House, CA",
                because it is the same kind of fact: a logistics constraint
                rather than a selling point. Luxury and Full Day both carry one,
                so the pair reads as a fork and the two cards stay level. */}
            {travelFit(svc) && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-[#A0785A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] flex-shrink-0" />
                  {travelFit(svc)}
                </span>
              </div>
            )}

            <div className="mb-4">
              <ServiceSpecs svc={svc} />
            </div>

            {/* Top 3 inline, the rest in the detail sheet. The trial used to
                hide its list entirely to keep three equal columns the same
                height; two to a row it just left a hole in the card, and the
                CTA is pinned to the bottom by justify-between either way.
                Policy fine print (travel fee, Full Day requirements) still
                lives in the detail sheet — it was pushing the CTA down. */}
            {!svc.includes?.length ? (
              <div className="mb-4 text-[0.8rem] text-[#D4A0B0] font-medium">
                See what's included →
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5 mb-4">
                {svc.includes.slice(0, 3).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[0.84rem] text-[#6d6460] leading-[1.45]">
                    <span className="text-[#D4A0B0] mt-px flex-shrink-0">✦</span>
                    {/* Some service records write these as full sentences rather
                        than short bullets (the trial's do). Two lines keeps a
                        wordy one from stretching the card past its neighbour. */}
                    <span className="line-clamp-2">{item}</span>
                  </li>
                ))}
                {remaining > 0 && (
                  <li className="text-[0.76rem] text-[#D4A0B0] pl-4">+{remaining} more</li>
                )}
              </ul>
            )}
          </div>

          {/* Two explicit targets instead of one card with two meanings: Details
              opens the sheet, the black button starts the booking. */}
          <div className="flex items-stretch gap-2.5">
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(svc, e); }}
              type="button"
              className="flex-shrink-0 px-5 py-4 lg:py-3.5 text-[0.79rem] tracking-[0.02em] text-[#7a7068] bg-transparent border border-[#e6dcd7] rounded-[var(--radius)] hover:border-[#111] hover:text-[#111] active:scale-[0.97] transition-all"
              style={{ touchAction: 'manipulation' }}
            >
              Details
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(svc); }}
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 py-4 lg:py-3.5 bg-[#111] text-white text-[0.79rem] font-medium tracking-[0.08em] uppercase rounded-[var(--radius)] hover:bg-[#222] active:scale-[0.97] active:bg-[#333] transition-all"
              style={{ touchAction: 'manipulation' }}
            >
              {ctaLabel(svc)}
              <CtaArrow />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
