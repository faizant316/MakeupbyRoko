import { PLUM } from './class-checkout/classTheme';

// Prominent, plum-themed feature block for Roko's makeup courses. Courses are a
// big part of her work, so this stands apart from the plain service cards: a
// soft plum gradient, a COURSES badge, the two class options called out, and a
// bold "view available classes" CTA. Copy comes from the DB service (`svc`),
// but courses are pay-in-full so no deposit line is ever shown.
export default function CoursesFeature({ svc, onOpenClassModal }) {
  const options = (svc.includes || []).slice(0, 2);

  return (
    <div
      className="relative overflow-hidden rounded-2xl flex flex-col lg:flex-row"
      style={{
        background: `linear-gradient(150deg, ${PLUM.tint} 0%, #ffffff 55%)`,
        border: `1px solid ${PLUM.border}`,
        boxShadow: '0 18px 50px rgba(42,22,32,0.08)',
      }}
    >
      {/* soft plum glow accent */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full opacity-60"
        style={{ background: `radial-gradient(circle, rgba(212,160,176,0.35), transparent 70%)` }} />

      {/* Text side */}
      <div className="relative z-10 flex-1 p-6 sm:p-8 lg:p-10 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full"
            style={{ background: PLUM.ink, color: '#fff' }}>
            <span style={{ color: PLUM.pink }}>✦</span> Makeup Courses
          </span>
          <span className="text-[0.62rem] font-medium tracking-[0.04em]" style={{ color: PLUM.plum }}>Learn from Roko</span>
        </div>

        <h3 className="font-serif leading-[1.05] mb-2.5" style={{ fontSize: 'clamp(1.9rem, 4.5vw, 2.9rem)', fontWeight: 300, color: '#1a1015' }}>
          {svc.title || 'Makeup Courses'}
        </h3>

        {svc.desc && (
          <p className="text-[0.86rem] leading-[1.65] max-w-[440px] mb-5" style={{ color: PLUM.gray }}>
            {svc.desc}
          </p>
        )}

        {/* Course options */}
        {options.length > 0 && (
          <div className="flex flex-col gap-2.5 mb-5">
            {options.map((item) => (
              <div key={item} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/70"
                style={{ border: `1px solid ${PLUM.border}` }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: PLUM.rose }}>✦</span>
                <span className="text-[0.82rem] font-medium leading-snug" style={{ color: PLUM.deep }}>{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Meta note — pay in full, no deposit */}
        <div className="flex items-start gap-2 text-[0.74rem] mb-6" style={{ color: PLUM.plum }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: PLUM.pink }} />
          <span>Wednesdays only · online via Zoom or in person at the Mountain House studio · <strong style={{ color: PLUM.deep }}>pay in full to reserve</strong></span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onOpenClassModal(); }}
          type="button"
          className="mt-auto w-full sm:w-auto sm:self-start px-8 py-3.5 text-white text-[0.8rem] font-medium tracking-[0.06em] uppercase rounded-xl active:scale-[0.98] transition-all"
          style={{ background: PLUM.ink, boxShadow: '0 8px 24px rgba(42,22,32,0.22)' }}
        >
          View Available Classes →
        </button>
      </div>

      {/* Photo side */}
      <div className="relative lg:w-[38%] flex-shrink-0 order-first lg:order-last overflow-hidden min-h-[220px] lg:min-h-0"
        style={{ background: PLUM.tint2 }}>
        <img src={svc.photo} alt={svc.title} loading="lazy" decoding="async"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 30%' }} />
        {/* plum edge blend into the text side on desktop */}
        <div className="hidden lg:block pointer-events-none absolute inset-y-0 left-0 w-16"
          style={{ background: `linear-gradient(to right, ${PLUM.tint}, transparent)` }} />
      </div>
    </div>
  );
}
