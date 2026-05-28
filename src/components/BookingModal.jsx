import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import BridalInquiryForm from './BridalInquiryForm';
import ServiceFAQ from './ServiceFAQ';
import ZelleSuccessUpload from './ZelleSuccessUpload';

const AVAILABLE_DAYS = [1, 2, 3, 4, 5, 6];

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
    <button onClick={() => handleDayClick(day)}
      title={
        isBlocked ? 'Blocked'
        : isFull ? 'Fully booked'
        : isPartial ? `${maxPerDay - bookingCount} spot${maxPerDay - bookingCount > 1 ? 's' : ''} left`
        : unavailable ? 'Unavailable'
        : 'Available'
      }
      className={`w-full aspect-square max-w-[2.75rem] flex flex-col items-center justify-center text-[0.875rem] transition-all relative rounded-none ${
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
      {isToday && !isSel && <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#D4A0B0]" />}
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

const inputClass = "w-full px-0 py-2.5 border-0 border-b border-gray-200 text-base sm:text-[0.85rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none touch-manipulation";

export default function BookingModal({ service: initialService, onClose }) {
  const [service, setService] = useState(initialService);
  const [step, setStep] = useState('calendar');
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef(null);

  const minDate = getMinBookingDate();
  // Start calendar on the month of the minimum booking date
  const [currentDate, setCurrentDate] = useState(new Date(minDate.getFullYear(), minDate.getMonth()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [calDays, setCalDays] = useState([]);
  const [formData, setFormData] = useState({ fname: '', lname: '', email: '', phone: '', notes: '', early_arrival: null, travel_requested: null });
  const [newBookingId, setNewBookingId] = useState(null);
  const [uploadToken, setUploadToken] = useState(null);

  const isEarlyArrival = formData.early_arrival === true;

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
    initialData: [],
  });

  const blockedSet = new Set(blockedDates.map(b => b.date));

  // Fetch existing bookings to show booked/busy dates
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['existing-bookings-calendar'],
    queryFn: () => api.entities.Booking.list('-date', 200),
    initialData: [],
    staleTime: 30000,
  });

  // Build a map: date -> count of all active bookings (pending + confirmed + completed all take a slot)
  const bookedDateMap = {};
  existingBookings.forEach(b => {
    if (!b.date || b.status === 'cancelled') return;
    bookedDateMap[b.date] = (bookedDateMap[b.date] || 0) + 1;
  });

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
  // Keep for summary display — no longer a single constant
  const MAX_BOOKINGS_PER_DAY = DEFAULT_MAX;

  const { data: serviceEntities = [] } = useQuery({
    queryKey: ['public-services-modal'],
    queryFn: () => api.entities.Service.filter({ is_active: true }, 'sort_order', 50),
  });

  // Build dropdown list from entity data (exclude bridal — bridal uses inquiry form)
  const ALL_SERVICES = serviceEntities
    .filter(s => s.category !== 'bridal')
    .map(s => ({
      key: s.id,
      title: s.title,
      price: s.price,
      duration: s.duration,
      deposit: s.deposit || '',
      description: s.description || '',
      includes: s.includes || [],
      key_features: s.key_features || [],
      what_to_expect: s.what_to_expect || '',
      before_after_photos: s.before_after_photos || []
    }));

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
    setSelectedDate(key);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fname || !formData.email) { alert('Please fill in required fields.'); return; }
    if (!selectedDate) { alert('Please select a date.'); return; }
    const earlySurcharge = isEarlyArrival ? ' | ⏰ Early arrival surcharge: +$100 (before 7 AM)' : '';
    const readyByNote = formData.ready_by_time ? ` | Ready by: ${formData.ready_by_time}` : '';
    const travelNote = formData.travel_requested === true ? ' | ✈️ Travel requested — bridal pricing ($750+) applies' : '';
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newBooking = await api.entities.Booking.create({
      name: `${formData.fname} ${formData.lname}`,
      email: formData.email,
      phone: formData.phone,
      service: service.title,
      date: selectedDate,
      time: '',
      notes: `${formData.notes}${earlySurcharge}${readyByNote}${travelNote}`.trim(),
      status: 'pending',
      upload_token: token,
    });
    setNewBookingId(newBooking.id);
    setUploadToken(token);

    // Send confirmation email via backend function (keeps payload small, avoids Gmail clipping)
    const dateFormatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const uploadUrl = `${window.location.origin}/upload-zelle?id=${newBooking.id}&token=${token}&deposit=${encodeURIComponent(service.deposit || '')}&price=${encodeURIComponent(service.price || '')}`;

    const hasTravelFee = formData.travel_requested === true;

    try {
      await api.functions.invoke('sendBookingConfirmation', {
        bookingType: 'nonbridal',
        to: formData.email,
        firstName: formData.fname,
        serviceName: service.title,
        servicePrice: service.price,
        serviceDeposit: service.deposit,
        dateFormatted,
        uploadUrl,
        isEarlyArrival,
        hasTravelFee,
        estimatedTotal: hasTravelFee && isEarlyArrival ? '$850+' : hasTravelFee ? '$750+' : isEarlyArrival ? `${service.price} + $100` : null,
      });
    } catch (err) {
      console.error('Failed to send confirmation email:', err);
    }

    setStep('done');
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)) {
        setServiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
    };
  }, []);

  const scrollRef = useRef(null);

  // Scroll to top when step changes to done
  useEffect(() => {
    if (step === 'done' && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [step]);


  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-start sm:justify-center"
      style={{ 
        background: 'radial-gradient(ellipse at 0% 50%, rgba(212,140,170,0.45) 0%, transparent 45%), radial-gradient(ellipse at 100% 50%, rgba(180,140,220,0.38) 0%, transparent 45%), radial-gradient(ellipse at 50% 0%, rgba(212,160,176,0.25) 0%, transparent 50%), rgba(0,0,0,0.58)',
        backdropFilter: 'blur(22px)'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-none"
        style={{
          animation: 'slideUpSheet 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: window.innerWidth >= 640 ? 'inset 0 0 200px rgba(212,140,170,0.12), inset 100px 0 200px rgba(212,140,170,0.08), inset -100px 0 200px rgba(180,140,220,0.08), 0 -1px 0 rgba(212,160,176,0.35)' : undefined,
          marginTop: '52px',
          height: 'calc(100% - 52px)',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm z-10 flex items-center px-4 sm:px-8 py-3.5 sm:py-4 gap-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          {/* ← Back */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 touch-manipulation"
            style={{ background: '#f0ebe6' }}
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Title — centered */}
          <div className="flex-1 flex items-center justify-center gap-2.5 min-w-0">
            <span className="text-[#D4A0B0] text-xs flex-shrink-0">✦</span>
            <div className="min-w-0">
              <span className="font-serif text-[1.05rem] tracking-tight text-[#111] block leading-tight truncate">
                {service.category === 'bridal' ? 'Bridal Inquiry' : step === 'done' ? 'Request Sent!' : `Book: ${service.title}`}
              </span>
              {service.category !== 'bridal' && step !== 'done' && service.duration && (
                <span className="text-[0.6rem] text-[#c5bdb5] tracking-wide block">{service.duration}</span>
              )}
            </div>
          </div>

          {/* × Close */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 touch-manipulation"
            style={{ background: '#f0ebe6' }}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Price strip — non-bridal only */}
        {service.category !== 'bridal' && step === 'calendar' && (
          <div className="flex-shrink-0 border-b px-6 sm:px-10 py-3" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
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
              <p className="text-[0.68rem] text-gray-400">Confirmed within 24–48 hrs · Roko will reach out to confirm your time</p>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div ref={scrollRef} data-modal-scroll className="flex-1 overflow-y-auto min-h-0 overscroll-contain flex flex-col bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="w-full sm:max-w-[1200px] sm:mx-auto flex-1 flex flex-col bg-white">

        {/* BRIDAL: Special inquiry form */}
        {service.category === 'bridal' && step !== 'done' && (
          <BridalInquiryForm onClose={onClose} service={service} />
        )}

        {/* CALENDAR + FORM VIEW (no time selection) */}
        {service.category !== 'bridal' && step === 'calendar' && (
          <>
          <div className="flex flex-col lg:flex-row lg:items-stretch">

            {/* LEFT: Calendar only */}
            <div className="lg:w-[50%] p-6 lg:p-7 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col relative overflow-hidden">

              {/* Soft glow background */}
              <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-[0.08] pointer-events-none"
                style={{ background: 'radial-gradient(circle, #D4A0B0, transparent 70%)' }} />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none"
                style={{ background: 'radial-gradient(circle, #B8A0D4, transparent 70%)' }} />

              {/* Calendar heading */}
              <div className="flex items-center gap-2 mb-5 relative z-10">
                <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-[#888]">Choose a Date</span>
              </div>

              {/* 30-day notice */}
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
                  <button onClick={() => setCurrentDate(new Date(year, month - 1))}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl">
                    ‹
                  </button>
                  <span className="font-serif text-[1.2rem] text-[#111] tracking-tight">{monthName}</span>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1))}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl">
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
                    <div key={i} className="text-[0.55rem] font-semibold text-gray-300 uppercase py-2 tracking-[0.1em]">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {calDays.map((day, idx) => (
                    !day
                      ? <div key={`e-${idx}`} className="w-11 h-11" />
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
                    <p className="text-[0.72rem] text-[#999] leading-[1.6]">Just pick a date — Roko will reach out to confirm your appointment time based on availability.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Form */}
            <div className="lg:w-[50%] p-6 lg:p-7 flex flex-col">

              {/* Selection summary at top */}
              {selectedDate ? (
                <div className="bg-gradient-to-r from-[#D4A0B0]/8 to-[#B8A0D4]/8 border border-[#D4A0B0]/15 rounded-xl px-4 py-3.5 mb-6 flex items-center gap-3"
                  style={{ boxShadow: '0 0 20px rgba(212,160,176,0.08)' }}>
                  <div className="w-9 h-9 rounded-xl bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-0.5">Requested Date</p>
                    <p className="text-[0.82rem] text-[#333]">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="font-serif text-[1.4rem] text-[#111] mb-1">Your <em className="text-[#D4A0B0] not-italic">Details</em></h3>
                  <p className="text-[0.8rem] text-gray-400">Fill in your info & select a date. Roko will confirm your time.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">First Name *</label>
                    <input required value={formData.fname} onChange={e => setFormData({ ...formData, fname: e.target.value })}
                      placeholder="Amara" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Last Name</label>
                    <input value={formData.lname} onChange={e => setFormData({ ...formData, lname: e.target.value })}
                      placeholder="Jones" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Email Address *</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@email.com" className={inputClass} />
                </div>

                <div>
                  <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 000-0000" className={inputClass} />
                </div>

                <div>
                  <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Do you need your look done before 7:00 AM?</label>
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
                        <p className="text-[0.72rem] font-semibold text-[#B0708A]">Early Arrival Surcharge — +$100</p>
                        <p className="text-[0.68rem] text-[#C090A8] mt-0.5">Getting your look done before 7:00 AM includes a $100 early arrival fee, added to your total.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">What time would you like to be ready by?</label>
                  <input
                    type="text"
                    value={formData.ready_by_time || ''}
                    onChange={e => setFormData({ ...formData, ready_by_time: e.target.value })}
                    placeholder="e.g. 10:00 AM"
                    className={inputClass}
                  />
                  <p className="text-[0.75rem] sm:text-[0.8rem] text-gray-400 mt-1.5 leading-[1.6]">
                    This is your preference — Roko will do her best to have you ready by this time. Your actual appointment time will be confirmed separately.
                  </p>
                </div>

                {/* Travel Question */}
                <div className="mt-4">
                  <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Do you need Roko to travel to you?</label>
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
                  {formData.travel_requested === true && (
                    <div className="mt-2.5 bg-white border border-[#E2C4D2] rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0 mt-0.5">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                      </svg>
                      <div>
                        <p className="text-[0.72rem] font-semibold text-[#B0708A]">Travel — Bridal Pricing Applies ($750+)</p>
                        <p className="text-[0.68rem] text-[#C090A8] mt-0.5">For non-bridal bookings that require Roko to travel to you, bridal pricing of $750+ applies. Roko will confirm the exact rate when she reaches out.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Additional Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any skin concerns, inspiration photos, event details…"
                    className={`${inputClass} resize-none h-[80px] border-b`} />
                </div>



                <div className="mt-auto pt-2">
                  {(isEarlyArrival || formData.travel_requested === true) && (
                    <div className="mb-3 rounded-xl border border-[#E2C4D2] overflow-hidden">
                      {isEarlyArrival && !formData.travel_requested && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EDD5E2]">
                          <span className="text-[0.72rem] text-gray-500">Base price</span>
                          <span className="text-[0.72rem] text-gray-600 font-medium">{service.price}</span>
                        </div>
                      )}
                      {formData.travel_requested === true && (
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
                            {formData.travel_requested ? '$850+' : `${service.price} + $100`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="submit"
                    disabled={!selectedDate}
                    className={`w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all ${
                      selectedDate
                        ? 'bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}>
                    {selectedDate ? 'Submit Booking Request →' : 'Select a date to continue'}
                  </button>
                  <p className="text-[0.65rem] text-center text-gray-400 mt-2">Roko will confirm your time within 24–48 hrs · Deposit via Zelle secures your date <span className="text-[#D4A0B0]">✦</span></p>
                </div>
              </form>

            </div>
          </div>

          {/* FAQ Section — full width below both columns */}
          <div className="px-6 lg:px-8 py-6 border-t border-gray-100">
            <ServiceFAQ service={service} />
          </div>
          </>
        )}

        {/* STEP: Done */}
        {service.category !== 'bridal' && step === 'done' && (
          <div className="bg-white p-6 sm:p-8 overflow-y-auto flex-1">
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
                    <span className="text-[0.82rem] font-semibold text-[#111111]">{formData.travel_requested === true ? '$750+' : service.price}</span>
                  </div>
                  {formData.travel_requested === true && (
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
                  {(isEarlyArrival || formData.travel_requested === true) && (
                    <div className="flex justify-between py-3 border-b border-[#F5E8EF] bg-[#FDF8FA] -mx-5 px-5">
                      <span className="text-[0.78rem] font-semibold text-[#111111]">Estimated Total</span>
                      <span className="text-[0.82rem] font-bold text-[#111111]">
                        {formData.travel_requested === true && isEarlyArrival ? '$850+' : formData.travel_requested === true ? '$750+' : `${service.price} + $100`}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.95rem] font-serif font-light text-[#111111]">Ruqia Moshref</p>
                      <p className="text-[0.75rem] text-[#888888] mt-0.5">510-491-6497</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.68rem] text-[#888888]">Deposit amount</p>
                      <p className="text-[1rem] font-semibold text-[#111111]">{service.deposit || 'See deposit'}</p>
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

        </div>{/* end inner max-width wrapper */}
        </div>{/* end scrollable content */}
      </div>
    </div>
  );
}