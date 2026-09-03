import { useState } from 'react';
import { bestFor, ctaLabel } from '@/lib/serviceCopy';
import CtaArrow from './CtaArrow';

// "Not sure which one?" — two taps to the right service.
//
// The three bridal options are not self-explanatory to a first-time bride, and
// BridalComparison (the only place that answered it) is a collapsed toggle below
// the carousel that most people never open. This asks what the booking is for
// and lands on the answer, with the book button right there.
//
// Styled as part of the page, not as a widget dropped onto it: white ground,
// hairline rules, serif answers, the accent used only as a 6px marker. An
// earlier version was a pink gradient panel with pill rows, which read as a
// different site. Collapsed by default so it costs nothing to anyone who
// already knows what they want.

const OCCASIONS = [
  { key: 'bridal',   label: 'A wedding',    sub: 'Bride, trial, or a full day' },
  { key: 'event',    label: 'An event',     sub: 'Party, birthday, graduation, night out' },
  { key: 'creative', label: 'A photoshoot', sub: 'Editorial, content, portraits' },
  { key: 'lessons',  label: 'A lesson',     sub: 'Learn to do your own makeup' },
];

const BRIDAL_PATHS = [
  { title: 'Luxury Bridal Look', label: 'The wedding day itself',     sub: 'Your look on the day' },
  { title: 'Bridal Trial',       label: 'A trial run first',          sub: 'Test the look 1 to 3 months ahead' },
  { title: 'Full Day Service',   label: 'An early start or long day', sub: 'Before 7 AM, or over an hour away' },
];

const Label = ({ children }) => (
  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#b3a9a3' }}>
    {children}
  </span>
);

// One answer. Hairline rules between rows, the name in the page's serif, and a
// pink marker that only appears under the cursor.
const Choice = ({ label, sub, onClick, first }) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full text-left flex items-center justify-between gap-4 py-4 px-1 transition-colors"
    style={{ background: 'none', border: 'none', borderTop: first ? 'none' : '1px solid #f0ebe6', cursor: 'pointer' }}
  >
    <span className="flex items-center gap-3 min-w-0">
      <span className="w-[3px] h-[18px] flex-shrink-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: '#D4A0B0' }} />
      <span className="min-w-0">
        <span className="block font-serif text-[1.05rem] leading-tight text-[#111]">{label}</span>
        <span className="block text-[0.74rem] text-[#a89f99] mt-1">{sub}</span>
      </span>
    </span>
    <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0 group-hover:stroke-[#111] group-hover:translate-x-0.5 transition-all">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </button>
);

export default function ServiceChooser({ services = [], onSelect, onViewDetail, onOpenClassModal, onFilter }) {
  const [open, setOpen] = useState(false);
  const [occasion, setOccasion] = useState(null);
  const [pick, setPick] = useState(null);

  const byTitle = (t) => services.find(s => s.title === t);
  const inCategory = (c) => services.filter(s => s.category === c);

  const reset = () => { setOccasion(null); setPick(null); };
  const close = () => { setOpen(false); reset(); };

  const chooseOccasion = (key) => {
    setOccasion(key);
    onFilter?.(key);
    if (key === 'bridal') return;                // one more question for brides
    const only = inCategory(key);
    setPick(only.length === 1 ? only[0] : null); // a single match answers itself
  };

  const book = (svc) => {
    if (!svc) return;
    if (svc.category === 'lessons') onOpenClassModal?.();
    else onSelect?.(svc);
  };

  if (!services.length) return null;

  const heading = pick ? 'Your match' : occasion ? 'Which part of the wedding?' : 'What are you booking?';

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 group"
          style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: '#8a7f79', cursor: 'pointer', background: 'none', border: 'none', padding: '6px 0' }}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,160,176,0.16)', color: '#B8778C', fontSize: '0.66rem', fontWeight: 700 }}>?</span>
          Not sure which one is right for you?
          <span className="text-[#D4A0B0] group-hover:text-[#B8778C] transition-colors">Help me choose →</span>
        </button>
      ) : (
        <div className="max-w-[560px] mt-2">
          {/* Same eyebrow treatment as the section headers, so this reads as
              part of the page rather than a panel dropped on top of it. */}
          <div className="flex items-center justify-between gap-4 pb-3">
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-6 h-px flex-shrink-0 bg-[#D4A0B0]" />
              <Label>{heading}</Label>
            </span>
            <div className="flex items-center gap-4">
              {occasion && (
                <button type="button" onClick={reset}
                  className="text-[0.72rem] text-[#a89f99] hover:text-[#111] transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                  Back
                </button>
              )}
              <button type="button" onClick={close}
                className="text-[0.72rem] text-[#a89f99] hover:text-[#111] transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                Close
              </button>
            </div>
          </div>

          {/* Q1 */}
          {!occasion && OCCASIONS.map((o, i) => (
            <Choice key={o.key} label={o.label} sub={o.sub} first={i === 0} onClick={() => chooseOccasion(o.key)} />
          ))}

          {/* Q2 — brides only */}
          {occasion === 'bridal' && !pick && BRIDAL_PATHS.filter(p => byTitle(p.title)).map((p, i) => (
            <Choice key={p.title} label={p.label} sub={p.sub} first={i === 0} onClick={() => setPick(byTitle(p.title))} />
          ))}

          {/* Result */}
          {pick && (
            <div className="pt-3 pb-1">
              <h4 className="font-serif text-[1.5rem] font-normal text-[#111] leading-tight">{pick.title}</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-serif text-[1.05rem] text-[#111]">{pick.price}</span>
                {pick.duration && <><span className="text-[#ddd]">·</span><span className="text-[0.8rem] text-[#7a7068]">{pick.duration}</span></>}
              </div>
              {bestFor(pick) && <p className="text-[0.8rem] text-[#8a7f79] mt-2.5 leading-[1.6]">{bestFor(pick)}</p>}
              <div className="flex items-stretch gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={(e) => onViewDetail?.(pick, e)}
                  className="flex-shrink-0 px-5 py-3 text-[0.78rem] tracking-[0.02em] text-[#7a7068] bg-transparent border border-[#e6dcd7] rounded-[3px] hover:border-[#111] hover:text-[#111] active:scale-[0.97] transition-all"
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => book(pick)}
                  className="flex-1 sm:flex-none sm:px-14 inline-flex items-center justify-center gap-2 py-4 sm:py-3 bg-[#111] text-white text-[0.78rem] font-medium tracking-[0.08em] uppercase rounded-[3px] hover:bg-[#222] active:scale-[0.97] transition-all"
                >
                  {ctaLabel(pick)}
                  <CtaArrow />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
