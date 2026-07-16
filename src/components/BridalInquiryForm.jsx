import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import ContractSign from './ContractSign';
import { formatPhone } from '@/lib/phone';
import { buildContract } from '@/lib/contract';
import { useContractOverrides } from '@/lib/useContractOverrides';

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
import { scrollModalTop } from '@/lib/modalLenis';
import CustomSelect from './CustomSelect';
import CalendarNavSelect from './CalendarNavSelect';
import FullDayIncludes from './FullDayIncludes';
import ZelleSuccessUpload from './ZelleSuccessUpload';
import ServiceFAQ from './ServiceFAQ';
import SubmissionRecap from './SubmissionRecap';
import TimePicker from './TimePicker';
import LocationAutocomplete from './LocationAutocomplete';

const AVAILABLE_DAYS = [0, 2, 3, 5, 6]; // Sun, Tue, Wed, Fri, Sat (closed Mon/Thu)
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function getMinBookingDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 14);
  return d;
}

const inputClass = "w-full px-0 py-3 border-0 border-b border-gray-200 text-base sm:text-[0.95rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none touch-manipulation";
const labelClass = "block text-[0.68rem] font-semibold tracking-[0.14em] text-[#999] uppercase mb-2";

function CalDay({ day, year, month, minDate, selectedDate, handleDayClick, blockedSet, bookedDateMap, maxPerDay }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isTooSoon = day.date < minDate; // also covers past dates
  const isAvail = !isTooSoon && AVAILABLE_DAYS.includes(day.date.getDay());
  const key = dateKey(year, month, day.d);
  const isSel = selectedDate === key;
  const isBlocked = !isTooSoon && blockedSet?.has(key);
  const bookingCount = bookedDateMap?.[key] || 0;
  const isFull = !isTooSoon && bookingCount >= maxPerDay;
  const isPartial = bookingCount > 0 && !isFull;
  const isToday = day.date.getTime() === today.getTime();

  // A wedding date is fixed, so any future date (past the 2-week minimum) is
  // selectable. The dots stay purely informational about Roko's existing load.
  const disabled = isTooSoon;

  return (
    <button type="button" onClick={() => handleDayClick(day)}
      title={isBlocked ? 'Roko has this date blocked — she\'ll confirm' : isFull ? 'Filling up — she\'ll confirm availability' : undefined}
      className={`w-full aspect-square max-w-[2.75rem] sm:max-w-[3.15rem] flex flex-col items-center justify-center text-[0.875rem] sm:text-[1rem] transition-all relative rounded-none ${
        disabled ? 'text-gray-200 cursor-not-allowed'
        : isSel ? 'bg-[#111] text-white font-semibold rounded-sm'
        : isToday ? 'text-[#D4A0B0] font-bold cursor-pointer'
        : 'text-[#888] hover:text-[#111] cursor-pointer'
      }`}>
      <span>{day.d}</span>
      {!disabled && !isSel && (isBlocked || isFull) && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-300" />
      )}
      {!disabled && !isSel && !isBlocked && !isFull && isPartial && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#F0C27A]" />
      )}
      {!disabled && !isSel && !isBlocked && !isFull && !isPartial && isAvail && (
        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
      )}
    </button>
  );
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function BridalSuccess({ onClose, brideName, email, bookingId, uploadToken, recapDate, recapRows, recapDateLabel = 'Wedding Date' }) {
  const firstName = (brideName || '').split(' ')[0] || 'there';

  useEffect(() => {
    // Scroll the modal's scroll container to top (respects its Lenis instance)
    scrollModalTop(document.querySelector('[data-modal-scroll]'));
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8">
      <div className="max-w-[520px] mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="text-center py-2 flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#F7EEF2] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2" className="w-4 h-4">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-[0.58rem] font-semibold tracking-[0.2em] uppercase text-[#C4849A] mb-2">Bridal Inquiry Received</p>
            <h3 className="font-serif text-[1.9rem] font-light text-[#2C1A14] mb-1 leading-tight">
              Hey {firstName}, you're on <em className="italic text-[#C4849A]">the list!</em>
            </h3>
            <p className="font-serif italic text-[#A0785A] text-[0.9rem]">I can't wait to be part of your big day.</p>
          </div>
          {email && (
            <div className="flex items-center gap-2 text-[0.72rem] px-3 py-1.5 rounded-full" style={{ background: 'rgba(196,132,154,0.1)', color: '#A0607A' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              Receipt sent to {email}
            </div>
          )}
        </div>

        {/* View submission recap */}
        <SubmissionRecap dateStr={recapDate} dateLabel={recapDateLabel} rows={recapRows || []} />

        {/* What's next */}
        <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A]">What's Next</p>
          </div>
          <div className="px-5 pb-4 pt-2">
            <p className="text-[0.82rem] text-[#6E6058] leading-[1.75]">
              Your bridal inquiry has been received. I'll be in touch within <strong className="text-[#2C1A14]">24–48 hours</strong> to confirm everything and schedule your consultation.
            </p>
            <div className="mt-3 px-3.5 py-3 bg-[#F7F3F0] rounded-lg border-l-2 border-[#D4A0B0]">
              <p className="text-[0.72rem] font-semibold text-[#A0785A] mb-1">Check your email for your secure upload link</p>
              <p className="text-[0.72rem] text-[#6E6058] leading-[1.65]">
                One private link to send your <strong className="text-[#2C1A14]">Zelle deposit screenshot</strong> and your <strong className="text-[#2C1A14]">with &amp; without makeup photos</strong>, all in one place, whenever you're ready.
              </p>
            </div>
          </div>
        </div>

        {/* Before consultation */}
        <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A]">Before Your Consultation</p>
            <p className="text-[0.74rem] text-[#8A7F85] leading-[1.55] mt-1">Your consultation is about <strong className="text-[#C4849A]">1 month before</strong> your date. Have these ready:</p>
          </div>
          <div className="px-5 pb-4 pt-2 flex flex-col gap-2.5">
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
                text: <>A photo <strong>with makeup on</strong> and one <strong>without makeup</strong></>
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                text: <>Any <strong>inspiration photos</strong> for your bridal look</>
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
                text: <>Photos of your <strong>gown / outfit(s)</strong></>
              },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[0.78rem] text-[#444]">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-[#D4A0B0]/10 flex items-center justify-center">{icon}</span>
                <span className="mt-0.5">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Send photos to */}
        <div className="bg-white rounded-2xl border border-[#EDE6DF] overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#C4849A]">With & Without Makeup Photos</p>
          </div>
          <div className="px-5 pb-4 pt-2">
            <p className="text-[0.75rem] text-[#6E6058] leading-[1.7] mb-3">
              If you uploaded photos in the form, you're all set! If you haven't yet, or want to add more, send them here:
            </p>
            <div className="flex flex-col gap-2.5">
              <a href="mailto:roko@makeupbyroko.org" className="flex items-center gap-2.5 text-[0.82rem] text-[#555] hover:text-[#C4849A] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                roko@makeupbyroko.org
              </a>
              <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[0.82rem] text-[#555] hover:text-[#C4849A] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#D4A0B0" stroke="none"/>
                  </svg>
                </div>
                @makeupbyroko_ (Instagram DM)
              </a>
            </div>
          </div>
        </div>

        {/* Sign off */}
        <div className="bg-white rounded-2xl border border-[#F0E0E9] px-5 py-5 text-center">
          <p className="font-serif italic text-[#C4849A] text-[1.1rem] mb-1">With love, Roko</p>
          <p className="text-[0.7rem] text-[#999999]">roko@makeupbyroko.org · @makeupbyroko_</p>
        </div>

        <div className="pb-4">
          <button onClick={onClose}
            className="w-full py-3.5 rounded-xl border border-gray-200 text-[0.8rem] font-medium text-gray-500 hover:border-[#2C1A14] hover:text-[#2C1A14] transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BridalInquiryForm({ onClose, service: passedService, onStepChange, registerBack }) {
  const { data: bridalService } = useQuery({
    queryKey: ['bridal-service'],
    queryFn: async () => {
      const services = await api.entities.Service.filter({ category: 'bridal', is_active: true }, 'sort_order', 1);
      return services[0] || null;
    },
    enabled: !passedService,
  });

  const { data: blockedDates = [] } = useQuery({ queryKey: ['blocked-dates'], queryFn: () => api.entities.BlockedDate.list(), initialData: [] });
  const rawCounts = useBookingCounts();
  const bookedDateMap = rawCounts ?? {};
  const { data: capacitySettings = [] } = useQuery({ queryKey: ['booking-capacity'], queryFn: () => api.entities.AppSettings.filter({ key: 'max_bookings_per_day' }), staleTime: 30000 });
  const { data: dayCapacities = [] } = useQuery({ queryKey: ['day-capacities'], queryFn: () => api.entities.DayCapacity.list('-date', 200), staleTime: 30000 });

  const blockedSet = new Set(blockedDates.map(b => b.date));
  const DEFAULT_MAX = capacitySettings[0] ? parseInt(capacitySettings[0].value, 10) : 3;
  const dayCapacityMap = {};
  dayCapacities.forEach(d => { dayCapacityMap[d.date] = d.capacity; });
  const getMaxForDay = (key) => dayCapacityMap[key] ?? DEFAULT_MAX;

  const activeService = passedService || bridalService;
  const isFullDay = /full.?day/i.test(activeService?.title || '');
  const isTrial = /trial/i.test(activeService?.title || '');
  const bridalPrice = activeService?.price || '$750';
  const bridalDeposit = activeService?.deposit || '$375 deposit';
  const bridalIncludes = activeService?.includes?.length ? activeService.includes : ['Full bridal makeup application','Lash application included','Professional touch-up kit','30-min Zoom consultation included','Bridesmaid add-ons available'];
  const bridalTitle = activeService?.title || 'Bridal Package';

  // For the Bridal Trial, the date being picked is the trial date, not the wedding
  // date — mirror that wording in the calendar copy so it matches "Tell me about
  // your trial" on the next step.
  const dateNoun = isTrial ? 'trial' : 'wedding';    // "your trial date"
  const dateNounCap = isTrial ? 'Trial' : 'Wedding'; // "Trial Date" heading / label

  // Short "about" block shown above the form fields — gives every bridal service
  // the same thoughtfully-laid-out descriptor + Package Price line that Full Day has.
  const aboutTag = isFullDay ? 'Full Day Coverage' : isTrial ? 'Bridal Trial' : 'Wedding Day Look';
  const aboutBlurb = isFullDay
    ? <>Roko stays with you from <strong>prep through ceremony</strong>, no rushing, no handoffs. Perfect for early start times, bridal switch looks, or venues over 1 hour from the studio.</>
    : isTrial
    ? <>A full run-through of your bridal look before the big day, so everything is <strong>perfected ahead of time</strong>. Recommended 1 to 3 months before your wedding.</>
    : <>Your <strong>wedding-day makeup</strong>, custom-designed for your features and built to last from your first look through the celebration.</>;

  const minDate = getMinBookingDate();
  const [calDate, setCalDate] = useState(new Date(minDate.getFullYear(), minDate.getMonth()));
  const [selectedDate, setSelectedDate] = useState(null);
  // Booksy-style stepped flow: date → form → success
  const [step, setStep] = useState('date');
  const [direction, setDirection] = useState('forward');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newBookingId, setNewBookingId] = useState(null);
  const [uploadToken, setUploadToken] = useState(null);
  const [form, setForm] = useState({
    bride_name: '', soon_to_be_last_name: '', email: '', phone: '',
    instagram_handle: '', wedding_date: '', event_location: '',
    event_start_time: '', photographer: '', hairstylist: '',
    venue_access_time: '', bridal_party_glam: undefined, num_people_glam: '', additional_details: '', how_heard: '',
    ready_by_time: '', makeup_ready_by_time: '', photographer_arrival_time: '', out_of_state: undefined
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const contractOverrides = useContractOverrides();

  // One human-readable answer for "who needs glam", stored + emailed so Roko always
  // sees either the bridal-party count or an explicit "Just the bride".
  const glamSummary =
    form.bridal_party_glam === true
      ? (form.num_people_glam.trim() || 'Yes, final count to confirm')
      : form.bridal_party_glam === false
      ? 'Just the bride'
      : (form.num_people_glam || '');

  // ── Step navigation ──
  const goStep = (next, dir = 'forward') => {
    setDirection(dir);
    setStep(next);
    scrollModalTop(document.querySelector('[data-modal-scroll]'));
  };
  // Track the live step so the (once-registered) back handler stays accurate.
  const stepRef = useRef('date');
  useEffect(() => { stepRef.current = step; }, [step]);
  // Keep the modal header's step indicator + back arrow in sync with our step.
  useEffect(() => { onStepChange?.(step); }, [step, onStepChange]);
  useEffect(() => { if (submitted) onStepChange?.('done'); }, [submitted, onStepChange]);
  // Let the modal header's back arrow step us back: sign → form → date.
  useEffect(() => {
    registerBack?.(() => {
      if (stepRef.current === 'sign') goStep('form', 'back');
      else goStep('date', 'back');
    });
  }, [registerBack]); // eslint-disable-line react-hooks/exhaustive-deps

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push({ d, date: new Date(year, month, d) });

  const handleDayClick = (day) => {
    if (!day) return;
    // Wedding dates are fixed — accept any date past the 2-week minimum, even on
    // a closed day / filling / blocked date. Roko sorts out the rest on confirm.
    if (day.date < minDate) return;
    const key = dateKey(year, month, day.d);
    // Tap the already-selected day to clear it.
    setSelectedDate(prev => prev === key ? null : key);
  };

  const handleContinue = () => {
    if (!selectedDate) { alert('Please select your wedding date from the calendar.'); return; }
    goStep('form');
  };

  // Validate the details, then advance to the Review & Sign step.
  const handleGoToSign = () => {
    if (!form.bride_name) { alert('Please enter the bride\'s first name.'); return; }
    if (!form.soon_to_be_last_name) { alert('Please enter the last name.'); return; }
    if (!form.email) { alert('Please enter your email address.'); return; }
    if (!form.phone) { alert('Please enter your phone number.'); return; }
    if (!selectedDate) { alert('Please select your wedding date from the calendar.'); return; }
    if (!form.event_location) { alert('Please enter the event location.'); return; }
    if (!form.event_start_time) { alert('Please select the event start time.'); return; }
    if (!form.venue_access_time) { alert('Please select the venue access time.'); return; }
    if (!form.ready_by_time) { alert('Please select when the hairstylist should arrive by.'); return; }
    goStep('sign');
  };

  const handleSubmit = async (sig) => {
    if (submitting) return; // guard against double-submit (creates duplicate inquiry + admin email)
    if (!form.bride_name || !form.email || !form.phone || !selectedDate) { goStep('form', 'back'); return; }
    if (!sig || !sig.name) { alert('Please sign the agreement to continue.'); return; }

    setSubmitting(true);
    try {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Create bridal inquiry record (carries all the wedding details shown in admin)
    const inquiryRes = await fetch('/api/bridal-inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The calendar selection IS the wedding date now (one date, no duplicate field).
      body: JSON.stringify({ ...form, num_people_glam: glamSummary, wedding_date: selectedDate || '', preferred_date: selectedDate || '', preferred_time: '', status: 'new', upload_token: token }),
    });
    if (!inquiryRes.ok) {
      // Don't block the booking, but make the failure loud instead of silent.
      console.error('Bridal inquiry insert failed:', await inquiryRes.text().catch(() => inquiryRes.status));
    }

    // Create associated booking record (carries the upload token + inspo photos)
    const bookingRes = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.bride_name,
        email: form.email,
        phone: form.phone,
        service: bridalTitle,
        date: selectedDate || '',
        time: '',
        // "Ready by" here is the BRIDE'S stated preference (makeup_ready_by_time),
        // NOT when the hairstylist arrives (ready_by_time). Each piece is its own
        // pipe-delimited segment so the admin card parses the time, the comment,
        // and the agreement cleanly instead of lumping them together.
        notes: [
          `Ready by: ${form.makeup_ready_by_time || 'Not specified'}`,
          form.additional_details?.trim() || null,
          `✍️ Agreement ${sig.version} signed by ${sig.name} · Photos: ${sig.photoConsent ? 'YES' : 'NO'}`,
        ].filter(Boolean).join(' | '),
        status: 'pending',
        upload_token: token,
        reference_photos: [],
        contract_signed: true,
        contract_signed_name: sig.name,
        contract_signed_at: sig.signedAt,
        contract_version: sig.version,
        contract_photo_consent: sig.photoConsent,
      }),
    });
    const newBooking = await bookingRes.json();
    setNewBookingId(newBooking.id);
    setUploadToken(token);

    // Use the stable public production URL, not window.location.origin, so the
    // email link never points at a protected *.vercel.app deployment URL (which
    // would force clients into a Vercel login wall on mobile).
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
    // Carry the package price + remaining balance (price − deposit) on the upload
    // link so the confirmation page can show the exact dollar figure owed, not a
    // vague "cash on the day". Travel, when it applies, is a separate line item.
    const money = (s) => { const n = parseFloat(String(s || '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; };
    const _priceN = money(bridalPrice);
    const _depositN = money(bridalDeposit);
    const bridalRemaining = (_priceN != null && _depositN != null && _priceN > _depositN)
      ? `$${(_priceN - _depositN).toLocaleString('en-US')}`
      : '';
    const uploadUrl = `${siteBase}/upload-zelle?id=${newBooking.id}&token=${token}&bridal=1&deposit=${encodeURIComponent(bridalDeposit || '')}&price=${encodeURIComponent(bridalPrice || '')}${bridalRemaining ? `&remaining=${encodeURIComponent(bridalRemaining)}` : ''}`;
    const bridalDateFormatted = selectedDate
      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'your requested date';
    const brideFirst = (form.bride_name || '').split(' ')[0] || 'there';

    fetch('/api/send-booking-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingType: 'bridal',
        to: form.email,
        firstName: brideFirst,
        lastName: form.soon_to_be_last_name,
        phone: form.phone,
        instagram: form.instagram_handle,
        bridalTitle,
        bridalDeposit,
        bridalDateFormatted,
        uploadUrl,
        eventLocation: form.event_location,
        eventStartTime: form.event_start_time,
        venueAccessTime: form.venue_access_time,
        readyByTime: form.ready_by_time,
        makeupReadyByTime: form.makeup_ready_by_time,
        photographerArrival: form.photographer_arrival_time,
        photographer: form.photographer,
        hairstylist: form.hairstylist,
        numPeopleGlam: glamSummary,
        outOfState: form.out_of_state,
        weddingDate: selectedDate,
        additionalDetails: form.additional_details,
        howHeard: form.how_heard,
        contractSignedName: sig.name,
        contractSignedAt: sig.signedAt,
        contractPhotoConsent: sig.photoConsent,
      }),
    }).catch(err => console.error('bridal email error:', err));

    setSubmitted(true);
    } catch (err) {
      console.error('Bridal submit failed:', err);
      alert('Something went wrong submitting your inquiry. Please try again.');
      setSubmitting(false); // allow retry
    }
  };

  if (submitted) {
    const recapRows = [
      { label: 'Package', value: bridalTitle },
      { label: 'Bride', value: `${form.bride_name} ${form.soon_to_be_last_name}`.trim() },
      { label: 'Email', value: form.email },
      { label: 'Phone', value: form.phone },
      { label: 'Instagram / TikTok', value: form.instagram_handle },
      { label: 'Event location', value: form.event_location },
      { label: 'Event start time', value: form.event_start_time },
      { label: 'Ready by (your preference)', value: form.makeup_ready_by_time },
      { label: 'Hairstylist arrive by', value: form.ready_by_time },
      { label: 'Photographer arrives', value: form.photographer_arrival_time },
      { label: 'Venue access time', value: form.venue_access_time },
      { label: 'Who needs glam', value: glamSummary },
      { label: 'Photographer', value: form.photographer },
      { label: 'Hairstylist', value: form.hairstylist },
      { label: 'Out-of-state event', value: form.out_of_state == null ? '' : form.out_of_state ? 'Yes' : 'No' },
      { label: 'How heard', value: form.how_heard },
      { label: 'Makeup vision & details', value: form.additional_details },
    ];
    return <BridalSuccess onClose={onClose} brideName={form.bride_name} email={form.email} bookingId={newBookingId} uploadToken={uploadToken} recapDate={selectedDate} recapRows={recapRows} recapDateLabel={`${dateNounCap} Date`} />;
  }

  const stepAnim = `${direction === 'back' ? 'stepInLeft' : 'stepInRight'} 0.4s cubic-bezier(0.22, 1, 0.36, 1)`;
  const selectedDateLong = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  // Filled service agreement for the bridal Review & Sign step. Bridal is an
  // on-location service (Roko travels to the venue), so the travel clause applies.
  const bridalContract = buildContract({
    clientName: `${form.bride_name} ${form.soon_to_be_last_name}`.trim(),
    serviceName: bridalTitle,
    dateFormatted: selectedDateLong || 'your wedding date',
    depositAmount: bridalDeposit,
    priceAmount: bridalPrice,
    locationType: 'onlocation',
    overrides: contractOverrides,
  });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1">

      {/* Hero Banner */}
      <div className="relative h-[140px] sm:h-[150px] overflow-hidden flex-shrink-0">
        <img src="/IMG_9891.jpeg" alt="Bridal" className="w-full h-full object-cover object-[center_30%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <p className="text-[0.6rem] font-medium tracking-[0.14em] uppercase mb-1 text-white/60">{bridalTitle} · {bridalPrice}</p>
          <h2 className="font-serif text-[1.3rem] leading-tight font-normal">
            {isFullDay ? 'Your full day, flawlessly covered.' : 'Your big day deserves perfection.'}
          </h2>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex-shrink-0">
        {isFullDay ? (
          <div className="flex items-center justify-between flex-wrap gap-3 max-w-[680px] mx-auto">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Package Price</p>
                <p className="font-serif text-[1.1rem] text-[#111] leading-tight">{bridalPrice}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Deposit to Book</p>
                <p className="font-serif text-[1.1rem] text-[#D4A0B0] leading-tight">{bridalDeposit}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Coverage</p>
                <p className="text-[0.78rem] font-medium text-[#111] leading-tight">4 Hours</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Travel</p>
                <p className="text-[0.78rem] font-medium text-[#111] leading-tight">$200+</p>
              </div>
            </div>
            <p className="hidden sm:block text-[0.68rem] text-gray-400">Confirmed within 24–48 hrs · Private consultation 1 month before</p>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3 max-w-[680px] mx-auto">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Package Price</p>
                <p className="font-serif text-[1.1rem] text-[#111] leading-tight">{bridalPrice}</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Deposit to Book</p>
                <p className="font-serif text-[1.1rem] text-[#D4A0B0] leading-tight">{bridalDeposit}</p>
              </div>
            </div>
            <p className="hidden sm:block text-[0.68rem] text-gray-400">Confirmed within 24–48 hrs · Consultation 1 month before event</p>
          </div>
        )}
      </div>

      {/* Stepped body */}
      <div key={step} style={{ animation: stepAnim }} className="flex-1 flex flex-col">

        {/* ───────── STEP 1: DATE ───────── */}
        {step === 'date' && (
          <div className="w-full max-w-[600px] lg:max-w-[720px] mx-auto p-6 lg:p-7 flex flex-col gap-5 relative overflow-hidden">

            {/* Glow accents */}
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-[0.07] pointer-events-none" style={{ background: 'radial-gradient(circle, #D4A0B0, transparent 70%)' }} />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.05] pointer-events-none" style={{ background: 'radial-gradient(circle, #B8A0D4, transparent 70%)' }} />

            {/* Calendar heading — the main event of step one, so it reads large. */}
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[#D4A0B0]/12 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-6 h-6"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <p className="text-[0.62rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-0.5">Select Your</p>
                <h3 className="font-serif text-[1.9rem] lg:text-[2.25rem] leading-none text-[#111]">{dateNounCap} <em className="not-italic text-[#D4A0B0]">Date</em></h3>
              </div>
            </div>

            {/* Lead-time notice — sits right under the heading and shares its weight. */}
            <div className="bg-white border-2 border-[#D4A0B0] rounded-xl px-4 py-3 relative z-10">
              <p className="text-[0.85rem] leading-[1.55] text-[#777]">
                Pick your {isTrial ? 'trial date' : 'wedding day'} below. Bridal must be booked at least <strong className="text-[#444]">2 weeks out</strong>. Earliest: <strong className="text-[#444]">{minDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong>
              </p>
            </div>

            {/* How bridal works — the private consultation is a real, required step,
                so make the two-part flow unmistakable right at the top: a planning
                consultation about a month out, then the day-of glam. */}
            {!isTrial && (
              <div className="relative z-10 rounded-xl overflow-hidden" style={{ border: '1px solid #F2E6EC' }}>
                <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-2" style={{ background: 'linear-gradient(135deg,#FCF7F9,#FBF3F6)', borderBottom: '1px solid #F5E9EF' }}>
                  <p className="text-[0.55rem] font-bold tracking-[0.15em] uppercase text-[#CE9BAD]">Every bride gets a private consultation</p>
                </div>
                <div className="px-3.5 py-3 flex flex-col gap-2.5 bg-white">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.62rem] font-bold text-white mt-px" style={{ background: '#CE9BAD' }}>1</span>
                    <p className="text-[0.74rem] leading-[1.55] text-[#6E6660]">
                      <strong className="text-[#3A2C26]">Private consultation</strong> about <strong className="text-[#C4849A]">1 month before</strong> your date. In person or over a call, we plan your entire bridal look together.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.62rem] font-bold text-white mt-px" style={{ background: '#E0BCC8' }}>2</span>
                    <p className="text-[0.74rem] leading-[1.55] text-[#6E6660]">
                      <strong className="text-[#3A2C26]">Your wedding day</strong>. I arrive and glam you flawlessly, exactly the way we planned.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <button type="button" onClick={() => setCalDate(new Date(year, month - 1))} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl flex-shrink-0">‹</button>
                {/* Month + Year quick-jump — custom portal dropdowns so they look
                    polished on desktop and still escape the panel's overflow. */}
                <div className="flex-1 flex items-center justify-center gap-1">
                  <CalendarNavSelect
                    ariaLabel="Month"
                    align="right"
                    value={month}
                    onChange={v => setCalDate(new Date(year, Number(v)))}
                    options={MONTHS.map((m, i) => ({ value: i, label: m }))}
                  />
                  <CalendarNavSelect
                    ariaLabel="Year"
                    align="left"
                    menuMinWidth={120}
                    value={year}
                    onChange={v => setCalDate(new Date(Number(v), month))}
                    options={Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i).map(y => ({ value: y, label: String(y) }))}
                  />
                </div>
                <button type="button" onClick={() => setCalDate(new Date(year, month + 1))} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-[#D4A0B0] transition-colors text-xl flex-shrink-0">›</button>
              </div>

              {/* Month availability summary */}
              {(() => {
                const _today = new Date(); _today.setHours(0, 0, 0, 0);
                let openCount = 0, fillingCount = 0, fullCount = 0;
                calDays.forEach(day => {
                  if (!day) return;
                  if (day.date < _today) return;
                  const isTooSoon = day.date < minDate;
                  const isAvail = !isTooSoon && AVAILABLE_DAYS.includes(day.date.getDay());
                  if (!isAvail) return;
                  const key = dateKey(year, month, day.d);
                  if (blockedSet?.has(key)) return;
                  const count = bookedDateMap?.[key] || 0;
                  if (count >= getMaxForDay(key)) fullCount++;
                  else if (count > 0) fillingCount++;
                  else openCount++;
                });
                if (openCount + fillingCount + fullCount === 0) return null;
                return (
                  <div className="flex items-center gap-2 flex-wrap mt-3 mb-2">
                    {openCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{openCount} open
                      </span>
                    )}
                    {fillingCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,194,122,0.15)', color: '#92400e' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F0C27A] inline-block" />{fillingCount} filling
                      </span>
                    )}
                    {fullCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#b91c1c' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" />{fullCount} full
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center mt-4 mb-3">
                {['SU','MO','TU','WE','TH','FR','SA'].map((d, i) => (
                  <div key={i} className="text-[0.6rem] sm:text-[0.68rem] font-semibold text-gray-400 uppercase py-2 tracking-[0.08em]">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center justify-items-center">
                {calDays.map((day, idx) => !day
                  ? <div key={`e-${idx}`} className="w-11 h-11 sm:w-[3.15rem] sm:h-[3.15rem]" />
                  : <CalDay key={dateKey(year, month, day.d)} day={day} year={year} month={month} minDate={minDate} selectedDate={selectedDate} handleDayClick={handleDayClick} blockedSet={blockedSet} bookedDateMap={bookedDateMap} maxPerDay={getMaxForDay(dateKey(year, month, day.d))} />
                )}
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

              {/* Wedding dates aren't limited to Roko's regular open days — make that clear. */}
              <p className="text-center text-[0.66rem] text-gray-400 mt-3 leading-[1.6]">
                Any day works for {isTrial ? 'trials' : 'weddings'}. The dots just show Roko's current load. Tap a selected date again to clear it.
              </p>
            </div>

            {/* Includes */}
            <div className="border-t border-gray-100 pt-5 relative z-10">
              {isFullDay ? (
                <FullDayIncludes bridalIncludes={bridalIncludes} />
              ) : (
                <>
                  <span className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-2.5">What's Included</span>
                  <ul className="flex flex-col gap-1.5">
                    {bridalIncludes.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[0.75rem] text-gray-500">
                        <span className="text-[#D4A0B0] text-[0.65rem] mt-0.5">✦</span>{item}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* FAQ */}
            {activeService && (
              <div className="border-t border-gray-100 pt-5 relative z-10">
                <ServiceFAQ service={activeService} />
              </div>
            )}
          </div>
        )}

        {/* ───────── STEP 2: FORM ───────── */}
        {step === 'form' && (
          <div className="w-full max-w-[680px] lg:max-w-[740px] mx-auto p-6 lg:p-9 flex flex-col gap-5">

            {/* Selected wedding-date chip — tap to change */}
            <button
              type="button"
              onClick={() => goStep('date', 'back')}
              className="w-full text-left bg-gradient-to-r from-[#D4A0B0]/8 to-[#B8A0D4]/8 border border-[#D4A0B0]/15 rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all hover:border-[#D4A0B0]/35"
              style={{ boxShadow: '0 0 20px rgba(212,160,176,0.08)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase text-[#D4A0B0] mb-0.5">{dateNounCap} Date</p>
                <p className="text-[0.82rem] text-[#333]">{selectedDateLong}</p>
              </div>
              <span className="text-[0.7rem] font-medium text-[#D4A0B0] flex items-center gap-1 flex-shrink-0">
                Change
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </button>

            <div>
              <h3 className="font-serif text-[1.7rem] lg:text-[1.9rem] text-[#111] mb-2 leading-tight">
                {isFullDay
                  ? <>Tell me about your <em className="text-[#D4A0B0] not-italic">full day</em></>
                  : isTrial
                  ? <>Tell me about your <em className="text-[#D4A0B0] not-italic">trial</em></>
                  : <>Tell me about your <em className="text-[#D4A0B0] not-italic">day</em></>
                }
              </h3>
              <div className="mb-3.5 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[#D4A0B0] text-[0.7rem]">✦</span>
                  <span className="text-[0.68rem] font-bold tracking-[0.14em] uppercase text-[#D4A0B0]">{aboutTag}</span>
                </div>
                <p className="text-[0.92rem] text-[#555] leading-[1.75] mb-4">{aboutBlurb}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[0.72rem] text-[#b5a99a]">Package Price</span>
                  <span className="font-serif text-[1.3rem] text-[#111]">{bridalPrice} <span className="text-[0.78rem] font-sans text-[#b5a99a]">· {bridalDeposit}</span></span>
                </div>
              </div>
              <p className="text-[0.85rem] text-gray-400">Fields marked * are required.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bride's First Name *</label>
                <input value={form.bride_name} onChange={e => set('bride_name', e.target.value)} placeholder="First name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last Name *</label>
                <input value={form.soon_to_be_last_name} onChange={e => set('soon_to_be_last_name', e.target.value)} placeholder="Last name" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone *</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(555) 000-0000" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Instagram / TikTok Handle</label>
              <input value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)} placeholder="@yourusername" className={inputClass} />
            </div>

            <div className="w-full h-px bg-gray-100" />

            {/* Timing — each on its own line so nothing feels crammed. Hairstylist
                Arrive By sits directly above the heads-up note so the note reads in
                context. */}
            <div>
              <label className={labelClass}>Event Start Time *</label>
              <TimePicker value={form.event_start_time} onChange={v => set('event_start_time', v)} placeholder="Select time" />
            </div>

            {/* The bride's own ready-by preference — the one timing field that's
                about her, so it gets a soft pink accent bar + plum label to stand
                out from the vendor times around it. */}
            <div className="relative pl-3.5">
              <span className="absolute left-0 top-1 bottom-2 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg,#E8B4C6,#C4849A)' }} />
              <label className="block text-[0.68rem] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: '#C4849A' }}>What time would you like to be ready by?</label>
              <TimePicker value={form.makeup_ready_by_time} onChange={v => set('makeup_ready_by_time', v)} placeholder="Select time" />
              <p className="text-[0.75rem] sm:text-[0.8rem] text-gray-400 mt-1.5 leading-[1.6]">
                Your preference for when you'd like your makeup finished. Roko sets the final timeline, but she'll plan around getting you ready by then.
              </p>
            </div>

            <div>
              <label className={labelClass}>Photographer Arrives</label>
              <TimePicker value={form.photographer_arrival_time} onChange={v => set('photographer_arrival_time', v)} placeholder="Select time" />
            </div>

            <div>
              <label className={labelClass}>Hairstylist Arrive By *</label>
              <TimePicker value={form.ready_by_time} onChange={v => set('ready_by_time', v)} placeholder="Select time" />
            </div>

            {/* Heads-up note — subtle: a thin pink accent line + a small pink tag,
                no filled box. */}
            <div className="relative pl-3.5">
              <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
              <p className="inline-block text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1.5 px-1.5 py-0.5 rounded" style={{ color: '#B06883', background: 'rgba(196,132,154,0.1)' }}>Heads up</p>
              <p className="text-[0.82rem] leading-[1.65]" style={{ color: '#6E6058' }}>
                If your hairstylist isn't <a href="https://instagram.com/hairbyshak" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: '#C4849A', textDecorationColor: '#E8C4D0' }}>@hairbyshak</a>, Roko plans her timing around when yours arrives. She doesn't glam at the same time as other hairstylists.
              </p>
            </div>

            <div>
              <label className={labelClass}>Event Location *</label>
              <LocationAutocomplete value={form.event_location} onChange={v => set('event_location', v)} />
            </div>

            <div>
              <label className={labelClass}>Photographer</label>
              <input value={form.photographer} onChange={e => set('photographer', e.target.value)} placeholder="Share their Instagram" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Hairstylist (Instagram)</label>
              <input value={form.hairstylist} onChange={e => set('hairstylist', e.target.value)} placeholder="Share their Instagram" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Venue Access Time *</label>
              <TimePicker value={form.venue_access_time} onChange={v => set('venue_access_time', v)} placeholder="Select time" />
            </div>

            <div>
              <label className={labelClass}>Does your bridal party need glam too?</label>
              <p className="text-[0.75rem] text-gray-400 mt-0.5 mb-2">Bridesmaids, mother of the bride &amp; more. Add-ons are available alongside your bridal makeup.</p>
              <div className="flex gap-3 mt-1">
                {['No', 'Yes'].map(opt => {
                  const active = opt === 'Yes' ? form.bridal_party_glam === true : form.bridal_party_glam === false;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const yes = opt === 'Yes';
                        set('bridal_party_glam', yes);
                        if (!yes) set('num_people_glam', '');
                      }}
                      className={`flex-1 py-3 rounded-xl text-[0.82rem] font-medium border transition-all ${
                        active
                          ? 'bg-[#111] text-white border-[#111]'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {opt === 'Yes' ? 'Yes, add glam' : 'No, just me'}
                    </button>
                  );
                })}
              </div>

              {form.bridal_party_glam === true && (
                <div className="mt-3" style={{ animation: 'fadeSlideDown 0.2s ease-out' }}>
                  <label className={labelClass}>How Many Need Glam? (Besides You)</label>
                  <input
                    value={form.num_people_glam}
                    onChange={e => set('num_people_glam', e.target.value)}
                    placeholder="e.g. 3 bridesmaids + mom"
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <div className="w-full h-px bg-gray-100" />

            {/* Before & after photos are collected later, through the client's
                personal upload link — not on this form. We only set expectations here. */}
            {/* Photos note — subtle: thin pink accent line + small pink tag, with
                "with / without makeup" as little highlighted pink chips. No box. */}
            <div>
              <label className={labelClass}>Photos of You (With &amp; Without Makeup)</label>
              <div className="relative pl-3.5 mt-1.5">
                <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
                <p className="inline-block text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1.5 px-1.5 py-0.5 rounded" style={{ color: '#B06883', background: 'rgba(196,132,154,0.1)' }}>After you reserve</p>
                <p className="text-[0.82rem] leading-[1.7]" style={{ color: '#6E6058' }}>
                  You'll get a personal upload link to send recent photos of yourself <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.76rem] font-semibold align-baseline" style={{ background: 'rgba(196,132,154,0.12)', color: '#B06883' }}>with makeup</span> and <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.76rem] font-semibold align-baseline" style={{ background: 'rgba(196,132,154,0.12)', color: '#B06883' }}>without makeup</span>. These are required so Roko can study your features and hand-select the right products and techniques for your day. You'll add them from that link, not here.
                </p>
              </div>
            </div>

            <div>
              <CustomSelect
                label="How Did You Hear About Me?"
                labelClass={labelClass}
                value={form.how_heard}
                onChange={(v) => set('how_heard', v)}
                placeholder="Select an option"
                options={['Instagram','TikTok','Facebook','Vendor Referral','Client Referral','Google','Other']}
              />
            </div>

            {/* Out-of-State Section */}
            <div className="w-full h-px bg-gray-100" />

            <div>
              <label className={labelClass}>Is this an out-of-state event?</label>
              <p className="text-[0.75rem] text-gray-400 mt-0.5 mb-2">Local = California &nbsp;·&nbsp; Out of state = outside CA</p>
              <div className="flex gap-3 mt-1">
                {['No', 'Yes'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('out_of_state', opt === 'Yes')}
                    className={`flex-1 py-2.5 rounded-xl text-[0.78rem] font-medium border transition-all ${
                      (opt === 'Yes' ? form.out_of_state === true : form.out_of_state === false && form.out_of_state !== undefined)
                        ? 'bg-[#111] text-white border-[#111]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {opt === 'Yes' ? 'Yes, out of state' : 'No, local event'}
                  </button>
                ))}
              </div>

              {form.out_of_state === true && (
                <div className="mt-3 bg-white border border-[#E2C4D2] rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-0.5">Out-of-State Requirements</p>
                  <p className="text-[0.75rem] text-[#555] leading-[1.7]">
                    Roko loves destination events! For out-of-state bookings, the following are required and must be covered by the client:
                  </p>
                  <ul className="flex flex-col gap-1.5 mt-1">
                    <li className="flex items-start gap-2 text-[0.75rem] text-[#444]">
                      <span className="mt-0.5 text-[#D4A0B0]">✦</span>
                      <span><strong>Round-trip flight</strong> for Roko + 1 add-on person</span>
                    </li>
                    <li className="flex items-start gap-2 text-[0.75rem] text-[#444]">
                      <span className="mt-0.5 text-[#D4A0B0]">✦</span>
                      <span><strong>Hotel accommodation</strong> (minimum 2 nights)</span>
                    </li>
                    <li className="flex items-start gap-2 text-[0.75rem] text-[#444]">
                      <span className="mt-0.5 text-[#D4A0B0]">✦</span>
                      <span><strong>Add-on person fee</strong> (Roko does not travel alone)</span>
                    </li>
                  </ul>
                  <div className="mt-2 pt-2.5 border-t border-[#EDD5E2]">
                    <p className="text-[0.72rem] text-[#999]">
                      For pricing & details on out-of-state bookings, email us at{' '}
                      <a href="mailto:roko@makeupbyroko.org" className="text-[#D4A0B0] hover:underline font-medium">roko@makeupbyroko.org</a>
                      {' '}or DM{' '}
                      <a href="https://www.instagram.com/makeupbyroko_/" target="_blank" rel="noopener noreferrer" className="text-[#D4A0B0] hover:underline font-medium">@makeupbyroko_</a>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full h-px bg-gray-100" />

            <div>
              <label className={labelClass}>Makeup Vision & Additional Details</label>
              <textarea value={form.additional_details} onChange={e => set('additional_details', e.target.value)} placeholder="Your makeup vision, anything I should know about your day, and any out-of-state notes. Inspo welcome." className={`${inputClass} resize-none h-[80px] border-b`} />
            </div>

            <p className="text-[0.65rem] text-center text-gray-400">
              Roko will confirm within 24–48 hours · {bridalDeposit} secures your date <span className="text-[#D4A0B0]">✦</span>
            </p>
          </div>
        )}

        {/* ───────── STEP 3: REVIEW & SIGN ───────── */}
        {step === 'sign' && (
          <div style={{ animation: stepAnim }} className="w-full flex flex-col flex-1">
            <ContractSign
              contract={bridalContract}
              clientName={`${form.bride_name} ${form.soon_to_be_last_name}`.trim()}
              submitting={submitting}
              ctaLabel="Sign & Submit Bridal Inquiry"
              onSign={handleSubmit}
            />
          </div>
        )}
      </div>

      {/* Pinned footer CTA (sticky to bottom of the modal scroll area).
          Hidden on the sign step, which carries its own Sign & Submit button. */}
      {step !== 'sign' && (
      <div
        className="sticky bottom-0 z-30 border-t border-[#f0ebe6] bg-white px-6 lg:px-7 py-3.5"
        style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-[680px] lg:max-w-[740px] mx-auto flex items-center gap-4">
          <div className="flex flex-col leading-tight flex-shrink-0">
            <span className="font-serif text-[1.25rem] text-[#111]">{bridalPrice}</span>
            <span className="text-[0.62rem] text-[#b5a99a] uppercase tracking-[0.1em]">{bridalDeposit}</span>
          </div>
          {step === 'date' ? (
            <button
              key="bridal-continue"
              type="button"
              onClick={handleContinue}
              disabled={!selectedDate}
              className={`flex-1 py-3.5 rounded-xl text-[0.85rem] font-medium tracking-[0.04em] transition-all ${
                selectedDate
                  ? 'bg-[#111] text-white hover:bg-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedDate ? 'Continue →' : `Select your ${dateNoun} date`}
            </button>
          ) : (
            <button
              key="bridal-review"
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
    </form>
  );
}
