'use client';
import { useState, useEffect } from 'react';
import ContractSign from '@/components/ContractSign';
import { buildContract } from '@/lib/contract';

// ── Brand plum palette (matches UploadZelle + the admin card) ──
const PLUM = '#C4849A';
const PLUM_DARK = '#6B4055';
const LABEL = '#A89098';
const VALUE = '#2C1A14';
const CARD_BORDER = '#E8E2DC';
const HEAD_BORDER = '#F0E0E9';

const pageBg = { background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF6F8 100%)' };

const isBridalService = (s = '') => /bridal|bride|wedding|full day/i.test(s) && !/non-bridal/i.test(s);

export default function ResignContract() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const bookingId = params.get('id');
  const token = params.get('token');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!bookingId || !token) {
      setError('Invalid link. Please check your email for the correct link.');
      setLoading(false);
      return;
    }
    fetch('/api/get-booking-by-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, booking_id: bookingId }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.error) throw new Error(res.error);
        setBooking(res.booking);
      })
      .catch(() => setError('This link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [bookingId, token]);

  const dateFormatted = booking?.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'your selected date';

  const onLocation = booking ? (isBridalService(booking.service) || /travel|✈️/i.test(booking.notes || '')) : false;

  const contract = booking
    ? buildContract({
        clientName: booking.name,
        serviceName: booking.service,
        dateFormatted,
        time: booking.time || '',
        locationType: onLocation ? 'onlocation' : 'studio',
        kind: 'appointment',
      })
    : null;

  const handleSign = async ({ name, photoConsent, signedAt, version }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/resign-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id: bookingId, name, photoConsent, signedAt, version }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your signature.');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Nav = (
    <div className="relative flex-shrink-0 px-4 sm:px-6 py-2.5 flex items-center" style={{ borderBottom: `1px solid ${HEAD_BORDER}`, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
      <a href="/" aria-label="Back to site" className="group relative z-20 inline-flex items-center gap-1.5 pl-1.5 pr-3 py-2 rounded-full transition-all active:scale-95 touch-manipulation" style={{ border: `1px solid ${HEAD_BORDER}`, color: PLUM, background: '#fff' }}>
        <span className="flex items-center justify-center w-5 h-5 rounded-full" style={{ background: '#FBF5F7' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="2.2" className="w-3 h-3"><polyline points="15 18 9 12 15 6" /></svg>
        </span>
        <span className="text-[0.58rem] font-semibold tracking-[0.12em] uppercase">Back to site</span>
      </a>
      <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[0.62rem] font-bold tracking-[0.22em] uppercase" style={{ color: PLUM }}>Makeup by Roko</p>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={pageBg}>
        <div className="text-center max-w-[320px]">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-7 h-7"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h2 className="font-serif text-xl mb-2" style={{ color: VALUE }}>Invalid Link</h2>
          <p className="text-[0.82rem] leading-[1.7]" style={{ color: PLUM_DARK }}>{error}</p>
          <p className="text-[0.75rem] mt-3" style={{ color: LABEL }}>Need help? Email <a href="mailto:roko@makeupbyroko.org" className="underline" style={{ color: PLUM }}>roko@makeupbyroko.org</a></p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={pageBg}>
        <div className="text-center">
          <p className="font-serif text-[1.7rem] font-light leading-none" style={{ color: VALUE }}>Makeup by <em className="italic" style={{ color: PLUM }}>Roko</em></p>
          <p className="mt-5 text-[0.58rem] font-semibold tracking-[0.22em] uppercase" style={{ color: LABEL }}>Loading your agreement</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col" style={pageBg}>
        {Nav}
        <div className="flex-1 flex items-center justify-center px-5 py-12">
          <div className="text-center max-w-[380px]">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" className="w-6 h-6"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase mb-1.5" style={{ color: PLUM }}>Agreement Signed</p>
            <h1 className="font-serif text-[1.9rem] font-light leading-tight" style={{ color: VALUE }}>All <em className="italic" style={{ color: PLUM }}>set!</em></h1>
            <p className="text-[0.85rem] mt-3 leading-[1.7]" style={{ color: PLUM_DARK }}>
              Thank you! Your updated agreement{booking?.time ? <> for <strong style={{ color: VALUE }}>{booking.time}</strong></> : ''} is signed. Roko will confirm once your deposit is in.
            </p>
          </div>
        </div>
        <p className="text-center text-[0.58rem] pb-6 tracking-wide" style={{ color: '#C9B8C0' }}>© {new Date().getFullYear()} Makeup by Roko</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={pageBg}>
      {Nav}
      <div className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-[640px]">
          <div className="bg-white overflow-hidden" style={{ borderRadius: 20, border: `1px solid ${CARD_BORDER}`, boxShadow: '0 22px 70px rgba(108,64,85,0.10)' }}>
            <div className="px-6 sm:px-7 pt-6 pb-4 text-center" style={{ borderBottom: `1px solid ${HEAD_BORDER}` }}>
              <p className="text-[0.58rem] font-bold tracking-[0.2em] uppercase mb-1.5" style={{ color: PLUM }}>Updated Appointment</p>
              <h1 className="font-serif text-[1.6rem] font-light leading-tight" style={{ color: VALUE }}>Review &amp; Sign Your <em className="italic" style={{ color: PLUM }}>Agreement</em></h1>
              <p className="text-[0.8rem] mt-2 leading-[1.55]" style={{ color: LABEL }}>
                {booking?.service}{booking?.time ? <> · <strong style={{ color: PLUM_DARK }}>{booking.time}</strong></> : ''} on {dateFormatted}
              </p>
            </div>
            {contract && (
              <ContractSign
                contract={contract}
                clientName={booking?.contract_signed_name || booking?.name || ''}
                submitting={submitting}
                ctaLabel="Sign Updated Agreement"
                onSign={handleSign}
              />
            )}
          </div>
          <p className="text-center text-[0.62rem] mt-4" style={{ color: LABEL }}>
            Questions? Email <a href="mailto:roko@makeupbyroko.org" className="hover:underline" style={{ color: PLUM }}>roko@makeupbyroko.org</a>
          </p>
        </div>
      </div>
      <p className="text-center text-[0.58rem] pb-6 tracking-wide" style={{ color: '#C9B8C0' }}>© {new Date().getFullYear()} Makeup by Roko</p>
    </div>
  );
}
