import { useState } from 'react';

const FAQS = [
  {
    q: 'How long does a makeup session take?',
    a: 'Most sessions take 1.5–2 hours depending on the look. Bridal appointments may take longer, especially if there are multiple people in the bridal party. Once you book, Roko will confirm the exact timing based on your service.',
  },
  {
    q: 'What products do you use?',
    a: 'Roko works with a curated kit of high-end, professional brands including Charlotte Tilbury, NARS, MAC, Anastasia Beverly Hills, and more. All products are carefully selected for longevity, skin compatibility, and photographic quality.',
  },
  {
    q: 'Do you travel for events?',
    a: 'Yes! Roko is a traveling artist available for destination bookings. Studio appointments in Mountain House have no travel fee. On-location services within about an hour of the studio add a flat $200 travel fee. Further out, the day books as the Full Day Service instead, which has travel included in its price. For destination events, travel and lodging are arranged with the client directly.',
  },
  {
    q: 'What travel costs apply to destination and out-of-state weddings?',
    a: 'For all destination and out-of-state bookings, the client covers round-trip airfare, hotel accommodations, and ground transportation (airport transfers, rideshare, or a rental car). If a hairstylist (Hair by Shak) is not also booked for the event, the client also covers airfare for Roko\'s assistant. Saturday destination weddings include reserved travel days before and after the wedding to allow for travel and scheduling.',
  },
  {
    q: 'How do I secure my booking?',
    a: 'A deposit via Zelle is required to lock in your date. Once your booking request is received, Roko will confirm within 24–48 hours. The remaining balance is due in cash on the day of your appointment.',
  },
  {
    q: 'Do you offer touch-up kits?',
    a: 'Yes. Bridal clients receive a professional touch-up kit to keep throughout the day. For other services, Roko can recommend the best products to maintain your look.',
  },
  {
    q: 'What should I do to prepare for my appointment?',
    a: 'Come with a clean, moisturized face and no makeup on. If you have inspiration photos or a specific vision in mind, bring those along! For bridal consultations, Roko will ask for reference photos in advance.',
  },
  {
    q: 'What is your cancellation policy?',
    a: 'Deposits are non-refundable and non-transferable. If you need to cancel or reschedule, please reach out at least 24 hours before your appointment. Roko will do her best to accommodate based on availability.',
  },
  {
    q: 'Can you accommodate sensitive skin or allergies?',
    a: 'Absolutely. Please mention any known skin sensitivities or allergies when booking. Roko will do her best to accommodate your needs using appropriate products.',
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState(null);

  return (
    <section className="bg-[#F5F5F5] py-[clamp(2.5rem,5vw,4rem)]">
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,5vw,3rem)]">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-5 h-px bg-[#D4A0B0]" />
            <span className="text-[0.6rem] font-medium tracking-[0.14em] uppercase text-[#D4A0B0]">Got Questions?</span>
            <span className="w-5 h-px bg-[#D4A0B0]" />
          </div>
          <h2 className="font-serif" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 300, color: '#111', lineHeight: 1.1 }}>
            Frequently Asked <em style={{ fontStyle: 'italic', color: '#D4A0B0' }}>Questions</em>
          </h2>
        </div>

        {/* Accordion */}
        <div className="flex flex-col divide-y divide-[#EEE8E2]">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-3.5 text-left group"
                >
                  <span className={`text-[0.9rem] font-medium leading-snug transition-colors duration-200 ${isOpen ? 'text-[#111]' : 'text-[#444] group-hover:text-[#111]'}`}>
                    {faq.q}
                  </span>
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-200 ${
                    isOpen
                      ? 'bg-[#111] border-[#111] text-white'
                      : 'border-[#ddd] text-[#999] group-hover:border-[#D4A0B0] group-hover:text-[#D4A0B0]'
                  }`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </span>
                </button>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.38s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease',
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <p className="text-[0.83rem] text-[#666] leading-[1.8] pb-5 pr-10">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <a
            href="https://www.instagram.com/makeupbyroko_/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[0.75rem] font-medium tracking-[0.06em] uppercase text-[#999] hover:text-[#D4A0B0] transition-colors"
          >
            Still have questions? DM me on Instagram
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}