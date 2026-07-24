'use client';
import { useState, useEffect } from 'react';
import { compressImage } from '@/lib/compressImage';

// ── Brand plum palette (matches the admin BookingDetail + bridal cards) ──
const PLUM = '#C4849A';
const PLUM_DARK = '#6B4055';
const LABEL = '#A89098';
const VALUE = '#2C1A14';
const CARD_BORDER = '#E8E2DC';
const HEAD_BG = '#FBF5F7';
const HEAD_BORDER = '#F0E0E9';
const DIVIDER = '#F0E8EC';
const INK = '#111111';

const ICON = {
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  sparkle: <path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" />,
  arrow: <polyline points="9 18 15 12 9 6" />,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
};

// Keyframes + helpers scoped to this page (kept in-component so the change
// stays self-contained — no shared CSS file edits).
const PAGE_CSS = `
/* Stop in-app browsers (Google app, some webviews) from auto-inflating text,
   which was widening the booking-summary values until they clipped. */
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
@keyframes uzFadeUp { from { opacity:0; transform: translateY(16px) scale(.985); } to { opacity:1; transform:none; } }
@keyframes uzInRight { from { opacity:0; transform: translateX(22px); } to { opacity:1; transform:none; } }
@keyframes uzInLeft { from { opacity:0; transform: translateX(-22px); } to { opacity:1; transform:none; } }
@keyframes uzBar { 0% { transform: translateX(-120%); } 100% { transform: translateX(260%); } }
@keyframes uzPop { 0% { transform: scale(.5); opacity:0; } 65% { transform: scale(1.12); } 100% { transform: scale(1); opacity:1; } }
@keyframes uzRise { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:none; } }
@keyframes uzSpin { to { transform: rotate(360deg); } }
.uz-card { animation: uzFadeUp .6s cubic-bezier(.4,0,.2,1) both; }
.uz-in-right { animation: uzInRight .42s cubic-bezier(.4,0,.2,1) both; }
.uz-in-left { animation: uzInLeft .42s cubic-bezier(.4,0,.2,1) both; }
.uz-rise { animation: uzRise .55s cubic-bezier(.4,0,.2,1) both; }
.uz-pop { animation: uzPop .5s cubic-bezier(.34,1.56,.64,1) both; }
.uz-bar { animation: uzBar 1.05s cubic-bezier(.4,0,.2,1) infinite; }
.uz-spin { animation: uzSpin .7s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .uz-card, .uz-in-right, .uz-in-left, .uz-rise, .uz-pop, .uz-bar { animation: none !important; }
}
`;

function Style() {
  return <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />;
}

// Tinted section-header bar with a plum icon + uppercase tracked label.
function CardHead({ icon, children }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ background: HEAD_BG, borderBottom: `1px solid ${HEAD_BORDER}` }}>
      {icon && (
        <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
          {icon}
        </svg>
      )}
      <p className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase" style={{ color: PLUM }}>{children}</p>
    </div>
  );
}

// One label / value row in the booking "spec sheet".
// The value column is min-w-0 + break-words so a long value (a service name,
// the Zelle email, a wrapped balance note) wraps cleanly instead of overflowing
// and getting clipped by the card's overflow-hidden — which is what was
// happening in Roko's in-app (Google) browser.
function SummaryRow({ label, value, caption, highlight }) {
  if (!value) return null;
  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-3.5"
      style={highlight ? { background: HEAD_BG } : undefined}
    >
      <span className="text-[0.58rem] font-semibold tracking-[0.14em] uppercase flex-shrink-0" style={{ color: highlight ? PLUM : LABEL }}>{label}</span>
      <span className="min-w-0 text-right">
        <span className={`block break-words leading-snug ${highlight ? 'text-[1rem] font-bold' : 'text-[0.85rem] font-semibold'}`} style={{ color: VALUE }}>{value}</span>
        {caption && <span className="block text-[0.6rem] font-medium mt-0.5" style={{ color: LABEL }}>{caption}</span>}
      </span>
    </div>
  );
}

// Compact tap-to-copy pill (with a plain-JS fallback for browsers that block
// navigator.clipboard). Flips to "Copied" for a beat. Sits next to the Zelle
// email so a client grabs it in one tap instead of retyping it.
function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — the value is still on screen to copy by hand */ }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.62rem] font-bold uppercase tracking-wide touch-manipulation transition-all active:scale-95"
      style={{ background: copied ? '#EAF6EE' : HEAD_BG, color: copied ? '#3F9D5B' : PLUM, WebkitTapHighlightColor: 'transparent' }}
      aria-label="Copy email address"
    >
      {copied ? (
        <><svg viewBox="0 0 24 24" fill="none" stroke="#3F9D5B" strokeWidth="2.6" className="w-3 h-3">{ICON.check}</svg>Copied</>
      ) : (
        <><svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.8" className="w-3 h-3">{ICON.copy}</svg>Copy</>
      )}
    </button>
  );
}

