import { useState } from 'react';

const GENERAL_FAQ = [
  { q: "How do I book an appointment?", a: "Book right here on the site: pick your service, choose an available date, and fill out the booking form. Once you submit, you'll get a confirmation email with the Zelle deposit details and a private link to upload your screenshot. Roko confirms within 24–48 hours." },
  { q: "How do I pay the deposit?", a: "Deposits are accepted through Zelle. After you book, the Zelle details arrive in your confirmation email. Send your deposit, include your full name and appointment date in the Zelle note, then upload a screenshot using the private link in that email to receive your booking confirmation." },
  { q: "How do I pay the remaining balance?", a: "The remaining balance must be paid in CASH. Please bring it in an envelope labeled with your name and the payment amount." },
  { q: "When is my appointment confirmed?", a: "Appointments are first come, first serve and are NOT confirmed until: the deposit is sent, a screenshot is received, and you receive a confirmation text/email." },
  { q: "What is the cancellation policy?", a: "Deposits are non-refundable and non-transferable. If you cancel, the deposit will not be refunded. If Roko cancels due to an emergency, you will be refunded." },
  { q: "How should I prepare for my appointment?", a: "Arrive with clean, moisturized skin: no heavy foundation or skincare treatments the night before. Come with dry, styled hair. Bring any inspiration photos and let me know about allergies or sensitivities in advance." },
  { q: "What happens during the consultation?", a: "A 30-minute Zoom consultation is scheduled once your appointment is confirmed. Please have ready: inspiration photos, photos of your outfit(s)/gown(s), a photo with makeup, and a photo without makeup. All photos are kept completely confidential." },
];

const BRIDAL_FAQ = [
  { q: "What does the Luxury Bridal Look include?", a: "The Luxury Bridal Look is $750 (2-hour service) with a $375 deposit. It includes full bridal makeup, lash application, a professional touch-up kit, and a 30-min Zoom consultation. Bridesmaid add-ons are available." },
  { q: "What is the travel fee?", a: "A $200+ travel fee is automatically added when Roko travels to you for the Luxury Bridal Look or a trial. Studio appointments in Mountain House, CA have no travel fee, and the Full Day Service has travel built into its price, so no fee is added." },
  { q: "When is a Full Day Service required?", a: "The Full Day Service ($1,700, $850 deposit) is required for brides who need a bridal switch (second look), are located over 1 hour from the studio, or have a start time before 7 AM." },
  { q: "Can you do makeup for my bridesmaids too?", a: "Yes! Bridesmaid add-ons are available. Let me know how many people need glam in your inquiry so timing can be planned accordingly." },
  { q: "Do you travel for destination weddings?", a: "Yes! For out-of-state and destination weddings, select \"Yes, out of state\" on the form and add your location in the details box. From there, Roko will go over travel requirements and pricing with you during your consultation." },
  ...GENERAL_FAQ.slice(0, 3),
];

const FULL_DAY_FAQ = [
  { q: "What does the Full Day Service include?", a: "The Full Day Service is $1,700 (4 hours of coverage) with an $850 deposit. Roko stays with you from prep through ceremony, no rushing and no handoffs. It includes full bridal makeup, lash application, a bridal switch (second look) when needed, a professional touch-up kit, and a 30-min Zoom consultation. Bridesmaid & MOB add-ons are available." },
  { q: "When is the Full Day Service required?", a: "The Full Day Service is required for brides who need a bridal switch (second look), are located over 1 hour from the studio, or have a ceremony start time before 7 AM. It's also ideal for anyone who wants a calm, unhurried morning." },
  { q: "Is there a travel fee?", a: "No. Roko travels to you for full-day coverage and that travel is already included in the $1,700 price, so there's no separate travel fee. (The $200+ travel fee applies to the Luxury Bridal Look and trials when they're held somewhere other than the studio.)" },
  { q: "Can you do makeup for my bridesmaids too?", a: "Yes! Bridesmaid & MOB add-ons are available. Let me know how many people need glam in your inquiry so timing can be planned accordingly." },
  { q: "Do you travel for destination weddings?", a: "Yes! For out-of-state and destination weddings, select \"Yes, out of state\" on the form and add your location in the details box. From there, Roko will go over travel requirements and pricing with you during your consultation." },
  ...GENERAL_FAQ.slice(0, 3),
];

