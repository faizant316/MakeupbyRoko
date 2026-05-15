const inputClass = "w-full px-0 py-2.5 border-0 border-b border-gray-200 text-[0.85rem] focus:border-[#D4A0B0] outline-none transition-all bg-transparent text-[#111] placeholder:text-gray-300 rounded-none";

export default function ClassSelector({ classes, selected, onToggle, onClose, onNext }) {
  const count = selected.length;
  const totalDeposit = classes
    .filter(c => selected.includes(c.key))
    .reduce((sum, c) => sum + c.deposit, 0);

  return (
    <>
      {/* Header — matches original MakeupClassModal header exactly */}
      <div
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 sm:px-10 py-4 sm:py-5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#D4A0B0]/12 flex items-center justify-center">
            <span className="text-[#D4A0B0] text-xs">✦</span>
          </div>
          <div>
            <span className="font-serif text-[1.1rem] tracking-tight text-[#111] block leading-tight">Makeup Classes by Roko</span>
            <span className="text-[0.62rem] text-[#c5bdb5] tracking-wide">Select classes — add to cart</span>
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

          {/* Intro */}
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#D4A0B0] mb-1">Service Menu</p>
            <h2 className="font-serif text-[1.6rem] text-[#111] mb-2">Makeup Classes by <em className="text-[#D4A0B0] not-italic">MakeupbyRoko</em></h2>
            <p className="text-[0.85rem] text-gray-400 leading-[1.7]">
              Select the class(es) you'd like — you can add multiple. Then proceed to checkout to secure your spot with a 50% deposit.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[0.72rem] text-[#A0785A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A0B0]" />
              Mon–Thu · 10 AM – 8 PM · 50% deposit secures your spot
            </div>
          </div>

          {/* Class cards */}
          <div className="flex flex-col gap-4">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#888] mb-0">Select Classes</p>
            {classes.map(cls => {
              const isSelected = selected.includes(cls.key);
              return (
                <div
                  key={cls.key}
                  onClick={() => onToggle(cls.key)}
                  className="rounded-xl p-5 cursor-pointer transition-all border"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, rgba(212,160,176,0.06), rgba(184,160,212,0.06))' : '#FAFAF9',
                    borderColor: isSelected ? '#D4A0B0' : '#ede8e4',
                    boxShadow: isSelected ? '0 0 0 1px #D4A0B080' : 'none',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Custom checkbox */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{ borderColor: isSelected ? '#D4A0B0' : '#d0c8c0' }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#D4A0B0' }} />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1.5">
                        <h4 className="font-serif text-[1rem] text-[#111]">{cls.title}</h4>
                        <span
                          className="text-[0.6rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                          style={{ background: isSelected ? '#D4A0B0' : '#ede8e4', color: isSelected ? '#fff' : '#a5998e' }}
                        >
                          ${cls.price}
                        </span>
                      </div>
                      <p className="text-[0.65rem] font-medium text-[#A0785A] mb-2">
                        {cls.duration} · <span className="text-[#A0785A]">${cls.deposit} deposit</span>
                      </p>
                      <p className="text-[0.78rem] text-gray-500 leading-[1.7]">{cls.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="pb-8">
            <button
              onClick={() => count > 0 && onNext()}
              disabled={count === 0}
              className="w-full py-3.5 rounded-xl text-[0.8rem] font-medium tracking-[0.04em] transition-all"
              style={count > 0
                ? { background: '#111', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
                : { background: '#f0ece8', color: '#bbb', cursor: 'not-allowed' }
              }
            >
              {count > 0 ? `View Cart (${count} class${count !== 1 ? 'es' : ''}) · $${totalDeposit} deposit →` : 'Select at least one class to continue'}
            </button>
            <p className="text-[0.65rem] text-center text-gray-400 mt-2">
              Roko will confirm within 24–48 hrs · 50% deposit via Stripe <span className="text-[#D4A0B0]">✦</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}