'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: `When you use this website to request a booking or inquiry, we collect personal information you voluntarily provide, including your full name, email address, phone number, wedding or event date, and any notes or details you share in the form. We do not collect payment information through this website. Deposits are handled via Zelle directly.`
  },
  {
    title: 'How We Use Your Information',
    body: `Your information is used solely to confirm and manage your appointment, communicate with you about your booking, and send relevant pre-appointment information. We do not sell, rent, or share your personal information with third parties for marketing purposes.`
  },
  {
    title: 'Email Communications',
    body: `By submitting a booking request, you consent to receive email communications regarding your appointment, including confirmation emails, consultation scheduling, and appointment reminders. You may opt out of non-essential communications at any time by contacting us directly.`
  },
  {
    title: 'Data Storage & Security',
    body: `Your data is stored securely using industry-standard practices. We take reasonable technical and organizational measures to protect your personal information from unauthorized access, disclosure, or misuse. However, no method of transmission over the internet is 100% secure.`
  },
  {
    title: 'Photos & Content',
    body: `If you consent to photography or video during your appointment, images may be used for portfolio purposes on social media platforms (Instagram, TikTok) and this website. Please inform Roqia Moshref at the time of booking if you do not wish to be photographed or featured.`
  },
  {
    title: 'Third-Party Services',
    body: `This website uses third-party services for operations including email delivery (Resend) and website hosting (Vercel). These services may process your data as necessary to provide their functions. We encourage you to review their respective privacy policies.`
  },
  {
    title: 'Your Rights',
    body: `You have the right to request access to, correction of, or deletion of your personal information at any time. To exercise these rights, please contact us at makeupbyroko22@gmail.com. We will respond to your request within a reasonable timeframe.`
  },
  {
    title: 'Updates to This Policy',
    body: `We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated effective date. Continued use of this website after changes are posted constitutes your acceptance of the revised policy.`
  },
  {
    title: 'Contact',
    body: `If you have any questions or concerns about this Privacy Policy, please contact us at makeupbyroko22@gmail.com or by text at 510-491-6497.`
  },
];

export default function PrivacyPolicy() {
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
          <h1 className="font-serif text-4xl sm:text-5xl text-white font-light">Privacy Policy</h1>
          <p className="text-[0.8rem] text-[#555] mt-4">Effective Date: January 1, 2025 · Roqia Moshref Makeup Artistry</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,5vw,3rem)] py-16">
        <p className="text-[0.9rem] text-[#666] leading-[1.85] mb-12">
          Roqia Moshref Makeup Artistry ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you visit this website or submit a booking inquiry.
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
          <p className="font-serif text-[1.1rem] text-[#111] mb-2">Questions about your data?</p>
          <p className="text-[0.8rem] text-[#888]">
            Email us at{' '}
            <a href="mailto:makeupbyroko22@gmail.com" className="text-[#A0785A] underline underline-offset-2 hover:text-[#111] transition-colors">
              makeupbyroko22@gmail.com
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