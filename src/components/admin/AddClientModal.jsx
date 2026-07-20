import { useState, useEffect, useRef } from 'react';
import { lenisStop, lenisStart } from '@/lib/lenis';
import { formatPhone } from '@/lib/phone';
import { AdminDatePicker } from './SchedulePicker';
import TimeWindowPicker from './TimeWindowPicker';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { CLASS_FORMATS, CLASS_CATALOG, classMeta, startWindows } from '@/lib/classCatalog';
import { parseRange } from '@/lib/timeWindow';
import { STUDIO_DISPLAY } from '@/lib/studio';

const TIMES = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM',
];

const STATUSES = [
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
  { value: 'confirmed', label: 'Confirmed', color: '#2563EB' },
  { value: 'completed', label: 'Completed', color: '#64748B' },
];

const HOW_HEARD = ['Instagram', 'TikTok', 'Facebook', 'Vendor Referral', 'Client Referral', 'Google', 'Other'];
const LESSON_ACCENT = '#5BB0CC';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Module-level so open state and focus survive parent re-renders (typing in one
// field must not close/reset another dropdown).
function StyledDropdown({ value, onChange, options, placeholder, dm }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const border = dm ? '#3f3f46' : '#E2E4EA';
  const bg = dm ? '#18181b' : '#ffffff';
  const text = dm ? '#f4f4f5' : '#111';
  const muted = dm ? '#71717a' : '#999';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-3.5 py-2.5 rounded-xl text-[0.85rem] outline-none flex items-center justify-between transition-all cursor-pointer"
        style={{ background: bg, border: `1px solid ${open ? '#D4A0B0' : border}`, color: value ? text : muted }}>
        <span className="truncate">{value || placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"
          className={`w-3.5 h-3.5 flex-shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] py-1.5 z-50 max-h-[240px] overflow-y-auto"
          style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${border}`, animation: 'fadeSlideDown 0.15s ease-out' }} data-lenis-prevent>
          {options.length === 0 && <p className="px-4 py-2.5 text-[0.8rem]" style={{ color: muted }}>Loading…</p>}
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[0.8rem] transition-colors"
              style={{ color: value === o ? text : muted, background: value === o ? (dm ? '#3f3f46' : '#F6F6FA') : 'transparent', fontWeight: value === o ? 600 : 400 }}
              onMouseEnter={e => { if (value !== o) e.currentTarget.style.background = dm ? '#3f3f46' : '#F6F6F9'; }}
              onMouseLeave={e => { if (value !== o) e.currentTarget.style.background = 'transparent'; }}>
              {o}
              {value === o && <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function YesNo({ value, onChange, dm, yes = 'Yes', no = 'No' }) {
  const border = dm ? '#3f3f46' : '#E2E4EA';
  const idle = { background: dm ? '#1e1e24' : '#fafafa', color: dm ? '#71717a' : '#999', border: `1px solid ${border}` };
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)} className="flex-1 py-2.5 rounded-xl text-[0.74rem] font-semibold transition-all"
        style={value === true ? { background: '#D4A0B0', color: '#fff', border: '1px solid #D4A0B0' } : idle}>{yes}</button>
      <button type="button" onClick={() => onChange(false)} className="flex-1 py-2.5 rounded-xl text-[0.74rem] font-semibold transition-all"
        style={value === false ? { background: '#111', color: '#fff', border: '1px solid #111' } : idle}>{no}</button>
    </div>
  );
}

const CLASS_OPTIONS = Object.entries(CLASS_CATALOG).map(([key, c]) => ({ key, title: c.title }));