// One numbered line in the on-site "How to send your deposit" list.
function HowStep({ n, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.62rem] font-bold" style={{ background: HEAD_BG, color: PLUM }}>{n}</span>
      <span className="text-[0.76rem] leading-[1.55]" style={{ color: PLUM_DARK }}>{children}</span>
    </li>
  );
}

function BookingSummary({ booking, dateFormatted, depositAmount, servicePrice, remaining }) {
  return (
    <div className="bg-white overflow-hidden h-full flex flex-col" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
      <CardHead>Booking Summary</CardHead>
      <div className="flex-1" style={{ borderColor: DIVIDER }}>
        <div className="divide-y" style={{ borderColor: DIVIDER }}>
          <SummaryRow label="Client" value={booking?.name} />
          <SummaryRow label="Service" value={booking?.service} />
          <SummaryRow label="Service Price" value={servicePrice} />
          <SummaryRow label="Date" value={dateFormatted || 'TBD'} />
          <SummaryRow label="Zelle deposit" value={depositAmount} highlight />
        </div>
      </div>
      {/* Remaining balance — its own clean footer band so it reads as the bottom
          line. Show the exact dollar figure whenever the link carries one (package
          price − deposit); otherwise a tidy "cash on the day" chip. Either way the
          caption keeps it honest: paid in cash on the appointment day. */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white" style={{ borderTop: `1px solid ${DIVIDER}` }}>
        <div className="min-w-0">
          <p className="text-[0.58rem] font-semibold tracking-[0.14em] uppercase" style={{ color: PLUM }}>Remaining Balance</p>
          <p className="text-[0.62rem] font-medium mt-1" style={{ color: LABEL }}>Due in cash on the day</p>
        </div>
        {remaining
          ? <span className="flex-shrink-0 text-[1.4rem] font-bold leading-none whitespace-nowrap" style={{ color: VALUE }}>{remaining}</span>
          : <span className="flex-shrink-0 text-[0.78rem] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: HEAD_BG, border: `1px solid ${HEAD_BORDER}`, color: PLUM_DARK }}>Cash on the day</span>}
      </div>
    </div>
  );
}

// Progress dots in the card footer — active dot stretches into a plum pill.
function Dots({ count, active, onJump }) {
  if (count < 2) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === active;
        const reached = i <= active;
        return (
          <button
            key={i}
            type="button"
            onClick={() => reached && onJump?.(i)}
            aria-label={`Step ${i + 1}`}
            className="transition-all duration-300 touch-manipulation"
            style={{
              height: 7,
              width: isActive ? 24 : 7,
              borderRadius: 99,
              background: isActive ? PLUM : '#EAD7E0',
              cursor: reached && !isActive ? 'pointer' : 'default',
            }}
          />
        );
      })}
    </div>
  );
}

