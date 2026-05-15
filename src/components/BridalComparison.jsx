import { useState } from 'react';

const ROWS = [
  {
    category: 'Pricing',
    icon: '💰',
    rows: [
      { label: 'Price', luxury: '$750', fullday: '$1,700' },
      { label: 'Deposit (Zelle)', luxury: '$375', fullday: '$850' },
      { label: 'Remaining Balance', luxury: 'Cash day-of', fullday: 'Cash day-of' },
      { label: 'Bridesmaid Add-ons', luxury: 'Available', fullday: 'Available' },
    ],
  },
  {
    category: 'Service Scope',
    icon: '✨',
    rows: [
      { label: 'Duration', luxury: '2 hours', fullday: 'Full day' },
      { label: 'Full Bridal Makeup', luxury: true, fullday: true },
      { label: 'Lash Application', luxury: true, fullday: true },
      { label: 'Touch-up Kit', luxury: true, fullday: true },
      { label: 'Second Look / Bridal Switch', luxury: null, fullday: true },
      { label: 'Zoom Consultation (30 min)', luxury: true, fullday: null },
    ],
  },
  {
    category: 'Travel & Location',
    icon: '🚗',
    rows: [
      { label: 'Studio (Mountain House, CA)', luxury: true, fullday: true },
      { label: 'On-Location Travel', luxury: '+$200 fee', fullday: 'Included' },
      { label: 'Start Before 7 AM', luxury: 'Upgrade required', fullday: 'Included' },
      { label: 'Location Over 1 hr Away', luxury: 'Upgrade required', fullday: 'Included' },
    ],
  },
  {
    category: 'When to Choose',
    icon: '💡',
    rows: [
      { label: 'Studio / elopement wedding', luxury: true, fullday: null },
      { label: 'Venue wedding with bridal suite', luxury: null, fullday: true },
      { label: 'Early morning ceremony', luxury: null, fullday: true },
      { label: 'Need a second look on the day', luxury: null, fullday: true },
    ],
  },
];

function Cell({ value }) {
  if (value === true) return (
    <span className="flex items-center justify-center">
      <span className="w-5 h-5 rounded-full bg-[#D4A0B0]/15 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2.5" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
    </span>
  );
  if (value === null) return (
    <span className="flex items-center justify-center">
      <span className="w-4 h-px bg-[#e0e0e0] block" />
    </span>
  );
  return <span className="text-[0.75rem] text-[#555] font-medium text-center block leading-tight">{value}</span>;
}

export default function BridalComparison({ bridalServices, onSelect }) {
  const [open, setOpen] = useState(false);

  const luxury = bridalServices.find(s => s.title === 'Luxury Bridal Look') || bridalServices[0];
  const fullday = bridalServices.find(s => s.title === 'Full Day Service') || bridalServices[1];

  if (!luxury || !fullday) return null;

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 group"
      >
        <span className={`w-4 h-4 rounded-full border border-[#D4A0B0]/40 flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-45' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2.5" className="w-2.5 h-2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        <span className="text-[0.82rem] font-semibold text-[#C4889A]">
          {open ? 'Hide comparison' : 'Compare bridal packages side-by-side'}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="#C4889A" strokeWidth="2" className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>

      {/* Comparison table */}
      {open && (
        <div className="mt-4 rounded-2xl border border-[#ede8e3] overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.05)]"
          style={{ animation: 'fadeSlideDown 0.2s ease-out' }}>

          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_1fr] bg-[#FAF6F3] border-b border-[#ede8e3]">
            <div className="w-[90px] sm:w-[140px] p-3 flex items-end">
              <span className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase text-[#bbb]">Feature</span>
            </div>
            {[luxury, fullday].map((svc, i) => (
              <div key={svc.key} className={`p-3 text-center ${i === 0 ? 'border-l border-[#ede8e3]' : 'border-l border-[#ede8e3] bg-[#FDF0F5]/40'}`}>
                <span className="text-[0.5rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] block mb-0.5">
                  {i === 0 ? 'Luxury' : 'Full Day'}
                </span>
                <span className="font-serif text-[1rem] sm:text-[1.1rem] text-[#111] block leading-tight">{svc.price}</span>
                <span className="text-[0.6rem] text-[#bbb]">{svc.duration}</span>
              </div>
            ))}
          </div>

          {/* Rows by category */}
          {ROWS.map((section) => (
            <div key={section.category}>
              {/* Section header */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF6F3] border-t border-[#ede8e3]">
                <span className="text-[0.8rem]">{section.icon}</span>
                <span className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#aaa]">{section.category}</span>
              </div>
              {section.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[auto_1fr_1fr] border-t border-[#f5f0eb] ${ri % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF8]'}`}
                >
                  <div className="w-[90px] sm:w-[140px] px-3 py-2.5 flex items-center">
                    <span className="text-[0.68rem] text-[#888] leading-tight">{row.label}</span>
                  </div>
                  <div className="px-2 py-2.5 border-l border-[#f0ebe6] flex items-center justify-center">
                    <Cell value={row.luxury} />
                  </div>
                  <div className="px-2 py-2.5 border-l border-[#f0ebe6] flex items-center justify-center bg-[#FDF0F5]/20">
                    <Cell value={row.fullday} />
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* CTA row */}
          <div className="grid grid-cols-[auto_1fr_1fr] border-t border-[#ede8e3] bg-[#FAF6F3]">
            <div className="w-[90px] sm:w-[140px]" />
            {[luxury, fullday].map((svc, i) => (
              <div key={svc.key} className="p-2.5 border-l border-[#ede8e3]">
                <button
                  onClick={() => { setOpen(false); onSelect(svc); }}
                  className="w-full h-9 bg-[#111] text-white text-[0.62rem] font-medium tracking-[0.04em] rounded-lg hover:bg-[#2a2a2a] active:scale-[0.97] transition-all flex items-center justify-center gap-1 whitespace-nowrap px-2"
                >
                  {i === 0 ? 'Luxury' : 'Full Day'} <span className="text-[#D4A0B0]">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}