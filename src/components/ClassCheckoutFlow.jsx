import { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import ClassSelector from './class-checkout/ClassSelector';
import ClassCart from './class-checkout/ClassCart';
import ClassContactForm from './class-checkout/ClassContactForm';
import ClassSuccessScreen from './ClassSuccessScreen';

const CLASSES = [
  {
    key: 'private_basic_lesson',
    title: 'Private Basic Makeup Lesson',
    duration: '1.5 hours',
    price: 300,
    deposit: 150,
    description: 'This personalized lesson is designed for beginners and focuses on the fundamentals of makeup. You will learn essential skincare and foundation application techniques, including concealer matching, basic eye makeup (eyeshadow, eyeliner, and brush technique), and tips for a natural glam look.',
  },
  {
    key: 'virtual_lesson',
    title: 'Virtual Makeup Lesson',
    duration: '2 hours',
    price: 400,
    deposit: 200,
    description: "My virtual makeup lessons are perfect for individuals who prefer to learn from the comfort of their own homes. These one-on-one online sessions provide personalized guidance and are ideal for those unable to meet in person. You'll receive step-by-step instructions through platforms like Zoom or WhatsApp.",
  },
  {
    key: 'intermediate_lesson',
    title: 'Intermediate Makeup Lesson',
    duration: '2.5 hours',
    price: 500,
    deposit: 250,
    description: 'The intermediate class is ideal for individuals with some previous makeup experience. This session dives deeper into makeup artistry with techniques like eyebrow mapping, contouring, and highlighting. You will also learn advanced eye makeup techniques, including smokey eyes and bold lip applications.',
  },
  {
    key: 'glam_class',
    title: 'Glam Makeup Class',
    duration: '3 hours',
    price: 600,
    deposit: 300,
    description: "This class is specifically designed for those who want to perfect bold, glamorous evening looks. You'll learn to create flawless skin finishes with contouring, as well as advanced eye makeup techniques such as cut creases and glitter applications. Includes false lash application and perfect lip art.",
  },
  {
    key: 'masterclass',
    title: 'Makeup Masterclass',
    duration: '4 hours · 2 days',
    price: 1500,
    deposit: 750,
    description: 'This comprehensive masterclass is designed for individuals looking to elevate their makeup skills to a professional level. Participants will master a range of techniques, including full coverage foundation application, contouring, eyebrow mapping, and professional client communication strategies.',
  },
];

export { CLASSES };

const STORAGE_KEY = 'roko_class_checkout';

export default function ClassCheckoutFlow({ onClose }) {
  const [step, setStep] = useState('select');
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', additional_notes: '' });
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

  const toggleClass = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const selectedClasses = CLASSES.filter(c => selected.includes(c.key));
  const totalDeposit = selectedClasses.reduce((sum, c) => sum + c.deposit, 0);
  const totalFull = selectedClasses.reduce((sum, c) => sum + c.price, 0);

  const handleCheckout = async () => {
    setIsRedirecting(true);
    try {
      const origin = window.location.origin;
      const path = window.location.pathname;

      const res = await fetch('/api/create-class-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          additional_notes: form.additional_notes,
          selected_classes: selected,
          success_url: `${origin}${path}`,
          cancel_url: `${origin}${path}`,
        }),
      });
      const data = await res.json();

      if (data.url) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          selectedClasses: selectedClasses.map(c => ({ name: c.title, duration: c.duration, price: c.price })),
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
      className="fixed inset-0 z-[500] flex items-end sm:items-start sm:justify-center"
      style={{
        background: 'radial-gradient(ellipse at 0% 50%, rgba(212,140,170,0.4) 0%, transparent 45%), radial-gradient(ellipse at 100% 50%, rgba(180,140,220,0.33) 0%, transparent 45%), rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-none"
        style={{
          animation: 'slideUpSheet 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
          marginTop: '52px',
          height: 'calc(100vh - 52px)',
          boxShadow: '0 -1px 0 rgba(212,160,176,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {step === 'select' && (
          <ClassSelector
            classes={CLASSES}
            selected={selected}
            onToggle={toggleClass}
            onClose={onClose}
            onNext={() => selected.length > 0 && setStep('cart')}
          />
        )}

        {step === 'cart' && (
          <ClassCart
            selectedClasses={selectedClasses}
            totalDeposit={totalDeposit}
            totalFull={totalFull}
            onBack={() => setStep('select')}
            onClose={onClose}
            onNext={() => setStep('contact')}
          />
        )}

        {step === 'contact' && (
          <ClassContactForm
            form={form}
            setForm={setForm}
            selectedClasses={selectedClasses}
            totalDeposit={totalDeposit}
            totalFull={totalFull}
            onBack={() => setStep('cart')}
            onClose={onClose}
            onCheckout={handleCheckout}
            isRedirecting={isRedirecting}
          />
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

        {step === 'cancelled' && <CancelledScreen onClose={onClose} onRetry={() => setStep('select')} />}
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