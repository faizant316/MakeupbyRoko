import { useRef } from 'react';
import { useModalLenis } from '@/lib/modalLenis';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { upcomingWednesdays } from '@/lib/classSchedule';
import { CLASS_FORMATS, CLASS_DAY, startWindows } from '@/lib/classCatalog';
import { parseRange } from '@/lib/timeWindow';
import ClassWednesdayPicker from './ClassWednesdayPicker';

const inputStyle = {
  width: '100%',
  padding: '10px 0',
  paddingBottom: '10px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '16px', // prevents iOS zoom
  outline: 'none',
  background: 'transparent',
  color: '#111',
  fontFamily: 'inherit',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  borderRadius: 0,
  WebkitAppearance: 'none',
  appearance: 'none',
};

const inputFocusHandler = (e) => { e.target.style.borderBottomColor = '#D4A0B0'; };
const inputBlurHandler = (e) => { e.target.style.borderBottomColor = '#e5e7eb'; };

function formatChosen(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch { return ''; }
}

export default function ClassContactForm({ form, setForm, selectedClass, format, selectedDate, setSelectedDate, selectedSlot, setSelectedSlot, onBack, onClose, onCheckout, isRedirecting }) {
  const scrollRef = useRef(null);
  useModalLenis(scrollRef);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fieldsValid = form.first_name && form.last_name && form.email && form.phone;
  const isValid = fieldsValid && !!selectedDate && !!selectedSlot;
  const price = selectedClass?.price || 0;
  const formatMeta = CLASS_FORMATS[format];

  // Every start window that fits this class inside Roko's 11 AM to 7 PM day.
  const windows = selectedClass ? startWindows(selectedClass.key, format) : [];
  const lastStart = windows.length ? parseRange(windows[windows.length - 1]).start : '';

  // Roko's rules: one client per Wednesday, and only the next 2 open
  // Wednesdays are bookable. Booked/blocked dates roll the options forward so
  // clients always see 2 real choices.
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
  const wednesdays = upcomingWednesdays({ blockedSet: new Set([...blockedSet, ...bookedSet]) });

  return (
    <>
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 sm:px-10 py-4 sm:py-5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#999] hover:text-[#111] transition-all"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <span className="font-serif text-[1.1rem] tracking-tight text-[#111] block leading-tight">Your Wednesday &amp; Details</span>
            <span className="text-[0.62rem] text-[#c5bdb5] tracking-wide">Pick a date, a time, and tell Roko about you</span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#999] hover:text-[#111] transition-all"
          style={{ background: 'rgba(0,0,0,0.06)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="w-full sm:max-w-[980px] sm:mx-auto px-6 sm:px-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* ── Left: Wednesday + start time ── */}
            <div>
              <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Step 1 — Choose Your Date</p>
              <h2 className="font-serif text-[1.5rem] text-[#111] mb-1">Pick a Wednesday</h2>
              <p className="text-[0.82rem] text-gray-400 leading-[1.7] mb-5">
                One client per Wednesday, so the whole day is yours. Roko opens the next two dates at a time.
              </p>

              <ClassWednesdayPicker
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                openDates={wednesdays}
                bookedSet={bookedSet}
                blockedSet={blockedSet}
              />

              {/* Start time within the 11 AM – 7 PM class day */}
              <div className="mt-6">
                <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Step 2 — Choose Your Time</p>
                <h3 className="font-serif text-[1.2rem] text-[#111] mb-1">Pick a start time</h3>
                <p className="text-[0.78rem] text-gray-400 leading-[1.7] mb-4">
                  Class hours are {CLASS_DAY.label}. Your {selectedClass?.duration?.toLowerCase()} can start any time from 11:00 AM{lastStart ? ` to ${lastStart}` : ''}.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {windows.map(win => {
                    const start = parseRange(win).start;
                    const isSel = selectedSlot === win;
                    return (
                      <button
                        key={win}
                        type="button"
                        onClick={() => setSelectedSlot(isSel ? null : win)}
                        className="py-2.5 rounded-xl text-[0.78rem] font-medium tabular-nums transition-all border touch-manipulation"
                        style={isSel
                          ? { background: '#111', color: '#fff', borderColor: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.16)' }
                          : { background: '#FAFAF9', color: '#333', borderColor: '#ede8e4' }}
                      >
                        {start}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDate && selectedSlot && (
                <div className="mt-5 flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(212,160,176,0.1)', border: '1px solid rgba(212,160,176,0.35)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-[0.8rem] text-[#A0607A] font-medium">{formatChosen(selectedDate)} · {selectedSlot}</span>
                </div>
              )}
            </div>

            {/* ── Right: details + order summary ── */}
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Step 3 — Your Details</p>
                <h2 className="font-serif text-[1.5rem] text-[#111] mb-4">Your Information</h2>

                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">First Name *</label>
                      <input required value={form.first_name} onChange={e => set('first_name', e.target.value)}
                        onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="Jane" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Last Name *</label>
                      <input required value={form.last_name} onChange={e => set('last_name', e.target.value)}
                        onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="Smith" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Email Address *</label>
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="you@email.com" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Phone Number *</label>
                    <input required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                      onFocus={inputFocusHandler} onBlur={inputBlurHandler} placeholder="(555) 000-0000" style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Additional Notes</label>
                    <textarea value={form.additional_notes} onChange={e => set('additional_notes', e.target.value)}
                      onFocus={inputFocusHandler} onBlur={inputBlurHandler}
                      placeholder="Anything else Roko should know…" rows={3} style={{ ...inputStyle, resize: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Order summary — paid in full */}
              <div className="rounded-xl border border-[#e8e2dc]" style={{ background: '#FAFAF9' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #ede8e4' }}>
                  <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#A0785A] mb-1">Due Today (Paid in Full)</p>
                  <p className="font-serif text-[1.7rem] text-[#111] leading-none">${price.toLocaleString()}</p>
                  <p className="text-[0.65rem] text-gray-400 mt-2">Apple Pay · Google Pay · All major cards, via Stripe</p>
                </div>
                {selectedClass && (
                  <div className="px-5 py-3 flex items-center justify-between text-[0.72rem]">
                    <span className="text-gray-500">{selectedClass.title} <span className="text-gray-400">· {formatMeta?.short}</span></span>
                    <span className="font-medium text-[#111]">${selectedClass.price.toLocaleString()}</span>
                  </div>
                )}
                {(selectedDate || selectedSlot) && (
                  <div className="px-5 pb-3 -mt-1 flex items-center justify-between text-[0.68rem]">
                    <span className="text-gray-400">{selectedDate ? formatChosen(selectedDate) : 'Pick a Wednesday'}</span>
                    <span className="text-gray-400 tabular-nums">{selectedSlot || ''}</span>
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
        style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: '#fff', padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full sm:max-w-[980px] sm:mx-auto">
          <button
            onClick={() => isValid && onCheckout()}
            disabled={!isValid || isRedirecting}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all flex items-center justify-center gap-2"
            style={isValid && !isRedirecting
              ? { background: '#111', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
              : { background: '#f0ece8', color: '#bbb', cursor: 'not-allowed' }
            }
          >
            {!selectedDate ? 'Choose your Wednesday to continue'
              : !selectedSlot ? 'Choose your start time to continue'
              : !fieldsValid ? 'Fill in your details to continue'
              : 'Continue to Review →'}
          </button>
          <p className="text-[0.65rem] text-center text-gray-400 mt-2">
            Next: review &amp; sign, then secure checkout <span className="text-[#D4A0B0]">✦</span>
          </p>
        </div>
      </div>
    </>
  );
}
