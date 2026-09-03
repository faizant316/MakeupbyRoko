import { PLUM } from './class-checkout/classTheme';
import { CLASS_CATALOG } from '@/lib/classCatalog';
import { bestFor, ctaLabel } from '@/lib/serviceCopy';
import CtaArrow from './CtaArrow';

// Featured block for Roko's makeup courses on the services page. Courses are a
// big part of her work, so this stands apart from the plain cards, but stays in
// the site's clean white / black / pink look. The whole card is clickable (like
// the other services, it opens the detail modal); the button jumps straight to
// booking. Options are pulled from the class catalog so prices are always right.

const fromPrice = (c) => Math.min(...Object.values(c.formats).map(f => f.price));

const COURSE_OPTIONS = [
  { title: 'Beginner Makeup Lesson', meta: '3 hours', from: fromPrice(CLASS_CATALOG.private_basic_lesson) },
  { title: 'Advanced Makeup Artist Training', meta: 'Full day', from: fromPrice(CLASS_CATALOG.masterclass) },
];

export default function CoursesFeature({ svc, onOpenClassModal, onViewDetail }) {
  return (
    <div
      onClick={(e) => onViewDetail && onViewDetail(svc, e)}
      className="group relative overflow-hidden rounded-2xl flex flex-col lg:flex-row bg-white cursor-pointer transition-all duration-300 hover:-translate-y-[2px] active:scale-[0.995]"
      style={{
        border: `1px solid ${PLUM.border}`,
        boxShadow: '0 10px 34px rgba(17,17,17,0.05)',
      }}
    >
      {/* Text side */}
      <div className="relative z-10 flex-1 p-6 sm:p-8 lg:p-10 flex flex-col">
        {/* A black "Makeup Courses" pill used to sit here, directly above a
            heading whose default text is also "Makeup Courses", inside a
            section already introduced as "Learn With Roko". Three labels for
            one thing. The heading keeps the job. */}
        <h3 className="font-serif leading-[1.05] mb-2.5 text-[#111]" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 2.9rem)', fontWeight: 300 }}>
          {svc.title || 'Makeup Courses'}
        </h3>

        {bestFor(svc) && (
          <p className="text-[0.8rem] leading-[1.5] mb-3" style={{ color: PLUM.grayLt }}>{bestFor(svc)}</p>
        )}

        {svc.desc && (
          <p className="text-[0.86rem] leading-[1.65] max-w-[460px] mb-5" style={{ color: PLUM.gray }}>
            {svc.desc}
          </p>
        )}

        {/* Two course options, combined into one clean panel */}
        <div className="rounded-xl overflow-hidden mb-5" style={{ border: `1px solid ${PLUM.border}` }}>
          {COURSE_OPTIONS.map((opt, i) => (
            <div key={opt.title}
              className="flex items-center justify-between gap-3 px-4 py-3.5"
              style={{ borderTop: i === 0 ? 'none' : `1px solid ${PLUM.borderSoft}`, background: '#fff' }}>
              <div className="min-w-0">
                <p className="text-[0.84rem] font-medium text-[#111] leading-tight truncate">{opt.title}</p>
                <p className="text-[0.68rem] mt-0.5" style={{ color: PLUM.grayLt }}>{opt.meta}</p>
              </div>
              <span className="text-[0.72rem] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: PLUM.noteBg, color: PLUM.rose }}>
                from ${opt.from.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Meta note — pay in full */}
        <div className="flex items-start gap-2 text-[0.74rem] mb-6" style={{ color: PLUM.gray }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: PLUM.pink }} />
          <span>Wednesdays only · online via Zoom or in person at the Mountain House studio · <strong className="text-[#111] font-medium">pay in full to reserve</strong></span>
        </div>

        {/* Details vs Book — the same pair every service card carries, so one
            tap target never means two different things. */}
        <div className="mt-auto flex items-stretch gap-2 w-full sm:w-auto sm:self-start">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(svc, e); }}
            type="button"
            className="flex-shrink-0 px-5 py-4 sm:py-3.5 text-[0.78rem] font-medium bg-white rounded-xl transition-all active:scale-[0.98]"
            style={{ color: PLUM.gray, border: `1px solid ${PLUM.border}` }}
          >
            Details
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenClassModal(); }}
            type="button"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-4 sm:py-3.5 bg-[#111] text-white text-[0.8rem] font-medium tracking-[0.06em] uppercase rounded-xl hover:bg-[#222] active:scale-[0.98] transition-all"
          >
            {ctaLabel(svc)}
            <CtaArrow />
          </button>
        </div>
      </div>

      {/* Photo side */}
      <div className="relative lg:w-[40%] flex-shrink-0 order-first lg:order-last overflow-hidden min-h-[220px] lg:min-h-0"
        style={{ background: PLUM.tint2 }}>
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          style={{ objectPosition: 'center 30%' }} />
      </div>
    </div>
  );
}
