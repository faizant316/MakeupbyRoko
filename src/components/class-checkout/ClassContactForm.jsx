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

export default function ClassContactForm({ form, setForm, selectedClasses, totalDeposit, totalFull, onBack, onClose, onCheckout, isRedirecting }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isValid = form.first_name && form.last_name && form.email && form.phone;

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
            <span className="font-serif text-[1.1rem] tracking-tight text-[#111] block leading-tight">Your Details</span>
            <span className="text-[0.62rem] text-[#c5bdb5] tracking-wide">Almost there — just a few details</span>
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
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="w-full sm:max-w-[860px] sm:mx-auto px-6 sm:px-10 py-8 flex flex-col gap-8">

          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Almost Done</p>
            <h2 className="font-serif text-[1.6rem] text-[#111] mb-2">Your Information</h2>
            <p className="text-[0.85rem] text-gray-400 leading-[1.7]">
              Enter your details below. You'll be taken to Stripe's secure checkout to complete your deposit.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedClasses.map(cls => (
                <span key={cls.key}
                  className="text-[0.6rem] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(212,160,176,0.12)', color: '#A0607A' }}>
                  {cls.title}
                </span>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-5">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888]">Your Information</p>

            {/* First + Last name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">First Name *</label>
                <input
                  required
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                  placeholder="Jane"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Last Name *</label>
                <input
                  required
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                  placeholder="Smith"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Email Address *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                  placeholder="you@email.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                  placeholder="(555) 000-0000"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#999] mb-1.5">Additional Notes</label>
              <textarea
                value={form.additional_notes}
                onChange={e => set('additional_notes', e.target.value)}
                onFocus={inputFocusHandler}
                onBlur={inputBlurHandler}
                placeholder="Scheduling preferences or anything else Roko should know…"
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
          </div>

          {/* Payment summary — correct pricing */}
          <div className="rounded-xl border border-[#e8e2dc]" style={{ background: '#FAFAF9' }}>
            {/* Header: full price + deposit split */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #ede8e4' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#A0785A] mb-1">Total Value</p>
                  <p className="font-serif text-[1.6rem] text-[#111] leading-none">${totalFull.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-[#A0785A] mb-1">Due Today (50% Deposit)</p>
                  <p className="font-serif text-[1.6rem] text-[#D4A0B0] leading-none">${totalDeposit.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[0.65rem] text-gray-400 mt-1">Remaining ${(totalFull - totalDeposit).toLocaleString()} collected at your appointment · Apple Pay · Google Pay · All major cards</p>
            </div>
            {/* Line items */}
            <div className="px-5 py-3 flex flex-col gap-1.5">
              {selectedClasses.map(cls => (
                <div key={cls.key} className="flex items-center justify-between text-[0.72rem]">
                  <span className="text-gray-500">{cls.title}</span>
                  <span className="font-medium text-[#111]">${cls.price} <span className="text-gray-400 font-normal">(${cls.deposit} deposit)</span></span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Sticky footer CTA */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: '#fff', padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full sm:max-w-[860px] sm:mx-auto">
          <button
            onClick={onCheckout}
            disabled={!isValid || isRedirecting}
            className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all flex items-center justify-center gap-2"
            style={isValid && !isRedirecting
              ? { background: '#111', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
              : { background: '#f0ece8', color: '#bbb', cursor: 'not-allowed' }
            }
          >
            {isRedirecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Redirecting to Stripe…
              </>
            ) : (
              isValid
                ? `Pay $${totalDeposit.toLocaleString()} deposit →`
                : 'Fill in your details to continue'
            )}
          </button>
          <p className="text-[0.65rem] text-center text-gray-400 mt-2">
            Roko will confirm within 24–48 hrs · Mon–Thu 10AM–8PM <span className="text-[#D4A0B0]">✦</span>
          </p>
        </div>
      </div>
    </>
  );
}
