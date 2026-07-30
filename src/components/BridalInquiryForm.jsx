import { useState, useEffect, useMemo, useRef } from 'react';
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
import FullDayIncludes from './FullDayIncludes';
import ZelleSuccessUpload from './ZelleSuccessUpload';
import ServiceFAQ from './ServiceFAQ';
import SubmissionRecap from './SubmissionRecap';
import TimePicker from './TimePicker';
import LocationAutocomplete from './LocationAutocomplete';
import { STUDIO_READY_VALUE } from '@/lib/studio';
import BookingCalendar, { getMinBookingDate } from './BookingCalendar';
import { BRIDAL_LEAD_DAYS, canAddParty, daysUntil } from '@/lib/bookingLeadTime';

// The two-part bridal flow (plan it, then wear it). Desktop only — on a phone
// step one carries the one-line version of this next to the lead-time note.
const CONSULT_STEPS = [
  {
    n: 1,
    dot: '#CE9BAD',
    body: <><strong className="text-[#3A2C26]">Private consultation</strong> about <strong className="text-[#C4849A]">1 month before</strong>, in person or over a call. We plan your whole look together.</>,
  },
  {
    n: 2,
    dot: '#E0BCC8',
    body: <><strong className="text-[#3A2C26]">Your wedding day</strong>. I arrive and glam you exactly as planned.</>,
  },
];

const inputClass = "w-full px-0 py-3 border-0 border-b border-gray-200 text-base sm:text-[0.95rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none touch-manipulation";
const labelClass = "block text-[0.68rem] font-semibold tracking-[0.14em] text-[#6E6660] uppercase mb-2";

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

