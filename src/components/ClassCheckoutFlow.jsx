import { useState, useEffect } from 'react';
import { useScrollLock, useHideSiteNav } from '@/lib/useScrollLock';
import ClassFormatStep from './class-checkout/ClassFormatStep';
import ClassSelector from './class-checkout/ClassSelector';
import ClassContactForm from './class-checkout/ClassContactForm';
import ClassSuccessScreen from './ClassSuccessScreen';
import ContractSign from './ContractSign';
import { buildContract } from '@/lib/contract';
import { useContractOverrides } from '@/lib/useContractOverrides';
import { CLASS_KEYS, CLASS_FORMATS, classMeta } from '@/lib/classCatalog';

// "2026-07-15" → "Wednesday, July 15, 2026"
function formatChosenDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
}

const STORAGE_KEY = 'roko_class_checkout';

export default function ClassCheckoutFlow({ onClose }) {
  const [step, setStep] = useState('format'); // format → select → details → sign → success
  const [format, setFormat] = useState(null); // 'online' | 'in_person'
  const [selected, setSelected] = useState(null); // single class key
  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD' Wednesday
  const [selectedSlot, setSelectedSlot] = useState(null); // e.g. '11:00 AM – 2:00 PM'
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', additional_notes: '' });
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const contractOverrides = useContractOverrides();

  // Lock the page behind the modal + stop page-level Lenis so the modal's own
  // scroll containers can take over the wheel.
  useScrollLock();
  // Same as the booking sheet: full-screen flow with its own header, so the
  // fixed site nav above it is only stealing height.
  useHideSiteNav();

  // Check for success/cancel return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id') && params.get('reg_id')) {
      const sessionId = params.get('session_id');
      const regId = params.get('reg_id');

      // Restore registration data from sessionStorage so success screen has itemized info
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try { setSuccessData(JSON.parse(stored)); } catch {}
        sessionStorage.removeItem(STORAGE_KEY);
      }

      setStep('success');

      // Confirm payment + trigger emails in background
      fetch('/api/confirm-class-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, registration_id: regId }),
      }).catch(console.error);

      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('cancelled') === 'true') {
      setStep('cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Slots differ per class + format, so a stale pick must never survive a switch.
  const pickFormat = (f) => { setFormat(f); setSelectedSlot(null); };
  const pickClass = (k) => { setSelected(k); setSelectedSlot(null); };

  const selectedClass = selected && format ? classMeta(selected, format) : null;
  const totalFull = selectedClass?.price || 0;
  const formatMeta = format ? CLASS_FORMATS[format] : null;

  // Filled class agreement for the Review & Sign step (paid in full at checkout).
  const classContract = buildContract({
    kind: 'class',
    clientName: `${form.first_name} ${form.last_name}`.trim(),
    serviceName: selectedClass ? `${selectedClass.title} (${formatMeta.label})` : 'your class',
    dateFormatted: selectedDate ? formatChosenDate(selectedDate) : undefined,
    time: selectedSlot || '',
    priceAmount: `$${totalFull}`,
    locationType: 'studio',
    overrides: contractOverrides,
  });

  const handleCheckout = async (sig) => {
    setIsRedirecting(true);
    try {
      const origin = window.location.origin;
      const path = window.location.pathname;

      const res = await fetch('/api/create-class-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: `${form.first_name} ${form.last_name}`.trim(),
          email: form.email,
          phone: form.phone,
          additional_notes: (form.additional_notes || '').trim() || null,
          selected_classes: selected ? [selected] : [],
          class_format: format,
          preferred_date: selectedDate || null,
          preferred_time: selectedSlot || null,
          success_url: `${origin}/payment-success`,
          cancel_url: `${origin}${path}`,
          contract_signed: sig ? true : undefined,
          contract_signed_name: sig?.name,
          contract_signed_at: sig?.signedAt,
          contract_version: sig?.version,
          contract_photo_consent: sig?.photoConsent,
        }),
      });
      const data = await res.json();

      if (data.url) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          full_name: `${form.first_name} ${form.last_name}`.trim(),
          email: form.email,
          format,
          formatLabel: formatMeta.short,
          preferredDate: formatChosenDate(selectedDate),
          preferredTime: selectedSlot || '',
          selectedClasses: selectedClass ? [{ name: selectedClass.title, duration: selectedClass.duration, price: selectedClass.price }] : [],
          totalPaid: totalFull,
        }));
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        setIsRedirecting(false);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setIsRedirecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start sm:justify-center"
      style={{
        // Lighter blur (was 20px) so the sheet's slide-up doesn't have to
        // re-rasterize a heavy full-viewport backdrop-filter every frame — that
        // was the choppy course-form open on the MacBook.
        background: 'radial-gradient(ellipse at 0% 50%, rgba(212,140,170,0.4) 0%, transparent 45%), radial-gradient(ellipse at 100% 50%, rgba(180,140,220,0.33) 0%, transparent 45%), rgba(0,0,0,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-none"
        onAnimationEnd={(e) => { if (e.animationName === 'slideUpSheet') e.currentTarget.style.willChange = 'auto'; }}
        style={{
          willChange: 'transform',
          // Full-height: the site nav is hidden while this flow is open
          // (useHideSiteNav). Dynamic viewport height (dvh) rather than vh, since
          // on mobile Safari 100vh overshoots the visible area and used to push
          // the sheet's header (back / ✕) up out of sight.
          animation: 'slideUpSheet 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
          height: '100dvh',
          boxShadow: '0 -1px 0 rgba(212,160,176,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {step === 'format' && (
          <ClassFormatStep
            format={format}
            onFormat={pickFormat}
            onClose={onClose}
            onNext={() => format && setStep('select')}
          />
        )}

        {step === 'select' && (
          <ClassSelector
            classKeys={CLASS_KEYS}
            format={format}
            selected={selected}
            onSelect={pickClass}
            onBack={() => setStep('format')}
            onClose={onClose}
            onNext={() => selected && setStep('details')}
          />
        )}

        {step === 'details' && (
          <ClassContactForm
            form={form}
            setForm={setForm}
            selectedClass={selectedClass}
            format={format}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            onBack={() => setStep('select')}
            onClose={onClose}
            onCheckout={() => setStep('sign')}
            isRedirecting={isRedirecting}
          />
        )}

        {step === 'sign' && (
          <>
            <div
              className="flex-shrink-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 sm:px-10 py-4 sm:py-5"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            >
              <button onClick={() => setStep('details')}
                className="flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-[#D4A0B0] hover:text-[#b8849a] transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back
              </button>
              <span className="font-serif text-[1.05rem] tracking-tight text-[#111]">Review &amp; Sign</span>
              <button onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#999] hover:text-[#111] transition-all"
                style={{ background: 'rgba(0,0,0,0.06)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain">
              <ContractSign
                contract={classContract}
                clientName={`${form.first_name} ${form.last_name}`.trim()}
                submitting={isRedirecting}
                ctaLabel="Sign & Continue to Payment"
                onSign={handleCheckout}
              />
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            {/* Header for success */}
            <div
              className="flex-shrink-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 sm:px-10 py-4 sm:py-5"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#F7EEF2] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="2.5" className="w-3 h-3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span className="font-serif text-[1.1rem] tracking-tight text-[#111]">Payment Confirmed</span>
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#999] hover:text-[#111] transition-all"
                style={{ background: 'rgba(0,0,0,0.06)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <ClassSuccessScreen onClose={onClose} registrationData={successData} />
          </>
        )}

        {step === 'cancelled' && <CancelledScreen onClose={onClose} onRetry={() => setStep('format')} />}
      </div>
    </div>
  );
}

function CancelledScreen({ onClose, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-5 px-8 py-16 flex-1">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" className="w-7 h-7">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
      <div>
        <h3 className="font-serif text-2xl text-[#111] mb-1">Payment Cancelled</h3>
        <p className="text-[0.85rem] text-gray-400 mt-1">No charge was made to your account.</p>
      </div>
      <div className="flex gap-3 mt-2">
        <button onClick={onClose}
          className="px-6 py-3 rounded-lg border border-gray-200 text-[0.8rem] font-medium text-gray-500 hover:border-[#111] hover:text-[#111] transition-all">
          Close
        </button>
        <button onClick={onRetry}
          className="px-6 py-3 rounded-lg text-[0.8rem] font-medium transition-all"
          style={{ background: '#111', color: '#fff' }}>
          Try Again
        </button>
      </div>
    </div>
  );
}
