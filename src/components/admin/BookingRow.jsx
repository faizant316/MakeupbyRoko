import StatusBadge from './StatusBadge';
import { relativeDate } from './timeline';
import { phoneHref } from '@/lib/phone';

// Compact one-line list item for the appointments list. The rich detail lives
// in the modal opened on click, so the row only carries what helps you scan:
// who, when, what, and status. Bridal rows are tagged and tinted.
export default function BookingRow({ booking, onClick, darkMode: dm, bridal, dimmed, selectable, selected }) {
  const rel = relativeDate(booking.date);
  const initial = (booking.name || '?').trim().charAt(0).toUpperCase() || '?';

  const dateColor = rel.tone === 'accent'
    ? '#A0607A'
    : rel.tone === 'past'
      ? '#E0795B'
      : (dm ? '#a1a1aa' : '#83838d');
  const mutedColor = dm ? '#71717a' : '#9c9ca4';

  const iconBtn = `flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-105`;
  const iconBtnStyle = { color: dm ? '#a1a1aa' : '#9a8e94', border: `1px solid ${dm ? '#3a3a48' : '#ece5e0'}` };

  // Non-bridal rows get their own quiet card presence so they lift off the
  // page (same #fff / #1e1e24 as the background) without competing with bridal.
  const skin = bridal
    ? {
        bg: dm ? 'rgba(154,84,116,0.12)' : '#FCF8FA',
        border: dm ? 'rgba(196,122,146,0.26)' : '#ECDCE3',
        shadow: dm ? 'inset 3px 0 0 0 #B06A85' : 'inset 3px 0 0 0 #9A5474, 0 1px 2px rgba(107,64,85,0.06), 0 2px 6px rgba(107,64,85,0.05)',
        hoverBg: dm ? 'rgba(154,84,116,0.18)' : '#FAF3F7',
      }
    : {
        bg: dm ? '#26262d' : '#FBF9F7',
        border: dm ? '#34343d' : '#ece4dc',
        shadow: dm ? 'none' : '0 1px 2px rgba(60,45,35,0.05), 0 2px 5px rgba(60,45,35,0.04)',
        hoverBg: dm ? '#2e2e37' : '#FFFDFB',
      };

  const selectedBg = dm ? 'rgba(37,99,235,0.16)' : 'rgba(37,99,235,0.07)';
  const selectedBorder = '#2563EB';

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 sm:gap-3.5 px-3 sm:px-4 py-3 rounded-xl text-left transition-all"
      style={{
        background: selected ? selectedBg : skin.bg,
        border: `1px solid ${selected ? selectedBorder : skin.border}`,
        boxShadow: selected ? `inset 3px 0 0 0 ${selectedBorder}` : skin.shadow,
        opacity: dimmed ? 0.62 : 1,
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(212,160,176,0.6)'; e.currentTarget.style.background = skin.hoverBg; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = skin.border; e.currentTarget.style.background = skin.bg; } }}
    >
      {/* iOS-style selection circle — empty ring fills blue with a check when picked */}
      {selectable && (
        <span
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150"
          style={{
            border: selected ? 'none' : `2px solid ${dm ? '#52525b' : '#d0d0d8'}`,
            background: selected ? selectedBorder : 'transparent',
          }}
        >
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      )}

      {/* Avatar initial — plum colorway + soft ring marks bridal, no emoji */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[0.9rem]"
        style={bridal
          ? { background: dm ? 'rgba(154,84,116,0.22)' : '#F1DCE7', color: dm ? '#e7c9d5' : '#8A4A63', boxShadow: `0 0 0 1.5px ${dm ? 'rgba(176,106,133,0.4)' : 'rgba(154,84,116,0.4)'}` }
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
              style={{ background: dm ? 'rgba(154,84,116,0.3)' : '#F0D9E3', color: dm ? '#f0d5e1' : '#7A4055' }}
            >
              Bridal
            </span>
          )}
          {booking.contract_signed && (
            <span
              className="inline-flex items-center gap-1 text-[0.5rem] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: dm ? 'rgba(59,130,246,0.15)' : '#e8f7ee', color: dm ? '#60A5FA' : '#15803d' }}
              title={`Agreement signed${booking.contract_signed_name ? ` by ${booking.contract_signed_name}` : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-2 h-2"><polyline points="20 6 9 17 4 12"/></svg>
              Signed
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

      {/* Hover quick actions — desktop only, fixed slot so the row doesn't shift.
          Hidden while selecting so taps only toggle the checkbox. */}
      <div className={`${selectable ? 'hidden' : 'hidden md:flex'} items-center gap-1 flex-shrink-0 w-[60px] justify-end opacity-0 group-hover:opacity-100 transition-opacity`}>
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
            href={`sms:${phoneHref(booking.phone)}`}
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
