import { useState } from 'react';
import { apptToMin, parseRange, formatRange, to24h, applyStartInput, applyEndInput } from '@/lib/timeWindow';
import { cx } from './ui';

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ink-muted" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// Modern two-tap time WINDOW picker (start → end). Controlled: `value` is a
// window string ("1:00 PM – 2:30 PM"), `onChange` gets the new window string.
// First tap sets the start, second sets the end; tapping a time at/behind the
// current start resets it as the new start. Desktop = tap grid, mobile = two
// native time wheels. Used by the booking card, Edit Appointment, and the
// consultation scheduler so time entry feels the same everywhere.
//
// dm and accent are still accepted from the callers that pass them. The
// colours come from the admin's palette now: the two ends of the window are
// ink, the time between them a light wash of it.
// eslint-disable-next-line no-unused-vars
export default function TimeWindowPicker({ value, onChange, slots = [], dm, accent }) {
  const { start, end } = parseRange(value);
  const sMin = apptToMin(start), eMin = apptToMin(end);

  // Set when the End wheel lands on a time that isn't after the start, so the
  // hint can say why nothing happened instead of leaving Roko guessing.
  const [endError, setEndError] = useState('');

  // Desktop grid. Here "tap a time at or before the start" genuinely means
  // "start over from this time". The tap is always deliberate, so reassigning
  // the start is the right read.
  const pick = (t) => {
    if (!start || end) { onChange(formatRange(t, '')); return; }
    const n = apptToMin(t);
    if (n != null && sMin != null && n > sMin) onChange(formatRange(start, t));
    else onChange(formatRange(t, ''));
  };

  // Both native inputs run through the reducers in lib/timeWindow.
  const onStartInput = (v) => {
    const { value: next, error } = applyStartInput(value, v);
    setEndError(error);
    onChange(next);
  };
  const onEndInput = (v) => {
    const { value: next, error } = applyEndInput(value, v);
    setEndError(error);
    onChange(next);
  };

  const dur = (sMin != null && eMin != null && eMin > sMin) ? eMin - sMin : 0;
  const durLabel = dur > 0 ? `${dur >= 60 ? `${Math.floor(dur / 60)}h ` : ''}${dur % 60 ? `${dur % 60}m` : ''}`.trim() : '';
  const hint = !start ? 'Tap the start time' : !end ? 'Now tap the end time' : 'Window set';

  // The box waiting for a tap is drawn the way a focused field is.
  const box = (active) => cx('min-w-0 flex-1 rounded-ctl border bg-paper px-3 py-2 transition-colors duration-200', active ? 'border-ink/60' : 'border-line');
  const boxLabel = (active) => cx('text-[0.62rem] font-semibold uppercase tracking-[0.14em]', active ? 'text-ink' : 'text-ink-muted');

  const Between = () => (
    <div className="flex flex-col items-center justify-center px-0.5">
      <ArrowRight />
      {durLabel && <span className="mt-0.5 whitespace-nowrap text-[0.62rem] font-semibold tabular-nums text-ink-soft">{durLabel}</span>}
    </div>
  );

  const Chip = ({ label, val, active, onClearOne }) => (
    <div className={box(active)}>
      <div className="flex items-center justify-between">
        <span className={boxLabel(active)}>{label}</span>
        {val && (
          <button type="button" onClick={onClearOne} aria-label={`Clear ${label}`}
            className="press -mr-1 flex h-5 w-5 items-center justify-center text-ink-muted hover:text-ink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      <p className={cx('mt-0.5 truncate text-[0.98rem] font-semibold tabular-nums', val ? 'text-ink' : 'text-ink-muted/50')}>
        {val || '--:--'}
      </p>
    </div>
  );

  return (
    <div>
      {/* Desktop summary: Start → End with the live length between them (the
          tap grid below fills them). Hidden on mobile, where the native inputs
          ARE the boxes: one row, no duplicates. */}
      <div className="hidden items-stretch gap-2 md:flex">
        <Chip label="Start" val={start} active={!start} onClearOne={() => onChange('')} />
        <Between />
        <Chip label="End" val={end} active={!!start && !end} onClearOne={() => onChange(formatRange(start, ''))} />
      </div>

      {/* Mobile: one row, two big targets that open the native time wheel
          directly. min-w-0 is required: grid items default to min-width:auto and
          a native <input type="time"> can overflow a shrunk column. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 md:hidden">
        {[
          ['Start', to24h(start), onStartInput, !start],
          null,
          ['End', to24h(end), onEndInput, !!start && !end],
        ].map((cell, i) => cell === null ? (
          <Between key="arrow" />
        ) : (
          <label key={cell[0]} className={cx(box(cell[3]), 'block cursor-pointer')}>
            <span className={cx(boxLabel(cell[3]), 'block')}>{cell[0]}</span>
            <input type="time" value={cell[1]} onChange={e => cell[2](e.target.value)}
              className="box-border block w-full min-w-0 max-w-full appearance-none border-0 bg-transparent p-0 pt-0.5 text-[16px] font-semibold tabular-nums text-ink outline-none" />
          </label>
        ))}
      </div>

      <div className="mb-2 mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <span className={cx('text-[0.74rem]', endError ? 'font-medium text-tone-alert' : 'text-ink-muted')}>{endError || hint}</span>
        {(start || end) && (
          <button type="button" onClick={() => onChange('')}
            className="text-[0.74rem] font-medium text-ink-muted underline underline-offset-2 transition-colors hover:text-ink">Clear</button>
        )}
      </div>

      {/* Desktop: tap grid, window highlighted */}
      <div className="hidden rounded-ctl border border-line p-1.5 md:block" data-lenis-prevent>
        <div className="grid max-h-[236px] grid-cols-4 gap-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {slots.map(t => {
            const tMin = apptToMin(t);
            const isEnd = !!end && t === end;
            const isStart = !isEnd && t === start;
            const inRange = sMin != null && eMin != null && tMin != null && tMin > sMin && tMin < eMin;
            return (
              <button key={t} type="button" onClick={() => pick(t)} aria-pressed={isStart || isEnd}
                className={cx(
                  'press relative h-9 rounded-ctl text-center text-[0.74rem] tabular-nums transition-colors',
                  isStart || isEnd ? 'bg-ink font-semibold text-paper'
                    : inRange ? 'bg-ink/[0.07] font-medium text-ink'
                    : 'font-medium text-ink-soft hover:bg-canvas hover:text-ink',
                )}>
                {t}
                {(isStart || isEnd) && (
                  <span aria-hidden className="absolute right-1.5 top-1 text-[0.5rem] font-bold leading-none text-paper/70">{isStart ? 'A' : 'B'}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
