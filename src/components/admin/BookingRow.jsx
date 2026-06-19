import StatusBadge from './StatusBadge';
import { relativeDate } from './timeline';

// Compact one-line list item for the appointments list. The rich detail lives
// in the modal opened on click, so the row only carries what helps you scan:
// who, when, what, and status. Bridal rows are tagged and tinted.
export default function BookingRow({ booking, onClick, darkMode: dm, bridal, dimmed }) {
  const rel = relativeDate(booking.date);
  const initial = (booking.name || '?').trim().charAt(0).toUpperCase() || '?';

  const dateColor = rel.tone === 'accent'
    ? '#A0607A'
    : rel.tone === 'past'
      ? '#E0795B'
      : (dm ? '#a1a1aa' : '#8a7e84');
  const mutedColor = dm ? '#71717a' : '#a99e95';

  const iconBtn = `flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-105`;
  const iconBtnStyle = { color: dm ? '#a1a1aa' : '#9a8e94', border: `1px solid ${dm ? '#3a3a48' : '#ece5e0'}` };

  // Non-bridal rows get their own quiet card presence so they lift off the
  // page (same #fff / #1e1e24 as the background) without competing with bridal.
  const skin = bridal
    ? {
        bg: dm ? 'rgba(212,160,176,0.1)' : '#FDF6F9',
        border: dm ? 'rgba(212,160,176,0.24)' : '#F0D9E3',
        shadow: dm ? 'inset 3px 0 0 0 #C47A92' : 'inset 3px 0 0 0 #D4A0B0, 0 1px 2px rgba(160,96,122,0.06), 0 2px 6px rgba(160,96,122,0.05)',
        hoverBg: dm ? 'rgba(212,160,176,0.16)' : '#FBEDF3',
      }
    : {
        bg: dm ? '#26262d' : '#FBF9F7',
        border: dm ? '#34343d' : '#ece4dc',
        shadow: dm ? 'none' : '0 1px 2px rgba(60,45,35,0.05), 0 2px 5px rgba(60,45,35,0.04)',
        hoverBg: dm ? '#2e2e37' : '#FFFDFB',
      };

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 sm:gap-3.5 px-3 sm:px-4 py-3 rounded-xl text-left transition-all"
      style={{
        background: skin.bg,
        border: `1px solid ${skin.border}`,
        boxShadow: skin.shadow,
        opacity: dimmed ? 0.62 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,176,0.6)'; e.currentTarget.style.background = skin.hoverBg; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = skin.border; e.currentTarget.style.background = skin.bg; }}
    >
      {/* Avatar initial — plum colorway + soft ring marks bridal, no emoji */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[0.9rem]"
        style={bridal
          ? { background: dm ? 'rgba(212,160,176,0.2)' : '#F1DCE7', color: dm ? '#e7c9d5' : '#A0607A', boxShadow: `0 0 0 1.5px ${dm ? 'rgba(212,160,176,0.35)' : 'rgba(196,132,154,0.45)'}` }
          : { background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#a1a1aa' : '#b0a59c' }}
      >
        {initial}
      </div>

      {/* Name + service */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[0.875rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>
            {booking.name || 'Unnamed'}
          </p>
          {bridal && (
            <span
              className="inline-flex items-center text-[0.5rem] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: dm ? 'rgba(212,160,176,0.28)' : '#EFCEDD', color: dm ? '#f0d5e1' : '#9A5474' }}
            >
              Bridal
            </span>
          )}
        </div>
        <p className="text-[0.72rem] truncate mt-0.5" style={{ color: mutedColor }}>
          {booking.service || 'Service not set'}
        </p>
      </div>

      {/* Date + status */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[0.72rem] font-semibold whitespace-nowrap" style={{ color: dateColor }}>
          {rel.label}
          {booking.time && <span className="font-normal" style={{ color: mutedColor }}> · {booking.time}</span>}
        </span>
        <StatusBadge status={booking.status} />
      </div>

      {/* Hover quick actions — desktop only, fixed slot so the row doesn't shift */}
      <div className="hidden md:flex items-center gap-1 flex-shrink-0 w-[60px] justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        {booking.email && (
          <a
            href={`mailto:${booking.email}?subject=Appointment%20with%20Roko%20—%20${encodeURIComponent(booking.service || '')}`}
            onClick={e => e.stopPropagation()}
            aria-label="Email client"
            className={iconBtn}
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#D4A0B0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#ece5e0'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#9a8e94'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
          </a>
        )}
        {booking.phone && (
          <a
            href={`sms:${booking.phone}`}
            onClick={e => e.stopPropagation()}
            aria-label="Text client"
            className={iconBtn}
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#D4A0B0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#ece5e0'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#9a8e94'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </a>
        )}
      </div>
    </button>
  );
}
