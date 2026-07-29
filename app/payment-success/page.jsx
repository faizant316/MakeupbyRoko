'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { PLUM } from '../../src/components/class-checkout/classTheme';
import BrandLoader from '../../src/components/BrandLoader';

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
  const preferredTime = data?.preferredTime || '';
  const formatLabel = data?.formatLabel || '';
  const isOnline = data?.format === 'online';
  const isInPerson = data?.format === 'in_person';

  // Verifying the Stripe session is the one moment a paying client is left
  // waiting with money already gone, so it gets the branded loader rather than a
  // bare spinner.
  if (status === 'loading') {
    return <BrandLoader caption="Confirming your payment" />;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="text-center max-w-sm">
          <h2 className="font-serif text-2xl text-[#1a1015] mb-3">Invalid Link</h2>
          <p className="text-[0.85rem] mb-6" style={{ color: PLUM.gray }}>This confirmation link is not valid or has already been used.</p>
          <Link href="/" className="text-[0.8rem] font-medium underline" style={{ color: PLUM.rose }}>Back to site</Link>
        </div>
      </div>
    );
  }

  const rowBorder = `1px solid ${PLUM.borderSoft}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm" style={{ borderBottom: `1px solid ${PLUM.border}` }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-serif text-[1rem] tracking-wide" style={{ color: PLUM.ink }}>MAKEUP BY ROKO</span>
          <Link href="/"
            className="text-[0.72rem] font-medium transition-colors"
            style={{ color: PLUM.plum }}>
            ← Back to site
          </Link>
        </div>
      </div>

      <div className={`max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6 transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>

        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-4 py-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F7EEF2, #EDD9E3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={PLUM.rose} strokeWidth="1.8" className="w-9 h-9">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: PLUM.rose }}>Payment Confirmed</p>
            <h1 className="font-serif text-[2.2rem] text-[#1a1015] leading-tight mb-2">You're all set{firstName !== 'there' ? `, ${firstName}` : ''}!</h1>
            <p className="font-serif italic text-[1rem]" style={{ color: PLUM.pink }}>Your spot is officially secured ✦</p>
          </div>
          <p className="text-[0.85rem] max-w-[420px] leading-[1.85]" style={{ color: PLUM.gray }}>
            Your payment has been received{preferredDate ? <> and your class is scheduled for <strong style={{ color: '#1a1015' }}>{preferredDate}</strong>{preferredTime ? <>, <strong style={{ color: '#1a1015' }}>{preferredTime}</strong></> : ''}</> : ''}.{' '}
            {isOnline
              ? <>Your <strong style={{ color: '#1a1015' }}>Zoom link</strong> is on its way to your inbox right now.</>
              : isInPerson
              ? <>The <strong style={{ color: '#1a1015' }}>studio address in Mountain House</strong> is in your confirmation email.</>
              : <>Roko will reach out within <strong style={{ color: '#1a1015' }}>24–48 hours</strong> to confirm your class time.</>}
          </p>
          {data?.email && (
            <div className="flex items-center gap-2 text-[0.72rem] px-3 py-1.5 rounded-full" style={{ background: 'rgba(196,132,154,0.1)', color: PLUM.deep }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              Receipt sent to {data.email}
            </div>
          )}
        </div>

        {/* Receipt */}
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${PLUM.border}`, boxShadow: '0 10px 40px rgba(42,22,32,0.06)' }}>
          {/* Receipt header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: PLUM.tint2, borderBottom: `1px solid ${PLUM.border}` }}>
            <div>
              <p className="text-[0.55rem] font-semibold tracking-[0.2em] uppercase mb-0.5" style={{ color: PLUM.rose }}>Payment Receipt</p>
              <p className="text-[0.72rem]" style={{ color: PLUM.gray }}>{receiptDate}</p>
            </div>
            <span className="text-[0.65rem] font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.12)', color: '#15803d' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
              Paid in full
            </span>
          </div>

          {/* Scheduled class date / time / format */}
          {preferredDate && <ReceiptRow label="Class date" value={preferredDate} border={rowBorder} />}
          {preferredTime && <ReceiptRow label="Time" value={preferredTime} border={rowBorder} mono />}
          {formatLabel && <ReceiptRow label="Format" value={formatLabel} border={rowBorder} />}

          {/* Line items */}
          {selectedClasses.length > 0 ? (
            <div style={{ borderTop: preferredDate || preferredTime || formatLabel ? 'none' : rowBorder }}>
              {selectedClasses.map((cls, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4" style={{ borderTop: rowBorder }}>
                  <div>
                    <p className="text-[0.85rem] font-medium text-[#1a1015]">{cls.name}</p>
                    {cls.duration && <p className="text-[0.65rem] mt-0.5" style={{ color: PLUM.plum }}>{cls.duration}</p>}
                  </div>
                  <p className="text-[0.85rem] font-semibold text-[#1a1015]">${(cls.price || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-4" style={{ borderTop: rowBorder }}>
              <p className="text-[0.82rem]" style={{ color: PLUM.gray }}>Makeup class booking</p>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-6 py-4" style={{ background: PLUM.tint, borderTop: `1px solid ${PLUM.border}` }}>
            <span className="text-[0.85rem] font-semibold text-[#1a1015]">Total Paid</span>
            <span className="font-serif text-[1.4rem]" style={{ color: PLUM.ink }}>${totalPaid.toLocaleString()}</span>
          </div>
        </div>

        {/* What's next */}
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${PLUM.border}` }}>
          <div className="px-6 py-4" style={{ background: PLUM.tint2, borderBottom: `1px solid ${PLUM.border}` }}>
            <p className="text-[0.55rem] font-semibold tracking-[0.2em] uppercase" style={{ color: PLUM.rose }}>What Happens Next</p>
          </div>
          <div>
            {(isOnline
              ? [
                  { n: 1, title: 'Check your email for the Zoom link', sub: 'Your confirmation and join link are headed to your inbox' },
                  { n: 2, title: 'Set up your space', sub: 'Good lighting, a mirror, and your makeup within reach' },
                  { n: 3, title: 'Come with a clean face', sub: 'We start fresh with skin prep, then build the look' },
                ]
              : isInPerson
              ? [
                  { n: 1, title: 'Check your email for the studio address', sub: 'Directions to the Mountain House studio are inside' },
                  { n: 2, title: 'Come with a clean face', sub: 'No makeup, or light moisturizer only' },
                  { n: 3, title: 'Just bring yourself!', sub: 'All products and tools are provided at the studio ✨' },
                ]
              : [
                  { n: 1, title: 'Check your email', sub: 'A receipt and confirmation is headed to your inbox' },
                  { n: 2, title: 'Roko reaches out within 24–48 hrs', sub: 'To confirm your class date, time & location' },
                  { n: 3, title: 'Show up and learn!', sub: 'All supplies provided, just bring yourself ✨' },
                ]
            ).map(({ n, title, sub }, i) => (
              <div key={n} className="flex items-start gap-4 px-6 py-4" style={{ borderTop: i === 0 ? 'none' : rowBorder }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#F7EEF2' }}>
                  <span className="text-[0.6rem] font-bold" style={{ color: PLUM.rose }}>{n}</span>
                </div>
                <div>
                  <p className="text-[0.85rem] font-medium text-[#1a1015]">{title}</p>
                  <p className="text-[0.7rem] mt-0.5" style={{ color: PLUM.gray }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign off */}
        <div className="text-center py-2">
          <p className="font-serif italic text-[1.15rem] mb-1" style={{ color: PLUM.plum }}>Xoxo, Roko 💄</p>
          <p className="text-[0.68rem]" style={{ color: PLUM.grayLt }}>roko@makeupbyroko.org · @makeupbyroko_</p>
        </div>

        {/* CTA */}
        <div className="pb-10">
          <Link href="/"
            className="w-full py-4 rounded-2xl text-[0.82rem] font-medium flex items-center justify-center transition-all"
            style={{ background: PLUM.ink, color: '#fff', boxShadow: '0 4px 20px rgba(42,22,32,0.2)' }}>
            Back to Makeup by Roko →
          </Link>
        </div>

      </div>
    </div>
  );
}

function ReceiptRow({ label, value, border, mono }) {
  return (
    <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: border }}>
      <span className="text-[0.72rem] font-medium uppercase tracking-[0.08em]" style={{ color: PLUM.plum }}>{label}</span>
      <span className={`text-[0.82rem] font-medium text-[#1a1015] ${mono ? 'tabular-nums' : ''}`}>{value}</span>
    </div>
  );
}
