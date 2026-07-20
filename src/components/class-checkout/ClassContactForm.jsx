import { useRef } from 'react';
import { useModalLenis, scrollModalToEl } from '@/lib/modalLenis';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { firstBookableWednesday } from '@/lib/classSchedule';
import { CLASS_FORMATS, CLASS_DAY, startWindows } from '@/lib/classCatalog';
import { parseRange } from '@/lib/timeWindow';
import { formatPhone } from '@/lib/phone';
import ClassWednesdayPicker from './ClassWednesdayPicker';
import { PLUM } from './classTheme';
import ClassStepper from './ClassStepper';

const inputStyle = {
  width: '100%',
  padding: '10px 0',
  paddingBottom: '10px',
  borderBottom: `1px solid ${PLUM.border}`,
  fontSize: '16px', // prevents iOS zoom
  outline: 'none',
  background: 'transparent',
  color: '#1a1015',
  fontFamily: 'inherit',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  borderRadius: 0,
  WebkitAppearance: 'none',
  appearance: 'none',
};

const inputFocusHandler = (e) => { e.target.style.borderBottomColor = PLUM.rose; };
const inputBlurHandler = (e) => { e.target.style.borderBottomColor = PLUM.border; };

function formatChosen(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch { return ''; }
}

// Small numbered badge so the three things this screen asks for read as an
// ordered list, not three panels that happen to sit near each other. `state`
// drives the colour: done (filled rose), active (outlined ink), waiting (grey).
function StepBadge({ n, state }) {
  const style = state === 'done'
    ? { background: PLUM.rose, color: '#fff', borderColor: PLUM.rose }
    : state === 'active'
      ? { background: PLUM.ink, color: '#fff', borderColor: PLUM.ink }
      : { background: 'transparent', color: PLUM.grayLt, borderColor: PLUM.border };
  return (
    <span
      className="w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[0.58rem] font-bold flex-shrink-0 transition-all"
      style={style}
    >
      {state === 'done'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : n}
    </span>
  );
}

const PICKED_ICONS = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
};

// Mobile-only receipt of what the previous steps captured. The auto-scroll moves
// the calendar off screen the instant you tap a day, so without this you arrive
// at the next step with no idea what you just picked. Reads as a small booking
// card (label above, answer in serif below) rather than a notification banner —
// this is your booking taking shape, so it should look like it. Desktop keeps
// both columns and the order summary in view, so it doesn't need the repeat.
function PickedCard({ items }) {
  return (
    <div className="lg:hidden rounded-2xl overflow-hidden mb-5"
      style={{ background: '#fff', border: `1px solid ${PLUM.border}`, boxShadow: '0 4px 18px rgba(17,17,17,0.05)' }}>
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-3 px-4 py-3"
          style={i > 0 ? { borderTop: `1px solid ${PLUM.borderSoft}` } : undefined}>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(196,132,154,0.12)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={PLUM.rose} strokeWidth="1.7"
              strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
              {PICKED_ICONS[it.icon]}
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.53rem] font-semibold tracking-[0.14em] uppercase" style={{ color: PLUM.rose }}>{it.label}</p>
            <p className="font-serif text-[0.98rem] leading-tight mt-0.5 truncate" style={{ color: '#1a1015' }}>{it.value}</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke={PLUM.rose} strokeWidth="3" className="w-3.5 h-3.5 flex-shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      ))}
    </div>
  );
}

// Matches Tailwind's lg breakpoint, where the layout splits into two columns
// and the details column becomes pinned.
const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

