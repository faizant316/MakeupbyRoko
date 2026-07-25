import { useRef } from 'react';
import { useModalLenis } from '@/lib/modalLenis';
import { useScrollLock } from '@/lib/useScrollLock';

// Elegant line icons per topic (stroke matches the site's blush accent).
const ICONS = {
  'Booking Policy': (
    <><rect x="4" y="5" width="16" height="16" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="4" y1="10" x2="20" y2="10" /><path d="M9 15l2 2 4-4" /></>
  ),
  'Travel Policy': (
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  ),
  'FAQ': (
    <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M9.1 9a2.9 2.9 0 0 1 5.7.8c0 1.9-2.9 2.9-2.9 2.9" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
  ),
  'Cancellation Terms': (
    <><rect x="4" y="5" width="16" height="16" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="10" y1="14" x2="15" y2="19" /><line x1="15" y1="14" x2="10" y2="19" /></>
  ),
};

const INFO_CONTENT = {
  'Booking Policy': {
    intro: 'Everything you need to know to reserve your date with Roko.',
    sections: [
      {
        title: 'How to Book',
        body: 'All bookings are made through the online booking form on this website. Select your service, choose an available date, fill in your details, and submit your request. Bookings must be made at least 2 weeks in advance so Roko has time to prepare for your look.'
      },
      {
        title: 'Deposit Requirement',
        body: 'A non-refundable deposit is required to secure your appointment date. The deposit amount varies by service and is due at the time of booking via Zelle. Your date is not confirmed until the deposit has been received and acknowledged.'
      },
      {
        title: 'Zelle Payment',
        body: 'Deposits are sent via Zelle. The Zelle recipient details are sent to your email with your booking confirmation after you submit a request. Please include your name and appointment date in the note, then upload a screenshot on your secure link as proof.'
      },
      {
        title: 'Remaining Balance',
        body: 'The remaining balance is due in cash on the day of your appointment. Please bring it in an envelope labeled with your name and the amount. No digital payments are accepted for the balance.'
      },
      {
        title: 'Confirmation',
        body: 'Once your request is submitted and your deposit is received, Roko will reach out within 24 to 48 hours to confirm your appointment time. A Zoom consultation may be scheduled to discuss your vision.'
      },
    ]
  },
  'Travel Policy': {
    intro: 'Roko is a traveling artist, based in Mountain House, California.',
    sections: [
      {
        title: 'Home Base',
        body: 'Roqia Moshref is based in Mountain House, California. Studio appointments there have no travel fee. On-location services (the artist traveling to you) add a flat travel fee, regardless of distance.'
      },
      {
        title: 'Travel Fee',
        body: 'For on-location services (bridal, event, photoshoot), a flat travel fee of $200 applies regardless of distance, in addition to the service price. Studio appointments in Mountain House have no travel fee. The Full Day Service includes travel in its price, so no travel fee is added to it. The travel fee is due along with the remaining balance.'
      },
      {
        title: 'Destination Bookings',
        body: 'Roko is available for destination events and weddings. For out-of-state or destination bookings, travel expenses including flights, accommodations, and per diem are the responsibility of the client and must be arranged prior to confirming the booking.'
      },
      {
        title: 'Parking',
        body: 'For on-location bookings, the client is responsible for ensuring free and convenient parking is available for the artist. Parking fees, if any, will be added to the final invoice.'
      },
    ]
  },
  'FAQ': {
    intro: 'The questions Roko is asked most, answered.',
    sections: [
      {
        title: 'How far in advance should I book?',
        body: 'At least 2 weeks in advance for regular services. For bridal bookings, it is highly recommended to book 3 to 6 months ahead, especially for peak wedding season (April to October). Popular dates fill up fast.'
      },
      {
        title: 'Do you offer trials?',
        body: 'Yes. A trial session is highly recommended for brides and photoshoot clients. A Zoom consultation is included with all bookings to go over your vision, inspiration photos, and any skin concerns before your appointment.'
      },
      {
        title: 'How should I prepare for my appointment?',
        body: 'Come with a clean, moisturized face. Avoid heavy skincare products the morning of. Bring or share inspiration photos. If you wear contacts, bring them, since lighting can affect how you see colors. Arrive on time so we have the full session together.'
      },
      {
        title: 'What products do you use?',
        body: 'Roko uses a professional kit featuring high-end and industry-trusted brands. Products are selected based on skin type, tone, and the look being achieved. If you have allergies or sensitivities, please disclose them when booking.'
      },
      {
        title: 'Do you do hair as well?',
        body: 'Currently, services are focused on makeup artistry only. Roko can recommend trusted hairstylists in the area upon request.'
      },
      {
        title: 'Can I bring guests to my appointment?',
        body: 'To keep a calm and focused environment, please limit guests to 1 or 2 people. For bridal group bookings, all members of the party should be listed at the time of booking.'
      },
    ]
  },
  'Cancellation Terms': {
    intro: 'Please read carefully before reserving your date.',
    sections: [
      {
        title: 'Deposits Are Non-Refundable',
        body: 'All deposits paid to secure a booking are strictly non-refundable and non-transferable. This policy exists because your date is held exclusively for you and cannot be offered to other clients once reserved.'
      },
      {
        title: 'Cancellation by Client',
        body: 'If you need to cancel, please notify Roko as soon as possible via email or text. Cancellations made with less than 24 hours notice forfeit the deposit in full. Same-day cancellations and no-shows are charged the full service amount.'
      },
      {
        title: 'Rescheduling',
        body: 'Please give at least 24 hours notice to cancel or reschedule. Deposits are non-refundable and non-transferable. Changes made with less than 24 hours notice forfeit the deposit.'
      },
      {
        title: 'Cancellation by Artist',
        body: 'In the rare event Roko must cancel due to illness or emergency, clients will receive a full refund of their deposit or the option to reschedule at no additional cost.'
      },
      {
        title: 'Late Arrivals',
        body: 'Please arrive on time. Arrivals more than 15 minutes late may result in a shortened session or cancellation at the artist\'s discretion, without a refund of the deposit.'
      },
    ]
  }
};