export default function AddClientModal({ onSave, onClose, darkMode: dm }) {
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', service: '', date: '', time: '',
    notes: '', status: 'confirmed', deposit_received: false, notify: false,
  });
  const [nb, setNb] = useState({ ready_by_time: '', early_arrival: null, travel_requested: null });
  const [bridal, setBridal] = useState({
    event_start_time: '', venue_access_time: '', ready_by_time: '', makeup_ready_by_time: '',
    photographer_arrival_time: '', bridal_party_glam: null, num_people_glam: '',
    event_location: '', photographer: '', hairstylist: '', instagram_handle: '',
    how_heard: '', out_of_state: null, additional_details: '',
  });
  const [cls, setCls] = useState({ format: '', classKey: '', slot: '', amount_paid: '', zoom_link: '', meeting_id: '' });
  const [genZoom, setGenZoom] = useState(false);

  const selectedService = services.find(s => s.title === form.service) || null;
  const category = selectedService?.category || '';
  const isBridal = category === 'bridal';
  const isClass = category === 'lessons';
  const isNonBridal = !!form.service && !isBridal && !isClass;
  const isFullDay = /full.?day/i.test(form.service);
  const isTrial = /trial/i.test(form.service);
  const dateNounCap = isTrial ? 'Trial' : 'Wedding';

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBr = (k, v) => setBridal(b => ({ ...b, [k]: v }));
  const setN = (k, v) => setNb(n => ({ ...n, [k]: v }));
  const setC = (k, v) => setCls(c => ({ ...c, [k]: v }));

  // One human-readable answer for "who needs glam" (matches the public bridal form).
  const glamSummary =
    bridal.bridal_party_glam === true ? (bridal.num_people_glam.trim() || 'Yes, final count to confirm')
    : bridal.bridal_party_glam === false ? 'Just the bride'
    : (bridal.num_people_glam || '');

  const classMetaSel = isClass && cls.classKey && cls.format ? classMeta(cls.classKey, cls.format) : null;
  const windows = classMetaSel ? startWindows(cls.classKey, cls.format) : [];

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => setServices(Array.isArray(data) ? data.filter(s => s?.title) : []))
      .catch(() => {});
  }, []);

  // Auto-fill the class amount from the catalog whenever class/format changes.
  useEffect(() => {
    if (classMetaSel) setCls(c => ({ ...c, amount_paid: String(classMetaSel.price ?? '') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.classKey, cls.format]);

  useEffect(() => {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    document.body.style.overflow = 'hidden';
    lenisStop();
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      lenisStart();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fullName = `${form.first_name} ${form.last_name}`.trim();

  // Non-bridal ready-by / early arrival / travel fold into the notes string in
  // the same format the public form uses, so the card parses them into chips.
  const buildNotes = () => {
    const parts = [form.notes.trim()];
    if (isNonBridal) {
      if (nb.early_arrival === true) parts.push('⏰ Early arrival (before 7 AM) — +$100 surcharge');
      if (nb.ready_by_time) parts.push(`Ready by: ${nb.ready_by_time}`);
      if (nb.travel_requested === true) parts.push('✈️ Travel requested — bridal pricing ($750+) applies');
    }
    return parts.filter(Boolean).join(' | ');
  };

  const generateZoom = async () => {
    if (!classMetaSel) { setError('Pick a class and format first.'); return; }
    setError('');
    setGenZoom(true);
    try {
      const res = await fetch('/api/create-zoom-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Makeup by Roko · ${classMetaSel.title}`,
          duration: classMetaSel.durationMinutes || 180,
          date: form.date || undefined,
          time: cls.slot || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate a Zoom link.');
      setCls(c => ({ ...c, zoom_link: data.join_url || '', meeting_id: data.meeting_id ? String(data.meeting_id) : '' }));
    } catch (err) {
      setError(err.message || 'Could not generate a Zoom link.');
    } finally {
      setGenZoom(false);
    }
  };

  const dateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  // Fire the matching client confirmation email (only when the Notify toggle is on).
  const notifyBooking = async (booking) => {
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
    const uploadUrl = `${siteBase}/upload-zelle?id=${booking.id}&token=${booking.upload_token}`;
    // Package total and the cash balance left after the deposit, so the bride's
    // email shows the same breakdown whether Roko added her or she booked herself.
    // Falls back to blank when a service row has no price, and the email collapses.
    const money = (s) => { const n = parseFloat(String(s || '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; };
    const _priceN = money(selectedService?.price);
    const _depositN = money(selectedService?.deposit);
    const bridalRemaining = (_priceN != null && _depositN != null && _priceN > _depositN)
      ? `$${(_priceN - _depositN).toLocaleString('en-US')}`
      : '';
    const payload = isBridal
      ? {
          bookingType: 'bridal', to: form.email.trim(), firstName: form.first_name.trim(), lastName: form.last_name.trim(),
          phone: form.phone, instagram: bridal.instagram_handle, bridalTitle: form.service,
          bridalDeposit: selectedService?.deposit, bridalPrice: selectedService?.price, bridalRemaining,
          bridalDateFormatted: dateFormatted, uploadUrl,
          eventLocation: bridal.event_location, eventStartTime: bridal.event_start_time, venueAccessTime: bridal.venue_access_time,
          readyByTime: bridal.ready_by_time, makeupReadyByTime: bridal.makeup_ready_by_time, photographerArrival: bridal.photographer_arrival_time,
          photographer: bridal.photographer, hairstylist: bridal.hairstylist, numPeopleGlam: glamSummary,
          outOfState: bridal.out_of_state, weddingDate: form.date, additionalDetails: bridal.additional_details, howHeard: bridal.how_heard,
        }
      : {
          bookingType: 'nonbridal', to: form.email.trim(), firstName: form.first_name.trim(), lastName: form.last_name.trim(),
          phone: form.phone, serviceName: form.service, servicePrice: selectedService?.price, serviceDeposit: selectedService?.deposit,
          dateFormatted, uploadUrl, isEarlyArrival: nb.early_arrival === true, hasTravelFee: nb.travel_requested === true,
          readyByTime: nb.ready_by_time, notes: form.notes,
        };
    await fetch('/api/send-booking-confirmation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, ...payload }),
    }).catch(() => {});
  };

  const submitClass = async () => {
    const insert = {
      full_name: fullName, email: form.email.trim(), phone: form.phone,
      [cls.classKey]: true,
      class_format: cls.format,
      preferred_date: form.date || null,
      appointment_date: form.date || null,
      preferred_time: cls.slot || null,
      appointment_time: cls.slot || null,
      amount_paid: cls.amount_paid ? Number(cls.amount_paid) : (classMetaSel?.price ?? null),
      payment_status: 'paid',
      status: 'confirmed',
      consultation_type: cls.format === 'online' ? 'Zoom' : 'In-Person',
      lesson_notes: cls.format === 'online' && cls.zoom_link
        ? [`Link: ${cls.zoom_link}`, cls.meeting_id ? `MeetingId: ${cls.meeting_id}` : null].filter(Boolean).join('\n')
        : null,
      additional_notes: form.notes.trim() || null,
    };
    const res = await fetch('/api/class-registrations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(insert),
    });
    const reg = await res.json();
    if (!res.ok) throw new Error(reg.error || 'Failed to create class registration');

    if (form.notify && form.date && cls.slot) {
      await fetch('/api/send-class-lesson', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: reg.id, clientEmail: form.email.trim(), clientName: fullName, clientPhone: form.phone,
          className: classMetaSel?.title, lessonDate: form.date, lessonTime: cls.slot,
          meetingType: cls.format === 'online' ? 'Zoom' : 'In-Person', zoomLink: cls.zoom_link, notes: form.notes,
        }),
      }).catch(() => {});
    }
    return reg;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.first_name.trim()) { setError('Please enter the client\'s first name.'); return; }
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) { setError('A valid email is required to add a client.'); return; }
    if (!form.service.trim()) { setError('Please choose a service.'); return; }
    if (isClass && (!cls.format || !cls.classKey)) { setError('Please choose the class format and which class.'); return; }
    setSaving(true);
    try {
      if (isClass) {
        const reg = await submitClass();
        onSave(reg, 'class');
        return;
      }

      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName, email: form.email.trim(), phone: form.phone,
          service: form.service, date: form.date || null, time: form.time || null,
          notes: buildNotes(), status: form.status, deposit_received: form.deposit_received,
        }),
      });
      const booking = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(booking.error || 'Failed to create booking');

      // Bridal: store the rich details in a linked inquiry (shares the booking's
      // upload_token so the card pairs them 1:1). Required columns are sent as ''
      // (never null) so the insert survives a sparse admin entry.
      if (isBridal) {
        await fetch('/api/bridal-inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bride_name: form.first_name.trim(),
            soon_to_be_last_name: form.last_name.trim(),
            email: form.email.trim(), phone: form.phone, service: form.service,
            instagram_handle: bridal.instagram_handle,
            wedding_date: form.date || '',
            event_location: bridal.event_location || '',
            event_start_time: bridal.event_start_time || '',
            venue_access_time: bridal.venue_access_time || '',
            ready_by_time: bridal.ready_by_time,
            makeup_ready_by_time: bridal.makeup_ready_by_time,
            photographer_arrival_time: bridal.photographer_arrival_time,
            photographer: bridal.photographer,
            hairstylist: bridal.hairstylist,
            num_people_glam: glamSummary,
            additional_details: bridal.additional_details,
            how_heard: bridal.how_heard,
            out_of_state: bridal.out_of_state,
            preferred_date: form.date || '',
            upload_token: booking.upload_token, status: 'new',
          }),
        }).catch(() => {});
      }

      if (form.notify) await notifyBooking(booking);

      onSave(booking, 'booking');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  // Theme tokens (match EditBookingModal / ServiceFormModal)
  const modalBg = dm ? '#27272a' : '#ffffff';
  const borderColor = dm ? '#3f3f46' : '#E8E9EE';
  const textPrimary = dm ? '#f4f4f5' : '#111111';
  const textMuted = dm ? '#71717a' : '#999999';
  const inputBg = dm ? '#18181b' : '#ffffff';
  const inputBorder = dm ? '#3f3f46' : '#E2E4EA';
  const sectionLabelColor = dm ? '#71717a' : '#a3a3ad';
  const subtleBg = dm ? '#1e1e24' : '#FAFAFB';

  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary };
  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl text-[0.85rem] outline-none transition-all placeholder:opacity-40 focus:border-[#D4A0B0]';
  const labelStyle = { display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px', color: dm ? '#a1a1aa' : '#808089' };

  const Section = ({ children, accent }) => (
    <p className="flex items-center gap-2.5 pt-1" style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent || sectionLabelColor }}>
      <span className="w-4 h-px" style={{ background: accent || (dm ? '#3f3f46' : '#E2E4EA') }} />
      {children}
    </p>
  );

  const canSave = form.first_name.trim() && form.email.trim() && form.service.trim() && (!isClass || (cls.format && cls.classKey));
  const dateLabel = isTrial ? 'Trial Date' : isBridal ? 'Wedding Date' : 'Appointment Date';

  return (
    <div
      className="fixed inset-0 z-[500] flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[640px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl sm:rounded-[24px]"
        style={{ background: modalBg, border: dm ? `1px solid ${borderColor}` : 'none', animation: 'fadeSlideDown 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex-none flex justify-between items-center px-5 sm:px-6 border-b"
          style={{ borderColor, paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '1rem' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#F2F2F7' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-4 h-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.16em] uppercase" style={{ color: '#D4A0B0' }}>Admin</p>
              <h3 className="font-serif text-[1.25rem] leading-none mt-0.5" style={{ color: textPrimary }}>Add Client</h3>
            </div>
          </div>
          <button onClick={onClose} type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#3f3f46' : '#F0F0F4', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form id="add-client-form" onSubmit={handleSubmit} data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>

          {/* CLIENT */}
          <Section>Client</Section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(555) 000-0000" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* SERVICE */}
          <Section>Service</Section>
          <div>
            <label style={labelStyle}>Service *</label>
            <StyledDropdown value={form.service} onChange={v => set('service', v)} options={services.map(s => s.title)} placeholder="Select a service…" dm={dm} />
            {isBridal && (
              <p className="mt-2 text-[0.68rem] font-medium px-3 py-2 rounded-lg" style={{ background: 'rgba(212,160,176,0.1)', color: '#A0607A' }}>
                Bridal service. Fill in the full bridal details below.
              </p>
            )}
            {isClass && (
              <p className="mt-2 text-[0.68rem] font-medium px-3 py-2 rounded-lg" style={{ background: 'rgba(91,176,204,0.12)', color: '#3E8AA3' }}>
                Makeup course. Choose the format, class, date and time below.
              </p>
            )}
          </div>

          {/* ───────── CLASS ───────── */}
          {isClass && (
            <>
              <Section accent={LESSON_ACCENT}>Class Format</Section>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(CLASS_FORMATS).map(f => {
                  const active = cls.format === f.key;
                  return (
                    <button key={f.key} type="button" onClick={() => setC('format', f.key)}
                      className="py-3 px-3 rounded-xl text-left transition-all"
                      style={active
                        ? { background: LESSON_ACCENT, color: '#fff', border: `1px solid ${LESSON_ACCENT}` }
                        : { background: subtleBg, color: textMuted, border: `1px solid ${borderColor}` }}>
                      <span className="block text-[0.8rem] font-semibold">{f.label}</span>
                      <span className="block text-[0.62rem] opacity-80 mt-0.5">{f.key === 'online' ? 'Live over Zoom' : 'Mountain House studio'}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label style={labelStyle}>Which Class</label>
                <StyledDropdown value={CLASS_OPTIONS.find(o => o.key === cls.classKey)?.title || ''}
                  onChange={t => setC('classKey', CLASS_OPTIONS.find(o => o.title === t)?.key || '')}
                  options={CLASS_OPTIONS.map(o => o.title)} placeholder="Select a class…" dm={dm} />
              </div>

              <div>
                <label style={labelStyle}>Class Date</label>
                <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent={LESSON_ACCENT} />
                {dateFormatted && <p className="text-[0.72rem] font-medium mt-2" style={{ color: LESSON_ACCENT }}>{dateFormatted}</p>}
              </div>

              {windows.length > 0 && (
                <div>
                  <label style={labelStyle}>Start Time</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {windows.map(w => {
                      const sel = cls.slot === w;
                      return (
                        <button key={w} type="button" onClick={() => setC('slot', sel ? '' : w)}
                          className="py-2.5 px-2 rounded-xl text-[0.72rem] font-semibold tabular-nums text-center transition-all"
                          style={sel
                            ? { background: LESSON_ACCENT, color: '#fff', border: `1px solid ${LESSON_ACCENT}` }
                            : { background: subtleBg, color: dm ? '#cdd3dd' : '#3f3f46', border: `1px solid ${borderColor}` }}>
                          {parseRange(w).start}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Amount Paid ($)</label>
                <input type="number" min="0" value={cls.amount_paid} onChange={e => setC('amount_paid', e.target.value)} placeholder="e.g. 520" className={inputClass} style={inputStyle} />
              </div>

              {cls.format === 'online' && (
                <div>
                  <label style={labelStyle}>Zoom Link</label>
                  <div className="flex gap-2">
                    <input value={cls.zoom_link} onChange={e => setC('zoom_link', e.target.value)} placeholder="Paste a link or generate one" className={`${inputClass} flex-1`} style={inputStyle} />
                    <button type="button" onClick={generateZoom} disabled={genZoom || !cls.classKey}
                      className="px-3.5 py-2.5 rounded-xl text-[0.72rem] font-semibold whitespace-nowrap transition-all disabled:opacity-50 flex items-center gap-1.5"
                      style={{ background: LESSON_ACCENT, color: '#fff' }}>
                      {genZoom ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> …</> : 'Generate'}
                    </button>
                  </div>
                  {cls.zoom_link && <p className="text-[0.68rem] mt-1.5" style={{ color: LESSON_ACCENT }}>Link ready. It saves with this class.</p>}
                </div>
              )}
              {cls.format === 'in_person' && (
                <div className="px-4 py-3 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                  <p className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: LESSON_ACCENT }}>Studio Location</p>
                  <p className="text-[0.78rem]" style={{ color: textPrimary }}>{STUDIO_DISPLAY}</p>
                </div>
              )}
            </>
          )}

          {/* ───────── NON-BRIDAL ───────── */}
          {isNonBridal && (
            <>
              <Section>Date &amp; Time</Section>
              <div>
                <label style={labelStyle}>{dateLabel}</label>
                <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent="#D4A0B0" />
                {dateFormatted && <p className="text-[0.72rem] font-medium mt-2" style={{ color: '#D4A0B0' }}>{dateFormatted}</p>}
              </div>
              <div>
                <label style={labelStyle}>Appointment Time Window</label>
                <TimeWindowPicker value={form.time} onChange={v => set('time', v)} slots={TIMES} dm={dm} accent="#D4A0B0" />
              </div>

              <Section>Appointment Details</Section>
              <div>
                <label style={labelStyle}>Ready By (client wants to be done)</label>
                <StyledDropdown value={nb.ready_by_time} onChange={v => setN('ready_by_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Early arrival (before 7 AM)?</label>
                  <YesNo value={nb.early_arrival} onChange={v => setN('early_arrival', v)} dm={dm} yes="Yes (+$100)" no="No" />
                </div>
                <div>
                  <label style={labelStyle}>Travel to client?</label>
                  <YesNo value={nb.travel_requested} onChange={v => setN('travel_requested', v)} dm={dm} yes="Yes" no="No" />
                </div>
              </div>
            </>
          )}

          {/* ───────── BRIDAL ───────── */}
          {isBridal && (
            <>
              <Section accent="#C4849A">{dateNounCap} Date</Section>
              <div>
                <label style={labelStyle}>{dateLabel}</label>
                <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent="#C4849A" />
                {dateFormatted && <p className="text-[0.72rem] font-medium mt-2" style={{ color: '#C4849A' }}>{dateFormatted}</p>}
              </div>

              <Section accent="#C4849A">Bridal Details</Section>
              <div>
                <label style={labelStyle}>Instagram / TikTok Handle</label>
                <input value={bridal.instagram_handle} onChange={e => setBr('instagram_handle', e.target.value)} placeholder="@handle" className={inputClass} style={inputStyle} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Event Start Time</label>
                  <StyledDropdown value={bridal.event_start_time} onChange={v => setBr('event_start_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>What time to be ready by</label>
                  <StyledDropdown value={bridal.makeup_ready_by_time} onChange={v => setBr('makeup_ready_by_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>Hairstylist Arrive By</label>
                  <StyledDropdown value={bridal.ready_by_time} onChange={v => setBr('ready_by_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>Photographer Arrival</label>
                  <StyledDropdown value={bridal.photographer_arrival_time} onChange={v => setBr('photographer_arrival_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>Venue Access Time</label>
                  <StyledDropdown value={bridal.venue_access_time} onChange={v => setBr('venue_access_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>How Did They Hear About You</label>
                  <StyledDropdown value={bridal.how_heard} onChange={v => setBr('how_heard', v)} options={HOW_HEARD} placeholder="Select…" dm={dm} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Event / Venue Location</label>
                <LocationAutocomplete value={bridal.event_location} onChange={v => setBr('event_location', v)} placeholder="Venue name or address" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Photographer</label>
                  <input value={bridal.photographer} onChange={e => setBr('photographer', e.target.value)} placeholder="@handle or name" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hairstylist</label>
                  <input value={bridal.hairstylist} onChange={e => setBr('hairstylist', e.target.value)} placeholder="@handle or name" className={inputClass} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Does the bridal party need glam too?</label>
                <YesNo value={bridal.bridal_party_glam} onChange={v => { setBr('bridal_party_glam', v); if (!v) setBr('num_people_glam', ''); }} dm={dm} yes="Yes, add glam" no="Just the bride" />
                {bridal.bridal_party_glam === true && (
                  <div className="mt-2.5">
                    <label style={labelStyle}>How many need glam? (besides the bride)</label>
                    <input value={bridal.num_people_glam} onChange={e => setBr('num_people_glam', e.target.value)} placeholder="e.g. 3 bridesmaids + mom" className={inputClass} style={inputStyle} />
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Out-of-state event?</label>
                <YesNo value={bridal.out_of_state} onChange={v => setBr('out_of_state', v)} dm={dm} yes="Yes, out of state" no="No, local" />
              </div>

              <div>
                <label style={labelStyle}>Makeup Vision / Additional Details</label>
                <textarea value={bridal.additional_details} onChange={e => setBr('additional_details', e.target.value)}
                  placeholder="Describe the makeup look, inspo, any special requests…" className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: 80, fontSize: '16px' }} />
              </div>
            </>
          )}

          {/* NOTES */}
          <Section>Notes</Section>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Anything else worth remembering for this client…"
            className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: 84, fontSize: '16px' }} />

          {/* STATUS + DEPOSIT — bookings only (classes carry their own paid state) */}
          {!isClass && (
            <>
              <Section>Status</Section>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.map(s => (
                  <button key={s.value} type="button" onClick={() => set('status', s.value)}
                    className="py-2.5 rounded-xl text-[0.7rem] font-semibold tracking-[0.04em] uppercase transition-all"
                    style={form.status === s.value
                      ? { background: s.color, color: '#fff', border: `1px solid ${s.color}` }
                      : { background: subtleBg, color: textMuted, border: `1px solid ${borderColor}` }
                    }>{s.label}</button>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                <div>
                  <p className="text-[0.82rem] font-medium" style={{ color: textPrimary }}>Zelle Deposit Received</p>
                  <p className="text-[0.7rem]" style={{ color: textMuted }}>Turn on if this client already paid their deposit</p>
                </div>
                <button type="button" onClick={() => set('deposit_received', !form.deposit_received)}
                  className="relative w-12 h-7 rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0"
                  style={{ background: form.deposit_received ? '#22c55e' : (dm ? '#3f3f46' : '#e2e8f0') }}>
                  <div className="w-6 h-6 rounded-full shadow transition-transform duration-200"
                    style={{ background: '#fff', transform: form.deposit_received ? 'translateX(20px)' : 'translateX(0px)' }} />
                </button>
              </div>
            </>
          )}

          {/* NOTIFY */}
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
            <div>
              <p className="text-[0.82rem] font-medium" style={{ color: textPrimary }}>Notify client by email</p>
              <p className="text-[0.7rem]" style={{ color: textMuted }}>Off = silent import. On = send the usual confirmation{isClass ? ' + Zoom/studio details' : ''}.</p>
            </div>
            <button type="button" onClick={() => set('notify', !form.notify)}
              className="relative w-12 h-7 rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0"
              style={{ background: form.notify ? '#D4A0B0' : (dm ? '#3f3f46' : '#e2e8f0') }}>
              <div className="w-6 h-6 rounded-full shadow transition-transform duration-200"
                style={{ background: '#fff', transform: form.notify ? 'translateX(20px)' : 'translateX(0px)' }} />
            </button>
          </div>

          {error && <p className="text-[0.75rem] font-medium px-1" style={{ color: '#ef4444' }}>{error}</p>}
        </form>

        {/* Pinned footer */}
        <div className="flex-none px-5 sm:px-6 py-3.5 border-t flex items-center gap-3"
          style={{ borderColor, background: modalBg, paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose}
            className="px-5 py-3 text-[0.78rem] font-medium rounded-xl border transition-all active:scale-[0.98]"
            style={{ borderColor: inputBorder, color: textMuted, background: 'transparent' }}>Cancel</button>
          <button type="submit" form="add-client-form" disabled={saving || !canSave}
            className="flex-1 py-3 text-[0.82rem] font-medium tracking-[0.04em] rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
            style={{ background: dm ? '#f4f4f5' : '#111111', color: dm ? '#111111' : '#ffffff' }}>
            {saving ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Adding…</> : (isClass ? 'Add Class Registration' : 'Add to Appointments')}
          </button>
        </div>
      </div>
    </div>
  );
}
