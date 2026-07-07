import StatusBadge from './StatusBadge';

export default function BookingCard({ booking, onClick, darkMode: dm }) {
  const dateFormatted = booking.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : '';

  return (
    <button
      onClick={onClick}
      className="rounded-xl p-5 text-left transition-all group w-full"
      style={{
        background: dm ? '#1e1e24' : '#fff',
        border: `1px solid ${dm ? '#3a3a48' : '#E5E7EB'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,176,0.5)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = dm ? '#3a3a48' : '#E5E7EB'; }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-serif text-[1.05rem] group-hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#ECEDF1' : '#111' }}>
          {booking.name || 'Unnamed'}
        </h4>
        <StatusBadge status={booking.status} />
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {booking.date && (
          <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: dm ? '#71717a' : '#999' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dateFormatted}{booking.time && ` at ${booking.time}`}
          </div>
        )}
        {booking.email && (
          <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: dm ? '#71717a' : '#999' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            {booking.email}
          </div>
        )}
        {booking.phone && (
          <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: dm ? '#71717a' : '#999' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            {booking.phone}
          </div>
        )}
      </div>
      <span className="text-[0.75rem] font-semibold block mb-3" style={{ color: dm ? '#D4A0B0' : '#888' }}>{booking.service}</span>

      {/* Contact buttons */}
      <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#ebebeb'}` }}>
        {booking.email && (
          <a href={`mailto:${booking.email}?subject=Appointment%20with%20Roko%3A%20${encodeURIComponent(booking.service || '')}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.04em] uppercase rounded-lg hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all"
            style={{ color: dm ? '#71717a' : '#555', border: `1px solid ${dm ? '#3a3a48' : '#E2E4EA'}` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            Email
          </a>
        )}
        {booking.phone && (
          <a href={`sms:${booking.phone}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.04em] uppercase rounded-lg hover:border-[#D4A0B0] hover:text-[#D4A0B0] transition-all"
            style={{ color: dm ? '#71717a' : '#555', border: `1px solid ${dm ? '#3a3a48' : '#E2E4EA'}` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Text
          </a>
        )}
      </div>
    </button>
  );
}