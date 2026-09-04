import { useState } from 'react';

// One header for every admin calendar view: Day, Week and Month, in the Home
// card and in the client-card drawer.
//
// Booksy's shape, and the reason it reads so fast: the date sits in the middle
// with one arrow either side, the year lives underneath it in small type, and
// the buttons that belong to the view (Block day, Today) sit off to the right
// where they can't push the date off centre. Left-aligning the date next to its
// arrows, which is what this used to do, made the row read as a toolbar rather
// than as "here's the day you're looking at".
//
// The title is tappable everywhere: it opens the month + year jumper, so the
// arrows are for walking a day/week/month at a time and the title is for
// leaving the neighbourhood entirely.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CalendarHeader({
  title,                 // the big centred line: "Fri, Sep 4" / "Aug 30 – Sep 5" / "September"
  subtitle,              // small line beneath — the year, always
  onStep,                // (dir) => void
  stepUnit = 'day',      // names the arrows for screen readers
  jumpDate,              // Date the jumper opens on; omit to make the title inert
  onJump,                // (monthIdx, year) => void
  right = null,          // view-specific buttons (Block day)
  onToday,
  isToday = true,        // hides the Today chip when you're already there
  dm,
  className = '',
}) {
  const [showJump, setShowJump] = useState(false);
  const [jumpYear, setJumpYear] = useState(() => (jumpDate || new Date()).getFullYear());

  const muted = dm ? '#8b8b95' : '#9c9ca6';
  const ink = dm ? '#ECEDF1' : '#1a1a1f';
  const accent = '#C4849A';
  const chipBg = dm ? '#26262e' : '#f6f2f4';
  const canJump = !!(onJump && jumpDate);

  const openJump = () => {
    if (!canJump) return;
    setJumpYear(jumpDate.getFullYear());
    setShowJump(v => !v);
  };

  const arrow = (dir) => (
    <button type="button" onClick={() => onStep(dir)} aria-label={`${dir < 0 ? 'Previous' : 'Next'} ${stepUnit}`}
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors active:scale-90"
      style={{ color: muted, background: 'transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = chipBg; e.currentTarget.style.color = accent; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        {dir < 0 ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Three tracks so the middle one stays centred no matter how wide the
          buttons on the right get. On a phone they stack, date first. */}
      <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
        <span className="hidden sm:block" />

        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 justify-center">
          {arrow(-1)}
          <button type="button" onClick={openJump} disabled={!canJump}
            className="flex flex-col items-center min-w-0 px-1.5 py-0.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ WebkitTapHighlightColor: 'transparent', cursor: canJump ? 'pointer' : 'default' }}>
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-[1.06rem] sm:text-[1.2rem] font-medium leading-tight truncate"
                style={{ color: ink, letterSpacing: '-0.01em' }}>
                {title}
              </span>
              {canJump && (
                <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"
                  style={{ transition: 'transform 200ms ease', transform: showJump ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </span>
            {subtitle && (
              <span className="text-[0.66rem] leading-tight tabular-nums mt-[1px]" style={{ color: muted }}>{subtitle}</span>
            )}
          </button>
          {arrow(1)}
        </div>

        <div className="flex items-center gap-1.5 justify-center sm:justify-end flex-wrap">
          {right}
          {!isToday && onToday && (
            <button type="button" onClick={onToday}
              className="flex-shrink-0 h-7 px-2.5 rounded-md text-[0.78rem] font-medium transition-colors active:scale-95"
              style={{ background: chipBg, color: dm ? '#d4d4d8' : '#5c5c66' }}>
              Today
            </button>
          )}
        </div>
      </div>

      {/* ── Month + year jumper ── */}
      {showJump && canJump && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowJump(false)} aria-hidden="true" />
          <div className="absolute z-50 rounded-xl p-3 left-1/2 -translate-x-1/2 w-[min(320px,100%)]"
            style={{
              top: '3.1rem',
              background: dm ? '#27272a' : '#fff',
              border: `1px solid ${dm ? '#3f3f46' : '#eadfe4'}`,
              boxShadow: dm ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 40px rgba(60,30,45,0.14)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setJumpYear(y => y - 1)} aria-label="Previous year"
                className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: muted }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <p className="text-[0.94rem] font-medium tabular-nums" style={{ color: ink }}>{jumpYear}</p>
              <button type="button" onClick={() => setJumpYear(y => y + 1)} aria-label="Next year"
                className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: muted }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {MONTHS.map((m, i) => {
                const isCur = jumpYear === jumpDate.getFullYear() && i === jumpDate.getMonth();
                const isNow = jumpYear === new Date().getFullYear() && i === new Date().getMonth();
                return (
                  <button key={m} type="button" onClick={() => { onJump(i, jumpYear); setShowJump(false); }}
                    className="py-1.5 rounded-md text-[0.8rem] transition-colors"
                    style={isCur
                      ? { background: dm ? '#ECEDF1' : '#1a1a1f', color: dm ? '#111' : '#fff', fontWeight: 500 }
                      : { color: isNow ? accent : (dm ? '#d4d4d8' : '#4a4a52'), fontWeight: isNow ? 500 : 400 }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
