import { bestFor, ctaLabel } from '@/lib/serviceCopy';
import ServiceSpecs from './ServiceSpecs';

// The wedding-day service, at the size it earns.
//
// All three bridal packages used to share an equal 3-up grid, which capped the
// highest-value service on the site at roughly 410px of column and left the
// flagship showing a cropped photo, three bullets and a "+2 more" link, while
// the $400 non-bridal services sat below it in full-width rows. This is the
// same split treatment the courses block uses: a full-height photo beside the
// complete list of what's included.
//
// Desktop only. The mobile carousel still runs all three packages through
// BridalCard, so the snap and stride math under it is untouched.

export default function BridalHeroCard({ svc, onSelect, onViewDetail }) {
  return (
    <div className="bridal-aura relative z-0 transition-transform duration-300 ease-out hover:-translate-y-1.5">
      <div
        onClick={(e) => onViewDetail && onViewDetail(svc, e)}
        className="group relative flex min-h-[500px] cursor-pointer overflow-hidden rounded-[var(--radius-lg)] border border-[#f1e7e2] bg-white shadow-[0_1px_2px_rgba(31,20,25,0.04),0_10px_34px_rgba(31,20,25,0.07)] transition-shadow duration-300 ease-out hover:shadow-[0_3px_10px_rgba(31,20,25,0.07),0_28px_60px_rgba(31,20,25,0.15)]"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Text side */}
        <div className="flex min-w-0 flex-1 flex-col p-9 xl:p-11">
          {/* Same eyebrow treatment as the page's section headers */}
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-px w-6 bg-[#D4A0B0]" />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A0B0' }}>
              Featured Service
            </span>
          </div>

          <h3 className="font-serif leading-[1.02] text-[#111]" style={{ fontSize: 'clamp(2rem, 2.6vw, 2.6rem)', fontWeight: 300, letterSpacing: '-0.015em' }}>
            {svc.title}
          </h3>

          {bestFor(svc) && (
            <p className="mt-2.5 text-[0.92rem] leading-[1.6] text-[#8a7f79]">{bestFor(svc)}</p>
          )}

          <div className="mt-6">
            <ServiceSpecs svc={svc} size="lg" />
          </div>

          {/* The full list, not a "+2 more" link. There is room for it here, and
              it is the answer to the only question a bride has on this card. */}
          {svc.includes?.length > 0 && (
            <div className="mt-7">
              <span className="mb-3.5 block" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b3a9a3' }}>
                What's included
              </span>
              <ul className="grid gap-x-7 gap-y-2.5 sm:grid-cols-2">
                {svc.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.86rem] leading-[1.45] text-[#6d6460]">
                    <span className="mt-px flex-shrink-0 text-[#D4A0B0]">✦</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Two explicit targets, same pair every service card carries */}
          <div className="mt-auto flex items-stretch gap-3 pt-9">
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(svc, e); }}
              type="button"
              className="flex-shrink-0 rounded-[var(--radius)] border border-[#e6dcd7] bg-transparent px-7 py-4 text-[0.8rem] tracking-[0.02em] text-[#7a7068] transition-all hover:border-[#111] hover:text-[#111] active:scale-[0.97]"
              style={{ touchAction: 'manipulation' }}
            >
              Details
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(svc); }}
              type="button"
              className="flex-1 rounded-[var(--radius)] bg-[#111] py-4 text-[0.8rem] font-medium uppercase tracking-[0.08em] text-white transition-all hover:bg-[#222] active:scale-[0.97] active:bg-[#333]"
              style={{ touchAction: 'manipulation' }}
            >
              {ctaLabel(svc)}
            </button>
          </div>
        </div>

        {/* Photo side. Absolutely positioned so the card's height is set by the
            text column: a portrait photo at 42% of a 1280px grid is over 900px
            tall on its own, and in normal flow it dragged the whole card to
            that height and stranded the CTA a screen below the copy. */}
        <div className="relative w-[42%] flex-shrink-0 overflow-hidden bg-[#f5f5f5]">
          <img
            src={svc.photo}
            alt={svc.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition: 'top' }}
          />
        </div>
      </div>
    </div>
  );
}