export default function InfoModal({ topic, onClose }) {
  const content = INFO_CONTENT[topic];
  const scrollRef = useRef(null);
  useModalLenis(scrollRef);
  useScrollLock();

  if (!content) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-[640px] sm:mx-6 sm:rounded-2xl rounded-t-2xl max-h-[86vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ animation: 'slideUpSheet 0.34s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Header */}
        <div
          className="relative flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FCF8F5 100%)' }}
        >
          {/* Tapered blush hairline */}
          <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,160,176,0.5) 50%, transparent)' }} />

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#D4A0B0]/12 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                {ICONS[topic]}
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-[1.4rem] sm:text-[1.55rem] text-[#2C1A14] leading-tight truncate">{topic}</h2>
              <p className="text-[0.7rem] text-[#b19aa4] leading-tight mt-0.5 truncate">{content.intro}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-[#F7EEF2] flex-shrink-0 ml-3"
            style={{ background: '#fff', border: '1px solid rgba(212,160,176,0.3)', boxShadow: '0 1px 4px rgba(140,90,110,0.07)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#2C1A14" strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content (Lenis-smoothed wheel) */}
        <div ref={scrollRef} data-modal-scroll className="overflow-y-auto flex-1 min-h-0 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="px-6 py-6 flex flex-col gap-5">
            {content.sections.map((s, i) => (
              <div key={i} className="flex gap-3.5">
                <div className="flex-shrink-0 flex flex-col items-center pt-0.5">
                  <span className="w-6 h-6 rounded-full bg-[#D4A0B0]/12 flex items-center justify-center text-[0.62rem] font-semibold text-[#B0708A]">
                    {i + 1}
                  </span>
                  {i < content.sections.length - 1 && <span className="w-px flex-1 mt-2 bg-[#f0e6ea]" />}
                </div>
                <div className="flex-1 pb-1">
                  <h3 className="font-sans text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-[#B0708A] mb-1.5">{s.title}</h3>
                  <p className="text-[0.85rem] text-[#5c5450] leading-[1.75]">{s.body}</p>
                </div>
              </div>
            ))}

            {/* Contact nudge */}
            <div className="mt-1 rounded-2xl p-4 flex items-start gap-3" style={{ background: '#FBF5F7', border: '1px solid #F0E0E9' }}>
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0" style={{ border: '1px solid #F0E0E9' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.6" className="w-4 h-4">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <p className="text-[0.8rem] text-[#6B4055] leading-[1.7]">
                Still have questions? Reach out at{' '}
                <a href="mailto:roko@makeupbyroko.org" className="font-medium underline underline-offset-2 hover:text-[#111] transition-colors">roko@makeupbyroko.org</a>
                {' '}or text <a href="sms:5104916497" className="font-medium underline underline-offset-2 hover:text-[#111] transition-colors">510-491-6497</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
