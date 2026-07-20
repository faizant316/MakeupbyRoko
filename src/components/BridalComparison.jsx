import { useState } from 'react';

// Package comparison, shown under the bridal cards behind a disclosure.
//
// Price, deposit and duration are read off the live service records rather than
// retyped here. They used to be hardcoded, which had already drifted: the table
// claimed Full Day was "Four hours" while the service itself says "Up to 4
// hours". Anything below the Pricing/Duration rows is editorial (it isn't in the
// services table), so it stays as config.
const cleanDeposit = (d) => (d || '').replace(/\s*deposit\s*$/i, '').trim();

function buildSections(luxury, fullday) {
  return [
    {
      category: 'Pricing',
      rows: [
        { label: 'Price', luxury: luxury.price, fullday: fullday.price },
        { label: 'Deposit (Zelle)', luxury: cleanDeposit(luxury.deposit), fullday: cleanDeposit(fullday.deposit) },
        { label: 'Remaining balance', luxury: 'Cash day-of', fullday: 'Cash day-of' },
        { label: 'Bridesmaid add-ons', luxury: 'Available', fullday: 'Available' },
      ],
    },
    {
      category: 'Service scope',
      rows: [
        { label: 'Duration', luxury: luxury.duration, fullday: fullday.duration },
        { label: 'Full bridal makeup', luxury: true, fullday: true },
        { label: 'Lash application', luxury: true, fullday: true },
        { label: 'Touch-up kit', luxury: true, fullday: true },
        { label: 'Second look / bridal switch', luxury: null, fullday: true },
        { label: 'Zoom consultation (30 min)', luxury: true, fullday: null },
      ],
    },
    {
      category: 'Travel & location',
      rows: [
        { label: 'Studio (Mountain House, CA)', luxury: true, fullday: true },
        { label: 'On-location travel', luxury: '+$200 fee', fullday: '+$200 fee' },
        { label: 'Start before 7 AM', luxury: 'Upgrade required', fullday: 'Included' },
        { label: 'Location over 1 hr away', luxury: 'Upgrade required', fullday: 'Included' },
      ],
    },
    {
      category: 'When to choose',
      rows: [
        { label: 'Studio / elopement wedding', luxury: true, fullday: null },
        { label: 'Venue wedding with bridal suite', luxury: null, fullday: true },
        { label: 'Early morning ceremony', luxury: null, fullday: true },
        { label: 'Need a second look on the day', luxury: null, fullday: true },
      ],
    },
  ];
}

function Cell({ value }) {
  if (value === true) return (
    <span className="flex items-center justify-center" aria-label="Included">
      <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
  if (value === null) return (
    <span className="flex items-center justify-center" aria-label="Not included">
      <span className="w-3 h-px bg-[#D8D8DE] block" />
    </span>
  );
  return <span className="text-[0.78rem] text-[#3F3F46] text-center block leading-snug">{value}</span>;
}

export default function BridalComparison({ bridalServices, onSelect }) {
  const [open, setOpen] = useState(false);

  const luxury = bridalServices.find(s => s.title === 'Luxury Bridal Look') || bridalServices[0];
  const fullday = bridalServices.find(s => s.title === 'Full Day Service') || bridalServices[1];

  if (!luxury || !fullday) return null;

  const sections = buildSections(luxury, fullday);
  const cols = [
    { svc: luxury, name: 'Luxury' },
    { svc: fullday, name: 'Full Day' },
  ];

  const GRID = 'grid grid-cols-[minmax(96px,132px)_1fr_1fr] sm:grid-cols-[180px_1fr_1fr]';

  return (
    <div>
      {/* Disclosure. Reads as a real button so it's obvious there's more here. */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="bridal-comparison-panel"
        className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-[var(--radius-lg)] border border-[#E4E4E9] bg-white text-[#111] hover:border-[#C4849A]/45 hover:bg-[#FCFAFB] active:scale-[0.995] transition-all duration-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span className="text-[0.88rem] font-medium tracking-[0.01em]">
          {open ? 'Hide comparison' : 'Compare Luxury and Full Day'}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="#9A9AA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          id="bridal-comparison-panel"
          className="mt-3 rounded-[var(--radius-lg)] border border-[#E7E7EA] overflow-hidden bg-white"
          style={{ animation: 'fadeSlideDown 0.2s ease-out' }}
        >
          {/* Header */}
          <div className={`${GRID} border-b border-[#E7E7EA]`}>
            <div className="px-4 py-4 flex items-end">
              <span className="text-[0.62rem] font-medium tracking-[0.14em] uppercase text-[#9A9AA2]">Feature</span>
            </div>
            {cols.map(({ svc, name }, i) => (
              <div key={svc.key || name}
                className={`px-3 py-4 text-center border-l border-[#E7E7EA] ${i === 1 ? 'bg-[#FBFBFC]' : ''}`}>
                <span className="text-[0.62rem] font-medium tracking-[0.14em] uppercase text-[#C4849A] block mb-1.5">
                  {name}
                </span>
                <span className="text-[1.35rem] text-[#111] block leading-none tracking-[-0.01em]">{svc.price}</span>
                <span className="text-[0.72rem] text-[#9A9AA2] block mt-1.5">{svc.duration}</span>
              </div>
            ))}
          </div>

          {sections.map((section) => (
            <div key={section.category}>
              <div className="px-4 py-2.5 bg-[#F7F7F9] border-b border-[#EDEDF0]">
                <span className="text-[0.62rem] font-medium tracking-[0.14em] uppercase text-[#6F6F78]">
                  {section.category}
                </span>
              </div>
              {section.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className={`${GRID} ${ri === section.rows.length - 1 ? '' : 'border-b border-[#F1F1F4]'}`}
                >
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-[0.78rem] text-[#5F5F68] leading-snug">{row.label}</span>
                  </div>
                  <div className="px-3 py-3 border-l border-[#F1F1F4] flex items-center justify-center">
                    <Cell value={row.luxury} />
                  </div>
                  <div className="px-3 py-3 border-l border-[#F1F1F4] flex items-center justify-center bg-[#FBFBFC]">
                    <Cell value={row.fullday} />
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* CTAs */}
          <div className={`${GRID} border-t border-[#E7E7EA]`}>
            <div />
            {cols.map(({ svc, name }, i) => (
              <div key={svc.key || name} className={`p-3 border-l border-[#E7E7EA] ${i === 1 ? 'bg-[#FBFBFC]' : ''}`}>
                <button
                  onClick={() => { setOpen(false); onSelect(svc); }}
                  className="w-full h-10 bg-[#111] text-white text-[0.76rem] font-medium tracking-[0.02em] rounded-[var(--radius)] hover:bg-[#2a2a2a] active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2"
                >
                  {name} <span className="text-[#D4A0B0]">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
