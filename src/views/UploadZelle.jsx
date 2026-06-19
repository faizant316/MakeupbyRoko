'use client';
import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';

// ── Brand plum palette (matches the admin BookingDetail + bridal cards) ──
const PLUM = '#C4849A';
const PLUM_DARK = '#6B4055';
const LABEL = '#A89098';
const VALUE = '#2C1A14';
const CARD_BORDER = '#E8E2DC';
const HEAD_BG = '#FBF5F7';
const HEAD_BORDER = '#F0E0E9';
const DIVIDER = '#F0E8EC';

// Tinted section-header bar with a plum icon + uppercase tracked label.
function CardHead({ icon, children }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ background: HEAD_BG, borderBottom: `1px solid ${HEAD_BORDER}` }}>
      <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
        {icon}
      </svg>
      <p className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase" style={{ color: PLUM }}>{children}</p>
    </div>
  );
}

const ICON = {
  diamond: <><path d="M6 3h12l3 6-9 12L3 9z" /><path d="M3 9h18" /><path d="M9 3 7.5 9 12 21l4.5-12L15 3" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
};

// One label / value row in the booking "spec sheet".
function SummaryRow({ label, value, highlight }) {
  if (!value) return null;
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3.5"
      style={highlight ? { background: HEAD_BG } : undefined}
    >
      <span className="text-[0.58rem] font-semibold tracking-[0.14em] uppercase flex-shrink-0" style={{ color: highlight ? PLUM : LABEL }}>{label}</span>
      <span className={`text-right ${highlight ? 'text-[1rem] font-bold' : 'text-[0.85rem] font-semibold'}`} style={{ color: VALUE }}>{value}</span>
    </div>
  );
}

function BookingSummary({ booking, dateFormatted, depositAmount, servicePrice }) {
  return (
    <div className="bg-white overflow-hidden h-full flex flex-col" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
      <CardHead icon={ICON.diamond}>Booking Summary</CardHead>
      <div className="flex-1" style={{ borderColor: DIVIDER }}>
        <div className="divide-y" style={{ borderColor: DIVIDER }}>
          <SummaryRow label="Client" value={booking?.name} />
          <SummaryRow label="Service" value={booking?.service} />
          <SummaryRow label="Service Price" value={servicePrice} />
          <SummaryRow label="Date" value={dateFormatted || 'TBD'} />
          <SummaryRow label="Zelle deposit" value={depositAmount} highlight />
        </div>
      </div>
    </div>
  );
}

function ZelleCard({ depositAmount }) {
  return (
    <div className="bg-white overflow-hidden h-full flex flex-col" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
      <CardHead icon={ICON.card}>Step 1 — Send Your Zelle Deposit</CardHead>
      <div className="px-6 py-5 flex flex-col gap-4 flex-1">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-serif text-[1.15rem] font-light" style={{ color: VALUE }}>Ruqia Moshref</p>
            <p className="text-[0.78rem] mt-0.5" style={{ color: LABEL }}>510-491-6497</p>
          </div>
          {depositAmount && (
            <div className="text-right">
              <p className="text-[0.55rem] font-semibold tracking-[0.14em] uppercase" style={{ color: LABEL }}>Amount</p>
              <p className="text-[1.1rem] font-bold mt-0.5" style={{ color: PLUM }}>{depositAmount}</p>
            </div>
          )}
        </div>
        {/* Deep-plum note box (matches admin "Makeup Vision" / Notes styling) */}
        <div className="px-4 py-3" style={{ borderRadius: 6, background: HEAD_BG, borderLeft: `2px solid ${PLUM}` }}>
          <p className="text-[0.75rem] leading-[1.7]" style={{ color: PLUM_DARK }}>
            Include your <strong style={{ color: VALUE }}>name</strong> + <strong style={{ color: VALUE }}>appointment date</strong> in the note when you send.
          </p>
        </div>
        <p className="text-[0.65rem] text-center mt-auto pt-1" style={{ color: LABEL }}>
          Remaining balance due in <strong style={{ color: PLUM_DARK }}>cash</strong> on appointment day
        </p>
      </div>
    </div>
  );
}

