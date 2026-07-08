import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { formatPhone } from '@/lib/phone';
import { lenisStop, lenisStart, lenisScrollTo } from '@/lib/lenis';
import { useModalLenis, scrollModalTop } from '@/lib/modalLenis';
import { useQuery } from '@tanstack/react-query';

function useBookingCounts() {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    fetch('/api/booking-counts')
      .then(r => r.ok ? r.json() : {})
      .then(setCounts)
      .catch(() => setCounts({}));
  }, []);
  return counts;
}
import BridalInquiryForm from './BridalInquiryForm';
import ServiceFAQ from './ServiceFAQ';
import ZelleSuccessUpload from './ZelleSuccessUpload';
import SubmissionRecap from './SubmissionRecap';
import TimePicker from './TimePicker';
import ContractSign from './ContractSign';
import { buildContract } from '@/lib/contract';
import { useContractOverrides } from '@/lib/useContractOverrides';

const AVAILABLE_DAYS = [0, 2, 3, 5, 6]; // Sun, Tue, Wed, Fri, Sat (closed Mon/Thu)

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Minimum booking date is 2 weeks from now
function getMinBookingDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 14);
  return d;
}

function BookingCalDay({ day, year, month, minDate, selectedDate, handleDayClick, blockedSet, bookedDateMap, maxPerDay }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isPast = day.date < today;
  const isTooSoon = day.date < minDate;
  const isAvail = !isTooSoon && AVAILABLE_DAYS.includes(day.date.getDay());
  const key = dateKey(year, month, day.d);
  const isSel = selectedDate === key;
  const isBlocked = !isPast && blockedSet?.has(key);
  const bookingCount = bookedDateMap?.[key] || 0;
  const isFull = bookingCount >= maxPerDay;
  const isPartial = bookingCount > 0 && !isFull;
  const unavailable = isTooSoon || !isAvail || isBlocked || isFull;

  const isToday = day.date.getTime() === today.getTime();

  return (
    <button type="button" onClick={() => handleDayClick(day)}
      title={
        isBlocked ? 'Blocked'
        : isFull ? 'Fully booked'
        : unavailable ? 'Unavailable'
        : undefined
      }
      className={`w-full aspect-square max-w-[2.75rem] sm:max-w-[3.15rem] flex flex-col items-center justify-center text-[0.875rem] sm:text-[1rem] transition-all relative rounded-none ${
        isBlocked
          ? 'text-red-300 cursor-not-allowed line-through decoration-red-300'
          : isFull
          ? 'text-red-300 cursor-not-allowed'
          : unavailable
          ? 'text-gray-200 cursor-not-allowed'
          : isSel
          ? 'bg-[#111] text-white font-semibold rounded-sm'
          : isToday
          ? 'text-[#D4A0B0] font-bold'
          : isPartial
          ? 'text-[#555] font-medium hover:text-[#111]'
          : 'text-[#888] hover:text-[#111]'
      }`}>
      <span>{day.d}</span>
      {/* Status dot — larger and more visible */}
      {!unavailable && !isSel && isPartial && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#F0C27A]" />
      )}
      {!unavailable && !isSel && !isPartial && isAvail && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
      )}
      {isFull && !isBlocked && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-300" />
      )}
    </button>
  );
}

// Sized to match the bridal form's fields so non-bridal (photoshoot / other
// services) inquiries feel just as substantial on desktop, not shrunken.
const inputClass = "w-full px-0 py-3 border-0 border-b border-gray-200 text-base sm:text-[0.95rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none touch-manipulation";
const labelClass = "block text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-2";