export default function BridalInquiryForm({ onClose, service: passedService, onStepChange, onFocusChange, registerBack, onSwitchService }) {
  const { data: bridalService } = useQuery({
    queryKey: ['bridal-service'],
    queryFn: async () => {
      const services = await api.entities.Service.filter({ category: 'bridal', is_active: true }, 'sort_order', 1);
      return services[0] || null;
    },
    enabled: !passedService,
  });

  // The Full Day row itself, for the over-an-hour nudge under the travel fee. It
  // supplies the real price (rather than a hardcoded "$1,700" that goes stale the
  // moment Roko edits the service in Supabase) and the object handed back up when
  // the bride taps switch. Skipped when the sheet already IS Full Day or a trial,
  // since neither one shows the nudge.
  const { data: fullDayService } = useQuery({
    queryKey: ['bridal-service-full-day'],
    queryFn: async () => {
      const services = await api.entities.Service.filter({ category: 'bridal', is_active: true }, 'sort_order', 20);
      return services.find(s => /full.?day/i.test(s.title || '')) || null;
    },
    enabled: !/full.?day|trial/i.test(passedService?.title || ''),
    staleTime: 60000,
  });

  const { data: blockedDates = [] } = useQuery({ queryKey: ['blocked-dates'], queryFn: () => api.entities.BlockedDate.list(), initialData: [] });
  const rawCounts = useBookingCounts();
  const bookedDateMap = rawCounts ?? {};
  const { data: capacitySettings = [] } = useQuery({ queryKey: ['booking-capacity'], queryFn: () => api.entities.AppSettings.filter({ key: 'max_bookings_per_day' }), staleTime: 30000 });
  const { data: dayCapacities = [] } = useQuery({ queryKey: ['day-capacities'], queryFn: () => api.entities.DayCapacity.list('-date', 200), staleTime: 30000 });

  // Memoised because BookingCalendar keys its day-state work off these. Rebuilt
  // fresh every render they would invalidate that work on every keystroke
  // elsewhere in the sheet.
  const blockedSet = useMemo(() => new Set(blockedDates.map(b => b.date)), [blockedDates]);
  const DEFAULT_MAX = capacitySettings[0] ? parseInt(capacitySettings[0].value, 10) : 3;
  const getMaxForDay = useMemo(() => {
    const map = {};
    dayCapacities.forEach(d => { map[d.date] = d.capacity; });
    return (key) => map[key] ?? DEFAULT_MAX;
  }, [dayCapacities, DEFAULT_MAX]);

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
    ? <>Roko stays with you from <strong>prep through ceremony</strong>. Best for early starts, switch looks, or venues over an hour away.</>
    : isTrial
    ? <>A full run-through of your bridal look <strong>before the big day</strong>. Best 1 to 3 months out.</>
    : <>Your <strong>wedding-day makeup</strong>, designed for your features and built to last all day.</>;

  // Stable for the life of the sheet — a fresh Date on every render would make
  // the calendar re-derive everything (and re-bind its swipe listeners) whenever
  // anything else in the form changed.
  // Brides deliberately keep the 2-week window: the month rule exists to protect
  // her bridal calendar, so applying it to brides would defeat its own purpose.
  const minDate = useMemo(() => getMinBookingDate(BRIDAL_LEAD_DAYS), []);
  const [calDate, setCalDate] = useState(() => new Date(minDate.getFullYear(), minDate.getMonth()));
  const [selectedDate, setSelectedDate] = useState(null);
  // Mobile-only focus mode: fold everything except the calendar and the pinned
  // price + CTA, so picking a date is the only thing on screen. Jump the sheet
  // back to the top on either toggle — folding content out from ABOVE the
  // current scroll position would otherwise leave her staring at blank space.
  const [calFocus, setCalFocus] = useState(false);
  const toggleCalFocus = () => {
    setCalFocus(f => !f);
    requestAnimationFrame(() => scrollModalTop(document.querySelector('[data-modal-scroll]')));
  };
  // Read by the back handler, which is registered once and would otherwise close
  // over calFocus as it was on first render.
  const calFocusRef = useRef(false);
  useEffect(() => { calFocusRef.current = calFocus; }, [calFocus]);
  // The modal header labels its back arrow from this — while focused, that arrow
  // un-focuses rather than closing.
  useEffect(() => { onFocusChange?.(calFocus); }, [calFocus, onFocusChange]);
  // Booksy-style stepped flow: date → form → success
  const [step, setStep] = useState('date');
  const [direction, setDirection] = useState('forward');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newBookingId, setNewBookingId] = useState(null);
  const [uploadToken, setUploadToken] = useState(null);
  const [form, setForm] = useState({
    bride_name: '', soon_to_be_last_name: '', email: '', phone: '',
    instagram_handle: '', wedding_date: '', event_location: '', ready_location_type: undefined,
    event_start_time: '', photographer: '', hairstylist: '',
    bridal_party_glam: undefined, num_people_glam: '', additional_details: '', how_heard: '',
    ready_by_time: '', makeup_ready_by_time: '', photographer_arrival_time: '', out_of_state: undefined,
    destination_location: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const contractOverrides = useContractOverrides();

  // Switching packages mid-form, in place. The sheet's service lives in
  // BookingModal, so the swap goes up through onSwitchService and comes back down
  // as a new `service` prop — this component never unmounts, so every answer she
  // has already typed survives. `switchedToFullDay` is what tells her it happened:
  // the price nearly triples, and a silent change to the sticky footer is not an
  // acceptable way to find that out.
  const [switchedToFullDay, setSwitchedToFullDay] = useState(false);
  const switchToFullDay = () => {
    if (!fullDayService || !onSwitchService) return;
    onSwitchService(fullDayService);
    setSwitchedToFullDay(true);
  };

  // Party add-ons need a month. Derived from the date the bride actually picked,
  // so it re-evaluates if she goes back and moves her date.
  const partyAllowed = canAddParty(selectedDate);
  const daysToDate = daysUntil(selectedDate);

  // One human-readable answer for "who needs glam", stored + emailed so Roko always
  // sees either the bridal-party count or an explicit "Just the bride". When the
  // date is inside the party window Roko never asked the question, so the record
  // says exactly that instead of implying the bride chose to come alone.
  const glamSummary = !partyAllowed
    ? 'Just the bride (inside 1 month, party glam not offered)'
    : form.bridal_party_glam === true
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
  // Let the modal header's back arrow walk back out of the flow: focus mode →
  // sign → form → date. Returns whether it consumed the press, so the modal knows
  // when there is nothing left to back out of and it should close instead.
  useEffect(() => {
    registerBack?.(() => {
      // Focus mode is a view state, not a step. Backing out of it has to give the
      // full step-one page back rather than close the sheet, which is the whole
      // point of the collapse button being reversible.
      if (calFocusRef.current) { toggleCalFocus(); return true; }
      if (stepRef.current === 'sign') { goStep('form', 'back'); return true; }
      if (stepRef.current === 'form') { goStep('date', 'back'); return true; }
      return false;
    });
  }, [registerBack]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trials are always held at the studio, so there's no location question on the
  // form — we quietly stamp the studio as the location so the admin card + recap
  // + email still show where it's happening.
  useEffect(() => {
    if (isTrial) setForm(f => f.event_location ? f : { ...f, event_location: STUDIO_READY_VALUE });
  }, [isTrial]);

  // Grid building, day states and the pick guard now live in BookingCalendar.
  // Wedding dates are fixed, so a closed day (Mon/Thu) is still fair game past
  // the 2-week minimum — that's what allowClosedDays below turns on. Days Roko
  // has blocked off, or days already at capacity, stay unpickable: she genuinely
  // can't take those.

  const handleContinue = () => {
    if (!selectedDate) { alert(`Please select your ${dateNoun} date from the calendar.`); return; }
    goStep('form');
  };

  // Validate the details, then advance to the Review & Sign step.
  const handleGoToSign = () => {
    if (!form.bride_name) { alert('Please enter the bride\'s first name.'); return; }
    if (!form.soon_to_be_last_name) { alert('Please enter the last name.'); return; }
    if (!form.email) { alert('Please enter your email address.'); return; }
    if (!form.phone) { alert('Please enter your phone number.'); return; }
    if (!selectedDate) { alert(`Please select your ${dateNoun} date from the calendar.`); return; }
    // A trial is a studio appointment — the only detail we need here is her
    // preferred time (Roko confirms + can move it). No venue / vendor fields.
    if (isTrial) {
      if (!form.event_start_time) { alert('Please pick a preferred time for your trial.'); return; }
      goStep('sign');
      return;
    }
    // Required because Roko builds the whole day's timeline backwards from it.
    // Checked here, after the trial early-return, since a trial has no ready-by
    // and never renders the field. Ordered above the location and vendor checks
    // to match where it sits on the page.
    if (!form.makeup_ready_by_time) { alert('Please select what time you\'d like to be ready by.'); return; }
    // Full Day travels on-location; the standard Luxury Bridal Look asks "where
    // would you like to get ready?" (studio vs. somewhere else).
    if (isFullDay) {
      if (!form.event_location) { alert('Please enter the event location.'); return; }
    } else {
      if (!form.ready_location_type) { alert('Please choose where you\'d like to get ready.'); return; }
      if (form.ready_location_type === 'elsewhere' && !form.event_location) { alert('Please add the address or venue where you\'ll be getting ready.'); return; }
    }
    if (!form.ready_by_time) { alert('Please select when the hairstylist should arrive by.'); return; }
    // Both are Yes/No booleans that start undefined, so "unanswered" is == null
    // rather than falsy — a deliberate "No" is false and must pass.
    // Only required when the question was actually shown. Inside the 1-month
    // party window it isn't, so demanding an answer would dead-end the form.
    if (partyAllowed && form.bridal_party_glam == null) { alert('Please let Roko know if your bridal party needs glam too.'); return; }
    if (form.out_of_state == null) { alert('Please let Roko know if this is an out-of-state event.'); return; }
    // Destination travel is quoted per trip, and the quote starts with the city,
    // so this is the one out-of-state answer worth blocking on. Only asked (and
    // only required) when she said yes.
    if (form.out_of_state === true && !form.destination_location.trim()) {
      alert('Please let Roko know where the wedding is.'); return;
    }
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
          // A trial has no "ready by" — its one time is her preferred appointment
          // time (stored in event_start_time), so surface that instead.
          isTrial
            ? `Preferred time: ${form.event_start_time || 'Flexible'}`
            : `Ready by: ${form.makeup_ready_by_time || 'Not specified'}`,
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
    // vague "cash on the day". Only send it when price − deposit is the WHOLE
    // truth: an on-location Luxury booking also owes the travel fee, so quoting
    // the bare difference there would under-state what she brings in cash. Full
    // Day is priced with travel included, so it always gets an exact figure.
    const money = (s) => { const n = parseFloat(String(s || '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; };
    const _priceN = money(bridalPrice);
    const _depositN = money(bridalDeposit);
    const _hasTravelFee = !isFullDay && !isTrial
      && !!form.event_location && form.event_location !== STUDIO_READY_VALUE;
    const bridalRemaining = (!_hasTravelFee && _priceN != null && _depositN != null && _priceN > _depositN)
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
        bookingId: newBooking.id,
        bookingType: 'bridal',
        to: form.email,
        firstName: brideFirst,
        lastName: form.soon_to_be_last_name,
        phone: form.phone,
        instagram: form.instagram_handle,
        bridalTitle,
        bridalDeposit,
        bridalPrice,
        bridalRemaining,
        bridalDateFormatted,
        uploadUrl,
        eventLocation: form.event_location,
        eventStartTime: form.event_start_time,
        readyByTime: form.ready_by_time,
        makeupReadyByTime: form.makeup_ready_by_time,
        photographerArrival: form.photographer_arrival_time,
        photographer: form.photographer,
        hairstylist: form.hairstylist,
        numPeopleGlam: glamSummary,
        outOfState: form.out_of_state,
        destinationLocation: form.out_of_state ? form.destination_location : '',
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
      { label: isTrial ? 'Location' : 'Getting ready', value: form.event_location },
      { label: 'Preferred time', value: isTrial ? form.event_start_time : '' },
      { label: 'Ready by (your preference)', value: form.makeup_ready_by_time },
      { label: 'Hairstylist arrive by', value: form.ready_by_time },
      { label: 'Photographer arrives', value: form.photographer_arrival_time },
      // The bride sees the plain answer. The parenthetical on glamSummary is
      // for Roko's copy, so she knows the bride never turned a party down —
      // she was never offered one.
      { label: 'Who needs glam', value: partyAllowed ? glamSummary : 'Just you' },
      { label: 'Photographer', value: form.photographer },
      { label: 'Hairstylist', value: form.hairstylist },
      { label: 'Out-of-state event', value: form.out_of_state == null ? '' : form.out_of_state ? 'Yes' : 'No' },
      { label: 'Wedding destination', value: form.out_of_state ? form.destination_location : '' },
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

      {/* Compact identity strip — MOBILE ONLY.
          The desktop treatment below (150px photo banner + a separate price row)
          costs ~205px of vertical space, which on a phone is most of what stands
          between a bride and the calendar. Same three facts (which package, the
          price, the deposit) in one ~68px row. The sticky footer repeats the
          price permanently, so this stays deliberately quiet. */}
      <div
        className={`${calFocus && step === 'date' ? 'hidden' : 'flex sm:hidden'} items-center gap-3 px-4 py-2.5 border-b border-[#F5EDF1] flex-shrink-0 bg-white`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[0.48rem] font-bold tracking-[0.2em] uppercase text-[#CE9BAD] leading-none mb-1">You're booking</p>
          <p className="font-serif text-[0.98rem] leading-tight text-[#2C1A14] truncate">{bridalTitle}</p>
        </div>
        <div className="text-right flex-shrink-0 leading-tight">
          <p className="font-serif text-[0.95rem] text-[#111]">{bridalPrice}</p>
          <p className="text-[0.55rem] text-[#b5a99a] uppercase tracking-[0.08em]">{bridalDeposit}</p>
        </div>
      </div>

      {/* Hero Banner — the package name is the headline here, so a bride can
          never mistake which of the three bridal forms she's filling out.
          Desktop only; mobile gets the compact strip above. */}
      <div className="hidden sm:block relative h-[160px] overflow-hidden flex-shrink-0">
        <img src="/IMG_9891.jpeg" alt="Bridal" className="w-full h-full object-cover object-[center_30%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/55 to-black/35" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
          <p className="text-[0.55rem] sm:text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-[#F2CFD8]">You're booking</p>
          <h2 className="font-serif text-[1.5rem] sm:text-[2rem] leading-[1.1] font-normal mt-1.5 drop-shadow-sm">
            {bridalTitle}
          </h2>
          <p className="text-[0.7rem] sm:text-[0.78rem] text-white/75 mt-1.5">
            {isFullDay ? 'Your full day, flawlessly covered.'
              : isTrial ? 'Your preview before the big day.'
              : 'Your big day deserves perfection.'}
          </p>
        </div>
      </div>

      {/* Info strip — desktop only. On mobile its price/deposit pair is already
          in the compact strip above AND pinned in the footer; showing it a third
          time was pure noise. */}
      <div className="hidden sm:block bg-gray-50 border-b border-gray-100 px-6 py-3 flex-shrink-0">
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
                <p className="text-[0.78rem] font-medium text-[#111] leading-tight">Included</p>
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
          <div className="w-full max-w-[600px] lg:max-w-[720px] mx-auto p-4 lg:p-7 flex flex-col gap-4 lg:gap-5 relative overflow-hidden">

            {/* Glow accents */}
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-[0.07] pointer-events-none" style={{ background: 'radial-gradient(circle, #D4A0B0, transparent 70%)' }} />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.05] pointer-events-none" style={{ background: 'radial-gradient(circle, #B8A0D4, transparent 70%)' }} />

            {/* Everything between here and the calendar folds away in mobile
                focus mode. `contents` keeps the wrapper invisible to the parent
                flex layout, so the gap rhythm is identical either way; the
                `sm:contents` half means a desktop viewport always shows it all,
                regardless of the toggle's state. */}
            <div className={calFocus ? 'hidden sm:contents' : 'contents'}>

            {/* Calendar heading — the main event of step one. Scaled back on
                mobile (the 48px icon tile and 1.9rem serif were pushing the grid
                itself below the fold). */}
            <div className="flex items-center gap-3 lg:gap-3.5 relative z-10">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#D4A0B0]/12 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-5 h-5 lg:w-6 lg:h-6"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <p className="text-[0.58rem] lg:text-[0.62rem] font-semibold tracking-[0.18em] uppercase text-[#D4A0B0] mb-0.5">Select Your</p>
                <h3 className="font-serif text-[1.5rem] lg:text-[2.25rem] leading-none text-[#111]">{dateNounCap} <em className="not-italic text-[#D4A0B0]">Date</em></h3>
              </div>
            </div>

            {/* Lead-time notice — a quiet rule-and-line instead of the old
                heavy 2px-bordered box. Same information, roughly half the height,
                and it no longer competes with the heading above it. */}
            <div className="relative z-10 pl-3" style={{ borderLeft: '2px solid #E7C3D1' }}>
              <p className="text-[0.76rem] lg:text-[0.82rem] leading-[1.5] text-[#7a726c]">
                Bookable at least <strong className="text-[#444] font-semibold">2 weeks out</strong>. Earliest {isTrial ? 'trial' : 'wedding'} date: <strong className="text-[#444] font-semibold">{minDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong>
              </p>
            </div>

            {/* The consultation promise still has to reach a bride before she
                picks a date, but on a phone it's one quiet ✦ line rather than
                the bordered, gradient-filled dropdown it used to be — that read
                as a control competing with the calendar right below it, and ate
                the room the calendar needed. Same ✦ idiom as "What's Included"
                further down, so it sits with the page instead of shouting. */}
            {!isTrial && (
              <p className="sm:hidden relative z-10 flex items-start gap-1.5 text-[0.72rem] leading-[1.55] text-[#9a918b]">
                <span className="text-[#D4A0B0] text-[0.6rem] mt-[0.2rem] flex-shrink-0">✦</span>
                <span>Every bride gets a <span className="text-[#6E6660] font-medium">private consultation</span> about a month before her date.</span>
              </p>
            )}

            {/* How bridal works — the private consultation is a real, required
                step, so it has to be visible before she picks a date. Desktop has
                the room for the full two-step card; on mobile it's the one-line
                note above instead, so nothing sits between the heading and the
                calendar but plain text. */}
            {!isTrial && (
              <div className="hidden sm:block relative z-10 rounded-xl overflow-hidden" style={{ border: '1px solid #F2E6EC' }}>
                <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-2" style={{ background: 'linear-gradient(135deg,#FCF7F9,#FBF3F6)', borderBottom: '1px solid #F5E9EF' }}>
                  <p className="text-[0.55rem] font-bold tracking-[0.15em] uppercase text-[#CE9BAD]">Every bride gets a private consultation</p>
                </div>
                <div className="px-3.5 py-3 flex flex-col gap-2.5 bg-white">
                  {CONSULT_STEPS.map(({ n, dot, body }) => (
                    <div key={n} className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.62rem] font-bold text-white mt-px" style={{ background: dot }}>{n}</span>
                      <p className="text-[0.74rem] leading-[1.55] text-[#6E6660]">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            </div>{/* end fold-in-focus-mode */}

            {/* Calendar — shared with every other booking flow.
                allowClosedDays: a wedding lands on whatever day it lands on, so
                Mon/Thu stay pickable here even though the studio is normally
                closed then. */}
            <BookingCalendar
              value={calDate}
              onMonthChange={setCalDate}
              minDate={minDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              blockedSet={blockedSet}
              bookedDateMap={bookedDateMap}
              getMaxForDay={getMaxForDay}
              allowClosedDays
              focused={calFocus}
              onToggleFocus={toggleCalFocus}
              helperText="Weekdays included. Red dates are unavailable. Tap a date again to clear it."
            />

            {/* Below the calendar — also folded in focus mode. */}
            <div className={calFocus ? 'hidden sm:contents' : 'contents'}>

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

            </div>{/* end fold-in-focus-mode */}
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

            {/* Studio-only note for trials — prominent (its own card, right at the
                top of the details) but calm: soft border, muted pink accent, no
                loud fill. Replaces the old "Event Location" question entirely. */}
            {isTrial && (
              <div className="rounded-xl border border-[#EDDFE6] bg-[#FDFAFB] px-4 py-3.5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D4A0B0]/12 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.5" className="w-4 h-4">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#C4849A] mb-0.5">Held at Roko's Studio</p>
                  <p className="text-[0.82rem] leading-[1.6] text-[#6E6058]">
                    Trials are at Roko's studio in <strong className="text-[#4A423E]">Mountain House</strong>. Exact address once your date is confirmed.
                  </p>
                </div>
              </div>
            )}

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

            {isTrial ? (
              <>
                <div className="w-full h-px bg-gray-100" />

                {/* Preferred trial time — her preference; Roko sets + can move it
                    with the clean time picker in admin. The one timing field a
                    trial needs, so it gets the soft pink "about you" accent. */}
                <div className="relative pl-3.5">
                  <span className="absolute left-0 top-1 bottom-2 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg,#E8B4C6,#C4849A)' }} />
                  <label className="block text-[0.68rem] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: '#C4849A' }}>What time works best for you? *</label>
                  <TimePicker value={form.event_start_time} onChange={v => set('event_start_time', v)} placeholder="Select time" />
                  <p className="text-[0.75rem] sm:text-[0.8rem] text-gray-400 mt-1.5 leading-[1.6]">
                    Roko confirms the final time and can move it with you.
                  </p>
                </div>

                <div className="w-full h-px bg-gray-100" />

                {/* No "look you're going for" question here on purpose. The whole
                    point of a trial is to work the look out together in person, so
                    asking her to describe it up front is busywork. */}

                {/* Photos note — same personal upload-link flow, framed for the trial. */}
                <div>
                  <label className={labelClass}>Photos of You (With &amp; Without Makeup)</label>
                  <div className="relative pl-3.5 mt-1.5">
                    <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
                    <p className="inline-block text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1.5 px-1.5 py-0.5 rounded" style={{ color: '#B06883', background: 'rgba(196,132,154,0.1)' }}>After you reserve</p>
                    <p className="text-[0.82rem] leading-[1.7]" style={{ color: '#6E6058' }}>
                      You'll get a private upload link. Send one photo <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.76rem] font-semibold align-baseline" style={{ background: 'rgba(196,132,154,0.12)', color: '#B06883' }}>with makeup</span> and one <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.76rem] font-semibold align-baseline" style={{ background: 'rgba(196,132,154,0.12)', color: '#B06883' }}>without</span>, so Roko can plan your look. Nothing to upload here.
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
              </>
            ) : (
              <>
            <div className="w-full h-px bg-gray-100" />

            {/* Timing and location. The bride's ready-by preference leads, then
                where she'll get ready, then the vendor arrival times. Event start
                time was dropped: Roko builds the timeline around the ready-by. */}

            {/* The bride's own ready-by preference — the one timing field that's
                about her, so it gets a soft pink accent bar + plum label to stand
                out from the vendor times around it. */}
            <div className="relative pl-3.5">
              <span className="absolute left-0 top-1 bottom-2 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg,#E8B4C6,#C4849A)' }} />
              <label className="block text-[0.68rem] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: '#C4849A' }}>What time would you like to be ready by? *</label>
              <TimePicker value={form.makeup_ready_by_time} onChange={v => set('makeup_ready_by_time', v)} placeholder="Select time" />
              <p className="text-[0.75rem] sm:text-[0.8rem] text-gray-400 mt-1.5 leading-[1.6]">
                When you want your makeup finished. Roko builds the timeline around it.
              </p>
            </div>

            {/* Where she'll get ready — grouped right under the ready-by so the two
                "about you" questions sit together, above the vendor arrival times. */}
            {isFullDay ? (
              <div>
                {/* She arrived here by tapping the over-an-hour nudge on the Luxury
                    form, so the package under her just changed and the price nearly
                    tripled without the sheet reloading. Say so, plainly and where
                    she tapped, instead of leaving it to be noticed in the footer. */}
                {switchedToFullDay && (
                  <div className="mb-4 rounded-xl px-3.5 py-3" style={{ background: 'rgba(196,132,154,0.08)', border: '1px solid #EBC4D2', animation: 'fadeSlideDown 0.2s ease-out' }}>
                    <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: '#B06883' }}>Package switched</p>
                    <p className="text-[0.82rem] leading-[1.65]" style={{ color: '#4A423E' }}>
                      You're now booking the <strong>{bridalTitle}</strong>{activeService?.price ? <>, <strong>{activeService.price}</strong></> : null}, with travel included. Everything you'd already filled in has been kept.
                    </p>
                  </div>
                )}
                <label className={labelClass}>Where would you like to get ready? *</label>
                <p className="text-[0.75rem] text-gray-400 mt-0.5 mb-2">Hotel, home, or venue. Roko travels to you for full days.</p>
                <LocationAutocomplete value={form.event_location} onChange={v => set('event_location', v)} />
                <div className="mt-3 relative pl-3.5">
                  <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
                  <p className="inline-block text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1.5 px-1.5 py-0.5 rounded" style={{ color: '#B06883', background: 'rgba(196,132,154,0.1)' }}>Travel included</p>
                  <p className="text-[0.82rem] leading-[1.65]" style={{ color: '#6E6058' }}>
                    <strong style={{ color: '#4A423E' }}>No separate travel fee</strong>, it's already in the full-day price. Your balance is the price minus your deposit, in cash on the day.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Where would you like to get ready? *</label>
                <p className="text-[0.75rem] text-gray-400 mt-0.5 mb-2">Where Roko does your makeup, not necessarily the venue.</p>
                <div className="flex gap-3 mt-1">
                  {[
                    { key: 'studio', title: "Roko's studio", sub: 'Mountain House' },
                    { key: 'elsewhere', title: 'Somewhere else', sub: 'Hotel, home or venue' },
                  ].map(opt => {
                    const active = form.ready_location_type === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          set('ready_location_type', opt.key);
                          // Keep event_location in lockstep: studio stores the readable
                          // studio label, "somewhere else" clears it for the bride to type.
                          set('event_location', opt.key === 'studio' ? STUDIO_READY_VALUE : '');
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl border text-left transition-all ${
                          active ? 'bg-[#111] border-[#111]' : 'bg-white border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <span className={`block text-[0.82rem] font-medium ${active ? 'text-white' : 'text-[#333]'}`}>{opt.title}</span>
                        <span className={`block text-[0.66rem] mt-0.5 ${active ? 'text-white/65' : 'text-gray-400'}`}>{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {form.ready_location_type === 'elsewhere' && (
                  <div className="mt-3.5" style={{ animation: 'fadeSlideDown 0.2s ease-out' }}>
                    <label className={labelClass}>Where will you be getting ready? *</label>
                    <LocationAutocomplete value={form.event_location} onChange={v => set('event_location', v)} />
                    {/* Out of state is quoted per trip (flights, hotel, add-on person),
                        so neither the local $200 nor the over-an-hour Full Day rule
                        applies. Leaving the $200 note up for a destination bride quotes
                        her a number that was never hers. */}
                    {form.out_of_state === true ? (
                      <div className="mt-3 relative pl-3.5">
                        <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
                        <p className="inline-block text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1.5 px-1.5 py-0.5 rounded" style={{ color: '#B06883', background: 'rgba(196,132,154,0.1)' }}>Destination event</p>
                        <p className="text-[0.82rem] leading-[1.65]" style={{ color: '#6E6058' }}>
                          The local <strong style={{ color: '#4A423E' }}>$200</strong> travel fee doesn't apply out of state. Roko quotes destination travel per trip, see the requirements further down.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 relative pl-3.5">
                        <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
                        <p className="inline-block text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1.5 px-1.5 py-0.5 rounded" style={{ color: '#B06883', background: 'rgba(196,132,154,0.1)' }}>Travel fee</p>
                        <p className="text-[0.82rem] leading-[1.65]" style={{ color: '#6E6058' }}>
                          <strong style={{ color: '#4A423E' }}>$200</strong> within about an hour of Mountain House. Added to your balance, in cash on the day.
                        </p>
                        {/* Past an hour isn't a bigger travel fee, it's a different
                            service: Full Day is already required for venues over an
                            hour out (see ServiceFAQ + FullDayIncludes). That rule
                            existed everywhere except the one screen where it matters,
                            right after she types a far-away address, so a Sacramento
                            or LA bride could book the wrong package and only find out
                            when Roko called her. */}
                        {fullDayService && onSwitchService && (
                          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(196,132,154,0.2)' }}>
                            <p className="text-[0.82rem] leading-[1.65]" style={{ color: '#6E6058' }}>
                              Getting ready more than an hour away? That's the <strong style={{ color: '#4A423E' }}>Full Day Service</strong> instead, travel included.
                            </p>
                            <button
                              type="button"
                              onClick={switchToFullDay}
                              className="mt-2.5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[0.8rem] font-medium text-white transition-all active:scale-[0.97] touch-manipulation"
                              style={{ background: '#111' }}
                            >
                              Switch to Full Day{fullDayService.price ? ` · ${fullDayService.price}` : ''}
                              <span aria-hidden="true">→</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {form.ready_location_type === 'studio' && (
                  <div className="mt-3 relative pl-3.5" style={{ animation: 'fadeSlideDown 0.2s ease-out' }}>
                    <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
                    <p className="inline-block text-[0.58rem] font-bold tracking-[0.16em] uppercase mb-1.5 px-1.5 py-0.5 rounded" style={{ color: '#B06883', background: 'rgba(196,132,154,0.1)' }}>You're all set</p>
                    <p className="text-[0.82rem] leading-[1.65]" style={{ color: '#6E6058' }}>
                      Roko's studio in Mountain House. Exact address once your date is confirmed.
                    </p>
                  </div>
                )}
              </div>
            )}

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
                Roko won't glam at the same time as another hairstylist, so she works around when yours arrives. (Unless it's <a href="https://instagram.com/hairbyshak_" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: '#C4849A', textDecorationColor: '#E8C4D0' }}>@hairbyshak_</a>.)
              </p>
            </div>

            <div>
              <label className={labelClass}>Photographer</label>
              <input value={form.photographer} onChange={e => set('photographer', e.target.value)} placeholder="Share their Instagram" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Hairstylist (Instagram)</label>
              <input value={form.hairstylist} onChange={e => set('hairstylist', e.target.value)} placeholder="Share their Instagram" className={inputClass} />
            </div>

            {/* A bridal party needs a month's notice: more chairs means more
                hours and more product than Roko can absorb late. Inside that
                window the question isn't asked at all rather than asked and
                then refused, so a bride is never offered something that gets
                taken back. She can still book herself, which is the point. */}
            {partyAllowed ? (
              <div>
                <label className={labelClass}>Does your bridal party need glam too? *</label>
                <p className="text-[0.75rem] text-gray-400 mt-0.5 mb-2">Bridesmaids, mom, anyone else getting glammed with you.</p>
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
            ) : (
              <div>
                <label className={labelClass}>Bridal party glam</label>
                <div className="relative pl-3.5 mt-1.5">
                  <span className="absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full" style={{ background: '#EBC4D2' }} />
                  {/* Lead with the RULE, not the arithmetic. "14 days out ·
                      needs 30" made the bride solve for the rule herself; she
                      has to be told outright that party glam is booked a month
                      ahead. Her own date comes second, as the reason it doesn't
                      apply to her. */}
                  <p className="text-[0.88rem] font-semibold mb-1" style={{ color: '#B06883' }}>
                    Must be booked 30+ days in advance
                  </p>
                  <p className="text-[0.82rem] leading-[1.6]" style={{ color: '#6E6058' }}>
                    Your {dateNoun} is {daysToDate != null ? `${daysToDate} ${daysToDate === 1 ? 'day' : 'days'} away` : 'sooner than that'}, so this covers you only. Want your party glammed? Add a note below.
                  </p>
                </div>
              </div>
            )}

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
                  You'll get a private upload link. Send one photo <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.76rem] font-semibold align-baseline" style={{ background: 'rgba(196,132,154,0.12)', color: '#B06883' }}>with makeup</span> and one <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.76rem] font-semibold align-baseline" style={{ background: 'rgba(196,132,154,0.12)', color: '#B06883' }}>without</span>, so Roko can pick the right products for you. Required, but not on this form.
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
              <label className={labelClass}>Is this an out-of-state event? *</label>
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

              {/* The destination, asked the moment she says yes and before the cost
                  breakdown, because it's the fact every line of that breakdown is
                  priced from. It used to have nowhere to go: brides who mentioned it
                  buried it in the makeup-vision box, and the rest left Roko emailing
                  to ask where she'd be flying. Free text, not the Places
                  autocomplete: at inquiry time the venue is often still "somewhere
                  outside Austin". */}
              {form.out_of_state === true && (
                <div className="mt-3.5" style={{ animation: 'fadeSlideDown 0.2s ease-out' }}>
                  <label className={labelClass}>Where's the wedding? *</label>
                  <input
                    value={form.destination_location}
                    onChange={e => set('destination_location', e.target.value)}
                    placeholder="City & state, e.g. Austin, Texas"
                    className={inputClass}
                  />
                  <p className="text-[0.75rem] text-gray-400 mt-1.5 leading-[1.6]">
                    Where Roko would be travelling to. It's what she prices the trip from.
                  </p>
                </div>
              )}

              {form.out_of_state === true && (
                <div className="mt-3 bg-white border border-[#E2C4D2] rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-0.5">Out-of-State Requirements</p>
                  <p className="text-[0.75rem] text-[#555] leading-[1.7]">
                    Roko loves destination events! You'd cover:
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
                      For pricing, email{' '}
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
              </>
            )}

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
              busyLabel="Sending your inquiry…"
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
