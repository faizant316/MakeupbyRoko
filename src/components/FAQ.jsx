import { useState } from 'react';

const FAQS = [
  {
    q: "How far in advance should I book?",
    a: "For bridal bookings, 3–6 months ahead is ideal as my calendar fills quickly. For other occasions, 2–4 weeks gives us plenty of time to prepare. Same-week appointments may be available — reach out or check the calendar."
  },
  {
    q: "Do you travel for appointments?",
    a: "Yes! I offer on-location services. Travel within a 30-mile radius is complimentary. For further distances, a travel fee applies. Destination events and weddings are welcome — let's talk details!"
  },
  {
    q: "What should I do to prepare for my appointment?",
    a: "Arrive with clean, moisturized skin. Avoid heavy skincare treatments the night before. Come with dry, styled hair if hair isn't included. If you have inspiration photos, bring them — I love seeing your vision before we start!"
  },
  {
    q: "What's your cancellation policy?",
    a: "I require 48 hours notice for cancellations. Deposits are non-refundable but fully transferable to a new date within 6 months. Last-minute cancellations (under 24 hours) may forfeit the deposit."
  },
  {
    q: "Do you offer a bridal trial?",
    a: "Absolutely — and I highly recommend it! A bridal trial is included in all full bridal packages. It's the perfect opportunity to test the look, make adjustments, and ensure you feel completely confident on your wedding day."
  },
  {
    q: "What products do you use?",
    a: "I use a professional kit featuring top brands — MAC, Charlotte Tilbury, NARS, Pat McGrath, Fenty Beauty, and more. All brushes and tools are sanitized before every appointment. If you have allergies or sensitivities, please let me know in advance."
  }
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <section id="faq" className="section bg-[var(--bg)]">
      <div className="container">
        <div className="section-header text-center reveal">
          <span className="label block mb-3">Questions</span>
          <h2 className="mb-3">Frequently Asked</h2>
        </div>

        <div className="max-w-[780px] mx-auto">
          {FAQS.map((faq, idx) => (
            <div key={idx} className={`border-b border-[var(--border)] reveal ${idx % 2 === 1 ? 'reveal-delay-1' : idx % 3 === 2 ? 'reveal-delay-2' : ''}`}>
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex justify-between items-center py-6 gap-4 cursor-pointer"
              >
                <span className="font-serif text-xl font-normal text-[var(--text)] leading-[1.3] text-left">{faq.q}</span>
                <div className={`w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center flex-shrink-0 transition-all ${openIdx === idx ? 'bg-[var(--text)] border-[var(--text)]' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3 h-3 text-[var(--text-muted)] transition-all ${openIdx === idx ? 'text-white transform rotate-45' : ''}`}>
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-400 ${openIdx === idx ? 'max-h-[500px]' : 'max-h-0'}`}>
                <div className="pb-6">
                  <p className="text-[0.9375rem] text-[var(--text-muted)] leading-[1.75]">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}