const EVENT_FAQ = [
  { q: "What is the non-bridal booking policy?", a: "Non-bridal bookings can only be made up to one month before your event, as bridal clients are prioritized. If you book earlier than one month in advance, bridal pricing will apply." },
  { q: "Where are non-bridal appointments held?", a: "All non-bridal appointments are held exclusively at the studio in Mountain House, unless included as part of a bridal travel service package." },
  ...GENERAL_FAQ,
];

const SHOOT_FAQ = [
  { q: "What counts as a photoshoot?", a: "Engagement shoots, maternity shoots, birthday shoots, and similar. The Photoshoot Makeup service is $500 with a $250 deposit (1 hr 45 min)." },
  { q: "Where are photoshoot appointments held?", a: "All photoshoot makeup appointments are held exclusively at the studio in Mountain House, CA." },
  ...GENERAL_FAQ,
];

const LESSON_FAQ = [
  { q: "When are classes held?", a: "Classes are held on Wednesdays between 11 AM and 7 PM, one client per day. You can book one of the next two open Wednesdays and pick the start time that works for you." },
  { q: "Are classes online or in person?", a: "Both! Take your class live over Zoom from anywhere, or in person at the studio in Mountain House, CA. Online classes are a little cheaper, and your Zoom link or the studio address arrives in your confirmation email right after checkout." },
  { q: "How do I sign up for a class?", a: "Choose your class and format, pick your Wednesday and start time, sign the class agreement, and pay in full online (Apple Pay, Google Pay, and all major cards via Stripe). Your seat is reserved instantly." },
  { q: "How long are the classes?", a: "The Beginner Makeup Lesson is 3 hours. The Advanced Makeup Artist Training is a full day: 7 hours in person with a 1-hour lunch break, or 6 hours online with a 30-minute break." },
  { q: "Do I need to bring my own makeup?", a: "For in-person classes everything is provided, though you're welcome to bring products you already own so I can show you how to use them better. For online classes, have your own makeup and brushes ready. Everyone receives a personalized product recommendation list." },
  { q: "What's the cancellation policy for classes?", a: "You can cancel or reschedule with at least 14 days notice, and either move your payment one time to another open Wednesday at no charge, or get a refund of your class fee minus the card processing fee. Cancellations with less than 14 days notice, and no-shows, forfeit the payment. If Roko ever has to cancel (illness or an emergency), you receive a full refund including the processing fee, or a free reschedule." },
];

const BRIDAL_TRIAL_FAQ = [
  { q: "What is included in the bridal trial?", a: "The bridal trial is a full makeup run-through at the studio. You'll receive the same quality application as your wedding day so you can see exactly how your look will come together and request any changes before the big day." },
  { q: "When should I schedule my bridal trial?", a: "Ideally 1 to 3 months before your wedding date. This gives enough time to review your look, make adjustments, and feel completely confident going into your wedding day." },
  { q: "What should I bring to my trial?", a: "Bring inspiration photos (close-up makeup shots and full-face references), photos of your gown and accessories, and any skin concerns or allergies noted in advance. Come with clean, moisturized skin and no heavy makeup on." },
  { q: "Can I make changes after the trial?", a: "Absolutely. The trial is specifically designed for that. Bring notes and any updated inspiration photos and all adjustments will be applied on your wedding day." },
  { q: "What is the travel fee?", a: "Trials are held at the studio in Mountain House, CA, so there's no travel fee. If Roko travels to you instead, a $200+ travel fee is added." },
  ...GENERAL_FAQ.slice(1, 5),
];

function getFAQs(service) {
  const category = service?.category || '';
  const key = service?.key || '';
  const title = (service?.title || '').toLowerCase();

  if (key === 'bridal' || category === 'bridal') {
    if (title.includes('trial')) return BRIDAL_TRIAL_FAQ;
    if (/full.?day/.test(title)) return FULL_DAY_FAQ;
    return BRIDAL_FAQ;
  }
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