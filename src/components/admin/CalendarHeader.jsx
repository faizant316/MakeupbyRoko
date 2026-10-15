import { useState } from 'react';
import { Chevron, cx } from './ui';

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

// A quiet square around an icon: no border, a canvas tint under a pointer.
const quietIcon = 'press flex shrink-0 items-center justify-center rounded-ctl text-ink-muted hover:bg-canvas hover:text-ink';

function Arrow({ dir, className }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {dir < 0 ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

export default function CalendarHeader({
  title,                 // the big centred line: "Fri, Sep 4" / "Aug 30 – Sep 5" / "September"
  subtitle,              // small line beneath: the year, always
  onStep,                // (dir) => void
  stepUnit = 'day',      // names the arrows for screen readers
  jumpDate,              // Date the jumper opens on; omit to make the title inert
  onJump,                // (monthIdx, year) => void
  right = null,          // view-specific buttons (Block day)
  onToday,
  isToday = true,        // hides the Today chip when you're already there
  big = false,           // full-page calendar: bigger date, bigger arrows
  // eslint-disable-next-line no-unused-vars
  dm,                    // still passed by every caller; the colours switch on their own now
  className = '',
}) {
  const [showJump, setShowJump] = useState(false);
  const [jumpYear, setJumpYear] = useState(() => (jumpDate || new Date()).getFullYear());
  const canJump = !!(onJump && jumpDate);

  const openJump = () => {
    if (!canJump) return;
    setJumpYear(jumpDate.getFullYear());
    setShowJump(v => !v);
  };

  const arrow = (dir) => (
    <button
      type="button"
      onClick={() => onStep(dir)}
      aria-label={`${dir < 0 ? 'Previous' : 'Next'} ${stepUnit}`}
      className={cx(quietIcon, big ? 'h-11 w-11' : 'h-10 w-10')}
    >
      <Arrow dir={dir} className={big ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
    </button>
  );

  return (
    <div className={cx('relative', className)}>
      {/* Three tracks so the middle one stays centred no matter how wide the
          buttons on the right get. On a phone they stack, date first. */}
      <div className="mb-3 flex flex-col items-center gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <span className="hidden sm:block" />

        <div className="relative flex min-w-0 items-center justify-center gap-1">
          {arrow(-1)}
          <button
            type="button"
            onClick={openJump}
            disabled={!canJump}
            aria-expanded={canJump ? showJump : undefined}
            className={cx(
              'flex min-w-0 flex-col items-center rounded-ctl transition-colors duration-200',
              big ? 'px-3 py-1.5' : 'px-2 py-1',
              canJump ? 'press cursor-pointer hover:bg-canvas' : 'cursor-default',
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cx(
                'truncate font-semibold leading-tight tracking-[-0.02em] text-ink',
                big ? 'text-[1.45rem] sm:text-[1.7rem]' : 'text-[1.06rem] sm:text-[1.2rem]',
              )}>
                {title}
              </span>
              {canJump && <Chevron open={showJump} className={cx('text-ink-muted', big ? 'h-3.5 w-3.5' : 'h-3 w-3')} />}
            </span>
            {subtitle && (
              <span className={cx('mt-px leading-tight tabular-nums text-ink-muted', big ? 'text-[0.74rem]' : 'text-[0.68rem]')}>{subtitle}</span>
            )}
          </button>
          {arrow(1)}

          {/* Month + year jumper. Outer box centres it, inner one animates, so
              the entrance's transform never fights the centring one. */}
          {showJump && canJump && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowJump(false)} aria-hidden="true" />
              <div className="absolute left-1/2 top-full z-50 mt-1.5 w-[min(300px,calc(100vw-2rem))] -translate-x-1/2">
                <div className="pop-in rounded-card border border-line bg-paper p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]" style={{ '--origin': 'top center' }}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <button type="button" onClick={() => setJumpYear(y => y - 1)} aria-label="Previous year" className={cx(quietIcon, 'h-9 w-9')}>
                      <Arrow dir={-1} className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-[0.92rem] font-semibold tabular-nums text-ink">{jumpYear}</p>
                    <button type="button" onClick={() => setJumpYear(y => y + 1)} aria-label="Next year" className={cx(quietIcon, 'h-9 w-9')}>
                      <Arrow dir={1} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {MONTHS.map((m, i) => {
                      const isCur = jumpYear === jumpDate.getFullYear() && i === jumpDate.getMonth();
                      const isNow = jumpYear === new Date().getFullYear() && i === new Date().getMonth();
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { onJump(i, jumpYear); setShowJump(false); }}
                          aria-pressed={isCur}
                          className={cx(
                            'press h-9 rounded-ctl text-[0.8rem] transition-colors',
                            isCur ? 'bg-ink font-semibold text-paper'
                              : isNow ? 'font-semibold text-rose hover:bg-canvas'
                              : 'text-ink-soft hover:bg-canvas hover:text-ink',
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
          {right}
          {!isToday && onToday && (
            <button
              type="button"
              onClick={onToday}
              className="press inline-flex h-8 shrink-0 items-center rounded-ctl border border-line-strong px-2.5 text-[0.72rem] font-medium text-ink-soft hover:border-ink/40 hover:text-ink"
            >
              Today
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
