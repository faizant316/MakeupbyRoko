import { useState } from 'react';

const TIMELINE = [
  { time: 'Morning', label: 'Roko arrives & sets up', desc: 'Full prep kit ready' },
  { time: 'Glam', label: 'Bridal makeup', desc: 'Unhurried, perfected' },
  { time: 'Ceremony', label: 'Ready on time', desc: 'No rushing, no stress' },
];

const PERFECT_FOR = [
  '⏰  Early ceremony start times (before 10 AM)',
  '🚗  Venues over 1 hour from the studio',
  '👗  Bridal switch looks between ceremony & reception',
  '💛  Brides who want a calm, unhurried experience',
];

const DEFAULT_INCLUDES = [
  'Full bridal makeup application',
  'Artist availability — prep through ceremony',
  'Travel to venue included',
  'Professional lash application',
  'Dedicated 1-on-1 Zoom consultation',
  'Bridesmaid & MOB add-ons available',
];

export default function FullDayIncludes({ bridalIncludes }) {
  const [expanded, setExpanded] = useState(false);
  const items = bridalIncludes?.length ? bridalIncludes : DEFAULT_INCLUDES;

  return (
    <div className="flex flex-col gap-5">
      {/* Premium badge */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[0.55rem] font-bold tracking-[0.2em] uppercase text-[#D4A0B0] px-2">Full Day — Premium Service</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* What's Included — always visible */}
      <div>
        <span className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-3">What's Included</span>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[0.75rem] text-[#444]">
              <span className="text-[#D4A0B0] text-[0.65rem] mt-0.5 flex-shrink-0">✦</span>{item}
            </li>
          ))}
        </ul>
      </div>

      {/* Timeline — horizontal on mobile, vertical on desktop */}
      <div>
        <span className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-3">Your Day, Step by Step</span>

        {/* Mobile: horizontal scrolling timeline */}
        <div className="flex lg:hidden gap-0 overflow-x-auto no-scrollbar pb-2">
          {TIMELINE.map((step, i) => (
            <div key={i} className="flex flex-col items-center min-w-[5rem] flex-1 relative">
              {/* Connecting line */}
              {i < TIMELINE.length - 1 && (
                <div className="absolute top-[0.6rem] left-1/2 w-full h-px bg-gray-100" style={{ left: '50%' }} />
              )}
              <div className="w-[1.2rem] h-[1.2rem] rounded-full border border-[#D4A0B0]/40 bg-white flex items-center justify-center relative z-10 flex-shrink-0">
                <span className="w-1 h-1 rounded-full bg-[#D4A0B0]" />
              </div>
              <div className="mt-2 text-center px-1">
                <span className="block text-[0.5rem] font-bold tracking-[0.1em] uppercase text-[#D4A0B0]">{step.time}</span>
                <span className="block text-[0.68rem] font-medium text-[#111] mt-0.5 leading-tight">{step.label}</span>
                <span className="block text-[0.6rem] text-[#bbb] mt-0.5 leading-tight">{step.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: vertical timeline */}
        <div className="hidden lg:flex flex-col gap-0">
          {TIMELINE.map((step, i) => (
            <div key={i} className="flex items-start gap-3 relative">
              {i < TIMELINE.length - 1 && (
                <div className="absolute left-[0.85rem] top-5 w-px h-full bg-gray-100" />
              )}
              <div className="w-[1.7rem] h-[1.7rem] rounded-full border border-[#D4A0B0]/30 bg-white flex items-center justify-center flex-shrink-0 relative z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]" />
              </div>
              <div className="pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#D4A0B0]">{step.time}</span>
                  <span className="text-[0.75rem] font-medium text-[#111]">{step.label}</span>
                </div>
                <p className="text-[0.68rem] text-[#aaa] mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Perfect For — collapsible on mobile, faded preview on desktop */}
      <div className="border-t border-gray-100 pt-4">
        {/* Mobile: toggleable */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="lg:hidden w-full flex items-center justify-between mb-2"
        >
          <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888]">Perfect For</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"
            className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Mobile: always visible with fade effect */}
        <div className="lg:hidden relative">
          <div className={`flex flex-col gap-1.5 transition-all duration-300 overflow-hidden ${expanded ? 'max-h-none' : 'max-h-[60px]'}`}>
            {PERFECT_FOR.map(line => (
              <p key={line} className="text-[0.72rem] text-[#666]">{line}</p>
            ))}
          </div>
          {/* Gradient fade at bottom — only show when collapsed */}
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/60 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Desktop: always visible with fade effect */}
        <div className="hidden lg:block">
          <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-2.5 block">Perfect For</span>
          <div className="relative">
            <div className="flex flex-col gap-1.5">
              {PERFECT_FOR.map(line => (
                <p key={line} className="text-[0.72rem] text-[#666]">{line}</p>
              ))}
            </div>
            {/* Gradient fade at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50/30 via-gray-50/10 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}