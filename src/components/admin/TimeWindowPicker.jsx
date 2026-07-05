import { apptToMin, parseRange, formatRange, to24h, from24h } from '@/lib/timeWindow';

// Modern two-tap time WINDOW picker (start → end). Controlled: `value` is a
// window string ("1:00 PM – 2:30 PM"), `onChange` gets the new window string.
// First tap sets the start, second sets the end; tapping a time at/behind the
// current start resets it as the new start. Desktop = tap grid, mobile = two
// native time wheels. Used by the booking card, Edit Appointment, and the
// consultation scheduler so time entry feels the same everywhere.
export default function TimeWindowPicker({ value, onChange, slots = [], dm, accent = '#D4A0B0' }) {
  const { start, end } = parseRange(value);
  const sMin = apptToMin(start), eMin = apptToMin(end);

  const pick = (t) => {
    if (!start || end) { onChange(formatRange(t, '')); return; }
    const n = apptToMin(t);
    if (n != null && sMin != null && n > sMin) onChange(formatRange(start, t));
    else onChange(formatRange(t, ''));
  };
  const onStartInput = (v) => {
    const s = from24h(v);
    const keepEnd = end && apptToMin(end) > apptToMin(s);
    onChange(formatRange(s, keepEnd ? end : ''));
  };
  const onEndInput = (v) => {
    const e = from24h(v);
    if (start && apptToMin(e) > apptToMin(start)) onChange(formatRange(start, e));
    else onChange(formatRange(e, ''));
  };

  const p = dm
    ? { bg: '#1e1e24', chip: '#27272a', border: '#3a3a48', text: '#F0EBE6', muted: '#8b8b96', tint: 'rgba(212,160,176,0.20)', tintBorder: 'rgba(212,160,176,0.4)' }
    : { bg: '#fff', chip: '#faf7f8', border: '#ece6ea', text: '#1a1417', muted: '#9a9098', tint: 'rgba(212,160,176,0.14)', tintBorder: 'rgba(212,160,176,0.35)' };

  const dur = (sMin != null && eMin != null && eMin > sMin) ? eMin - sMin : 0;
  const durLabel = dur > 0 ? `${dur >= 60 ? `${Math.floor(dur / 60)}h ` : ''}${dur % 60 ? `${dur % 60}m` : ''}`.trim() : '';
  const hint = !start ? 'Tap the start time' : !end ? 'Now tap the end time' : 'Window set';

  const Chip = ({ label, val, active, onClearOne }) => (
    <div className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 transition-all"
      style={{ background: p.chip, border: `1.5px solid ${active ? accent : p.border}`, boxShadow: active ? `0 0 0 3px ${accent}22` : 'none' }}>
      <div className="flex items-center justify-between">
        <span className="text-[0.5rem] font-bold tracking-[0.16em] uppercase" style={{ color: active ? accent : p.muted }}>{label}</span>
        {val && (
          <button type="button" onClick={onClearOne} className="text-[0.6rem] leading-none transition-opacity hover:opacity-60" style={{ color: p.muted }} aria-label={`Clear ${label}`}>✕</button>
        )}
      </div>
      <p className="text-[0.92rem] font-semibold mt-0.5 truncate" style={{ color: val ? p.text : p.muted, opacity: val ? 1 : 0.55 }}>
        {val || '--:--'}
      </p>
    </div>
  );

  return (
    <div>
      {/* Summary: Start → End with live duration */}
      <div className="flex items-stretch gap-2">
        <Chip label="Start" val={start} active={!start} onClearOne={() => onChange('')} />
        <div className="flex flex-col items-center justify-center px-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke={p.muted} strokeWidth="2" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          {durLabel && <span className="text-[0.52rem] font-bold mt-0.5 whitespace-nowrap" style={{ color: accent }}>{durLabel}</span>}
        </div>
        <Chip label="End" val={end} active={!!start && !end} onClearOne={() => onChange(formatRange(start, ''))} />
      </div>

      <div className="flex items-center justify-between mt-2.5 mb-1.5 px-0.5">
        <span className="text-[0.62rem] font-medium" style={{ color: p.muted }}>{hint}</span>
        {(start || end) && (
          <button type="button" onClick={() => onChange('')} className="text-[0.62rem] font-medium underline underline-offset-2 transition-opacity hover:opacity-60" style={{ color: p.muted }}>Clear</button>
        )}
      </div>

      {/* Mobile: two native time wheels */}
      <div className="md:hidden grid grid-cols-2 gap-2.5">
        {[['Start', to24h(start), onStartInput], ['End', to24h(end), onEndInput]].map(([lbl, v, handler]) => (
          <label key={lbl} className="block">
            <span className="block text-[0.52rem] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: p.muted }}>{lbl}</span>
            <input type="time" value={v} onChange={e => handler(e.target.value)}
              style={{ width: '100%', fontSize: '16px', padding: '11px 13px', borderRadius: '11px', border: `1.5px solid ${p.border}`, background: p.bg, color: p.text, outline: 'none', boxSizing: 'border-box' }} />
          </label>
        ))}
      </div>

      {/* Desktop: tap grid, window highlighted */}
      <div className="hidden md:block rounded-xl p-2.5" style={{ background: p.bg, border: `1px solid ${p.border}` }} data-lenis-prevent>
        <div className="grid grid-cols-4 gap-1.5 max-h-[236px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {slots.map(t => {
            const tMin = apptToMin(t);
            const isEnd = !!end && t === end;
            const isStart = !isEnd && t === start;
            const inRange = sMin != null && eMin != null && tMin != null && tMin > sMin && tMin < eMin;
            const style = (isStart || isEnd)
              ? { background: accent, color: '#fff', border: `1px solid ${accent}`, boxShadow: '0 2px 8px rgba(196,132,154,0.35)' }
              : inRange
                ? { background: p.tint, color: dm ? '#F0EBE6' : '#8a5a6c', border: `1px solid ${p.tintBorder}` }
                : { background: p.chip, color: p.muted, border: `1px solid ${p.border}` };
            return (
              <button key={t} type="button" onClick={() => pick(t)}
                className="relative py-2.5 rounded-lg text-[0.7rem] font-semibold transition-all text-center touch-manipulation hover:opacity-90"
                style={style}>
                {t}
                {(isStart || isEnd) && (
                  <span className="absolute top-1 right-1.5 text-[0.5rem] font-extrabold leading-none" style={{ opacity: 0.9 }}>{isStart ? 'A' : 'B'}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
