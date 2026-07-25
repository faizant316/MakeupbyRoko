'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: `By accessing or using this website and submitting a booking inquiry, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use this website.`
  },
  {
    title: 'Booking & Appointments',
    body: `All service requests submitted through this website are inquiries only and do not constitute a confirmed booking. A booking is only confirmed once a non-refundable deposit has been received via Zelle and acknowledged by Roqia Moshref. Roqia reserves the right to decline any booking at her discretion.`
  },
  {
    title: 'Deposits & Payment',
    body: `A non-refundable deposit is required to secure your appointment date. Deposits are paid via Zelle to Ruqia Moshref. The remaining balance is due in CASH on the day of your appointment. No digital payments are accepted for the balance. Prices are subject to change without notice; confirmed bookings will honor the quoted rate.`
  },
  {
    title: 'Cancellations & Rescheduling',
    body: `All deposits are strictly non-refundable and non-transferable. Please give at least 24 hours notice to cancel or reschedule. Cancellations or changes made with less than 24 hours notice forfeit the deposit in full. Same-day cancellations and no-shows are charged the full service amount.`
  },
  {
    title: 'Late Arrivals',
    body: `Please arrive on time to your appointment. Arrivals more than 15 minutes late may result in a shortened service session or cancellation at the artist's discretion, without a refund of the deposit.`
  },
  {
    title: 'Health & Allergies',
    body: `It is your responsibility to disclose any skin conditions, allergies, sensitivities, or medical concerns prior to your appointment. Roqia Moshref will not be held liable for reactions resulting from undisclosed conditions. Services may be refused if a client presents with a contagious skin condition (e.g., active cold sore, conjunctivitis).`
  },
  {
    title: 'Photography & Portfolio Use',
    body: `By attending your appointment, you consent to photography being taken of the completed look for portfolio and promotional purposes, including use on Instagram, TikTok, and this website. If you do not wish to be photographed or featured, you must notify Roqia Moshref in writing before your appointment.`
  },
  {
    title: 'Travel Fees',
    body: `Studio appointments in Mountain House, California have no travel fee. On-location services (the artist traveling to you) are subject to a flat travel fee starting at $200, regardless of distance. The Full Day Service is an exception: travel is included in its package price and no additional travel fee is charged. For destination events, all travel-related expenses (flights, hotel, per diem) are the client's responsibility.`
  },
  {
    title: 'Limitation of Liability',
    body: `Roqia Moshref Makeup Artistry is not liable for any indirect, incidental, or consequential damages arising from the use of this website or services provided. Our maximum liability is limited to the amount paid for the specific service in question.`
  },
  {
    title: 'Intellectual Property',
    body: `All content on this website, including images, text, and design, is the property of Roqia Moshref Makeup Artistry. You may not reproduce, distribute, or use any content without explicit written permission.`
  },
  {
    title: 'Changes to Terms',
    body: `We reserve the right to update these Terms of Service at any time. Changes will be posted on this page with an updated effective date. Continued use of this website constitutes acceptance of the updated terms.`
  },
  {
    title: 'Governing Law',
    body: `These Terms of Service are governed by the laws of the State of California. Any disputes arising from these terms or our services shall be resolved in the courts of San Joaquin County, California.`
  },
];

export default function TermsOfService() {
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#FAF8F6' }}>
      {/* Header */}
      <div className="bg-[#111] py-16 px-[clamp(1.25rem,5vw,3rem)]">
        <div className="max-w-[760px] mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[#888] hover:text-[#D4A0B0] transition-colors mb-8"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Site
          </button>
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-3">Legal</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-white font-light">Terms of Service</h1>
          <p className="text-[0.8rem] text-[#555] mt-4">Effective Date: January 1, 2025 · Roqia Moshref Makeup Artistry</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,5vw,3rem)] py-16">
        <p className="text-[0.9rem] text-[#666] leading-[1.85] mb-12">
          These Terms of Service govern your use of the Roqia Moshref Makeup Artistry website and the booking of makeup artistry services. Please read them carefully before submitting an inquiry or booking.
        </p>

        <div className="flex flex-col gap-10">
          {SECTIONS.map((s, i) => (
            <div key={i} className="border-l-2 border-[#E8D5C4] pl-6">
              <h2 className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[#A0785A] mb-3">{s.title}</h2>
              <p className="text-[0.875rem] text-[#555] leading-[1.85]">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Contact nudge */}
        <div className="mt-14 bg-white border border-[#e8e2dc] rounded-2xl p-6 text-center">
          <p className="font-serif text-[1.1rem] text-[#111] mb-2">Questions about these terms?</p>
          <p className="text-[0.8rem] text-[#888]">
            Email us at{' '}
            <a href="mailto:roko@makeupbyroko.org" className="text-[#A0785A] underline underline-offset-2 hover:text-[#111] transition-colors">
              roko@makeupbyroko.org
            </a>
          </p>
        </div>

        <p className="text-center text-[0.7rem] text-[#bbb] mt-10">
          © {new Date().getFullYear()} Roqia Moshref Makeup Artistry · Mountain House, California
        </p>
      </div>
    </div>
  );
}