// Which section a photo belongs to. The category is baked into the storage path
// by /api/upload-client-photos (client/<id>/<category>/…), so a flat URL array
// still groups cleanly. Check "without" first — "/without/" contains "with".
function photoCategory(url) {
  const u = String(url || '');
  if (/\/without\//.test(u)) return 'without';
  if (/\/with\//.test(u)) return 'with';
  return 'extra';
}

// One labeled photo section on the success card — mirrors the upload screen's
// two-zone layout (Without makeup / With makeup) so the confirmation shows the
// photos organized exactly the way the client added them, on mobile and desktop.
function PhotoGroupView({ icon, title, items }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.6" className="w-3.5 h-3.5 flex-shrink-0">{icon}</svg>
        <p className="text-[0.68rem] font-bold tracking-[0.1em] uppercase" style={{ color: PLUM_DARK }}>{title}</p>
        <span className="ml-auto text-[0.56rem] font-bold tracking-[0.08em] uppercase" style={{ color: LABEL }}>{items.length} photo{items.length > 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((url, i) => (
          <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ border: `1px solid ${HEAD_BORDER}` }}>
            <img src={url} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Bridal clients attach their with/without makeup + inspiration photos here
// (return-visit, post-submit). Uploads land on the booking's reference_photos.
function ClientPhotosCard({ token, booking, setBooking }) {
  const photos = booking?.reference_photos || [];
  const withoutPhotos = photos.filter(u => photoCategory(u) === 'without');
  const withPhotos = photos.filter(u => photoCategory(u) === 'with');
  const extraPhotos = photos.filter(u => photoCategory(u) === 'extra');
  const [uploading, setUploading] = useState(false);

  const handlePick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    // Upload one photo per request so we stay under Vercel's ~4.5MB body
    // limit — a single multi-file request with a few phone photos blows past
    // it and fails silently. A single failed file won't lose the others.
    let failed = 0;
    try {
      for (const f of files.slice(0, 20)) {
        try {
          const compressed = await compressImage(f);
          const formData = new FormData();
          formData.append('file', compressed);
          formData.append('token', token);
          formData.append('category', 'extra');
          const res = await fetch('/api/upload-client-photos', { method: 'POST', body: formData });
          const raw = await res.text();
          let data = {};
          try { data = raw ? JSON.parse(raw) : {}; } catch { /* not JSON */ }
          if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
          setBooking(b => ({ ...b, reference_photos: data.reference_photos || [...(b?.reference_photos || []), ...(data.urls || [])] }));
        } catch {
          failed += 1;
        }
      }
      if (failed) alert(`${failed} photo${failed > 1 ? 's' : ''} could not be uploaded. Please try those again.`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white overflow-hidden" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
      <CardHead icon={ICON.upload}>Your Photos (With &amp; Without Makeup)</CardHead>
      <div className="p-5 flex flex-col gap-4">
        <p className="text-[0.78rem] leading-[1.7]" style={{ color: PLUM_DARK }}>
          Upload a few recent photos of yourself <strong style={{ color: VALUE }}>with makeup</strong> and <strong style={{ color: VALUE }}>without makeup</strong> so Roko can prep for your consultation. Inspiration photos are welcome too.
        </p>

        {photos.length > 0 && (
          <div className="flex flex-col gap-4">
            <PhotoGroupView icon={ICON.camera} title="Without makeup" items={withoutPhotos} />
            <PhotoGroupView icon={ICON.sparkle} title="With makeup" items={withPhotos} />
            <PhotoGroupView icon={ICON.image} title="More photos" items={extraPhotos} />
          </div>
        )}

        <label
          className="flex flex-col items-center gap-3 px-5 py-7 cursor-pointer transition-all"
          style={{ borderRadius: 10, border: `1.5px dashed ${HEAD_BORDER}`, background: '#FEFCFD', ...(uploading ? { opacity: 0.6, pointerEvents: 'none' } : {}) }}
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: HEAD_BG }}>
            {uploading
              ? <div className="w-5 h-5 border-2 rounded-full uz-spin" style={{ borderColor: 'rgba(196,132,154,0.3)', borderTopColor: PLUM }} />
              : <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.5" className="w-5 h-5">{ICON.upload}</svg>}
          </div>
          <div className="text-center">
            <p className="text-[0.8rem] font-semibold" style={{ color: PLUM_DARK }}>{uploading ? 'Uploading…' : (photos.length ? 'Add more photos' : 'Tap to add your photos')}</p>
            <p className="text-[0.62rem] mt-1" style={{ color: LABEL }}>PNG, JPG. Select multiple if you like.</p>
          </div>
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handlePick} />
        </label>
      </div>
    </div>
  );
}

// A square multi-photo zone (with thumbnails + remove) used on the photos step.
function PhotoZone({ icon, title, hint, items, onAdd, onRemove, disabled }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.6" className="w-3.5 h-3.5 flex-shrink-0">{icon}</svg>
        <p className="text-[0.68rem] font-bold tracking-[0.1em] uppercase" style={{ color: PLUM_DARK }}>{title}</p>
        {items.length > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[0.56rem] font-bold tracking-[0.08em] uppercase" style={{ color: '#3FA66A' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3FA66A" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12" /></svg>
            {items.length} added
          </span>
        ) : (
          <span className="ml-auto text-[0.5rem] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded" style={{ color: PLUM, background: HEAD_BG, border: `1px solid ${HEAD_BORDER}` }}>Required</span>
        )}
      </div>
      <p className="text-[0.72rem] leading-[1.55] mb-2.5" style={{ color: LABEL }}>{hint}</p>
      <div className="grid grid-cols-4 gap-2">
        {items.map((it, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden uz-pop" style={{ border: `1px solid ${HEAD_BORDER}` }}>
            <img src={it.preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 flex items-center justify-center text-white"
              aria-label="Remove photo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ))}
        <label
          className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
          style={{ border: `1.5px dashed ${HEAD_BORDER}`, background: '#FEFCFD', ...(disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}) }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.8" className="w-4 h-4">{ICON.plus}</svg>
          <span className="text-[0.55rem] font-semibold tracking-wide" style={{ color: PLUM }}>Add</span>
          <input type="file" accept="image/*" multiple className="hidden" disabled={disabled} onChange={onAdd} />
        </label>
      </div>
    </div>
  );
}

export default function UploadZelle() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const bookingId = params.get('id');
  const token = params.get('token');
  const depositAmount = params.get('deposit') || null;
  // Links may pass the deposit as "$375 deposit"; show just the amount in the hero.
  const depositDisplay = depositAmount ? depositAmount.replace(/\s*deposit\s*$/i, '').trim() : null;
  const servicePrice = params.get('price') || null;
  // Exact remaining balance, computed at link-build time only when it's truthful
  // (no travel fee / early-arrival surcharge). Absent → the summary falls back to
  // "due in cash on the day".
  const remaining = (params.get('remaining') || '').trim() || null;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('fwd');
  const [submitting, setSubmitting] = useState(false);

  // Deferred uploads — held in state, committed together on final submit.
  const [zelleFile, setZelleFile] = useState(null);
  const [zellePreview, setZellePreview] = useState(null);
  const [withoutItems, setWithoutItems] = useState([]); // [{ file, preview }]
  const [withItems, setWithItems] = useState([]);

  // Load the booking behind this upload link. Wrapped so a flaky or slow
  // connection can never leave the page stuck on the loader forever: the
  // request is aborted after 15s and surfaced as a *retryable* error instead of
  // an infinite spinner. `reloadKey` lets the "Try again" button re-run it, and
  // `ignore` drops any late response from a superseded attempt.
  useEffect(() => {
    if (!bookingId || !token) {
      setError('This link is missing its booking details. Please open the link straight from your confirmation email.');
      setLoading(false);
      return;
    }
    let ignore = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    setLoading(true);
    setError(null);
    fetch('/api/get-booking-by-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, booking_id: bookingId }),
      signal: ctrl.signal,
    })
      .then(async r => {
        const res = await r.json().catch(() => ({}));
        if (!r.ok || res.error) throw new Error(res.error || `HTTP ${r.status}`);
        return res;
      })
      .then(res => {
        if (ignore) return;
        setBooking(res.booking);
        if (res.booking?.zelle_screenshot) setUploaded(true);
        setLoading(false);
      })
      .catch(err => {
        if (ignore) return;
        // A real "not found / invalid token" comes back as a server error;
        // an abort, an offline device, or a 5xx is a connection hiccup the
        // client can simply retry.
        const offlineish = err?.name === 'AbortError' || /Failed to fetch|NetworkError|HTTP 5\d\d/i.test(err?.message || '');
        setError(offlineish
          ? "We couldn't reach the server. Check your connection and tap Try again."
          : 'This link is invalid or has expired.');
        setLoading(false);
      })
      .finally(() => clearTimeout(timer));
    return () => { ignore = true; clearTimeout(timer); ctrl.abort(); };
  }, [bookingId, token, reloadKey]);

  const dateFormatted = booking?.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  // Only the bridal upload link (built with bridal=1) collects with/without
  // makeup photos. Every other service is a deposit-only, single-step upload —
  // so detection is driven purely by the link flag, never the service name.
  const isBridal = params.get('bridal') === '1';
  const steps = isBridal ? ['deposit', 'photos'] : ['deposit'];
  const isLast = step === steps.length - 1;
  // Bridal requires at least one photo in each category before submitting.
  const photosComplete = withoutItems.length > 0 && withItems.length > 0;

  const pageBg = { background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF6F8 100%)' };

  // ── File handlers (deferred — nothing uploads until final submit) ──
  const pickZelle = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (zellePreview) URL.revokeObjectURL(zellePreview);
    setZelleFile(f);
    setZellePreview(URL.createObjectURL(f));
    e.target.value = '';
  };
  const clearZelle = () => {
    if (zellePreview) URL.revokeObjectURL(zellePreview);
    setZelleFile(null);
    setZellePreview(null);
  };
  const addPhotos = (setter) => (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setter(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    e.target.value = '';
  };
  const removePhoto = (setter) => (i) => {
    setter(prev => {
      const it = prev[i];
      if (it) URL.revokeObjectURL(it.preview);
      return prev.filter((_, x) => x !== i);
    });
  };

  const goNext = () => { setDir('fwd'); setStep(s => Math.min(s + 1, steps.length - 1)); };
  const goBack = () => { setDir('back'); setStep(s => Math.max(s - 1, 0)); };
  const jumpTo = (i) => { if (i === step) return; setDir(i > step ? 'fwd' : 'back'); setStep(i); };

  const handleSubmitAll = async () => {
    if (!zelleFile || submitting) return;
    setSubmitting(true);
    try {
      // 1) Deposit screenshot — the critical, required upload. This is the ONLY
      // thing the client waits on, so the confirmation appears in seconds
      // instead of after every photo has finished.
      const shot = await compressImage(zelleFile);
      const fd = new FormData();
      fd.append('file', shot);
      fd.append('token', token);
      const res = await fetch('/api/zelle-upload', { method: 'POST', body: fd });
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* not JSON */ }
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);

      // Deposit is saved — reveal the success screen right away. The bridal
      // photos then upload in the background and pop onto the card as they land,
      // so the client is never stuck on a spinner while several phone photos
      // compress and upload (which was taking ~a minute on mobile).
      setBooking(b => ({ ...b, zelle_screenshot: 'uploaded', screenshot_url: data.url }));
      setUploaded(true);
      setSubmitting(false);

      // 2) Bridal photos — encouraged, but never block a saved deposit.
      // Upload ONE photo per request. A single multi-file request easily
      // exceeds Vercel's ~4.5MB serverless body limit (just a few phone
      // photos is enough), and the platform rejects it before our route even
      // runs. Sequentially (not in parallel) because the route appends to
      // reference_photos with a read-modify-write — concurrent writes would
      // clobber each other and drop photos.
      const groups = isBridal ? [['without', withoutItems], ['with', withItems]] : [];
      const tagged = groups.flatMap(([category, items]) => items.map(it => ({ it, category })));
      if (tagged.length) {
        let photoError = null;
        for (const { it, category } of tagged) {
          try {
            const compressed = await compressImage(it.file);
            const pf = new FormData();
            pf.append('file', compressed);
            pf.append('token', token);
            pf.append('category', category);
            const pres = await fetch('/api/upload-client-photos', { method: 'POST', body: pf });
            const praw = await pres.text();
            let pdata = {};
            try { pdata = praw ? JSON.parse(praw) : {}; } catch { /* not JSON */ }
            if (!pres.ok) throw new Error(pdata.error || `Photo upload failed (${pres.status})`);
            // Merge progressively so each photo appears on the success card as
            // soon as it finishes uploading.
            setBooking(b => ({ ...b, reference_photos: pdata.reference_photos || [...(b?.reference_photos || []), ...(pdata.urls || [])] }));
          } catch (e) {
            photoError = e;
          }
        }
        if (photoError) {
          setTimeout(() => alert('Your deposit was received! We had trouble uploading your photos. You can reopen this link any time to add them.'), 60);
        }
      }
    } catch (err) {
      alert(err?.message ? `Upload failed: ${err.message}` : 'Upload failed. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Branded loader / intro ──
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={pageBg}>
        <Style />
        <div className="text-center max-w-[320px] uz-rise">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-7 h-7">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="font-serif text-xl mb-2" style={{ color: VALUE }}>Something went wrong</h2>
          <p className="text-[0.82rem] leading-[1.7]" style={{ color: PLUM_DARK }}>{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setLoading(true); setReloadKey(k => k + 1); }}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 text-[0.8rem] font-semibold touch-manipulation transition-all active:scale-95"
            style={{ borderRadius: 12, background: INK, color: '#fff', boxShadow: '0 8px 26px rgba(196,132,154,0.3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" className="w-4 h-4"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            Try again
          </button>
          <p className="text-[0.75rem] mt-4" style={{ color: LABEL }}>Still stuck? Email <a href="mailto:roko@makeupbyroko.org" className="underline" style={{ color: PLUM }}>roko@makeupbyroko.org</a></p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={pageBg}>
        <Style />
        <div className="text-center uz-rise">
          <p className="font-serif text-[1.7rem] font-light leading-none" style={{ color: VALUE }}>
            Makeup by <em className="italic" style={{ color: PLUM }}>Roko</em>
          </p>
          <div className="mt-4 h-[3px] w-32 mx-auto rounded-full overflow-hidden" style={{ background: '#F1E2EA' }}>
            <div className="h-full w-1/3 rounded-full uz-bar" style={{ background: PLUM }} />
          </div>
          <p className="mt-5 text-[0.58rem] font-semibold tracking-[0.22em] uppercase" style={{ color: LABEL }}>Preparing your secure upload</p>
        </div>
      </div>
    );
  }

  // ── Shared chrome (nav + footer) ──
  const Nav = (
    <div className="relative flex-shrink-0 px-4 sm:px-6 py-2.5 flex items-center" style={{ borderBottom: `1px solid ${HEAD_BORDER}`, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
      {/* Anchor sits above the centered title (z-20) and the title ignores pointer
          events, so a single tap always lands on the pill (not the brand text).
          Comfortable 40px tap target + a shorter "Back" label on mobile so it
          never crowds the centered brand on a narrow phone. */}
      <a
        href="/"
        aria-label="Back to site"
        className="group relative z-20 inline-flex items-center gap-1.5 pl-1.5 pr-3 rounded-full transition-all active:scale-95 touch-manipulation select-none"
        style={{ minHeight: 40, border: `1px solid ${HEAD_BORDER}`, color: PLUM, background: '#fff', WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full transition-colors" style={{ background: HEAD_BG }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="2.2" className="w-3 h-3"><polyline points="15 18 9 12 15 6" /></svg>
        </span>
        <span className="text-[0.58rem] font-semibold tracking-[0.12em] uppercase whitespace-nowrap">Back<span className="hidden sm:inline"> to site</span></span>
      </a>
      <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[0.62rem] font-bold tracking-[0.22em] uppercase whitespace-nowrap" style={{ color: PLUM }}>Makeup by Roko</p>
    </div>
  );

  // ── SUCCESS STATE (post-submit + return visits) ──
  if (uploaded) {
    return (
      <div className="min-h-screen flex flex-col" style={pageBg}>
        <Style />
        {Nav}
        <div className="flex-1 flex flex-col">
          {/* Hero */}
          <div className="py-10 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4 uz-pop">
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

          <div className="flex-1 max-w-5xl mx-auto w-full px-5 pb-10">
            {/* Desktop layout */}
            <div className="hidden lg:grid grid-cols-3 gap-5 items-stretch">
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositDisplay} servicePrice={servicePrice} remaining={remaining} />

              {booking?.screenshot_url && (
                <div className="bg-white overflow-hidden flex flex-col" style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}` }}>
                  <CardHead icon={ICON.upload}>Your Screenshot</CardHead>
                  <div className="p-4 flex items-center justify-center flex-1">
                    <img src={booking.screenshot_url} alt="Zelle screenshot" className="w-full rounded-xl object-contain max-h-[300px]" />
                  </div>
                </div>
              )}

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
                    Email <a href="mailto:roko@makeupbyroko.org" className="hover:underline font-medium" style={{ color: PLUM }}>roko@makeupbyroko.org</a>
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
              <BookingSummary booking={booking} dateFormatted={dateFormatted} depositAmount={depositDisplay} servicePrice={servicePrice} remaining={remaining} />

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
                  Email <a href="mailto:roko@makeupbyroko.org" className="hover:underline font-medium" style={{ color: PLUM }}>roko@makeupbyroko.org</a>
                  {' '}or DM <a href="https://instagram.com/makeupbyroko_" target="_blank" rel="noreferrer" className="hover:underline font-medium" style={{ color: PLUM }}>@makeupbyroko_</a>
                </p>
              </div>
            </div>

            {/* Bridal: keep the door open to add more photos after submitting. */}
            {isBridal && booking && (
              <div className="mt-4">
                <ClientPhotosCard token={token} booking={booking} setBooking={setBooking} />
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[0.58rem] pb-6 tracking-wide" style={{ color: '#C9B8C0' }}>© {new Date().getFullYear()} Makeup by Roko</p>
      </div>
    );
  }

  // ── FIRST-TIME WIZARD ──
  const noise = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  const primaryDisabled = submitting || !zelleFile || (isLast && isBridal && !photosComplete);
  const primaryLabel = isLast
    ? (submitting ? 'Submitting…' : (isBridal ? 'Submit & reserve my date' : 'Reserve my date'))
    : 'Continue';
  const onPrimary = isLast ? handleSubmitAll : goNext;

  return (
    <div className="min-h-screen flex flex-col" style={pageBg}>
      <Style />
      {Nav}

      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-7 sm:py-12 relative">
        {/* Soft textured backdrop so the centered card has depth on desktop. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-28 -left-24 w-[22rem] h-[22rem] rounded-full" style={{ background: 'radial-gradient(circle, rgba(196,132,154,0.16), transparent 70%)' }} />
          <div className="absolute -bottom-28 -right-16 w-[26rem] h-[26rem] rounded-full" style={{ background: 'radial-gradient(circle, rgba(196,132,154,0.11), transparent 70%)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: noise, opacity: 0.035 }} />
        </div>

        <div className="uz-card relative w-full max-w-[480px]">
          <div className="bg-white" style={{ borderRadius: 22, border: `1px solid ${CARD_BORDER}`, boxShadow: '0 22px 70px rgba(108,64,85,0.12)' }}>

            {/* Card top: secure badge + step indicator */}
            <div className="px-6 sm:px-7 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.6" className="w-3.5 h-3.5">{ICON.lock}</svg>
                <span className="text-[0.55rem] font-semibold tracking-[0.16em] uppercase" style={{ color: LABEL }}>Secure upload</span>
              </div>
              {steps.length > 1 && (
                <span className="text-[0.55rem] font-bold tracking-[0.14em] uppercase" style={{ color: PLUM }}>Step {step + 1} of {steps.length}</span>
              )}
            </div>

            {/* Body — animates in on each step change */}
            <div className="px-6 sm:px-7 py-6">
              <div key={step} className={dir === 'back' ? 'uz-in-left' : 'uz-in-right'}>

                {/* ── STEP 1: DEPOSIT ── */}
                {step === 0 && (
                  <div className="flex flex-col gap-5">
                    <div className="text-center">
                      <p className="text-[0.58rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: PLUM }}>Reserve your date</p>
                      {depositDisplay ? (
                        <p className="font-serif text-[2.6rem] leading-none font-light" style={{ color: VALUE }}>{depositDisplay}</p>
                      ) : (
                        <h2 className="font-serif text-[1.9rem] leading-tight font-light" style={{ color: VALUE }}>
                          Secure your <em className="italic" style={{ color: PLUM }}>date</em>
                        </h2>
                      )}
                      <p className="text-[0.8rem] mt-2 leading-[1.6]" style={{ color: LABEL }}>
                        Send your deposit on Zelle, then upload the screenshot here to lock in your date.
                      </p>
                    </div>

                    {/* How to send + who to send to, in ONE card so the whole
                        deposit action lives in a single clear space. */}
                    <div className="px-4 py-4" style={{ borderRadius: 14, border: `1px solid ${CARD_BORDER}`, background: '#FEFCFD' }}>
                      <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-3" style={{ color: PLUM }}>How to send your deposit</p>
                      <ol className="flex flex-col gap-2.5">
                        <HowStep n={1}>Open your <strong style={{ color: VALUE }}>Zelle app</strong> and send{depositDisplay ? <> <strong style={{ color: VALUE }}>{depositDisplay}</strong></> : ' your deposit'} to the address below.</HowStep>
                        <HowStep n={2}>Take a <strong style={{ color: VALUE }}>screenshot</strong> of the confirmation.</HowStep>
                        <HowStep n={3}>Come back here and upload it{isBridal ? ' with your photos' : ''}.</HowStep>
                      </ol>

                      {/* Recipient, folded into the same card with a one-tap copy. */}
                      <div className="mt-3.5 pt-3.5" style={{ borderTop: `1px solid ${DIVIDER}` }}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[0.56rem] font-semibold tracking-[0.14em] uppercase" style={{ color: LABEL }}>Zelle to</span>
                          <span className="text-[0.85rem] font-semibold" style={{ color: VALUE }}>Ruqia Moshref</span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <p className="text-[0.56rem] font-semibold tracking-[0.14em] uppercase mb-0.5" style={{ color: LABEL }}>Email</p>
                            <p className="text-[0.85rem] font-bold break-all leading-snug" style={{ color: VALUE }}>makeupbyroko22@gmail.com</p>
                          </div>
                          <CopyButton value="makeupbyroko22@gmail.com" />
                        </div>
                        <p className="mt-3 text-[0.66rem] leading-[1.55]" style={{ color: LABEL }}>
                          Tap <strong style={{ color: PLUM_DARK }}>Copy</strong> and paste it into your Zelle app (it's the recipient address, not a link). Add your <strong style={{ color: PLUM_DARK }}>name + {isBridal ? 'wedding' : 'appointment'} date</strong> in the memo. Remaining balance is cash on the day.
                        </p>
                      </div>
                    </div>

                    {/* Screenshot dropzone */}
                    {zellePreview ? (
                      <div className="relative overflow-hidden uz-rise" style={{ borderRadius: 12, border: `1px solid ${HEAD_BORDER}` }}>
                        <img src={zellePreview} alt="Zelle screenshot" className="w-full object-contain max-h-[260px]" style={{ background: '#FBF7F9' }} />
                        <button
                          type="button"
                          onClick={clearZelle}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/55 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          aria-label="Remove screenshot"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <div className="absolute bottom-0 inset-x-0 px-3 py-2 flex items-center gap-1.5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-3 h-3">{ICON.check}</svg>
                          <span className="text-[0.62rem] font-semibold text-white tracking-wide">Screenshot added</span>
                        </div>
                      </div>
                    ) : (
                      <label
                        className="flex flex-col items-center gap-3 px-5 py-8 cursor-pointer transition-all"
                        style={{ borderRadius: 12, border: `1.5px dashed ${HEAD_BORDER}`, background: '#FEFCFD' }}
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: HEAD_BG }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke={PLUM} strokeWidth="1.5" className="w-5 h-5">{ICON.upload}</svg>
                        </div>
                        <div className="text-center">
                          <p className="text-[0.82rem] font-semibold" style={{ color: PLUM_DARK }}>Upload your Zelle screenshot</p>
                          <p className="text-[0.62rem] mt-1" style={{ color: LABEL }}>Tap to choose · PNG or JPG</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={pickZelle} />
                      </label>
                    )}
                  </div>
                )}

                {/* ── STEP 2: PHOTOS (bridal) ── */}
                {step === 1 && (
                  <div className="flex flex-col gap-5">
                    <div className="text-center">
                      <p className="text-[0.58rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: PLUM }}>A few photos for Roko</p>
                      <h2 className="font-serif text-[1.7rem] leading-tight font-light" style={{ color: VALUE }}>
                        Share your <em className="italic" style={{ color: PLUM }}>looks</em>
                      </h2>
                      <p className="text-[0.8rem] mt-2 leading-[1.6]" style={{ color: LABEL }}>
                        So Roko can plan your bridal look, add at least one recent photo with makeup and one without. Both are required to submit.
                      </p>
                    </div>

                    <PhotoZone
                      icon={ICON.camera}
                      title="Without makeup"
                      hint="A clear, recent photo of your bare skin in good lighting."
                      items={withoutItems}
                      onAdd={addPhotos(setWithoutItems)}
                      onRemove={removePhoto(setWithoutItems)}
                      disabled={submitting}
                    />

                    <div className="h-px" style={{ background: DIVIDER }} />

                    <PhotoZone
                      icon={ICON.sparkle}
                      title="With makeup"
                      hint="A look you love or a recent glam. Inspiration screenshots are welcome too."
                      items={withItems}
                      onAdd={addPhotos(setWithItems)}
                      onRemove={removePhoto(setWithItems)}
                      disabled={submitting}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer: buttons + dots */}
            <div className="px-6 sm:px-7 pb-6 pt-1">
              {!zelleFile && (
                <p className="text-center text-[0.66rem] mb-3" style={{ color: LABEL }}>Add your Zelle screenshot to continue</p>
              )}
              {isLast && isBridal && zelleFile && !photosComplete && (
                <p className="text-center text-[0.66rem] mb-3" style={{ color: LABEL }}>Add at least one photo to each section to submit</p>
              )}
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-4 text-[0.78rem] font-semibold transition-all touch-manipulation disabled:opacity-50"
                    style={{ borderRadius: 12, border: `1px solid ${CARD_BORDER}`, color: PLUM_DARK, background: '#fff' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke={PLUM_DARK} strokeWidth="2.2" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6" /></svg>
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={onPrimary}
                  disabled={primaryDisabled}
                  className="flex-1 py-4 text-[0.82rem] font-semibold tracking-[0.03em] transition-all touch-manipulation"
                  style={!primaryDisabled
                    ? { borderRadius: 12, background: INK, color: '#fff', boxShadow: '0 8px 26px rgba(196,132,154,0.3)' }
                    : { borderRadius: 12, background: '#F4ECF0', color: '#C9B3BE', cursor: 'not-allowed' }
                  }
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full uz-spin" />
                      {primaryLabel}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      {primaryLabel}
                      {!isLast && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" className="w-3.5 h-3.5">{ICON.arrow}</svg>}
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-5">
                <Dots count={steps.length} active={step} onJump={jumpTo} />
              </div>
            </div>
          </div>

          <p className="text-center text-[0.62rem] mt-4" style={{ color: LABEL }}>
            Trouble? Email <a href="mailto:roko@makeupbyroko.org" className="hover:underline" style={{ color: PLUM }}>roko@makeupbyroko.org</a>
          </p>
        </div>
      </div>

      <p className="text-center text-[0.58rem] pb-6 tracking-wide" style={{ color: '#C9B8C0' }}>© {new Date().getFullYear()} Makeup by Roko</p>
    </div>
  );
}
