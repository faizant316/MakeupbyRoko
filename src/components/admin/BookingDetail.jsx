import { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from './StatusBadge';
import EditBookingModal from './EditBookingModal';
import BookingReferencePhotos from './BookingReferencePhotos';
import confetti from 'canvas-confetti';

function ZelleScreenshotViewer({ bookingId, table = 'bookings', dm }) {
  const [expanded, setExpanded] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !signedUrl) {
      setLoadingUrl(true);
      try {
        const res = await fetch('/api/screenshot-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bookingId, table }),
        });
        const data = await res.json();
        setSignedUrl(data.url);
      } finally {
        setLoadingUrl(false);
      }
    }
  };

  return (
    <div className="mb-3 rounded-xl overflow-hidden border" style={{ borderColor: dm ? '#3a3a48' : '#e8e2dc' }}>
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: dm ? '#2e2e38' : '#F7F3F0' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span className="text-[0.72rem] font-semibold" style={{ color: dm ? '#86efac' : '#16a34a' }}>Zelle Screenshot Received</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#71717a' : '#aaa'} strokeWidth="2"
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {expanded && (
        <div className="p-3" style={{ background: dm ? '#1e1e24' : '#fff' }}>
          {loadingUrl && <p className="text-[0.72rem] text-center py-4" style={{ color: dm ? '#71717a' : '#aaa' }}>Loading…</p>}
          {signedUrl && (
            <>
              <img
                src={signedUrl}
                alt="Zelle screenshot"
                className="w-full rounded-lg object-contain max-h-[400px] cursor-pointer"
                onClick={() => window.open(signedUrl, '_blank')}
                title="Click to open full size"
              />
              <p className="text-[0.62rem] text-center mt-2" style={{ color: dm ? '#52525b' : '#bbb' }}>Click image to open full size</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

function CopyableAddress({ address, dm }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-left w-full group"
      title="Tap to copy address"
    >
      <p className="text-[0.85rem] font-medium leading-snug" style={{ color: dm ? '#e4e4e7' : '#111' }}>
        {address}
      </p>
      <span className="text-[0.62rem] mt-0.5 inline-flex items-center gap-1 transition-colors"
        style={{ color: copied ? '#22c55e' : dm ? '#52525b' : '#c5bdb5' }}>
        {copied ? (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
        ) : (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Tap to copy</>
        )}
      </span>
    </button>
  );
}

export default function BookingDetail({ booking, onBack, onUpdateStatus, onUpdateBooking, onDelete, allBookings, darkMode: dm }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showClientStats, setShowClientStats] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [mapsKey, setMapsKey] = useState('');

  useEffect(() => {
    base44.functions.invoke('getMapKey', {}).then(res => setMapsKey(res.data?.key || '')).catch(() => {});
  }, []);

  const showToast = (msg, color) => {
    setToast({ message: msg, color });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2200);
  };

  const handleStatusChange = (s) => {
    if (s === 'cancelled') {
      setConfirmCancel(true);
      return;
    }
    onUpdateStatus(s);
    if (s === 'completed') {
      setCelebrate(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.3, x: 0.5 },
        colors: ['#F0C27A', '#D4A0B0', '#B8A0D4', '#60A5FA'],
        scalar: 1.0,
      });
      setTimeout(() => setCelebrate(false), 2200);
    } else if (s === 'confirmed') {
      showToast('Appointment Confirmed', '#3b82f6');
      if (booking.email) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: booking.email,
            subject: `Your appointment is confirmed — ${booking.service} ✦`,
            html: `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:20px;background:#FAF7F4;"><div style="background:#fff;border-radius:16px;padding:24px;text-align:center;margin-bottom:10px;border:1px solid #EDE6DF;"><p style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C4849A;margin:0 0 8px;">Roqia Moshref · Makeup Artistry</p><div style="width:42px;height:42px;border-radius:50%;background:#EBF5EB;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:18px;">✓</div><h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;color:#2C1A14;margin:0 0 6px;">You're <em style="color:#C4849A;">Confirmed!</em></h1><p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#A0785A;margin:0;">Can't wait to see you ✦</p></div><div style="background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:10px;border:1px solid #EDE6DF;"><p style="font-size:14px;color:#2C1A14;margin:0 0 4px;">Hey <strong>${booking.name?.split(' ')[0] || 'there'}</strong> 👋</p><p style="font-size:13px;color:#6E6058;margin:0;line-height:1.6;">Your appointment has been confirmed! See you soon.</p></div><div style="background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:10px;border:1px solid #EDE6DF;"><p style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#C4849A;margin:0 0 10px;">Appointment Details</p><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:6px 0;font-size:12px;color:#9E8E84;border-bottom:1px solid #F0EAE5;">Service</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;border-bottom:1px solid #F0EAE5;">${booking.service}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#9E8E84;">Date</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#2C1A14;text-align:right;">${dateFormatted}</td></tr></table></div><div style="background:#fff;border-radius:12px;padding:16px;text-align:center;margin-bottom:8px;border:1px solid #EDE6DF;"><p style="font-size:11px;color:#9E8E84;margin:0 0 4px;">Questions? Reach out anytime.</p><p style="font-size:12px;color:#A0785A;margin:0;">makeupbyroko22@gmail.com · @makeupbyroko_</p></div><div style="text-align:center;"><p style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#A0785A;margin:0 0 3px;">Xoxo, Roko 💋</p></div></div>`,
          }),
        }).catch(err => console.error('confirmed email error:', err));
      }
    }
  };

  const handleConfirmCancel = () => {
    onUpdateStatus('cancelled');
    setConfirmCancel(false);
    showToast('Appointment Cancelled', '#ef4444');
    if (booking.email) {
      fetch('/api/on-booking-cancelled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: booking.email,
          name: booking.name?.split(' ')[0] || booking.name || 'there',
          service: booking.service,
          date: dateFormatted,
        }),
      }).catch(err => console.error('cancelled email error:', err));
    }
  };

  const dateFormatted = booking.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const totalVisits = allBookings.filter(b => b.email === booking.email).length;
  const completedVisits = allBookings.filter(b => b.email === booking.email && b.status === 'completed').length;
  const cancelledVisits = allBookings.filter(b => b.email === booking.email && b.status === 'cancelled').length;
  // Sort chronologically: earliest date first, undated last
  const clientBookings = allBookings
    .filter(b => b.email === booking.email && b.id !== booking.id)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

  // Fetch bridal inquiry if this is a bridal booking
  const isBridal = /bridal|bride|wedding|full day/i.test(booking.service || '') && !/non-bridal/i.test(booking.service || '');

  const { data: bridalInquiry } = useQuery({
    queryKey: ['bridal-inquiry', booking.email],
    queryFn: async () => {
      const results = await base44.entities.BridalInquiry.filter({ email: booking.email }, '-created_date', 1);
      return results[0] || null;
    },
    enabled: isBridal && !!booking.email,
  });

  // Scroll to top when detail view mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const handleSaveEdit = (data) => {
    onUpdateBooking(data);
    setShowEdit(false);
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[#D4A0B0] hover:text-[#b8849a] transition-colors mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to List
      </button>

      <div className="rounded-xl p-6 sm:p-8 mb-6" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}` }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => setShowClientStats(!showClientStats)}
              className="font-serif text-[1.75rem] transition-colors text-left"
              style={{ color: dm ? '#e4e4e7' : '#111' }}>
              {booking.name}
            </button>
            <p className="text-[0.8rem] mt-1" style={{ color: dm ? '#71717a' : '#999' }}>{booking.service}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Client stats — toggled by name click */}
        {showClientStats && (
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl" style={{ background: dm ? '#1e1e24' : '#FAF8F6', border: `1px solid ${dm ? '#2a2420' : '#f0ebe6'}`, animation: 'fadeSlideDown 0.3s ease-out' }}>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{totalVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Total Visits</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{completedVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[1.5rem]" style={{ color: dm ? '#F0EBE6' : '#111' }}>{cancelledVisits}</div>
              <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase text-[#b5a99a]">Cancelled</div>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a] mb-1">Date & Time</p>
            <p className="text-[0.9rem] font-medium" style={{ color: dm ? '#F0EBE6' : '#111' }}>{dateFormatted}</p>
            {booking.time && <p className="text-[0.85rem]" style={{ color: dm ? '#D4A0B0' : '#A0785A' }}>{booking.time}</p>}
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a] mb-1">Contact</p>
            {booking.email && <a href={`mailto:${booking.email}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block" style={{ color: dm ? '#e4e4e7' : '#111' }}>{booking.email}</a>}
            {booking.phone && <a href={`sms:${booking.phone}`} className="text-[0.85rem] hover:text-[#D4A0B0] underline underline-offset-2 transition-colors block mt-0.5" style={{ color: dm ? '#71717a' : '#999' }}>{booking.phone}</a>}
          </div>
        </div>

        {booking.notes && (
          <div className="mb-6">
            <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a] mb-1">Notes</p>
            <p className="text-[0.85rem] leading-relaxed" style={{ color: dm ? '#a1a1aa' : '#777' }}>{booking.notes}</p>
          </div>
        )}

        {/* Bridal Inquiry Details */}
        {isBridal && bridalInquiry && (
          <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: `1px solid ${dm ? '#3a3a48' : '#f0e6df'}` }}>
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ background: dm ? 'rgba(212,160,176,0.12)' : 'rgba(212,160,176,0.1)', borderBottom: `1px solid ${dm ? '#3a3a48' : '#f0e6df'}` }}>
              <span className="text-base">💍</span>
              <p className="text-[0.6rem] font-bold tracking-[0.18em] uppercase text-[#D4A0B0]">Bridal Inquiry Details</p>
            </div>

            <div className="p-5" style={{ background: dm ? '#1e1e24' : '#FFFCFA' }}>
              {/* Top grid — key timing info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: '👰', label: 'Bride', value: `${bridalInquiry.bride_name || ''}${bridalInquiry.soon_to_be_last_name ? ` ${bridalInquiry.soon_to_be_last_name}` : ''}` },
                  { icon: '📅', label: 'Wedding Date', value: bridalInquiry.wedding_date ? new Date(bridalInquiry.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : null },
                  { icon: '🕐', label: 'Event Start', value: bridalInquiry.event_start_time },
                  { icon: '🚪', label: 'Venue Access', value: bridalInquiry.venue_access_time },
                ].filter(f => f.value).map(({ icon, label, value }) => (
                  <div key={label} className="rounded-xl px-4 py-3 flex items-center gap-3 sm:block" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                    <span className="text-[1.2rem] sm:hidden">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-0.5">{label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.85rem] hidden sm:inline">{icon}</span>
                        <p className="text-[0.85rem] font-medium leading-snug" style={{ color: dm ? '#e4e4e7' : '#111' }}>{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Makeup artist timing row */}
              {(bridalInquiry.ready_by_time || bridalInquiry.photographer_arrival_time) && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {bridalInquiry.ready_by_time && (
                    <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                      <div className="w-8 h-8 rounded-full bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[0.9rem]">💄</span>
                      </div>
                      <div>
                        <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-0.5">Artist Arrive By</p>
                        <p className="text-[0.85rem] font-semibold" style={{ color: dm ? '#D4A0B0' : '#C4849A' }}>{bridalInquiry.ready_by_time}</p>
                      </div>
                    </div>
                  )}
                  {bridalInquiry.photographer_arrival_time && (
                    <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                      <div className="w-8 h-8 rounded-full bg-[#B8A0D4]/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[0.9rem]">📷</span>
                      </div>
                      <div>
                        <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-0.5">Photographer Arrives</p>
                        <p className="text-[0.85rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#111' }}>{bridalInquiry.photographer_arrival_time}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Event Location — big card with map embed */}
              {bridalInquiry.event_location && (
                <div className="rounded-2xl overflow-hidden mb-5" style={{ border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                  <div className="px-4 py-4 sm:py-3" style={{ background: dm ? '#27272a' : '#fff', borderBottom: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#D4A0B0]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-3.5 h-3.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-0.5">Event Location</p>
                        <CopyableAddress address={bridalInquiry.event_location} dm={dm} />
                      </div>
                      <a
                        href={`maps://?q=${encodeURIComponent(bridalInquiry.event_location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.65rem] font-semibold transition-colors flex-shrink-0"
                        style={{ background: dm ? '#3a3a48' : '#F5F0EC', color: dm ? '#D4A0B0' : '#A0785A' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Maps
                      </a>
                    </div>
                  </div>
                  {/* Google Maps embed — desktop only */}
                  <div className="hidden sm:block">
                    {mapsKey ? (
                      <iframe
                        title="Event Location"
                        width="100%"
                        height="220"
                        style={{ border: 0, display: 'block' }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encodeURIComponent(bridalInquiry.event_location)}&zoom=14`}
                      />
                    ) : (
                      <div className="h-[120px] flex items-center justify-center" style={{ background: dm ? '#1e1e24' : '#f5f0ec' }}>
                        <div className="w-5 h-5 border-2 border-[#D4A0B0]/30 border-t-[#D4A0B0] rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor row */}
              {(bridalInquiry.photographer || bridalInquiry.hairstylist) && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {bridalInquiry.photographer && (
                    <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                      <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Photographer</p>
                      <a href={`https://instagram.com/${bridalInquiry.photographer.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                        className="text-[0.82rem] font-medium hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#e4e4e7' : '#333' }}>
                        {bridalInquiry.photographer}
                      </a>
                    </div>
                  )}
                  {bridalInquiry.hairstylist && (
                    <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                      <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-1">Hairstylist</p>
                      <a href={`https://instagram.com/${bridalInquiry.hairstylist.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                        className="text-[0.82rem] font-medium hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#e4e4e7' : '#333' }}>
                        {bridalInquiry.hairstylist}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom row — glam count, instagram, how heard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {bridalInquiry.num_people_glam && (
                  <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                    <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-0.5">People Needing Glam</p>
                    <p className="text-[0.85rem] font-medium" style={{ color: dm ? '#e4e4e7' : '#111' }}>✨ {bridalInquiry.num_people_glam}</p>
                  </div>
                )}
                {bridalInquiry.instagram_handle && (
                  <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                    <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-0.5">Instagram / TikTok</p>
                    <a href={`https://instagram.com/${bridalInquiry.instagram_handle.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                      className="text-[0.82rem] font-medium hover:text-[#D4A0B0] transition-colors" style={{ color: dm ? '#e4e4e7' : '#333' }}>
                      {bridalInquiry.instagram_handle}
                    </a>
                  </div>
                )}
                {bridalInquiry.how_heard && (
                  <div className="rounded-xl px-4 py-3" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                    <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-0.5">How They Heard</p>
                    <p className="text-[0.82rem] font-medium" style={{ color: dm ? '#e4e4e7' : '#333' }}>{bridalInquiry.how_heard}</p>
                  </div>
                )}
              </div>

              {/* Additional details */}
              {bridalInquiry.additional_details && (
                <div className="rounded-xl px-4 py-3.5" style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#ede8e3'}` }}>
                  <p className="text-[0.55rem] font-bold tracking-[0.12em] uppercase text-[#b5a99a] mb-1.5">Additional Details / Makeup Vision</p>
                  <p className="text-[0.83rem] leading-[1.7]" style={{ color: dm ? '#a1a1aa' : '#555' }}>{bridalInquiry.additional_details}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zelle Deposit Received */}
        <div className="mb-6">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a] mb-3">Zelle Deposit</p>

          {/* Screenshot viewer */}
          {booking.zelle_screenshot && (
            <ZelleScreenshotViewer bookingId={booking.id} table="bookings" dm={dm} />
          )}

          <div className="flex items-stretch gap-3">
            <button
              onClick={() => onUpdateBooking({ deposit_received: true })}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all"
              style={booking.deposit_received
                ? { background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: '1px solid #22c55e', boxShadow: '0 4px 16px rgba(34,197,94,0.25)' }
                : { background: dm ? '#27272a' : '#fafafa', color: dm ? '#52525b' : '#c5bdb5', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }
              }
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: booking.deposit_received ? 'rgba(255,255,255,0.2)' : dm ? '#2e2e38' : '#f0ece8' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="text-[0.7rem] font-semibold tracking-[0.04em]">Received</span>
            </button>
            <button
              onClick={() => onUpdateBooking({ deposit_received: false })}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all"
              style={!booking.deposit_received
                ? { background: dm ? 'rgba(120,20,20,0.55)' : 'linear-gradient(135deg, rgba(244,63,63,0.08), rgba(220,38,38,0.12))', color: dm ? '#fca5a5' : '#b91c1c', border: `1px solid ${dm ? 'rgba(185,28,28,0.4)' : 'rgba(239,68,68,0.25)'}`, boxShadow: 'none' }
                : { background: dm ? '#27272a' : '#fafafa', color: dm ? '#52525b' : '#c5bdb5', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }
              }
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: !booking.deposit_received ? 'rgba(255,255,255,0.15)' : dm ? '#2e2e38' : '#f0ece8' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <span className="text-[0.7rem] font-semibold tracking-[0.04em]">Not Yet</span>
            </button>
          </div>
        </div>

        {/* Reference Photos */}
        <BookingReferencePhotos booking={booking} onUpdateBooking={onUpdateBooking} dm={dm} />

        {/* Edit Details button */}
        <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-[0.72rem] font-semibold tracking-[0.04em] rounded-xl transition-all hover:opacity-80"
            style={{ background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#e4e4e7' : '#333', border: `1px solid ${dm ? '#3a3a48' : '#e8e0d8'}` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Details
          </button>
        </div>

        {/* Update Status */}
        <div className="mb-6 pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a] mb-3">Update Status</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUSES.map(s => {
              const isActive = booking.status === s;
              const statusColors = {
                pending:   { bg: '#F59E0B', text: '#fff' },
                confirmed: { bg: '#3B82F6', text: '#fff' },
                completed: { bg: '#22C55E', text: '#fff' },
                cancelled: { bg: '#EF4444', text: '#fff' },
              };
              return (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className="py-2.5 px-3 text-[0.65rem] font-semibold tracking-[0.06em] uppercase rounded-xl transition-all hover:opacity-90 truncate"
                  style={isActive
                    ? { background: statusColors[s].bg, color: statusColors[s].text }
                    : { background: dm ? '#2e2e38' : '#F5F0EC', color: dm ? '#52525b' : '#bbb', border: `1px solid ${dm ? '#3a3a48' : '#ece6e0'}` }
                  }
                >{s}</button>
              );
            })}
          </div>
        </div>

        {/* Delete */}
        <div className="pt-6" style={{ borderTop: `1px solid ${dm ? '#3a3a48' : '#f0ebe6'}` }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 text-[0.65rem] font-medium tracking-[0.08em] uppercase rounded-full transition-all"
              style={{ color: dm ? '#f87171' : '#dc2626', border: `1px solid ${dm ? 'rgba(185,28,28,0.3)' : 'rgba(239,68,68,0.25)'}` }}
              onMouseEnter={e => { e.currentTarget.style.background = dm ? 'rgba(120,20,20,0.2)' : 'rgba(244,63,63,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete Appointment
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[0.75rem] text-red-400">Are you sure?</span>
              <button onClick={onDelete} className="px-4 py-2 text-[0.65rem] font-medium uppercase bg-red-500 text-white rounded-full hover:bg-red-600 transition-all">Yes, Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-[0.65rem] font-medium uppercase rounded-full transition-all"
                style={{ color: dm ? '#71717a' : '#999', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Client history */}
      {clientBookings.length > 0 && (
        <div className="rounded-xl p-6 sm:p-8" style={{ background: dm ? '#1e1e24' : '#fff', border: `1px solid ${dm ? '#3a3a48' : '#e8e2dc'}` }}>
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-[#b5a99a] mb-4">Appointment History</p>
          <div className="flex flex-col">
            {clientBookings.map((b, idx) => (
              <div key={b.id} className="flex items-center justify-between py-3"
                style={{ borderBottom: idx < clientBookings.length - 1 ? `1px solid ${dm ? '#2e2e38' : '#f5f0ed'}` : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    b.status === 'completed' ? 'bg-green-500' : b.status === 'confirmed' ? 'bg-blue-400' : b.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-[0.85rem] font-medium" style={{ color: dm ? '#F0EBE6' : '#111' }}>{b.service}</p>
                    <p className="text-[0.72rem] mt-0.5" style={{ color: dm ? '#71717a' : '#aaa' }}>
                      {b.date
                        ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'No date set'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtle top toast */}
      {toast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          style={{
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            opacity: toastVisible ? 1 : 0,
            transform: `translateX(-50%) translateY(${toastVisible ? '0px' : '-8px'})`,
          }}
        >
          <div
            className="flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-lg border"
            style={{
              background: toast.color === '#3b82f6' ? 'rgba(239,246,255,0.97)' : 'rgba(255,241,241,0.97)',
              borderColor: toast.color === '#3b82f6' ? '#bfdbfe' : '#fecaca',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: toast.color, boxShadow: `0 0 6px ${toast.color}88` }}
            />
            <p className="text-[0.8rem] font-semibold tracking-wide" style={{ color: toast.color }}>
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-2xl shadow-2xl p-7 max-w-[340px] w-full text-center"
            style={{
              background: dm ? '#27272a' : '#fff',
              border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}`,
              animation: 'fadeSlideDown 0.25s ease-out',
            }}>
            <p className="text-[1.1rem] font-serif mb-2" style={{ color: dm ? '#e4e4e7' : '#111' }}>Cancel this appointment?</p>
            <p className="text-[0.8rem] mb-6" style={{ color: dm ? '#71717a' : '#999' }}>This will mark the appointment as cancelled.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmCancel(false)}
                className="px-5 py-2 text-[0.75rem] font-medium rounded-full transition-all"
                style={{ color: dm ? '#a1a1aa' : '#777', border: `1px solid ${dm ? '#3f3f46' : '#e8e2dc'}` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = dm ? '#71717a' : '#bbb'}
                onMouseLeave={e => e.currentTarget.style.borderColor = dm ? '#3f3f46' : '#e8e2dc'}>
                Keep It
              </button>
              <button onClick={handleConfirmCancel}
                className="px-5 py-2 text-[0.75rem] font-medium text-white bg-red-500 rounded-full hover:bg-red-600 transition-all">
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration confetti only */}

      {/* Edit modal */}
      {showEdit && (
        <EditBookingModal booking={booking} onSave={handleSaveEdit} onClose={() => setShowEdit(false)} darkMode={dm} />
      )}
    </div>
  );
}