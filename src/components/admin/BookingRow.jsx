import StatusBadge from './StatusBadge';
import { relativeDate } from './timeline';
import { phoneHref } from '@/lib/phone';
import { depositState, depositTone } from './depositState';

// Compact one-line list item for the appointments list. The rich detail lives
// in the modal opened on click, so the row only carries what helps you scan:
// who, when, what, and status. Bridal rows are tagged and tinted.
export default function BookingRow({ booking, onClick, darkMode: dm, bridal, dimmed, selectable, selected, hideDate }) {
  // Consult-only bookings have no appointment date — show their consultation
  // date/time so they read as scheduled, not "No date".
  const consultOnly = !booking.date && !!booking.consultation_date;
  const rel = relativeDate(booking.date || booking.consultation_date);
  const rowTime = booking.date ? booking.time : booking.consultation_time;
  const initial = (booking.name || '?').trim().charAt(0).toUpperCase() || '?';

  // Deposit standing, spelled out on the row so scanning the list is enough.
  // Before this, a late Zelle flipped a hidden flag and the only way to find
  // out was opening the card.
  const deposit = depositState(booking);
  const depositTint = deposit.kind === 'none' ? null : depositTone(deposit.kind, dm);

  const dateColor = rel.tone === 'accent'
    ? '#A0607A'
    : rel.tone === 'past'
      ? '#E0795B'
      : (dm ? '#a1a1aa' : '#83838d');
  const mutedColor = dm ? '#8e8e99' : '#9c9ca4';

  // Travel bookings carry an address (0015); brides who filled in the site form
  // carry a get-ready location on their inquiry, passed down as `location` by
  // whichever list is rendering us. City first, then the street, so scanning a
  // day tells her where she is going before it tells her the house number.
  const locationCity = booking.location_city;
  // First segment of the address is the street, which is all that fits and all
  // that adds anything once the city is already shown.
  const locationStreet = booking.location?.split(',')[0]?.trim();
  const locationLine = locationCity && locationStreet && locationStreet !== locationCity
    ? `${locationCity} · ${locationStreet}`
    : locationCity || locationStreet || null;
  const locationColor = dm ? '#8fb3d9' : '#6a7f99';

  const iconBtn = `flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-105`;
  const iconBtnStyle = { color: dm ? '#a1a1aa' : '#9a8e94', border: `1px solid ${dm ? '#3a3a48' : '#E6E6EC'}` };

  // Bridal rows carry a rose wash so the list sorts itself at a glance: in a
  // month that is almost entirely weddings, the one Makeup trial should be the
  // row that stands out, and it does because it is the only white card.
  //
  // What is deliberately NOT here is the 3px colour bar that used to run down
  // the left edge on top of this. The fill is the signal; the bar was a second
  // copy of it welded to one corner, fighting the card's own radius. Tint the
  // surface or mark the edge, not both.
  const skin = bridal
    ? {
        bg: dm ? 'rgba(154,84,116,0.13)' : '#FCF4F8',
        border: dm ? 'rgba(196,122,146,0.28)' : '#EEDAE4',
        shadow: dm ? 'none' : '0 1px 2px rgba(107,64,85,0.05), 0 2px 5px rgba(107,64,85,0.04)',
        hoverBg: dm ? 'rgba(154,84,116,0.19)' : '#F9EBF2',
      }
    : {
        bg: dm ? '#26262d' : '#fff',
        border: dm ? '#34343d' : '#E7E7EE',
        shadow: dm ? 'none' : '0 1px 2px rgba(30,30,40,0.05), 0 2px 5px rgba(30,30,40,0.04)',
        hoverBg: dm ? '#2e2e37' : '#FBFAFC',
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
        // Selection reads as the border thickening, not as a bar bolted to one
        // edge — the ring hugs the same rounded corners the card already has.
        boxShadow: selected ? `0 0 0 1px ${selectedBorder}` : skin.shadow,
        opacity: dimmed ? 0.62 : 1,
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = bridal ? (dm ? 'rgba(196,122,146,0.5)' : '#E2C3D2') : (dm ? '#4a4a58' : '#D6D6E0'); e.currentTarget.style.background = skin.hoverBg; } }}
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
          : { background: dm ? '#2e2e38' : '#F0F0F5', color: dm ? '#a1a1aa' : '#A6A6AF' }}
      >
        {initial}
      </div>

      {/* Name + service. flex-wrap lets a long name keep the whole line (never
          truncated — Roko needs full names on mobile) while the tag chips wrap
          to the next line instead of squeezing the name down to an initial. */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[0.875rem] font-semibold leading-snug break-words min-w-0" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>
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
          {booking.source === 'booksy' && (
            <span
              className="inline-flex items-center text-[0.5rem] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: dm ? 'rgba(14,165,175,0.18)' : '#E0F5F6', color: dm ? '#5EEAD4' : '#0E8F98' }}
              title="Imported from Booksy"
            >
              Booksy
            </span>
          )}
        </div>
        <p className="text-[0.72rem] truncate mt-0.5" style={{ color: mutedColor }}>
          {booking.service || 'Service not set'}
        </p>
        {/* Where she's driving, on the row itself. Before this the only way to
            find out was opening the card, which is useless for the actual
            question she asks the list: can these two jobs fit in one day.
            City leads because that is what decides it; the street follows for
            the days she is packing the car. */}
        {locationLine && (
          <p className="flex items-start gap-1.5 text-[0.7rem] mt-1" style={{ color: locationColor }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-2.5 h-2.5 flex-shrink-0 mt-[3px]">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="truncate">{locationLine}</span>
          </p>
        )}
        {depositTint && (
          <p
            className="flex items-center gap-1.5 text-[0.7rem] mt-1"
            style={{ color: depositTint.fg, fontWeight: deposit.kind === 'arrived' ? 600 : 500 }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: depositTint.key }} />
            <span className="truncate">{deposit.label}</span>
          </p>
        )}
      </div>

      {/* Time + status, with the date only when it adds something. Under a
          "Monday, Sep 7" heading every row was repeating Mon, Sep 7 down the
          whole group, three lines deep, and the one thing you actually wanted
          from that corner — what time — was the smallest text in it. Under a
          day heading the time takes the top line; the coarse groups (Later This
          Month, Past Due) still carry the date, because there it's the answer. */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
        {!hideDate && (
          <span className="text-[0.72rem] font-semibold whitespace-nowrap" style={{ color: consultOnly ? '#8B5CF6' : dateColor }}>
            {rel.label}
          </span>
        )}
        {rowTime && (
          <span
            className={`whitespace-nowrap tabular-nums ${hideDate ? 'text-[0.78rem] font-semibold' : 'text-[0.68rem] -mt-0.5'}`}
            style={{ color: hideDate ? (dm ? '#e4e4e7' : '#3a3a42') : mutedColor }}>
            {rowTime}
          </span>
        )}
        {hideDate && !rowTime && (
          <span className="text-[0.7rem] whitespace-nowrap" style={{ color: mutedColor }}>No time set</span>
        )}
        <StatusBadge status={booking.status} />
      </div>

      {/* Hover quick actions — desktop only, fixed slot so the row doesn't shift.
          Hidden while selecting so taps only toggle the checkbox. */}
      <div className={`${selectable ? 'hidden' : 'hidden md:flex'} items-center gap-1 flex-shrink-0 w-[60px] justify-end opacity-0 group-hover:opacity-100 transition-opacity`}>
        {booking.email && (
          <a
            href={`mailto:${booking.email}?subject=Appointment%20with%20Roko%20%C2%B7%20${encodeURIComponent(booking.service || '')}`}
            onClick={e => e.stopPropagation()}
            aria-label="Email client"
            className={iconBtn}
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A0B0'; e.currentTarget.style.color = '#D4A0B0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#E6E6EC'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#9a8e94'; }}
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
            onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#E6E6EC'; e.currentTarget.style.color = dm ? '#a1a1aa' : '#9a8e94'; }}
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
