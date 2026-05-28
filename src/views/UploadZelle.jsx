'use client';
import { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';

function BookingSummary({ booking, dateFormatted, depositAmount, servicePrice }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3.5 border-b border-[#EDE6DF]" style={{ background: 'rgba(212,160,176,0.05)' }}>
        <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A]">Booking Summary</p>
      </div>
      <div className="divide-y divide-[#F5EFE9] flex-1">
        {booking?.name && (
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[0.75rem] text-[#9E8E84]">Client</span>
            <span className="text-[0.82rem] font-semibold text-[#2C1A14]">{booking.name}</span>
          </div>
        )}
        {booking?.service && (
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[0.75rem] text-[#9E8E84]">Service</span>
            <span className="text-[0.82rem] font-semibold text-[#2C1A14] text-right ml-4">{booking.service}</span>
          </div>
        )}
        {servicePrice && (
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[0.75rem] text-[#9E8E84]">Service Price</span>
            <span className="text-[0.82rem] font-semibold text-[#2C1A14]">{servicePrice}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-[0.75rem] text-[#9E8E84]">Date</span>
          <span className="text-[0.82rem] font-semibold text-[#2C1A14]">{dateFormatted || 'TBD'}</span>
        </div>
        {depositAmount && (
          <div className="flex items-center justify-between px-5 py-3 bg-[#FDF7F4]">
            <span className="text-[0.75rem] font-semibold text-[#A0785A]">Zelle deposit</span>
            <span className="text-[0.95rem] font-bold text-[#2C1A14]">{depositAmount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ZelleCard({ depositAmount }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3.5 border-b border-[#EDE6DF]" style={{ background: 'rgba(212,160,176,0.05)' }}>
        <p className="text-[0.58rem] font-bold tracking-[0.18em] uppercase text-[#C4849A]">Step 1 — Send Your Zelle Deposit</p>
      </div>
      <div className="px-6 py-5 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-[1.1rem] text-[#2C1A14] font-light">Ruqia Moshref</p>
            <p className="text-[0.78rem] text-[#9E8E84] mt-0.5">📞 510-491-6497</p>
          </div>
          {depositAmount && (
            <div className="text-right">
              <p className="text-[0.62rem] text-[#9E8E84] uppercase tracking-wide">Amount</p>
              <p className="text-[1.05rem] font-bold text-[#2C1A14]">{depositAmount}</p>
            </div>
          )}
        </div>
        <div className="bg-[#FDF7F4] rounded-xl px-4 py-3 border border-[#EDE6DF]">
          <p className="text-[0.73rem] text-[#6E6058] leading-[1.7]">
            Include your <strong className="text-[#2C1A14]">name</strong> + <strong className="text-[#2C1A14]">appointment date</strong> in the note when you send.
          </p>
        </div>
        <p className="text-[0.65rem] text-[#B8A8A0] text-center mt-auto">
          💵 Remaining balance due in <strong className="text-[#6E6058]">cash</strong> on appointment day
        </p>
      </div>
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
      if (bookingId) formData.append('bookingId', bookingId);
      const res = await fetch('/api/zelle-upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploaded(true);
      setBooking(b => ({ ...b, zelle_screenshot: 'uploaded', screenshot_url: data.url }));
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const dateFormatted = booking?.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF7F4' }}>
        <div className="w-7 h-7 border-4 border-[#D4A0B0]/30 border-t-[#D4A0B0] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#FAF7F4' }}>
        <div className="text-center max-w-[320px]">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-7 h-7">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 className="font-serif text-xl text-[#111] mb-2">Invalid Link</h2>
          <p className="text-[0.82rem] text-gray-500 leading-[1.7]">{error}</p>
          <p className="text-[0.75rem] text-gray-400 mt-3">Need help? Email <a href="mailto:makeupbyroko22@gmail.com" className="text-[#D4A0B0] underline">makeupbyroko22@gmail.com</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF7F4' }}>

      {/* Navbar */}
      <div className="flex-shrink-0 border-b border-[#EDE6DF] px-5 py-3.5 flex items-center justify-between" style={{ background: '#fff' }}>
        <a href="/" className="flex items-center gap-1.5 text-[0.68rem] text-[#9E8E84] hover:text-[#2C1A14] transition-colors group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to site
        </a>
        <div className="text-center">
          <p className="text-[0.62rem] font-bold tracking-[0.22em] uppercase text-[#D4A0B0]">Roqia Moshref</p>
          <p className="text-[0.5rem] tracking-[0.16em] uppercase text-gray-400 mt-0.5">Makeup Artistry</p>
        </div>
        <div className="w-[80px]" />
      </div>

      {/* ─── UPLOADED STATE ─── */}
      {uploaded && (
        <div className="flex-1 flex flex-col">
          {/* Hero */}
          <div className="py-10 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" className="w-6 h-6">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#C4849A] mb-1.5">Deposit Received</p>
            <h1 className="font-serif text-[1.9rem] lg:text-[2.4rem] font-light text-[#2C1A14] leading-tight">
              Screenshot <em className="italic text-[#C4849A]">Submitted!</em>
            </h1>
            <p className="text-[0.82rem] text-[#9E8E84] mt-2">Roko will confirm your appointment within 24–48 hours.</p>
          </div>

          {/* Desktop: 3-col | Mobile: stacked */}
          <div className="flex-1 max-w-5xl mx-auto w-full px-5 pb-10">

            {/* Desktop layout */}
            <div className="hidden lg:grid grid-cols-3 gap-5 items-stretch">
              {/* Col 1: Summary */}
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} servicePrice={servicePrice} />

              {/* Col 2: Screenshot preview */}
              {booking?.screenshot_url && (
                <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden flex flex-col">
                  <div className="px-5 py-3.5 border-b border-[#EDE6DF]" style={{ background: 'rgba(212,160,176,0.05)' }}>
                    <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A]">Your Screenshot</p>
                  </div>
                  <div className="p-4 flex items-center justify-center flex-1">
                    <img src={booking.screenshot_url} alt="Zelle screenshot" className="w-full rounded-xl object-contain max-h-[300px]" />
                  </div>
                </div>
              )}

              {/* Col 3: Next steps */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-[#EDE6DF] p-5">
                  <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A] mb-3">What's Next</p>
                  <p className="text-[0.78rem] text-[#6E6058] leading-[1.75]">
                    Roko has been notified and will reach out to confirm your appointment time within <strong className="text-[#2C1A14]">24–48 hours</strong>.
                  </p>
                  <div className="mt-3 pt-3 border-t border-[#F5EFE9]">
                    <p className="text-[0.72rem] text-[#A0785A]">💵 Remaining balance due in <strong>CASH</strong> on appointment day.</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#EDE6DF] p-5">
                  <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A] mb-2">Questions?</p>
                  <p className="text-[0.73rem] text-[#6E6058] leading-[1.7]">
                    Email <a href="mailto:makeupbyroko22@gmail.com" className="text-[#D4A0B0] hover:underline font-medium">makeupbyroko22@gmail.com</a>
                    {' '}or DM <a href="https://instagram.com/makeupbyroko_" target="_blank" rel="noreferrer" className="text-[#D4A0B0] hover:underline font-medium">@makeupbyroko_</a>
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-[#F0E0E9] px-5 py-4 text-center">
                  <p className="font-serif italic text-[#C4849A] text-[1.05rem]">With love, Roko</p>
                </div>
              </div>
            </div>

            {/* Mobile layout */}
            <div className="lg:hidden flex flex-col gap-4">
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} servicePrice={servicePrice} />

              {booking?.screenshot_url && (
                <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#EDE6DF]" style={{ background: 'rgba(212,160,176,0.05)' }}>
                    <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A]">Your Screenshot</p>
                  </div>
                  <div className="p-4">
                    <img src={booking.screenshot_url} alt="Zelle screenshot" className="w-full rounded-xl object-contain max-h-[280px]" />
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-[#EDE6DF] p-5">
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A] mb-2.5">What's Next</p>
                <p className="text-[0.78rem] text-[#6E6058] leading-[1.75]">
                  Roko will confirm within <strong className="text-[#2C1A14]">24–48 hours</strong>.
                </p>
                <div className="mt-3 pt-3 border-t border-[#F5EFE9]">
                  <p className="text-[0.72rem] text-[#A0785A]">💵 Remaining balance due in <strong>CASH</strong> on appointment day.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EDE6DF] p-5">
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A] mb-2">Questions?</p>
                <p className="text-[0.73rem] text-[#6E6058] leading-[1.7]">
                  Email <a href="mailto:makeupbyroko22@gmail.com" className="text-[#D4A0B0] hover:underline font-medium">makeupbyroko22@gmail.com</a>
                  {' '}or DM <a href="https://instagram.com/makeupbyroko_" target="_blank" rel="noreferrer" className="text-[#D4A0B0] hover:underline font-medium">@makeupbyroko_</a>
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
            <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#C4849A] mb-1.5">Zelle Deposit Upload</p>
            <h1 className="font-serif text-[1.9rem] lg:text-[2.4rem] font-light text-[#2C1A14] leading-tight">
              Secure Your <em className="italic text-[#C4849A]">Date</em>
            </h1>
            <p className="text-[0.82rem] text-[#9E8E84] mt-2">Send your deposit via Zelle, then upload your screenshot below.</p>
          </div>

          {/* Desktop: 3-col | Mobile: stacked */}
          <div className="flex-1 max-w-5xl mx-auto w-full px-5 pb-10">

            {/* Desktop layout */}
            <div className="hidden lg:grid grid-cols-3 gap-5 items-stretch">
              {/* Col 1: Zelle instructions */}
              <ZelleCard depositAmount={depositAmount} />

              {/* Col 2: Upload */}
              <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden flex flex-col">
                <div className="px-5 py-3.5 border-b border-[#EDE6DF]" style={{ background: 'rgba(212,160,176,0.05)' }}>
                  <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A]">Step 2 — Upload Screenshot</p>
                </div>
                <div className="p-5 flex flex-col gap-4 flex-1">
                  {filePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#D4A0B0]/30">
                      <img src={filePreview} alt="Preview" className="w-full object-contain max-h-[220px]" />
                      <button
                        onClick={() => { setFilePreview(null); setFileToUpload(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 px-5 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#D4A0B0] transition-colors group">
                      <div className="w-11 h-11 rounded-2xl bg-gray-50 group-hover:bg-[#D4A0B0]/8 flex items-center justify-center transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" className="w-5 h-5 group-hover:stroke-[#D4A0B0] transition-colors">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-[0.78rem] font-medium text-gray-500 group-hover:text-[#A0785A] transition-colors">Click to select your screenshot</p>
                        <p className="text-[0.62rem] text-gray-300 mt-0.5">PNG, JPG up to 10MB</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!fileToUpload || uploading}
                    className={`w-full py-3.5 rounded-xl text-[0.82rem] font-semibold tracking-[0.04em] transition-all ${
                      fileToUpload && !uploading
                        ? 'bg-[#2C1A14] text-white hover:bg-[#3d2820] shadow-[0_4px_20px_rgba(44,26,20,0.18)]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading…
                      </span>
                    ) : 'Submit Screenshot →'}
                  </button>

                  <p className="text-[0.63rem] text-center text-gray-400">
                    Trouble? Email <a href="mailto:makeupbyroko22@gmail.com" className="text-[#D4A0B0] hover:underline">makeupbyroko22@gmail.com</a>
                  </p>
                </div>
              </div>

              {/* Col 3: Booking summary */}
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} />
            </div>

            {/* Mobile layout */}
            <div className="lg:hidden flex flex-col gap-4">
              <ZelleCard depositAmount={depositAmount} />

              {/* Upload */}
              <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#EDE6DF]" style={{ background: 'rgba(212,160,176,0.05)' }}>
                  <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase text-[#C4849A]">Step 2 — Upload Screenshot</p>
                </div>
                <div className="p-5 flex flex-col gap-4 flex-1">
                  {filePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#D4A0B0]/30">
                      <img src={filePreview} alt="Preview" className="w-full object-contain max-h-[220px]" />
                      <button
                        onClick={() => { setFilePreview(null); setFileToUpload(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 px-5 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#D4A0B0] transition-colors group">
                      <div className="w-11 h-11 rounded-2xl bg-gray-50 group-hover:bg-[#D4A0B0]/8 flex items-center justify-center transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" className="w-5 h-5 group-hover:stroke-[#D4A0B0] transition-colors">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-[0.82rem] font-medium text-gray-500 group-hover:text-[#A0785A] transition-colors">Tap to select your screenshot</p>
                        <p className="text-[0.65rem] text-gray-300 mt-0.5">PNG, JPG up to 10MB</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!fileToUpload || uploading}
                    className={`w-full py-4 rounded-xl text-[0.85rem] font-semibold tracking-[0.04em] transition-all ${
                      fileToUpload && !uploading
                        ? 'bg-[#2C1A14] text-white hover:bg-[#3d2820] shadow-[0_4px_20px_rgba(44,26,20,0.18)]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading…
                      </span>
                    ) : 'Submit Screenshot →'}
                  </button>
                </div>
              </div>

              {/* Booking summary always visible on mobile */}
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositAmount} />

              <p className="text-[0.65rem] text-center text-gray-400 pb-2">
                Trouble? Email <a href="mailto:makeupbyroko22@gmail.com" className="text-[#D4A0B0] hover:underline">makeupbyroko22@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[0.58rem] text-gray-300 pb-6 tracking-wide">© {new Date().getFullYear()} Roqia Moshref Makeup Artistry</p>
    </div>
  );
}