export default function BookingModal({ service: initialService, onClose }) {
  const [service, setService] = useState(initialService);
  // Booksy-style stepped flow: date → form → done
  const [step, setStep] = useState('date');
  const [direction, setDirection] = useState('forward');
  // Bridal manages its own steps internally; it reports them up so the shared
  // modal header can show "Step X of 2" and drive its back arrow.
  const [bridalStep, setBridalStep] = useState('date');
  const bridalBackRef = useRef(null);

  const minDate = getMinBookingDate();
  // Start calendar on the month of the minimum booking date
  const [currentDate, setCurrentDate] = useState(new Date(minDate.getFullYear(), minDate.getMonth()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [calDays, setCalDays] = useState([]);
  const [formData, setFormData] = useState({ fname: '', lname: '', email: '', phone: '', notes: '', early_arrival: null, travel_requested: null });
  const [newBookingId, setNewBookingId] = useState(null);
  const [uploadToken, setUploadToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isBridal = service.category === 'bridal';
  const isEarlyArrival = formData.early_arrival === true;
  const hasTravelFee = formData.travel_requested === true;
  const contractOverrides = useContractOverrides();

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
    initialData: [],
  });

  const blockedSet = new Set(blockedDates.map(b => b.date));

  const rawCounts = useBookingCounts();
  const bookedDateMap = rawCounts ?? {};

  // Fetch dynamic capacity setting
  const { data: capacitySettings = [] } = useQuery({
    queryKey: ['booking-capacity'],
    queryFn: () => api.entities.AppSettings.filter({ key: 'max_bookings_per_day' }),
    staleTime: 30000,
  });
  const DEFAULT_MAX = capacitySettings[0] ? parseInt(capacitySettings[0].value, 10) : 3;

  // Per-day capacity overrides
  const { data: dayCapacities = [] } = useQuery({
    queryKey: ['day-capacities'],
    queryFn: () => api.entities.DayCapacity.list('-date', 200),
    staleTime: 30000,
  });
  const dayCapacityMap = {};
  dayCapacities.forEach(d => { dayCapacityMap[d.date] = d.capacity; });

  const getMaxForDay = (dateKey) => dayCapacityMap[dateKey] ?? DEFAULT_MAX;

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push({ d, date: new Date(year, month, d) });
    setCalDays(days);
  }, [currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleDayClick = (day) => {
    if (!day) return;
    const isTooSoon = day.date < minDate;
    const isAvailable = !isTooSoon && AVAILABLE_DAYS.includes(day.date.getDay());
    if (!isAvailable) return;
    const key = dateKey(year, month, day.d);
    if (blockedSet.has(key)) return;
    const count = bookedDateMap[key] || 0;
    if (count >= getMaxForDay(key)) return;
    // Tap the already-selected day to clear it.
    setSelectedDate(prev => prev === key ? null : key);
  };

  // ── Step navigation ──
  const goStep = (next, dir = 'forward') => { setDirection(dir); setStep(next); };
  const handleContinue = () => { if (!selectedDate) return; goStep('form'); };
  const handleHeaderBack = () => {
    if (isBridal) {
      if ((bridalStep === 'form' || bridalStep === 'sign') && bridalBackRef.current) { bridalBackRef.current(); return; }
      onClose();
      return;
    }
    if (step === 'sign') { goStep('form', 'back'); return; }
    if (step === 'form') { goStep('date', 'back'); return; }
    onClose();
  };

  // Form step → advance to Review & Sign (validate required fields first).
  const handleGoToSign = () => {
    if (!formData.fname || !formData.lname || !formData.email) { alert('Please fill in required fields.'); return; }
    if (!selectedDate) { alert('Please select a date.'); return; }
    goStep('sign');
  };

  // Called by the ContractSign step with the signature payload.
  const handleSubmit = async (sig) => {
    if (submitting) return; // guard against double-submit (creates duplicate booking + admin email)
    if (!formData.fname || !formData.lname || !formData.email) { alert('Please fill in required fields.'); return; }
    if (!selectedDate) { alert('Please select a date.'); return; }
    if (!sig || !sig.name) { alert('Please sign the agreement to continue.'); return; }
    setSubmitting(true);
    const earlySurcharge = isEarlyArrival ? ' | ⏰ Early arrival surcharge: +$100 (before 7 AM)' : '';
    const readyByNote = formData.ready_by_time ? ` | Ready by: ${formData.ready_by_time}` : '';
    const travelNote = hasTravelFee ? ' | ✈️ Travel requested — bridal pricing ($750+) applies' : '';
    const signedContractNote = ` | ✍️ Agreement ${sig.version} signed by ${sig.name} · Photos: ${sig.photoConsent ? 'YES' : 'NO'}`;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let newBooking;
    try {
      newBooking = await api.entities.Booking.create({
        name: `${formData.fname} ${formData.lname}`,
        email: formData.email,
        phone: formData.phone,
        service: service.title,
        date: selectedDate,
        time: '',
        notes: `${formData.notes}${earlySurcharge}${readyByNote}${travelNote}${signedContractNote}`.trim(),
        status: 'pending',
        upload_token: token,
        contract_signed: true,
        contract_signed_name: sig.name,
        contract_signed_at: sig.signedAt,
        contract_version: sig.version,
        contract_photo_consent: sig.photoConsent,
      });
    } catch (err) {
      console.error('Failed to create booking:', err);
      alert('Something went wrong submitting your booking. Please try again.');
      setSubmitting(false); // allow retry
      return;
    }
    setNewBookingId(newBooking.id);
    setUploadToken(token);

    // Send confirmation email via backend function (keeps payload small, avoids Gmail clipping)
    const dateFormatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    // Always build the upload link from the stable public production URL, never
    // window.location.origin. A visitor (or owner testing) may submit from a
    // deployment-specific *.vercel.app URL that has Vercel Deployment Protection,
    // which would force clients into a Vercel login wall on the email link.
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
    const uploadUrl = `${siteBase}/upload-zelle?id=${newBooking.id}&token=${token}&deposit=${encodeURIComponent(service.deposit || '')}&price=${encodeURIComponent(service.price || '')}`;

    try {
      await api.functions.invoke('sendBookingConfirmation', {
        bookingType: 'nonbridal',
        to: formData.email,
        firstName: formData.fname,
        lastName: formData.lname,
        phone: formData.phone,
        serviceName: service.title,
        servicePrice: service.price,
        serviceDeposit: service.deposit,
        dateFormatted,
        uploadUrl,
        isEarlyArrival,
        hasTravelFee,
        readyByTime: formData.ready_by_time,
        notes: formData.notes,
        estimatedTotal: hasTravelFee && isEarlyArrival ? '$850+' : hasTravelFee ? '$750+' : isEarlyArrival ? `${service.price} + $100` : null,
        contractSignedName: sig.name,
        contractSignedAt: sig.signedAt,
        contractPhotoConsent: sig.photoConsent,
      });
    } catch (err) {
      console.error('Failed to send confirmation email:', err);
    }

    goStep('done');
  };

  // Lock background scroll when modal is open.
  // iOS Safari ignores overflow:hidden on body — position:fixed is the
  // only reliable cross-browser fix. We capture scrollY first so we can
  // restore the exact scroll position when the modal closes.
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    lenisStop();
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
      lenisStart();
      // Resync Lenis to the restored position. While the body was fixed, Lenis's
      // internal scroll offset drifted to 0; without this the first wheel tick
      // after closing snaps the page up to the hero. immediate = no animation.
      lenisScrollTo(scrollY, { immediate: true, force: true });
      requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
    };
  }, []);

  const scrollRef = useRef(null);
  useModalLenis(scrollRef);

  // Scroll to top of the sheet whenever the step changes (keeps each step
  // starting cleanly at the top, like Booksy).
  useEffect(() => { scrollModalTop(scrollRef.current); }, [step]);

  const stepAnim = `${direction === 'back' ? 'stepInLeft' : 'stepInRight'} 0.4s cubic-bezier(0.22, 1, 0.36, 1)`;

  // Pinned footer CTA total (form step)
  const footerTotal = hasTravelFee && isEarlyArrival ? '$850+'
    : hasTravelFee ? '$750+'
    : isEarlyArrival ? `${service.price} + $100`
    : service.price;

  const selectedDateLong = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  // Filled service agreement for the Review & Sign step.
  const bookingContract = buildContract({
    clientName: `${formData.fname} ${formData.lname}`.trim(),
    serviceName: service.title,
    dateFormatted: selectedDate
      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'your selected date',
    depositAmount: service.deposit,
    priceAmount: service.price,
    locationType: hasTravelFee ? 'onlocation' : 'studio',
    overrides: contractOverrides,
  });

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start sm:justify-center"
      style={{
        background: 'radial-gradient(ellipse at 0% 50%, rgba(212,140,170,0.45) 0%, transparent 45%), radial-gradient(ellipse at 100% 50%, rgba(180,140,220,0.38) 0%, transparent 45%), radial-gradient(ellipse at 50% 0%, rgba(212,160,176,0.25) 0%, transparent 50%), rgba(0,0,0,0.58)',
        backdropFilter: 'blur(22px)'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-none"
        style={{
          // Top-anchored + dvh so the sticky header (back / ✕) is never cropped
          // behind the nav on mobile (100vh/100% overshoot the visible area).
          animation: 'slideUpSheet 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: typeof window !== 'undefined' && window.innerWidth >= 640 ? 'inset 0 0 200px rgba(212,140,170,0.12), inset 100px 0 200px rgba(212,140,170,0.08), inset -100px 0 200px rgba(180,140,220,0.08), 0 -1px 0 rgba(212,160,176,0.35)' : undefined,
          marginTop: 'var(--nav-h, 52px)',
          height: 'calc(100dvh - var(--nav-h, 52px))',
        }}
      >
        {/* Header — slim & sleek */}
        {(() => {
          // Step subtitle, shared by bridal (driven by bridalStep) and non-bridal (step)
          const activeStep = isBridal ? bridalStep : step;
          const isDone = activeStep === 'done';
          const title = isBridal
            ? (isDone ? 'Request Sent!' : 'Bridal Inquiry')
            : (step === 'done' ? 'Request Sent!' : `Book: ${service.title}`);
          const subtitle = isDone ? null
            : isBridal
              ? (bridalStep === 'sign' ? 'Step 3 of 3 · Review & sign'
                : bridalStep === 'form' ? 'Step 2 of 3 · Your details'
                : 'Step 1 of 3 · Wedding date')
              : (step === 'sign' ? 'Step 3 of 3 · Review & sign'
                : step === 'form' ? 'Step 2 of 3 · Your details'
                : `Step 1 of 3 · Choose date${service.duration ? ' · ' + service.duration : ''}`);
          const canBack = isBridal ? (bridalStep === 'form' || bridalStep === 'sign') : (step === 'form' || step === 'sign');
          return (
        <div
          className="flex-shrink-0 backdrop-blur-sm z-10 flex items-center px-3 sm:px-6 py-2 sm:py-2.5 gap-3 relative"
          style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FCF8F5 100%)' }}
        >
          {/* Tapered blush hairline */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,160,176,0.5) 50%, transparent)' }}
          />

          {/* ← Back (step-aware: form → date, otherwise close) — soft gray bubble
              to match the Makeup Courses flow (was a white pink-bordered bubble) */}
          <button
            onClick={(e) => { e.stopPropagation(); handleHeaderBack(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-[#f0eef0] flex-shrink-0 touch-manipulation"
            style={{ background: '#F7F4F5', color: '#8b868d' }}
            aria-label={canBack ? 'Back to date' : 'Close'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Title — centered, flanked by delicate rules + sparkle */}
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-2">
            <div className="flex items-center justify-center gap-2 min-w-0 max-w-full">
              <span className="hidden sm:block h-px w-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,160,176,0.75))' }} />
              <span className="text-[#D4A0B0] text-[0.55rem] flex-shrink-0 leading-none">✦</span>
              <span className="font-serif text-[0.95rem] sm:text-[1.05rem] tracking-[0.01em] text-[#2C1A14] leading-tight truncate">
                {title}
              </span>
              <span className="text-[#D4A0B0] text-[0.55rem] flex-shrink-0 leading-none">✦</span>
              <span className="hidden sm:block h-px w-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg, rgba(212,160,176,0.75), transparent)' }} />
            </div>
            {subtitle && (
              <span className="text-[0.55rem] text-[#b9aca2] tracking-[0.1em] uppercase">{subtitle}</span>
            )}
          </div>

          {/* × Close — soft gray bubble to match the Makeup Courses flow */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-[#f0eef0] flex-shrink-0 touch-manipulation"
            style={{ background: '#F7F4F5', color: '#8b868d' }}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="w-3 h-3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
          );
        })()}

        {/* Price strip — non-bridal, on date + form steps (the "header + package price") */}
        {!isBridal && step !== 'done' && (
          <div className="flex-shrink-0 border-b px-6 sm:px-10 py-3" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 max-w-[620px] mx-auto">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Service Price</p>
                  <p className="font-serif text-[1.1rem] text-[#111] leading-tight">{service.price}</p>
                </div>
                {service.deposit && (
                  <>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Deposit to Book</p>
                      <p className="font-serif text-[1.1rem] text-[#D4A0B0] leading-tight">{service.deposit}</p>
                    </div>
                  </>
                )}
                {service.duration && (
                  <>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Duration</p>
                      <p className="text-[0.85rem] text-[#555] leading-tight font-medium">{service.duration}</p>
                    </div>
                  </>
                )}
              </div>
              <p className="hidden sm:block text-[0.68rem] text-gray-400">Confirmed within 24–48 hrs · Roko will reach out to confirm your time</p>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div ref={scrollRef} data-modal-scroll className="flex-1 overflow-y-auto min-h-0 overscroll-contain flex flex-col bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* BRIDAL: special inquiry form (manages its own stepped flow) */}
          {isBridal ? (
            <BridalInquiryForm
              onClose={onClose}
              service={service}
              onStepChange={setBridalStep}
              registerBack={(fn) => { bridalBackRef.current = fn; }}
            />
          ) : (
            <div key={step} style={{ animation: stepAnim }} className="w-full flex-1 flex flex-col">

              {/* ───────── STEP 1: DATE ───────── */}
              {step === 'date' && (
                <div className="w-full max-w-[600px] lg:max-w-[720px] mx-auto px-6 lg:px-7 py-6 flex flex-col relative overflow-hidden">
                  {/* Soft glow background */}
                  <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-[0.08] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #D4A0B0, transparent 70%)' }} />
                  <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #B8A0D4, transparent 70%)' }} />

                  {/* Calendar heading */}
                  <div className="flex items-center gap-3 mb-5 relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-[#D4A0B0]/12 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-5 h-5">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[0.58rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-0.5">Select Your</p>
                      <h3 className="font-serif text-[1.55rem] lg:text-[1.85rem] leading-none text-[#111]">Appointment <em className="not-italic text-[#D4A0B0]">Date</em></h3>
                    </div>
                  </div>

                  {/* 2-week notice */}
                  <div className="bg-white border-2 border-[#D4A0B0] rounded-xl px-4 py-2.5 mb-3 relative z-10">
                    <p className="text-[0.72rem] text-[#888]">
                      Bookings must be made at least <strong className="text-[#555]">2 weeks in advance</strong>. Earliest available: <strong className="text-[#555]">{minDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong>
                    </p>
                  </div>

                  {/* Month availability summary */}
                  {(() => {
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    let openCount = 0;
                    let fillingCount = 0;
                    let fullCount = 0;
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dt = new Date(year, month, d);
                      const k = dateKey(year, month, d);
                      if (dt < minDate || !AVAILABLE_DAYS.includes(dt.getDay()) || blockedSet.has(k)) continue;
                      const cnt = bookedDateMap[k] || 0;
                      const cap = getMaxForDay(k);
                      if (cnt >= cap) fullCount++;
                      else if (cnt > 0) fillingCount++;
                      else openCount++;
                    }
                    return (
                      <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[0.65rem] font-semibold text-emerald-700">{openCount} open</span>
                        </div>
                        {fillingCount > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F0C27A]" />
                            <span className="text-[0.65rem] font-semibold text-amber-700">{fillingCount} filling</span>
                          </div>
                        )}
                        {fullCount > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                            <span className="text-[0.65rem] font-semibold text-red-500">{fullCount} booked</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Calendar */}
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
                      <button type="button" onClick={() => setCurrentDate(new Date(year, month - 1))}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl">
                        ‹
                      </button>
                      <span className="font-serif text-[1.2rem] text-[#111] tracking-tight">{monthName}</span>
                      <button type="button" onClick={() => setCurrentDate(new Date(year, month + 1))}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl">
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
                      {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
                        <div key={i} className="text-[0.55rem] sm:text-[0.65rem] font-semibold text-gray-300 uppercase py-2 tracking-[0.1em]">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center justify-items-center">
                      {calDays.map((day, idx) => (
                        !day
                          ? <div key={`e-${idx}`} className="w-11 h-11 sm:w-[3.15rem] sm:h-[3.15rem]" />
                          : <BookingCalDay
                            key={dateKey(year, month, day.d)}
                            day={day}
                            year={year}
                            month={month}
                            minDate={minDate}
                            selectedDate={selectedDate}
                            handleDayClick={handleDayClick}
                            blockedSet={blockedSet}
                            bookedDateMap={bookedDateMap}
                            maxPerDay={getMaxForDay(dateKey(year, month, day.d))}
                          />
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-gray-100">
                      <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Open
                      </span>
                      <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F0C27A] inline-block"></span> Filling
                      </span>
                      <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block"></span> Booked
                      </span>
                      <span className="flex items-center gap-1.5 text-[0.58rem] font-medium text-gray-400">
                        <span className="w-3.5 h-3.5 rounded-sm bg-[#111] inline-block"></span> Selected
                      </span>
                    </div>
                  </div>

                  {/* Info note about time */}
                  <div className="mt-5 bg-white rounded-xl border border-gray-200 p-4 relative z-10">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[0.75rem] font-medium text-[#333] mb-1">What about the time?</p>
                        <p className="text-[0.72rem] text-[#999] leading-[1.6]">Just pick a date. Roko will reach out to confirm your appointment time based on availability.</p>
                      </div>
                    </div>
                  </div>

                  {/* FAQ */}
                  <div className="mt-6 pt-6 border-t border-gray-100 relative z-10">
                    <ServiceFAQ service={service} />
                  </div>
                </div>
              )}

              {/* ───────── STEP 2: FORM ───────── */}
              {step === 'form' && (
                <div className="w-full max-w-[680px] lg:max-w-[740px] mx-auto px-6 lg:px-9 py-6 flex flex-col flex-1">

                  {/* Selected-date chip with a "change" affordance back to the calendar */}
                  <button
                    type="button"
                    onClick={() => goStep('date', 'back')}
                    className="w-full text-left bg-gradient-to-r from-[#D4A0B0]/8 to-[#B8A0D4]/8 border border-[#D4A0B0]/15 rounded-xl px-4 py-3.5 mb-6 flex items-center gap-3 transition-all hover:border-[#D4A0B0]/35"
                    style={{ boxShadow: '0 0 20px rgba(212,160,176,0.08)' }}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-0.5">Requested Date</p>
                      <p className="text-[0.82rem] text-[#333]">{selectedDateLong}</p>
                    </div>
                    <span className="text-[0.7rem] font-medium text-[#D4A0B0] flex items-center gap-1 flex-shrink-0">
                      Change
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </button>

                  <div className="mb-5">
                    <h3 className="font-serif text-[1.7rem] lg:text-[1.9rem] text-[#111] mb-1 leading-tight">Your <em className="text-[#D4A0B0] not-italic">Details</em></h3>
                    <p className="text-[0.85rem] text-gray-400">Fill in your info. Roko will confirm your time.</p>
                  </div>

                  <form id="nonbridal-booking-form" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>First Name *</label>
                        <input value={formData.fname} onChange={e => setFormData({ ...formData, fname: e.target.value })}
                          placeholder="Amara" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Last Name *</label>
                        <input value={formData.lname} onChange={e => setFormData({ ...formData, lname: e.target.value })}
                          placeholder="Jones" className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Email Address *</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@email.com" className={inputClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        placeholder="(555)000-0000" className={inputClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Do you need your look done before 7:00 AM?</label>
                      <div className="flex gap-3 mt-1">
                        {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => setFormData({ ...formData, early_arrival: opt.value })}
                            className={`flex-1 py-2.5 rounded-xl text-[0.78rem] font-medium border transition-all ${
                              formData.early_arrival === opt.value
                                ? 'bg-[#111] text-white border-[#111]'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {isEarlyArrival && (
                        <div className="mt-2.5 bg-white border border-[#E2C4D2] rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0 mt-0.5">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <div>
                            <p className="text-[0.72rem] font-semibold text-[#B0708A]">Early Arrival Surcharge (+$100)</p>
                            <p className="text-[0.68rem] text-[#C090A8] mt-0.5">Getting your look done before 7:00 AM includes a $100 early arrival fee, added to your total.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>What time would you like to be ready by?</label>
                      <TimePicker
                        value={formData.ready_by_time || ''}
                        onChange={v => setFormData({ ...formData, ready_by_time: v })}
                        placeholder="Select time"
                      />
                      <p className="text-[0.75rem] sm:text-[0.8rem] text-gray-400 mt-1.5 leading-[1.6]">
                        This is your preference. Roko will do her best to have you ready by this time. Your actual appointment time will be confirmed separately.
                      </p>
                    </div>

                    {/* Travel Question */}
                    <div className="mt-4">
                      <label className={labelClass}>Do you need Roko to travel to you?</label>
                      <p className="text-[0.75rem] sm:text-[0.8rem] text-gray-400 mb-2 leading-[1.6]">
                        By default, all appointments are held at Roko's studio. Select "Yes" only if you need her to come to your location.
                      </p>
                      <div className="flex gap-3 mt-1">
                        {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => setFormData({ ...formData, travel_requested: opt.value })}
                            className={`flex-1 py-2.5 rounded-xl text-[0.78rem] font-medium border transition-all ${
                              formData.travel_requested === opt.value
                                ? 'bg-[#111] text-white border-[#111]'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {hasTravelFee && (
                        <div className="mt-2.5 bg-white border border-[#E2C4D2] rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0 mt-0.5">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                          </svg>
                          <div>
                            <p className="text-[0.72rem] font-semibold text-[#B0708A]">Travel · Bridal Pricing Applies ($750+)</p>
                            <p className="text-[0.68rem] text-[#C090A8] mt-0.5">For non-bridal bookings that require Roko to travel to you, bridal pricing of $750+ applies. Roko will confirm the exact rate when she reaches out.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Additional Notes</label>
                      <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Any skin concerns, inspiration photos, event details…"
                        className={`${inputClass} resize-none h-[80px] border-b`} />
                    </div>

                    {/* Pricing breakdown */}
                    {(isEarlyArrival || hasTravelFee) && (
                      <div className="rounded-xl border border-[#E2C4D2] overflow-hidden">
                        {isEarlyArrival && !hasTravelFee && (
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EDD5E2]">
                            <span className="text-[0.72rem] text-gray-500">Base price</span>
                            <span className="text-[0.72rem] text-gray-600 font-medium">{service.price}</span>
                          </div>
                        )}
                        {hasTravelFee && (
                          <div className={`flex items-center justify-between px-4 py-2.5 bg-[#FBF4F7]${isEarlyArrival ? ' border-b border-[#EDD5E2]' : ''}`}>
                            <span className="text-[0.72rem] text-[#B0708A]">Bridal pricing applies (travel)</span>
                            <span className="text-[0.72rem] text-[#B0708A] font-semibold">$750+</span>
                          </div>
                        )}
                        {isEarlyArrival && (
                          <div className="flex items-center justify-between px-4 py-2.5 bg-[#FBF4F7] border-b border-[#EDD5E2]">
                            <span className="text-[0.72rem] text-[#B0708A]">Early arrival fee</span>
                            <span className="text-[0.72rem] text-[#B0708A] font-semibold">+ $100</span>
                          </div>
                        )}
                        {isEarlyArrival && (
                          <div className="flex items-center justify-between px-4 py-2.5 bg-white">
                            <span className="text-[0.72rem] text-[#111] font-semibold">Estimated Total</span>
                            <span className="text-[0.72rem] text-[#111] font-bold">
                              {hasTravelFee ? '$850+' : `${service.price} + $100`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[0.65rem] text-center text-gray-400">Roko will confirm your time within 24–48 hrs · Deposit via Zelle secures your date <span className="text-[#D4A0B0]">✦</span></p>
                  </form>
                </div>
              )}

              {/* ───────── STEP 3: REVIEW & SIGN ───────── */}
              {step === 'sign' && (
                <ContractSign
                  contract={bookingContract}
                  clientName={`${formData.fname} ${formData.lname}`.trim()}
                  submitting={submitting}
                  ctaLabel="Sign & Confirm Booking"
                  onSign={handleSubmit}
                />
              )}

              {/* ───────── STEP 4: DONE ───────── */}
              {step === 'done' && (
                <div className="bg-white p-6 sm:p-8">
                  <div className="max-w-[520px] mx-auto flex flex-col gap-4">

                    {/* Header */}
                    <div className="text-center py-2 flex flex-col items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#FDF0F5] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2" className="w-5 h-5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[0.58rem] font-semibold tracking-[0.2em] uppercase text-[#C4849A] mb-2">Booking Request Received</p>
                        <h3 className="font-serif text-[1.9rem] font-light text-[#111111] mb-1 leading-tight">
                          Hey {formData.fname}, <em className="italic text-[#C4849A]">Request Received!</em>
                        </h3>
                        <p className="font-serif italic text-[#888888] text-[0.9rem]">Can't wait to glam you up ✦</p>
                      </div>
                      {formData.email && (
                        <div className="flex items-center gap-2 text-[0.72rem] px-3 py-1.5 rounded-full" style={{ background: 'rgba(196,132,154,0.1)', color: '#A0607A' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Receipt sent to {formData.email}
                        </div>
                      )}
                    </div>

                    {/* View submission recap */}
                    <SubmissionRecap
                      dateStr={selectedDate}
                      dateLabel="Requested Date"
                      rows={[
                        { label: 'Service', value: service.title },
                        { label: 'Name', value: `${formData.fname} ${formData.lname}`.trim() },
                        { label: 'Email', value: formData.email },
                        { label: 'Phone', value: formData.phone },
                        { label: 'Before 7 AM?', value: formData.early_arrival == null ? '' : formData.early_arrival ? 'Yes (+$100)' : 'No' },
                        { label: 'Ready by', value: formData.ready_by_time },
                        { label: 'Travel to you?', value: formData.travel_requested == null ? '' : formData.travel_requested ? 'Yes (bridal pricing)' : 'No' },
                        { label: 'Notes', value: formData.notes },
                      ]}
                    />

                    {/* Booking summary */}
                    <div className="bg-white rounded-2xl border border-[#F0E0E9] overflow-hidden">
                      <div className="px-5 pt-4 pb-1">
                        <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A]">Booking Summary</p>
                      </div>
                      <div className="px-5 pb-2">
                        <div className="flex justify-between py-3 border-b border-[#F5E8EF]">
                          <span className="text-[0.78rem] text-[#888888]">Service</span>
                          <span className="text-[0.82rem] font-semibold text-[#111111]">{service.title}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-[#F5E8EF]">
                          <span className="text-[0.78rem] text-[#888888]">Base Price</span>
                          <span className="text-[0.82rem] font-semibold text-[#111111]">{hasTravelFee ? '$750+' : service.price}</span>
                        </div>
                        {hasTravelFee && (
                          <div className="flex justify-between py-3 border-b border-[#F5E8EF]">
                            <span className="text-[0.78rem] text-[#888888]">Travel fee (bridal pricing)</span>
                            <span className="text-[0.78rem] font-semibold text-[#888888]">$750+</span>
                          </div>
                        )}
                        {isEarlyArrival && (
                          <div className="flex justify-between py-3 border-b border-[#F5E8EF]">
                            <span className="text-[0.78rem] text-[#C4849A]">Early arrival (before 7 AM)</span>
                            <span className="text-[0.78rem] font-semibold text-[#C4849A]">+ $100</span>
                          </div>
                        )}
                        {(isEarlyArrival || hasTravelFee) && (
                          <div className="flex justify-between py-3 border-b border-[#F5E8EF] bg-[#FDF8FA] -mx-5 px-5">
                            <span className="text-[0.78rem] font-semibold text-[#111111]">Estimated Total</span>
                            <span className="text-[0.82rem] font-bold text-[#111111]">
                              {hasTravelFee && isEarlyArrival ? '$850+' : hasTravelFee ? '$750+' : `${service.price} + $100`}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-3 border-b border-[#F5E8EF]">
                          <span className="text-[0.78rem] text-[#888888]">Requested Date</span>
                          <span className="text-[0.82rem] font-semibold text-[#111111]">
                            {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex justify-between py-3">
                          <span className="text-[0.78rem] text-[#888888]">Confirmation sent to</span>
                          <span className="text-[0.78rem] text-[#888888] truncate ml-4 text-right">{formData.email}</span>
                        </div>
                      </div>
                      <div className="mx-5 mb-4 px-3.5 py-2.5 bg-[#FDF8FA] rounded-xl border-l-[3px] border-[#E8C4D0]">
                        <p className="text-[0.72rem] text-[#888888] leading-relaxed">Roko will confirm your appointment time within 24–48 hours</p>
                      </div>
                    </div>

                    {/* Zelle deposit */}
                    <div className="bg-white rounded-2xl border border-[#F0E0E9] overflow-hidden">
                      <div className="px-5 pt-4 pb-3 border-b border-[#F5E8EF]">
                        <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A] mb-0.5">Send Your Zelle Deposit</p>
                        <p className="text-[0.72rem] text-[#888888]">Send your deposit to lock in your date</p>
                      </div>
                      <div className="px-5 py-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#FDF0F5] flex items-center justify-center flex-shrink-0">
                              <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.5" className="w-4 h-4">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[0.82rem] font-medium text-[#111111] leading-tight">Zelle details sent to your email</p>
                              <p className="text-[0.7rem] text-[#888888] mt-0.5 leading-tight">Check your inbox to send your deposit</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[0.68rem] text-[#888888]">Deposit amount</p>
                            <p className="text-[1rem] font-semibold text-[#111111]">{service.deposit || 'See email'}</p>
                          </div>
                        </div>
                        <div className="bg-[#FDF8FA] rounded-xl px-4 py-3 border border-[#F0E0E9]">
                          <p className="text-[0.72rem] text-[#444444] leading-relaxed">
                            Include your <strong className="text-[#111111]">name</strong> + <strong className="text-[#111111]">appointment date</strong> in the Zelle note
                          </p>
                        </div>
                        <p className="text-[0.68rem] text-[#999999] text-center">
                          Remaining balance due in <strong className="text-[#444444]">cash</strong> on appointment day
                        </p>
                      </div>
                    </div>

                    {/* Zelle upload */}
                    {newBookingId && uploadToken && (
                      <ZelleSuccessUpload />
                    )}

                    {/* What's next */}
                    <div className="bg-white rounded-2xl border border-[#F0E0E9] px-5 py-4">
                      <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A] mb-2">What's Next</p>
                      <p className="text-[0.82rem] text-[#444444] leading-[1.75]">
                        Send your Zelle deposit to secure your date. Roko will reach out within <strong className="text-[#111111]">24–48 hours</strong> to confirm your appointment time.
                      </p>
                    </div>

                    {/* Sign off */}
                    <div className="bg-white rounded-2xl border border-[#F0E0E9] px-5 py-5 text-center">
                      <p className="font-serif italic text-[#C4849A] text-[1.1rem] mb-1">With love, Roko</p>
                      <p className="text-[0.7rem] text-[#999999]">makeupbyroko22@gmail.com · @makeupbyroko_</p>
                    </div>

                    <div className="flex justify-center pb-2">
                      <button onClick={onClose}
                        className="px-8 py-3 rounded-xl border border-[#F0E0E9] text-[0.8rem] font-medium text-[#888888] hover:border-[#111111] hover:text-[#111111] transition-all">
                        Close
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}
        </div>{/* end scrollable content */}

        {/* Pinned footer CTA — non-bridal date + form steps (Booksy-style bottom bar).
            Hidden on the sign step, which carries its own Sign & Confirm button. */}
        {!isBridal && step !== 'done' && step !== 'sign' && (
          <div
            className="flex-shrink-0 border-t border-[#f0ebe6] bg-white px-5 sm:px-8 py-3.5"
            style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="max-w-[680px] lg:max-w-[740px] mx-auto flex items-center gap-4">
              <div className="flex flex-col leading-tight flex-shrink-0">
                <span className="font-serif text-[1.25rem] text-[#111]">{step === 'form' ? footerTotal : service.price}</span>
                <span className="text-[0.62rem] text-[#b5a99a] uppercase tracking-[0.1em]">{step === 'form' ? 'Est. total' : (service.duration || 'Total')}</span>
              </div>
              {step === 'date' ? (
                <button
                  key="nb-continue"
                  type="button"
                  onClick={handleContinue}
                  disabled={!selectedDate}
                  className={`flex-1 py-3.5 rounded-xl text-[0.85rem] font-medium tracking-[0.04em] transition-all ${
                    selectedDate
                      ? 'bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {selectedDate ? 'Continue →' : 'Select a date'}
                </button>
              ) : (
                <button
                  key="nb-review"
                  type="button"
                  onClick={handleGoToSign}
                  className="flex-1 py-3.5 rounded-xl text-[0.85rem] font-medium tracking-[0.04em] transition-all bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)]"
                >
                  Review &amp; Sign →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