export default function ClassContactForm({ form, setForm, selectedClass, format, selectedDate, setSelectedDate, selectedSlot, setSelectedSlot, onBack, onClose, onCheckout, isRedirecting }) {
  const scrollRef = useRef(null);
  const timeRef = useRef(null);
  const detailsRef = useRef(null);
  const firstNameRef = useRef(null);
  useModalLenis(scrollRef);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fieldsValid = form.first_name && form.last_name && form.email && form.phone;
  const isValid = fieldsValid && !!selectedDate && !!selectedSlot;
  const price = selectedClass?.price || 0;
  const formatMeta = CLASS_FORMATS[format];

  // Every start window that fits this class inside Roko's 11 AM to 7 PM day.
  const windows = selectedClass ? startWindows(selectedClass.key, format) : [];
  const lastStart = windows.length ? parseRange(windows[windows.length - 1]).start : '';

  // One client per Wednesday, and only Wednesdays at least two weeks out.
  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
    initialData: [],
  });
  const { data: bookedData } = useQuery({
    queryKey: ['class-booked-dates'],
    queryFn: () => fetch('/api/class-booked-dates').then(r => r.json()),
    initialData: { dates: [] },
  });
  const blockedSet = new Set(blockedDates.map(b => b.date));
  const bookedSet = new Set(bookedData?.dates || []);
  const firstOpenKey = firstBookableWednesday();

  // Picking a date used to leave the screen dead still, with the start-time grid
  // parked below the fold on mobile and easy to read past on desktop. Each pick
  // now walks the client to whatever it unlocked.
  // Just enough of a beat to see the day turn black before the view moves —
  // scrolling in the same frame reads as "did that even register?", but any
  // longer and the tap feels laggy. The move itself is quick too.
  const goTo = (ref, delay = 0) => {
    const el = ref.current;
    if (!el) return;
    setTimeout(() => scrollModalToEl(scrollRef.current, el, -12, 0.4), delay);
  };

  const pickDate = (key) => {
    setSelectedDate(key);
    if (key && !selectedSlot) goTo(timeRef, 130);
  };

  // Step 3 lives in the pinned column on desktop, so it's already on screen —
  // scrolling to it would drag the whole page back to the top. Put the cursor
  // in the first field instead. Mobile still has to travel down to reach it.
  const goToDetails = (delay = 0) => {
    if (isDesktop()) {
      setTimeout(() => firstNameRef.current?.focus({ preventScroll: true }), delay);
    } else {
      goTo(detailsRef, delay);
    }
  };

  const pickSlot = (win) => {
    const next = selectedSlot === win ? null : win;
    setSelectedSlot(next);
    if (next && !fieldsValid) goToDetails(130);
  };

  // What the footer button does when the form isn't finished yet: instead of
  // sitting there greyed out, it sends you to the thing that's still missing.
  const nextStep = !selectedDate ? null
    : !selectedSlot ? { label: 'Next: pick your start time', go: () => goTo(timeRef) }
    : !fieldsValid ? { label: 'Next: fill in your details', go: () => goToDetails() }
    : null;

  return (
    <>
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 sm:px-10 py-4 sm:py-5"
        style={{ borderBottom: `1px solid ${PLUM.border}` }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: PLUM.tint2, color: PLUM.plum }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <span className="font-serif text-[1.1rem] tracking-tight text-[#1a1015] block leading-tight">Your Wednesday &amp; Details</span>
            <span className="text-[0.62rem] tracking-wide" style={{ color: PLUM.gray }}>Pick a date, a time, and tell Roko about you</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: PLUM.tint2, color: PLUM.plum }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="w-full sm:max-w-[980px] sm:mx-auto px-5 sm:px-10 pt-6 pb-10">

          <ClassStepper current={3} className="mb-7" />

          <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-8 lg:gap-12">

            {/* ── Left: Wednesday + start time ── */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StepBadge n={1} state={selectedDate ? 'done' : 'active'} />
                <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase" style={{ color: PLUM.pink }}>Choose your date</p>
              </div>
              <h2 className="font-serif text-[1.5rem] text-[#1a1015] mb-1">Pick a Wednesday</h2>
              <p className="text-[0.82rem] leading-[1.7] mb-5" style={{ color: PLUM.gray }}>
                One client per Wednesday, so the whole day is yours. Any Wednesday at least two weeks out is open, page ahead to any date you like.
              </p>

              <ClassWednesdayPicker
                selectedDate={selectedDate}
                onSelectDate={pickDate}
                firstOpenKey={firstOpenKey}
                bookedSet={bookedSet}
                blockedSet={blockedSet}
              />

              {/* Start time within the 11 AM – 7 PM class day. Held back until a
                  Wednesday exists so step 2 reads as the thing the date unlocks. */}
              <div ref={timeRef} className="mt-6 scroll-mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <StepBadge n={2} state={selectedSlot ? 'done' : selectedDate ? 'active' : 'waiting'} />
                  <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: selectedDate ? PLUM.pink : PLUM.grayLt }}>Choose your time</p>
                </div>
                <h3 className="font-serif text-[1.2rem] mb-1" style={{ color: selectedDate ? '#1a1015' : PLUM.gray }}>Pick a start time</h3>
                <p className="text-[0.78rem] leading-[1.7] mb-4" style={{ color: PLUM.gray }}>
                  {selectedDate
                    ? <>Class hours are {CLASS_DAY.label}. Your {selectedClass?.duration?.toLowerCase()} can start any time from 11:00 AM{lastStart ? ` to ${lastStart}` : ''}.</>
                    : 'Pick your Wednesday above and your start times will open up here.'}
                </p>
                {selectedDate && (
                  <PickedCard items={[
                    { icon: 'calendar', label: 'Your Wednesday', value: formatChosen(selectedDate) },
                  ]} />
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 transition-opacity"
                  style={{ opacity: selectedDate ? 1 : 0.4 }}>
                  {windows.map(win => {
                    const start = parseRange(win).start;
                    const isSel = selectedSlot === win;
                    return (
                      <button
                        key={win}
                        type="button"
                        disabled={!selectedDate}
                        onClick={() => pickSlot(win)}
                        className="py-2.5 rounded-xl text-[0.78rem] font-medium tabular-nums transition-all border touch-manipulation"
                        style={isSel
                          ? { background: PLUM.ink, color: '#fff', borderColor: PLUM.ink, boxShadow: '0 4px 16px rgba(42,22,32,0.2)' }
                          : { background: PLUM.tint, color: PLUM.deep, borderColor: PLUM.border, cursor: selectedDate ? 'pointer' : 'not-allowed' }}
                      >
                        {start}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* No recap chip here any more: it sat below the time grid, which
                  is exactly where the scroll port cuts off, so it read as
                  clipped. Mobile gets the PickedCard on step 3; desktop reads it
                  off the pinned order summary, which is always in view. */}
            </div>

            {/* ── Right: details + order summary ──
                Pinned on desktop. Unpinned, the form sat at the top of its
                column, so working down the calendar scrolled it away and
                "fill in your details" had to throw you back to the top. Pinned,
                it just stays beside you and the up-down-up never happens. */}
            <div className="flex flex-col gap-8 lg:sticky lg:top-1 lg:self-start">
              <div ref={detailsRef} className="scroll-mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <StepBadge n={3} state={fieldsValid ? 'done' : selectedSlot ? 'active' : 'waiting'} />
                  <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase" style={{ color: PLUM.pink }}>Your details</p>
                </div>
                <h2 className="font-serif text-[1.5rem] text-[#1a1015] mb-4">Your Information</h2>
                {selectedDate && selectedSlot && (
                  <PickedCard items={[
                    { icon: 'calendar', label: 'Your Wednesday', value: formatChosen(selectedDate) },
                    { icon: 'clock', label: 'Start time', value: selectedSlot },
                  ]} />
                )}

                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM.label }}>First Name *</label>
                      <input ref={firstNameRef} required value={form.first_name} onChange={e => set('first_name', e.target.value)}
                        onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="Jane" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM.label }}>Last Name *</label>
                      <input required value={form.last_name} onChange={e => set('last_name', e.target.value)}
                        onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="Smith" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM.label }}>Email Address *</label>
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="you@email.com" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM.label }}>Phone Number *</label>
                    <input required type="tel" value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))}
                      onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="(555) 000-0000" style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-1.5" style={{ color: PLUM.label }}>Additional Notes</label>
                    <textarea value={form.additional_notes} onChange={e => set('additional_notes', e.target.value)}
                      onFocus={inputFocusHandler} onBlur={inputBlurHandler}
                      placeholder="Anything else Roko should know…" rows={3} style={{ ...inputStyle, resize: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Order summary — paid in full */}
              <div className="rounded-2xl overflow-hidden" style={{ background: PLUM.tint, border: `1px solid ${PLUM.border}` }}>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${PLUM.border}`, background: PLUM.tint2 }}>
                  <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase mb-1" style={{ color: PLUM.plum }}>Due Today · Paid in Full</p>
                  <p className="font-serif text-[1.8rem] leading-none" style={{ color: '#1a1015' }}>${price.toLocaleString()}</p>
                  <p className="text-[0.65rem] mt-2" style={{ color: PLUM.gray }}>Apple Pay · Google Pay · all major cards, via Stripe</p>
                </div>
                {selectedClass && (
                  <div className="px-5 py-3 flex items-center justify-between text-[0.72rem]" style={{ borderBottom: (selectedDate || selectedSlot) ? `1px solid ${PLUM.borderSoft}` : 'none' }}>
                    <span style={{ color: PLUM.deep }}>{selectedClass.title} <span style={{ color: PLUM.gray }}>· {formatMeta?.short}</span></span>
                    <span className="font-medium" style={{ color: '#1a1015' }}>${selectedClass.price.toLocaleString()}</span>
                  </div>
                )}
                {(selectedDate || selectedSlot) && (
                  <div className="px-5 py-3 flex items-center justify-between text-[0.68rem]">
                    <span style={{ color: PLUM.gray }}>{selectedDate ? formatChosen(selectedDate) : 'Pick a Wednesday'}</span>
                    <span className="tabular-nums" style={{ color: PLUM.gray }}>{selectedSlot || ''}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky footer CTA */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: `1px solid ${PLUM.border}`, background: '#fff', padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full sm:max-w-[980px] sm:mx-auto">
          <button
            onClick={() => {
              if (isValid) { onCheckout(); return; }
              nextStep?.go();
            }}
            disabled={(!isValid && !nextStep) || isRedirecting}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all flex items-center justify-center gap-2"
            style={isValid && !isRedirecting
              ? { background: PLUM.ink, color: '#fff', boxShadow: '0 4px 20px rgba(42,22,32,0.22)' }
              // Something's still missing but we know where it is — keep the
              // button live so it can carry them there instead of stonewalling.
              : nextStep
                ? { background: '#fff', color: PLUM.deep, border: `1px solid ${PLUM.rose}`, boxShadow: '0 2px 12px rgba(42,22,32,0.06)' }
                : { background: PLUM.disabled, color: PLUM.grayLt, cursor: 'not-allowed' }
            }
          >
            {isValid ? 'Continue to Review →'
              : nextStep
                ? <>{nextStep.label}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 animate-bounce">
                      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                    </svg>
                  </>
                : 'Choose your Wednesday to continue'}
          </button>
          <p className="text-[0.65rem] text-center mt-2" style={{ color: PLUM.gray }}>
            Next: review &amp; sign, then secure checkout <span style={{ color: PLUM.pink }}>✦</span>
          </p>
        </div>
      </div>
    </>
  );
}