// Reusable upload card body (dropzone + submit) — same markup on desktop & mobile.
function UploadBody({ filePreview, setFilePreview, fileToUpload, setFileToUpload, uploading, handleFileChange, handleUpload, ctaLabel }) {
  return (
    <div className="p-5 flex flex-col gap-4 flex-1">
      {filePreview ? (
        <div className="relative overflow-hidden" style={{ borderRadius: 10, border: `1px solid ${HEAD_BORDER}` }}>
          <img src={filePreview} alt="Preview" className="w-full object-contain max-h-[220px]" />
          <button
            onClick={() => { setFilePreview(null); setFileToUpload(null); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      ) : (
        <label
          className="flex flex-col items-center gap-3 px-5 py-8 cursor-pointer transition-all group"
          style={{ borderRadius: 10, border: `1.5px dashed ${HEAD_BORDER}`, background: '#FEFCFD' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors" style={{ background: HEAD_BG }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.5" className="w-5 h-5">{ICON.upload}</svg>
          </div>
          <div className="text-center">
            <p className="text-[0.8rem] font-semibold" style={{ color: PLUM_DARK }}>{ctaLabel}</p>
            <p className="text-[0.62rem] mt-1" style={{ color: LABEL }}>PNG, JPG up to 10MB</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      )}

      <button
        onClick={handleUpload}
        disabled={!fileToUpload || uploading}
        className="w-full py-4 text-[0.82rem] font-semibold tracking-[0.04em] transition-all"
        style={fileToUpload && !uploading
          ? { borderRadius: 10, background: '#111111', color: '#fff', boxShadow: '0 6px 22px rgba(196,132,154,0.28)' }
          : { borderRadius: 10, background: '#F4ECF0', color: '#C9B3BE', cursor: 'not-allowed' }
        }
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Uploading…
          </span>
        ) : 'Submit Screenshot →'}
      </button>
    </div>
  );
}

export default function UploadZelle() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const bookingId = params.get('id');
  const token = params.get('token');
  const depositAmount = params.get('deposit') || null;
  const servicePrice = params.get('price') || null;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);

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
        if (res.booking.zelle_screenshot) setUploaded(true);
      })
      .catch(() => setError('This link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [bookingId, token]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToUpload(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFilePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileToUpload) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('token', token);
      const res = await fetch('/api/zelle-upload', { method: 'POST', body: formData });
      // Read as text first so a non-JSON response (e.g. an HTML error/auth page)
      // doesn't throw before we can surface a useful message.
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* response was not JSON */ }
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      setUploaded(true);
      setBooking(b => ({ ...b, zelle_screenshot: 'uploaded', screenshot_url: data.url }));
    } catch (err) {
      alert(err?.message ? `Upload failed: ${err.message}` : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const dateFormatted = booking?.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  const pageBg = { background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF6F8 100%)' };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageBg}>
        <div className="w-7 h-7 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(196,132,154,0.25)', borderTopColor: PLUM }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={pageBg}>
        <div className="text-center max-w-[320px]">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-7 h-7">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="font-serif text-xl mb-2" style={{ color: VALUE }}>Invalid Link</h2>
          <p className="text-[0.82rem] leading-[1.7]" style={{ color: PLUM_DARK }}>{error}</p>
          <p className="text-[0.75rem] mt-3" style={{ color: LABEL }}>Need help? Email <a href="mailto:makeupbyroko22@gmail.com" className="underline" style={{ color: PLUM }}>makeupbyroko22@gmail.com</a></p>
        </div>
      </div>
    );
  }

  const uploadProps = { filePreview, setFilePreview, fileToUpload, setFileToUpload, uploading, handleFileChange, handleUpload };

  return (
    <div className="min-h-screen flex flex-col" style={pageBg}>

      {/* Navbar */}
      <div className="relative flex-shrink-0 px-4 sm:px-6 py-3 flex items-center" style={{ borderBottom: `1px solid ${HEAD_BORDER}`, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
        <a
          href="/"
          className="group relative z-10 inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full transition-all touch-manipulation"
          style={{ border: `1px solid ${HEAD_BORDER}`, color: PLUM, background: '#fff' }}
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full transition-colors" style={{ background: HEAD_BG }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="2.2" className="w-3 h-3"><polyline points="15 18 9 12 15 6" /></svg>
          </span>
          <span className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase">Back to site</span>
        </a>
        <p className="absolute left-1/2 -translate-x-1/2 text-[0.62rem] font-bold tracking-[0.22em] uppercase" style={{ color: PLUM }}>Makeup by Roko</p>
      </div>

      {/* ─── UPLOADED STATE ─── */}
      {uploaded && (
        <div className="flex-1 flex flex-col">
          {/* Hero */}
          <div className="py-10 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" className="w-6 h-6">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase mb-1.5" style={{ color: PLUM }}>Deposit Received</p>
            <h1 className="font-serif text-[1.9rem] lg:text-[2.4rem] font-light leading-tight" style={{ color: VALUE }}>
              Screenshot <em className="italic" style={{ color: PLUM }}>Submitted!</em>
            </h1>
            <p className="text-[0.82rem] mt-2" style={{ color: LABEL }}>Roko will confirm your appointment within 24–48 hours.</p>
          </div>

          {/* Desktop: 3-col | Mobile: stacked */}
          <div className="flex-1 max-w-5xl mx-auto w-full px-5 pb-10">

            {/* Desktop layout */}
            <div className="hidden lg:grid grid-cols-3 gap-5 items-stretch">
              {/* Col 1: Summary */}
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} servicePrice={servicePrice} />

              {/* Col 2: Screenshot preview */}
              {booking?.screenshot_url && (
                <div className="bg-white overflow-hidden flex flex-col" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                  <CardHead icon={ICON.upload}>Your Screenshot</CardHead>
                  <div className="p-4 flex items-center justify-center flex-1">
                    <img src={booking.screenshot_url} alt="Zelle screenshot" className="w-full rounded-xl object-contain max-h-[300px]" />
                  </div>
                </div>
              )}

              {/* Col 3: Next steps */}
              <div className="flex flex-col gap-4">
                <div className="bg-white p-5" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                  <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: PLUM }}>What's Next</p>
                  <p className="text-[0.78rem] leading-[1.75]" style={{ color: PLUM_DARK }}>
                    Roko has been notified and will reach out to confirm your appointment time within <strong style={{ color: VALUE }}>24–48 hours</strong>.
                  </p>
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DIVIDER}` }}>
                    <p className="text-[0.72rem]" style={{ color: LABEL }}>Remaining balance due in <strong style={{ color: PLUM_DARK }}>cash</strong> on appointment day.</p>
                  </div>
                </div>
                <div className="bg-white p-5" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                  <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: PLUM }}>Questions?</p>
                  <p className="text-[0.73rem] leading-[1.7]" style={{ color: PLUM_DARK }}>
                    Email <a href="mailto:makeupbyroko22@gmail.com" className="hover:underline font-medium" style={{ color: PLUM }}>makeupbyroko22@gmail.com</a>
                    {' '}or DM <a href="https://instagram.com/makeupbyroko_" target="_blank" rel="noreferrer" className="hover:underline font-medium" style={{ color: PLUM }}>@makeupbyroko_</a>
                  </p>
                </div>
                <div className="px-5 py-4 text-center" style={{ borderRadius: 12, background: HEAD_BG, border: `1px solid ${HEAD_BORDER}` }}>
                  <p className="font-serif italic text-[1.05rem]" style={{ color: PLUM }}>With love, Roko</p>
                </div>
              </div>
            </div>

            {/* Mobile layout */}
            <div className="lg:hidden flex flex-col gap-4">
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} servicePrice={servicePrice} />

              {booking?.screenshot_url && (
                <div className="bg-white overflow-hidden" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                  <CardHead icon={ICON.upload}>Your Screenshot</CardHead>
                  <div className="p-4">
                    <img src={booking.screenshot_url} alt="Zelle screenshot" className="w-full rounded-xl object-contain max-h-[280px]" />
                  </div>
                </div>
              )}

              <div className="bg-white p-5" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase mb-2.5" style={{ color: PLUM }}>What's Next</p>
                <p className="text-[0.78rem] leading-[1.75]" style={{ color: PLUM_DARK }}>
                  Roko will confirm within <strong style={{ color: VALUE }}>24–48 hours</strong>.
                </p>
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DIVIDER}` }}>
                  <p className="text-[0.72rem]" style={{ color: LABEL }}>Remaining balance due in <strong style={{ color: PLUM_DARK }}>cash</strong> on appointment day.</p>
                </div>
              </div>

              <div className="bg-white p-5" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: PLUM }}>Questions?</p>
                <p className="text-[0.73rem] leading-[1.7]" style={{ color: PLUM_DARK }}>
                  Email <a href="mailto:makeupbyroko22@gmail.com" className="hover:underline font-medium" style={{ color: PLUM }}>makeupbyroko22@gmail.com</a>
                  {' '}or DM <a href="https://instagram.com/makeupbyroko_" target="_blank" rel="noreferrer" className="hover:underline font-medium" style={{ color: PLUM }}>@makeupbyroko_</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── UPLOAD STATE ─── */}
      {!uploaded && (
        <div className="flex-1 flex flex-col">
          {/* Hero */}
          <div className="py-10 px-5 text-center">
            <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase mb-1.5" style={{ color: PLUM }}>Zelle Deposit Upload</p>
            <h1 className="font-serif text-[1.9rem] lg:text-[2.4rem] font-light leading-tight" style={{ color: VALUE }}>
              Secure Your <em className="italic" style={{ color: PLUM }}>Date</em>
            </h1>
            <p className="text-[0.82rem] mt-2" style={{ color: LABEL }}>Send your deposit via Zelle, then upload your screenshot below.</p>
          </div>

          {/* Desktop: 3-col | Mobile: stacked */}
          <div className="flex-1 max-w-5xl mx-auto w-full px-5 pb-10">

            {/* Desktop layout */}
            <div className="hidden lg:grid grid-cols-3 gap-5 items-stretch">
              {/* Col 1: Zelle instructions */}
              <ZelleCard depositAmount={depositAmount} />

              {/* Col 2: Upload */}
              <div className="bg-white overflow-hidden flex flex-col" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                <CardHead icon={ICON.upload}>Step 2 — Upload Screenshot</CardHead>
                <UploadBody {...uploadProps} ctaLabel="Click to select your screenshot" />
                <p className="text-[0.63rem] text-center px-5 pb-5 -mt-1" style={{ color: LABEL }}>
                  Trouble? Email <a href="mailto:makeupbyroko22@gmail.com" className="hover:underline" style={{ color: PLUM }}>makeupbyroko22@gmail.com</a>
                </p>
              </div>

              {/* Col 3: Booking summary */}
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} />
            </div>

            {/* Mobile layout */}
            <div className="lg:hidden flex flex-col gap-4">
              <ZelleCard depositAmount={depositAmount} />

              {/* Upload */}
              <div className="bg-white overflow-hidden" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                <CardHead icon={ICON.upload}>Step 2 — Upload Screenshot</CardHead>
                <UploadBody {...uploadProps} ctaLabel="Tap to select your screenshot" />
              </div>

              {/* Booking summary always visible on mobile */}
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} />

              <p className="text-[0.65rem] text-center pb-2" style={{ color: LABEL }}>
                Trouble? Email <a href="mailto:makeupbyroko22@gmail.com" className="hover:underline" style={{ color: PLUM }}>makeupbyroko22@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[0.58rem] pb-6 tracking-wide" style={{ color: '#C9B8C0' }}>© {new Date().getFullYear()} Makeup by Roko</p>
    </div>
  );
}
