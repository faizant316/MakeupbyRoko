import { useState, useEffect, useRef } from 'react';

export default function DateBlockPopup({ date, isBlocked, existingReason = '', onBlock, onUnblock, onClose }) {
  const [reason, setReason] = useState(existingReason);
  const popupRef = useRef(null);

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 15, 20,0.35)', backdropFilter: 'blur(6px)' }}>
      <div
        ref={popupRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[360px] overflow-hidden"
        style={{ animation: 'fadeSlideDown 0.2s ease-out' }}
      >
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 ${isBlocked ? 'bg-[#FDF3F3]' : 'bg-[#FAFAFB]'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${isBlocked ? 'bg-[#EF5350]' : 'bg-[#E5E7EB]'}`} />
                <span className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#a3a3ad]">
                  {isBlocked ? 'Date Blocked' : 'Block This Date'}
                </span>
              </div>
              <p className="font-serif text-[1.15rem] text-[#111] leading-snug">{formatted}</p>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-[#ccc] hover:text-[#888] transition-colors flex-shrink-0 mt-0.5 border border-[#ECEDF1]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isBlocked ? (
            <>
              {existingReason && (
                <div className="bg-[#FDF3F3] border border-[#f5c5c5] rounded-lg px-4 py-3 mb-5">
                  <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-[#EF5350] mb-1">Blocked Reason</p>
                  <p className="text-[0.85rem] text-[#555]">{existingReason}</p>
                </div>
              )}
              <p className="text-[0.8rem] text-[#999] leading-relaxed mb-5">
                This date is currently blocked, so clients cannot book appointments on this day. You can unblock it anytime.
              </p>
              <div className="flex gap-2.5">
                <button onClick={onUnblock}
                  className="flex-1 py-2.5 rounded-xl bg-[#111] text-white text-[0.75rem] font-medium tracking-[0.04em] hover:bg-[#333] transition-colors">
                  Unblock Date
                </button>
                <button onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[0.75rem] font-medium text-[#999] hover:border-[#ccc] transition-colors">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[0.8rem] text-[#999] leading-relaxed mb-4">
                Blocking this date will mark it as unavailable. Clients won't be able to book appointments on this day. Just tap Block. A reason is optional.
              </p>
              <div className="mb-5">
                <label className="block text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#52525b] mb-1.5">
                  Reason <span className="text-[#ccc] font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Personal day, Travel, Holiday…"
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-base sm:text-[0.85rem] focus:border-[#D4A0B0] focus:ring-1 focus:ring-[#D4A0B0]/20 outline-none transition-all bg-white text-[#111] placeholder:text-[#bcbcc4]"
                  onKeyDown={e => { if (e.key === 'Enter') onBlock(reason); }}
                />
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => onBlock(reason)}
                  className="flex-1 py-2.5 rounded-xl bg-[#EF5350] text-white text-[0.75rem] font-medium tracking-[0.04em] hover:bg-[#d94440] transition-colors flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    <line x1="9" y1="14" x2="15" y2="18"/><line x1="15" y1="14" x2="9" y2="18"/>
                  </svg>
                  Block This Date
                </button>
                <button onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[0.75rem] font-medium text-[#999] hover:border-[#ccc] transition-colors">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}