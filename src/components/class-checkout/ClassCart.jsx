export default function ClassCart({ selectedClasses, totalDeposit, totalFull, onBack, onClose, onNext }) {
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
            <span className="font-serif text-[1.1rem] tracking-tight text-[#111] block leading-tight">Your Cart</span>
            <span className="text-[0.62rem] text-[#c5bdb5] tracking-wide">{selectedClasses.length} class{selectedClasses.length !== 1 ? 'es' : ''} selected</span>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="w-full sm:max-w-[860px] sm:mx-auto px-6 sm:px-10 py-8 flex flex-col gap-6">

          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Order Summary</p>
            <h2 className="font-serif text-[1.6rem] text-[#111] mb-2">Review Your Classes</h2>
            <p className="text-[0.85rem] text-gray-400 leading-[1.7]">
              A 50% deposit is due today to secure your spot. The remaining balance is collected at the appointment.
            </p>
          </div>

          {/* Class rows */}
          <div className="flex flex-col gap-3">
            {selectedClasses.map(cls => (
              <div key={cls.key} className="flex items-center justify-between rounded-xl p-4 border border-[#ede8e4]"
                style={{ background: '#FAFAF9' }}>
                <div>
                  <h4 className="font-serif text-[0.95rem] text-[#111]">{cls.title}</h4>
                  <p className="text-[0.65rem] font-medium text-[#A0785A] mt-0.5">{cls.duration}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.82rem] font-semibold text-[#111]">${cls.deposit} <span className="font-normal text-gray-400 text-[0.68rem]">deposit</span></p>
                  <p className="text-[0.65rem] text-gray-400">${cls.price} total</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-[#ede8e4] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#FAFAF9', borderBottom: '1px solid #ede8e4' }}>
              <span className="text-[0.78rem] text-gray-500">Total class value</span>
              <span className="text-[0.78rem] text-gray-500">${totalFull.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#FAFAF9', borderBottom: '1px solid #ede8e4' }}>
              <span className="text-[0.78rem] text-gray-500">Remaining (due at appointment)</span>
              <span className="text-[0.78rem] text-gray-400">${(totalFull - totalDeposit).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: '#fff' }}>
              <span className="text-[0.85rem] font-semibold text-[#111]">Deposit due today</span>
              <span className="text-[1rem] font-semibold text-[#111]">${totalDeposit.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[0.72rem] text-[#A0785A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0] mt-1.5 flex-shrink-0" />
            Apple Pay, Google Pay, and all major cards accepted at checkout via Stripe.
          </div>

          {/* CTA */}
          <div className="pb-8">
            <button
              onClick={onNext}
              className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all"
              style={{ background: '#111', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            >
              Continue to Your Details →
            </button>
            <p className="text-[0.65rem] text-center text-gray-400 mt-2">
              Secured by Stripe · No charge until you confirm <span className="text-[#D4A0B0]">✦</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}