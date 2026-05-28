import { useState } from 'react';

const GENERAL_FAQ = [
  { q: "How do I book an appointment?", a: "Email makeupbyroko22@gmail.com with your appointment date as the subject line (MM/DD/YYYY), full name, phone number, time you need to be ready by, occasion, and location. Please allow 24–48 hours for a response." },
  { q: "How do I pay the deposit?", a: "Deposits are accepted through Zelle only.\n\nName: Ruqia Moshref\nPhone: 510-491-6497\n\nInclude your name, phone number, and appointment date in the Zelle note. Send a screenshot as proof of payment." },
  { q: "How do I pay the remaining balance?", a: "The remaining balance must be paid in CASH. Please bring it in an envelope labeled with your name and the payment amount." },
  { q: "When is my appointment confirmed?", a: "Appointments are first come, first serve and are NOT confirmed until: the deposit is sent, a screenshot is received, and you receive a confirmation text/email." },
  { q: "What is the cancellation policy?", a: "Deposits are non-refundable and non-transferable. If you cancel, the deposit will not be refunded. If Roko cancels due to an emergency, you will be refunded." },
  { q: "How should I prepare for my appointment?", a: "Arrive with clean, moisturized skin — no heavy foundation or skincare treatments the night before. Come with dry, styled hair. Bring any inspiration photos and let me know about allergies or sensitivities in advance." },
  { q: "What happens during the consultation?", a: "A 30-minute Zoom consultation is scheduled once your appointment is confirmed. Please have ready: inspiration photos, photos of your outfit(s)/gown(s), a photo with makeup, and a photo without makeup. All photos are kept completely confidential." },
];

const BRIDAL_FAQ = [
  { q: "What does the Luxury Bridal Look include?", a: "The Luxury Bridal Look is $750 (2-hour service) with a $375 deposit. It includes full bridal makeup, lash application, a professional touch-up kit, and a 30-min Zoom consultation. Bridesmaid add-ons are available." },
  { q: "What is the travel fee?", a: "A $200+ travel fee is automatically added for any bridal services not held at the studio in Mountain House, CA." },
  { q: "When is a Full Day Service required?", a: "The Full Day Service ($1,700, $850 deposit) is required for brides who need a bridal switch (second look), are located over 1 hour from the studio, or have a start time before 7 AM." },
  { q: "Can you do makeup for my bridesmaids too?", a: "Yes! Bridesmaid add-ons are available. Let me know how many people need glam in your inquiry so timing can be planned accordingly." },
  { q: "Do you travel for destination weddings?", a: "Yes! For out-of-state or locations more than 2 hours from Mountain House, include the location in your booking email for accurate pricing." },
  ...GENERAL_FAQ.slice(0, 3),
];

const EVENT_FAQ = [
  { q: "What is the non-bridal booking policy?", a: "Non-bridal bookings can only be made up to one month before your event, as bridal clients are prioritized. If you book earlier than one month in advance, bridal pricing will apply." },
  { q: "Where are non-bridal appointments held?", a: "All non-bridal appointments are held exclusively at the studio in Mountain House, unless included as part of a bridal travel service package." },
  ...GENERAL_FAQ,
];

const SHOOT_FAQ = [
  { q: "What counts as a photoshoot?", a: "Engagement shoots, maternity shoots, birthday shoots, and similar. The Photoshoot Makeup service is $600 with a $300 deposit (1 hr 45 min)." },
  { q: "Where are photoshoot appointments held?", a: "All photoshoot makeup appointments are held exclusively at the studio in Mountain House, CA." },
  ...GENERAL_FAQ,
];

const LESSON_FAQ = [
  { q: "When are classes held?", a: "Classes are held Monday through Thursday between 10:00 AM and 8:00 PM." },
  { q: "How do I sign up for a class?", a: "Visit the class selection form, choose your class, then email back after submitting a 50% deposit via Zelle to secure your spot." },
  { q: "Do I need to bring my own makeup?", a: "You're welcome to bring products you already own so I can show you how to use them better, but it's not required. You'll also receive a personalized product recommendation list." },
  ...GENERAL_FAQ.slice(0, 3),
];

function getFAQs(service) {
  const category = service?.category || '';
  const key = service?.key || '';
  const title = (service?.title || '').toLowerCase();

  if (key === 'bridal' || category === 'bridal') return BRIDAL_FAQ;
  if (category === 'lessons' || title.includes('course') || title.includes('lesson')) return LESSON_FAQ;
  if (category === 'creative' || title.includes('photoshoot') || title.includes('shoot')) return SHOOT_FAQ;
  return EVENT_FAQ;
}

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-3.5 text-left group"
      >
        <span className={`text-[0.82rem] font-medium leading-snug transition-colors duration-200 ${open ? 'text-[#111]' : 'text-[#444] group-hover:text-[#111]'}`}>
          {item.q}
        </span>
        <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-[#111] border-[#111] text-white'
            : 'border-[#ddd] text-[#999] group-hover:border-[#D4A0B0] group-hover:text-[#D4A0B0]'
        }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-3 h-3 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </span>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.38s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease',
          opacity: open ? 1 : 0,
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p className="text-[0.78rem] text-[#666] leading-[1.8] pb-4 pr-6 whitespace-pre-line">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ServiceFAQ({ service }) {
  const faqs = getFAQs(service);
  if (faqs.length === 0) return null;

  return (
    <div>
      <h4 className="font-serif text-[1rem] text-[#111] mb-3">Common Questions</h4>
      <div className="bg-[#F5F5F5] rounded-xl px-5 divide-y divide-[#EEE8E2]">
        {faqs.map((item, idx) => (
          <FAQItem key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}