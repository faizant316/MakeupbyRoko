import { useEffect } from 'react';

const INFO_CONTENT = {
  'Booking Policy': {
    icon: '📋',
    sections: [
      {
        title: 'How to Book',
        body: 'All bookings are made through the online booking form on this website. Select your service, choose an available date, fill in your details, and submit your request. Bookings must be made at least 30 days in advance to allow proper preparation.'
      },
      {
        title: 'Deposit Requirement',
        body: 'A non-refundable deposit is required to secure your appointment date. The deposit amount varies by service and is due at the time of booking via Zelle. Your date is not confirmed until the deposit has been received and acknowledged.'
      },
      {
        title: 'Zelle Payment',
        body: 'Deposits are sent via Zelle. The Zelle recipient details are sent to your email with your booking confirmation after you submit a request. Please include your name and appointment date in the note, then email a screenshot as proof to makeupbyroko22@gmail.com.'
      },
      {
        title: 'Remaining Balance',
        body: 'The remaining balance is due in CASH on the day of your appointment. Please bring it in an envelope labeled with your name and the amount. No digital payments are accepted for the balance.'
      },
      {
        title: 'Confirmation',
        body: 'Once your request is submitted and deposit is received, Roko will reach out within 24–48 hours to confirm your appointment time. A Zoom consultation may be scheduled to discuss your vision.'
      },
    ]
  },
  'Travel Policy': {
    icon: '✈️',
    sections: [
      {
        title: 'Home Base',
        body: 'Roqia Moshref is based in Mountain House, California. Local clients within a reasonable driving distance may not incur travel fees — please inquire for details.'
      },
      {
        title: 'Travel Fee',
        body: 'For on-location services (bridal, event, photoshoot), a travel fee applies based on distance from Mountain House, CA. Travel fees will be quoted at the time of booking confirmation and are due along with the remaining balance.'
      },
      {
        title: 'Destination Bookings',
        body: 'Roko is a traveling artist available for destination events and weddings. For out-of-state or destination bookings, travel expenses including flights, accommodations, and per diem are the responsibility of the client and must be arranged prior to confirming the booking.'
      },
      {
        title: 'Parking',
        body: 'For on-location bookings, the client is responsible for ensuring free and convenient parking is available for the artist. Parking fees, if any, will be added to the final invoice.'
      },
    ]
  },
  'FAQ': {
    icon: '💬',
    sections: [
      {
        title: 'How far in advance should I book?',
        body: 'At least 30 days in advance for regular services. For bridal bookings, it\'s highly recommended to book 3–6 months ahead — especially for peak wedding season (April–October). Popular dates fill up fast!'
      },
      {
        title: 'Do you offer trials?',
        body: 'Yes! A trial session is highly recommended for brides and photoshoot clients. A Zoom consultation is included with all bookings to go over your vision, inspiration photos, and any skin concerns before your appointment.'
      },
      {
        title: 'What should I do to prepare for my appointment?',
        body: 'Come with a clean, moisturized face. Avoid heavy skincare products the morning of. Bring or share inspiration photos. If you wear contacts, bring them — lighting can affect how you see colors. Arrive on time so we have the full session together.'
      },
      {
        title: 'What products do you use?',
        body: 'Roko uses a professional kit featuring high-end and industry-trusted brands. Products are selected based on skin type, tone, and the look being achieved. If you have allergies or sensitivities, please disclose them when booking.'
      },
      {
        title: 'Do you do hair as well?',
        body: 'Currently, services are focused on makeup artistry only. However, Roko can recommend trusted hairstylists in the area upon request.'
      },
      {
        title: 'Can I bring guests to my appointment?',
        body: 'To maintain a calm and focused environment, please limit guests to 1–2 people. For bridal group bookings, all members of the party should be listed at the time of booking.'
      },
    ]
  },
  'Cancellation Terms': {
    icon: '📅',
    sections: [
      {
        title: 'Deposits Are Non-Refundable',
        body: 'All deposits paid to secure a booking are strictly non-refundable. This policy exists because your date is held exclusively for you and cannot be offered to other clients once reserved.'
      },
      {
        title: 'Cancellation by Client',
        body: 'If you need to cancel your appointment, please notify Roko as soon as possible via email or text. Cancellations made less than 14 days before the appointment date forfeit the full deposit. For bridal bookings, cancellations less than 30 days prior may be subject to additional fees.'
      },
      {
        title: 'Rescheduling',
        body: 'You may reschedule your appointment once at no charge, provided at least 14 days notice is given and the rescheduled date is within 60 days of the original. The deposit will transfer to the new date. Same-day cancellations or no-shows are charged the full service amount.'
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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!content) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-[640px] sm:mx-6 sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl"
        style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{content.icon}</span>
            <h2 className="font-serif text-[1.5rem] text-[#111]">{topic}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">
          {content.sections.map((s, i) => (
            <div key={i}>
              <h3 className="font-sans text-[0.75rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-2">{s.title}</h3>
              <p className="text-[0.875rem] text-[#555] leading-[1.75]">{s.body}</p>
            </div>
          ))}

          {/* Contact nudge */}
          <div className="mt-4 bg-[#FAF8F6] rounded-xl p-4 border border-[#f0ebe6]">
            <p className="text-[0.78rem] text-[#A0785A]">
              Questions? Reach out at{' '}
              <a href="mailto:makeupbyroko22@gmail.com" className="underline underline-offset-2 hover:text-[#111] transition-colors">makeupbyroko22@gmail.com</a>
              {' '}or text <a href="sms:5104916497" className="underline underline-offset-2 hover:text-[#111] transition-colors">510-491-6497</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}