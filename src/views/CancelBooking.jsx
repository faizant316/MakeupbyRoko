'use client';
import { useState, useEffect } from 'react';

// ── Brand palette (matches the emails + upload-zelle page) ──
const PLUM = '#C4849A';
const INK = '#16110F';
const BODY = '#5A5258';
const MUTE = '#A99FA4';
const PAGE_BG = '#F1EAED';
const CARD_BORDER = '#F0E6EC';
const SOFT = '#FBF5F8';
const DANGER = '#DC2626';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';

const isBridalService = (s) =>
  /bridal|bride|wedding|full day/i.test(s || '') && !/non-bridal/i.test(s || '');

function fmtDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return raw; }
}

function daysUntil(raw) {
  if (!raw) return null;
  const then = new Date(raw + 'T00:00:00').getTime();
  if (Number.isNaN(then)) return null;
  return Math.ceil((then - Date.now()) / (1000 * 60 * 60 * 24));
}

const PAGE_CSS = `
@keyframes cbUp { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform:none; } }
@keyframes cbSpin { to { transform: rotate(360deg); } }
.cb-card { animation: cbUp .5s cubic-bezier(.4,0,.2,1) both; }
.cb-spin { animation: cbSpin .7s linear infinite; }
@media (prefers-reduced-motion: reduce){ .cb-card{ animation:none; } }
`;

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", padding: '28px 14px 60px' }}>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div className="cb-card" style={{ maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 4px 24px rgba(140,90,110,0.10)' }}>
        <div style={{ padding: '20px 26px', borderBottom: `1px solid ${CARD_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 19, color: INK }}>Makeup by <span style={{ color: PLUM, fontStyle: 'italic' }}>Roko</span></span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: `1px solid #F4ECF1` }}>
      <span style={{ fontSize: 14, color: '#6B636A' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: INK, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function CancelBooking() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [recordType, setRecordType] = useState(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [reasonFocus, setReasonFocus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { type }

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t);
    if (!t) { setError('This link is missing its code. Please use the link from your email.'); setLoading(false); return; }
    fetch('/api/get-booking-by-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'We could not find your booking.');
        setRecord(data.booking);
        setRecordType(data.recordType);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const isClass = recordType === 'class';
  const isBridal = recordType === 'booking' && isBridalService(record?.service);
  const alreadyClosed = record && (record.status === 'cancelled');
  const alreadyRequested = isBridal && !!record?.cancel_requested_at && record?.status !== 'cancelled';

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Something went wrong. Please hit the Reply button on your confirmation email and Roko will sort it out.');
      setDone({ type: data.type });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <Shell>
        <div style={{ padding: '60px 26px', textAlign: 'center' }}>
          <div className="cb-spin" style={{ width: 30, height: 30, border: `3px solid ${CARD_BORDER}`, borderTopColor: PLUM, borderRadius: '50%', margin: '0 auto' }} />
          <p style={{ fontSize: 14, color: MUTE, marginTop: 16 }}>Loading your booking…</p>
        </div>
      </Shell>
    );
  }

  // ── Error / invalid token ──
  if (error && !record) {
    return (
      <Shell>
        <div style={{ padding: '48px 26px', textAlign: 'center' }}>
          <p style={{ fontSize: 20, color: INK, marginBottom: 8 }}>We hit a snag</p>
          <p style={{ fontSize: 14, color: BODY, lineHeight: 1.6, margin: '0 auto', maxWidth: 320 }}>{error}</p>
          <a href={SITE_URL} style={{ display: 'inline-block', marginTop: 24, fontSize: 13, fontWeight: 600, color: PLUM, textDecoration: 'none' }}>Back to makeupbyroko.org →</a>
        </div>
      </Shell>
    );
  }

  // ── Success screen ──
  if (done) {
    const bridalReq = done.type === 'bridal_request';
    return (
      <Shell>
        <div style={{ padding: '48px 26px 40px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: bridalReq ? '#FBEAD6' : '#EFE6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            {bridalReq ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="#D08A2C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26"><circle cx="12" cy="12" r="9" /><polyline points="12 7.5 12 12 15 13.5" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="26" height="26"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 400, color: INK, margin: '0 0 12px' }}>
            {bridalReq ? 'Request received' : isClass ? 'Class cancelled' : 'Appointment cancelled'}
          </h1>
          <p style={{ fontSize: 14.5, color: BODY, lineHeight: 1.65, margin: '0 auto', maxWidth: 340 }}>
            {bridalReq
              ? "Because this is a wedding booking, Roko handles every cancellation personally. Your date is still held for now, and she'll reach out within 24 hours. A confirmation is on its way to your email."
              : isClass
              ? "We've emailed you a confirmation. If you're due a refund, Roko will take care of it and let you know."
              : "We've emailed you a confirmation. There's nothing else you need to do."}
          </p>
          <a href={SITE_URL} style={{ display: 'inline-block', marginTop: 26, fontSize: 13, fontWeight: 600, color: PLUM, textDecoration: 'none' }}>Back to makeupbyroko.org →</a>
        </div>
      </Shell>
    );
  }

  // ── Already cancelled / already requested ──
  if (alreadyClosed || alreadyRequested) {
    return (
      <Shell>
        <div style={{ padding: '48px 26px 40px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: alreadyRequested ? '#FBEAD6' : '#EFE6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            {alreadyRequested ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="#D08A2C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26"><circle cx="12" cy="12" r="9" /><polyline points="12 7.5 12 12 15 13.5" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="26" height="26"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 400, color: INK, margin: '0 0 12px' }}>
            {alreadyRequested ? 'Your request is already in' : 'Already cancelled'}
          </h1>
          <p style={{ fontSize: 14, color: BODY, lineHeight: 1.6, margin: '0 auto', maxWidth: 330 }}>
            {alreadyRequested
              ? 'We already have your cancellation request. Roko will reach out to you personally. No need to do anything else.'
              : 'This booking has already been cancelled. If that was not you, hit the Reply button on your confirmation email and it comes straight to Roko.'}
          </p>
          <a href={SITE_URL} style={{ display: 'inline-block', marginTop: 24, fontSize: 13, fontWeight: 600, color: PLUM, textDecoration: 'none' }}>Back to makeupbyroko.org →</a>
        </div>
      </Shell>
    );
  }

  // ── The cancel form ──
  const name = (record?.name || '').split(' ')[0] || '';
  const dateFmt = fmtDate(record?.date);
  const dLeft = daysUntil(record?.date);

  // Policy line per flow
  let policy;
  if (isBridal) {
    policy = 'Wedding bookings are handled personally. Submitting this sends Roko a request to cancel, it does not cancel anything yet. Your date stays held until you speak with her.';
  } else if (isClass) {
    policy = dLeft == null
      ? 'Roko will process any refund you are due once your class is cancelled.'
      : dLeft >= 14
      ? "You're cancelling 14 or more days ahead, so you'll be refunded minus the card processing fee. Roko handles the refund and will email you."
      : 'Because this is within 14 days of your class, the card processing fee is non-refundable. Roko will handle any remaining refund and email you.';
  } else {
    policy = 'Your deposit is non-refundable, and cancelling releases your date. There is nothing else you need to do.';
  }

  const heading = isBridal ? 'Request to cancel' : isClass ? 'Cancel your class' : 'Cancel your appointment';
  const cta = isBridal ? 'Request to cancel' : isClass ? 'Cancel my class' : 'Cancel my appointment';
  const ctaColor = isBridal ? '#D97706' : DANGER;

  return (
    <Shell>
      <div style={{ padding: '30px 26px 34px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: PLUM, textAlign: 'center', margin: '0 0 10px' }}>
          {isBridal ? 'Bridal Booking' : isClass ? 'Makeup Class' : 'Appointment'}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 400, color: INK, textAlign: 'center', margin: '0 0 6px' }}>{heading}</h1>
        <p style={{ fontSize: 14, color: BODY, textAlign: 'center', lineHeight: 1.6, margin: '0 auto 22px', maxWidth: 340 }}>
          {name ? `Hi ${name}, ` : ''}here are your booking details. Please review before you continue.
        </p>

        {/* Booking summary */}
        <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '6px 18px 8px', marginBottom: 18 }}>
          <Row label={isClass ? 'Class' : 'Service'} value={record?.service} />
          <Row label="Date" value={dateFmt || 'To be scheduled'} />
          {record?.time ? <Row label="Time" value={record.time} /> : null}
        </div>

        {/* Policy note */}
        <div style={{ background: SOFT, borderRadius: 14, borderLeft: `3px solid ${isBridal ? '#E8C48A' : '#E8C4D0'}`, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#6B636A', lineHeight: 1.6, margin: 0 }}>{policy}</p>
        </div>

        {/* Reason */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#8a7d82', marginBottom: 8 }}>
          {isBridal ? 'REASON (helps Roko before she calls)' : 'REASON (optional)'}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onFocus={() => setReasonFocus(true)}
          onBlur={() => setReasonFocus(false)}
          rows={3}
          placeholder={isBridal ? 'e.g. Our plans have changed…' : 'Let Roko know why, if you like'}
          style={{
            width: '100%', boxSizing: 'border-box', fontSize: 14.5, lineHeight: 1.5, color: INK,
            background: '#FBF9FA', borderRadius: 14, padding: '12px 14px', resize: 'none', outline: 'none',
            border: `1px solid ${reasonFocus ? PLUM : '#ECE0E4'}`,
            boxShadow: reasonFocus ? `0 0 0 3px rgba(196,132,154,0.14)` : 'none',
            transition: 'border-color .16s, box-shadow .16s',
            fontFamily: 'inherit',
          }}
        />

        {error ? <p style={{ fontSize: 13, color: DANGER, marginTop: 12, textAlign: 'center' }}>{error}</p> : null}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <a href={SITE_URL}
            style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px 22px', fontSize: 13.5, fontWeight: 600, color: '#8a8188', border: `1px solid #EAE2E5`, borderRadius: 999, textDecoration: 'none' }}>
            Never mind
          </a>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              flex: 1, padding: '13px 22px', fontSize: 13.5, fontWeight: 700, color: '#fff',
              background: ctaColor, border: 'none', borderRadius: 999, cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1, boxShadow: `0 8px 20px ${ctaColor}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {submitting ? <><span className="cb-spin" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%' }} /> Working…</> : cta}
          </button>
        </div>
      </div>
    </Shell>
  );
}
