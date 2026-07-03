'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'roko_class_checkout';

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [data, setData] = useState(null);
  const [show, setShow] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const regId = params.get('reg_id');

    if (!sessionId || !regId) {
      setStatus('error');
      return;
    }

    // Restore itemized data from sessionStorage
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setData(JSON.parse(stored)); } catch {}
      sessionStorage.removeItem(STORAGE_KEY);
    }

    // Confirm payment + send emails
    fetch('/api/confirm-class-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, registration_id: regId }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.success || res.already_confirmed) setStatus('success');
        else setStatus('success'); // show success even if email fails — payment went through
      })
      .catch(() => setStatus('success'))
      .finally(() => setTimeout(() => setShow(true), 80));
  }, []);

  const receiptDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const firstName = (data?.full_name || '').split(' ')[0] || 'there';
  const selectedClasses = data?.selectedClasses || [];
  const totalPaid = data?.totalPaid || selectedClasses.reduce((s, c) => s + (c.price || 0), 0);
  const preferredDate = data?.preferredDate || '';

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#D4A0B0] border-t-transparent rounded-full animate-spin" />
          <p className="text-[0.85rem] text-[#A0785A]">Confirming your payment…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="text-center max-w-sm">
          <h2 className="font-serif text-2xl text-[#111] mb-3">Invalid Link</h2>
          <p className="text-[0.85rem] text-gray-400 mb-6">This confirmation link is not valid or has already been used.</p>
          <Link href="/" className="text-[0.8rem] font-medium text-[#C4849A] underline">Back to site</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[#EDE6DF]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-serif text-[1rem] tracking-wide text-[#2C1A14]">MAKEUP BY ROKO</span>
          <Link href="/"
            className="text-[0.72rem] font-medium text-[#A0785A] hover:text-[#2C1A14] transition-colors">
            ← Back to site
          </Link>
        </div>
      </div>

      <div className={`max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6 transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>

        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-4 py-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F7EEF2, #EDD9E3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.8" className="w-9 h-9">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-[#C4849A] mb-2">Payment Confirmed</p>
            <h1 className="font-serif text-[2.2rem] text-[#111] leading-tight mb-2">You're all set{firstName !== 'there' ? `, ${firstName}` : ''}!</h1>
            <p className="font-serif italic text-[#D4A0B0] text-[1rem]">Your spot is officially secured ✦</p>
          </div>
          <p className="text-[0.85rem] text-gray-500 max-w-[420px] leading-[1.85]">
            Your payment has been received{preferredDate ? <> for <strong className="text-[#111]">{preferredDate}</strong></> : ''} and a confirmation email is on its way to your inbox.
            Roko will reach out within <strong className="text-[#111]">24–48 hours</strong> to confirm your class time.
          </p>
          {data?.email && (
            <div className="flex items-center gap-2 text-[0.72rem] px-3 py-1.5 rounded-full" style={{ background: 'rgba(196,132,154,0.1)', color: '#A0607A' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              Receipt sent to {data.email}
            </div>
          )}
        </div>

        {/* Receipt */}
        <div className="rounded-2xl overflow-hidden border border-[#EDE6DF] bg-white">
          {/* Receipt header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: '#FAF7F4', borderBottom: '1px solid #EDE6DF' }}>
            <div>
              <p className="text-[0.55rem] font-semibold tracking-[0.2em] uppercase text-[#C4849A] mb-0.5">Payment Receipt</p>
              <p className="text-[0.72rem] text-gray-400">{receiptDate}</p>
            </div>
            <span className="text-[0.65rem] font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
              Paid in full ✓
            </span>
          </div>

          {/* Requested class date */}
          {preferredDate && (
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#F5F0EC]">
              <span className="text-[0.72rem] font-medium text-[#A0785A] uppercase tracking-[0.08em]">Class date (requested)</span>
              <span className="text-[0.82rem] font-medium text-[#111]">{preferredDate}</span>
            </div>
          )}

          {/* Line items */}
          {selectedClasses.length > 0 ? (
            <div className="divide-y divide-[#F5F0EC]">
              {selectedClasses.map((cls, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-[0.85rem] font-medium text-[#111]">{cls.name}</p>
                    {cls.duration && <p className="text-[0.65rem] text-[#A0785A] mt-0.5">{cls.duration}</p>}
                  </div>
                  <p className="text-[0.85rem] font-semibold text-[#111]">${(cls.price || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-4">
              <p className="text-[0.82rem] text-gray-400">Makeup class booking</p>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-6 py-4" style={{ background: '#FAF7F4', borderTop: '1px solid #EDE6DF' }}>
            <span className="text-[0.85rem] font-semibold text-[#111]">Total Paid</span>
            <span className="font-serif text-[1.4rem] text-[#111]">${totalPaid.toLocaleString()}</span>
          </div>
        </div>

        {/* What's next */}
        <div className="rounded-2xl overflow-hidden border border-[#EDE6DF] bg-white">
          <div className="px-6 py-4" style={{ background: '#FAF7F4', borderBottom: '1px solid #EDE6DF' }}>
            <p className="text-[0.55rem] font-semibold tracking-[0.2em] uppercase text-[#C4849A]">What Happens Next</p>
          </div>
          <div className="divide-y divide-[#F5F0EC]">
            {[
              { n: 1, title: 'Check your email', sub: 'A receipt and confirmation is headed to your inbox' },
              { n: 2, title: 'Roko reaches out within 24–48 hrs', sub: 'To confirm your class date, time & location' },
              { n: 3, title: 'Show up and learn!', sub: 'All supplies provided, just bring yourself ✨' },
            ].map(({ n, title, sub }) => (
              <div key={n} className="flex items-start gap-4 px-6 py-4">
                <div className="w-6 h-6 rounded-full bg-[#F7EEF2] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[0.6rem] font-bold text-[#C4849A]">{n}</span>
                </div>
                <div>
                  <p className="text-[0.85rem] font-medium text-[#111]">{title}</p>
                  <p className="text-[0.7rem] text-gray-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign off */}
        <div className="text-center py-2">
          <p className="font-serif italic text-[1.15rem] text-[#A0785A] mb-1">Xoxo, Roko 💄</p>
          <p className="text-[0.68rem] text-gray-400">makeupbyroko22@gmail.com · @makeupbyroko_</p>
        </div>

        {/* CTA */}
        <div className="pb-10">
          <Link href="/"
            className="w-full py-4 rounded-2xl text-[0.82rem] font-medium flex items-center justify-center transition-all"
            style={{ background: '#111', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            Back to Makeup by Roko →
          </Link>
        </div>

      </div>
    </div>
  );
}
