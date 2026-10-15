import { useState } from 'react';
import { Label, Sheet, buttonClass, inputClass } from './ui';

// Block or unblock one date from the Home calendar. A small sheet: the date as
// the title, an optional reason, and the one decision.
export default function DateBlockPopup({ date, isBlocked, existingReason = '', onBlock, onUnblock, onClose }) {
  const [reason, setReason] = useState(existingReason);

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  const cancel = (
    <button type="button" onClick={onClose} className={buttonClass('quiet', 'lg', 'flex-1')}>
      Cancel
    </button>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      size="sm"
      eyebrow={isBlocked ? 'Date blocked' : 'Block this date'}
      title={formatted}
      footer={isBlocked ? (
        <div className="flex gap-2.5">
          {cancel}
          <button type="button" onClick={onUnblock} className={buttonClass('solid', 'lg', 'flex-1')}>
            Unblock date
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5">
          {cancel}
          <button
            type="button"
            onClick={() => onBlock(reason)}
            className={buttonClass('alert', 'lg', 'flex-1 font-semibold')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 14l6 4M15 14l-6 4" />
            </svg>
            Block this date
          </button>
        </div>
      )}
    >
      {isBlocked ? (
        <>
          {existingReason && (
            <div className="mb-4 border border-tone-alert/25 bg-tone-alert/[0.04] px-4 py-3">
              <Label className="text-tone-alert">Blocked reason</Label>
              <p className="mt-1 text-[0.86rem] text-ink-soft">{existingReason}</p>
            </div>
          )}
          <p className="text-[0.86rem] leading-relaxed text-ink-muted">
            This date is currently blocked, so clients cannot book appointments on this day. You can unblock it anytime.
          </p>
        </>
      ) : (
        <>
          <p className="text-[0.86rem] leading-relaxed text-ink-muted">
            Blocking this date will mark it as unavailable. Clients won't be able to book appointments on this day. Just tap Block. A reason is optional.
          </p>
          <label className="mt-5 block">
            <Label>
              Reason <span className="font-normal normal-case tracking-normal text-ink-muted/80">(optional)</span>
            </Label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Personal day, Travel, Holiday…"
              className={`${inputClass} mt-2`}
              onKeyDown={e => { if (e.key === 'Enter') onBlock(reason); }}
            />
          </label>
        </>
      )}
    </Sheet>
  );
}
