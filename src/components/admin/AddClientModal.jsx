import { useState, useEffect, useRef } from 'react';
import { lenisStop, lenisStart } from '@/lib/lenis';
import { AdminDatePicker } from './SchedulePicker';
import TimeWindowPicker from './TimeWindowPicker';

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

const HOW_HEARD = ['Instagram', 'TikTok', 'Google', 'Referral / Word of Mouth', 'Other'];

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
              style={{ color: value === o ? text : muted, background: value === o ? (dm ? '#3f3f46' : '#FAF5F2') : 'transparent', fontWeight: value === o ? 600 : 400 }}
              onMouseEnter={e => { if (value !== o) e.currentTarget.style.background = dm ? '#3f3f46' : '#f9f6f3'; }}
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

// Native <select> for the many secondary time/detail fields. A native control's
// option list renders in the browser's top layer, so it is NEVER clipped by the
// modal's scroll container (unlike a custom popover) — bulletproof in a dense form.
function NativeSelect({ value, onChange, options, placeholder, dm }) {
  const border = dm ? '#3f3f46' : '#E2E4EA';
  const bg = dm ? '#18181b' : '#ffffff';
  const text = dm ? '#f4f4f5' : '#111';
  const muted = dm ? '#71717a' : '#999';
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full pl-3.5 pr-9 py-2.5 rounded-xl outline-none focus:border-[#D4A0B0]"
        style={{ background: bg, border: `1px solid ${border}`, color: value ? text : muted, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', fontSize: '16px' }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o} style={{ color: '#111' }}>{o}</option>)}
      </select>
      <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
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

export default function AddClientModal({ onSave, onClose, darkMode: dm }) {
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', phone: '', service: '', date: '', time: '',
    notes: '', status: 'confirmed', deposit_received: false,
  });
  const [nb, setNb] = useState({ ready_by_time: '', early_arrival: null, travel_requested: null });
  const [bridal, setBridal] = useState({
    bride_name: '', soon_to_be_last_name: '', wedding_date: '', event_start_time: '',
    venue_access_time: '', ready_by_time: '', photographer_arrival_time: '', num_people_glam: '',
    event_location: '', photographer: '', hairstylist: '', instagram_handle: '', how_heard: '', additional_details: '',
  });

  const isBridal = /bridal|bride|wedding|full.?day/i.test(form.service);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBr = (k, v) => setBridal(b => ({ ...b, [k]: v }));
  const setN = (k, v) => setNb(n => ({ ...n, [k]: v }));

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => setServices(Array.isArray(data) ? data.map(s => s.title).filter(Boolean) : []))
      .catch(() => {});
  }, []);

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

  // Non-bridal ready-by / early arrival / travel fold into the notes string in
  // the same format the public form uses, so the card parses them into chips.
  const buildNotes = () => {
    const parts = [form.notes.trim()];
    if (!isBridal) {
      if (nb.early_arrival === true) parts.push('⏰ Early arrival (before 7 AM) — +$100 surcharge');
      if (nb.ready_by_time) parts.push(`Ready by: ${nb.ready_by_time}`);
      if (nb.travel_requested === true) parts.push('✈️ Travel requested — bridal pricing ($750+) applies');
    }
    return parts.filter(Boolean).join(' | ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please enter the client name.'); return; }
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) { setError('A valid email is required to add a client.'); return; }
    if (!form.service.trim()) { setError('Please choose a service.'); return; }
    setSaving(true);
    try {
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim(), phone: form.phone,
          service: form.service, date: form.date, time: form.time,
          notes: buildNotes(), status: form.status, deposit_received: form.deposit_received,
        }),
      });
      const booking = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(booking.error || 'Failed to create booking');

      // Bridal: store the rich details in a linked inquiry (shares the booking's
      // upload_token so the card pairs them 1:1).
      if (isBridal) {
        await fetch('/api/bridal-inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bridal,
            bride_name: bridal.bride_name.trim() || form.name.trim(),
            email: form.email.trim(), phone: form.phone, service: form.service,
            wedding_date: bridal.wedding_date || form.date || undefined,
            upload_token: booking.upload_token, status: 'new',
          }),
        }).catch(() => {});
      }

      onSave(booking);
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
  const labelStyle = { display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px', color: dm ? '#a1a1aa' : '#8a7f76' };

  const Section = ({ children, accent }) => (
    <p className="flex items-center gap-2.5 pt-1" style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent || sectionLabelColor }}>
      <span className="w-4 h-px" style={{ background: accent || (dm ? '#3f3f46' : '#E2E4EA') }} />
      {children}
    </p>
  );

  const dateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const canSave = form.name.trim() && form.email.trim() && form.service.trim();

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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#f8f1ee' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-4 h-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.16em] uppercase" style={{ color: '#D4A0B0' }}>Admin</p>
              <h3 className="font-serif text-[1.25rem] leading-none mt-0.5" style={{ color: textPrimary }}>Add Client</h3>
            </div>
          </div>
          <button onClick={onClose} type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#3f3f46' : '#f4f0ec', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form id="add-client-form" onSubmit={handleSubmit} data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>

          {/* CLIENT */}
          <Section>Client</Section>
          <div>
            <label style={labelStyle}>Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Client name" className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" className={inputClass} style={inputStyle} />
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
            <StyledDropdown value={form.service} onChange={v => set('service', v)} options={services} placeholder="Select a service…" dm={dm} />
            {isBridal && (
              <p className="mt-2 text-[0.68rem] font-medium px-3 py-2 rounded-lg" style={{ background: 'rgba(212,160,176,0.1)', color: '#A0607A' }}>
                Bridal service selected — fill in the full bridal details below.
              </p>
            )}
          </div>

          {/* DATE & TIME */}
          <Section>Date &amp; Time</Section>
          <div>
            <label style={labelStyle}>Date</label>
            <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent="#D4A0B0" />
            {dateFormatted && <p className="text-[0.72rem] font-medium mt-2" style={{ color: '#D4A0B0' }}>{dateFormatted}</p>}
          </div>
          <div>
            <label style={labelStyle}>Appointment Time Window</label>
            <TimeWindowPicker value={form.time} onChange={v => set('time', v)} slots={TIMES} dm={dm} accent="#D4A0B0" />
          </div>

          {/* NON-BRIDAL DETAILS */}
          {form.service && !isBridal && (
            <>
              <Section>Appointment Details</Section>
              <div>
                <label style={labelStyle}>Ready By (client wants to be done)</label>
                <NativeSelect value={nb.ready_by_time} onChange={v => setN('ready_by_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
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

          {/* BRIDAL DETAILS */}
          {isBridal && (
            <>
              <Section accent="#C4849A">Bridal Details</Section>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Bride's First Name</label>
                  <input value={bridal.bride_name} onChange={e => setBr('bride_name', e.target.value)} placeholder="First name" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Soon-to-be Last Name</label>
                  <input value={bridal.soon_to_be_last_name} onChange={e => setBr('soon_to_be_last_name', e.target.value)} placeholder="Last name" className={inputClass} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Wedding Date</label>
                <input type="date" value={bridal.wedding_date} onChange={e => setBr('wedding_date', e.target.value)} className={inputClass} style={{ ...inputStyle, fontSize: '16px' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Event Start Time</label>
                  <NativeSelect value={bridal.event_start_time} onChange={v => setBr('event_start_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>Venue Access Time</label>
                  <NativeSelect value={bridal.venue_access_time} onChange={v => setBr('venue_access_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>Artist Arrive By (Ready By)</label>
                  <NativeSelect value={bridal.ready_by_time} onChange={v => setBr('ready_by_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
                <div>
                  <label style={labelStyle}>Photographer Arrival</label>
                  <NativeSelect value={bridal.photographer_arrival_time} onChange={v => setBr('photographer_arrival_time', v)} options={TIMES} placeholder="Select time…" dm={dm} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}># People Getting Glam</label>
                  <input type="number" min="1" value={bridal.num_people_glam} onChange={e => setBr('num_people_glam', e.target.value)} placeholder="e.g. 4" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>How Did They Hear About You</label>
                  <NativeSelect value={bridal.how_heard} onChange={v => setBr('how_heard', v)} options={HOW_HEARD} placeholder="Select…" dm={dm} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Event / Venue Location</label>
                <input value={bridal.event_location} onChange={e => setBr('event_location', e.target.value)} placeholder="Venue name or address" className={inputClass} style={inputStyle} />
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
                <label style={labelStyle}>Bride's Instagram / TikTok</label>
                <input value={bridal.instagram_handle} onChange={e => setBr('instagram_handle', e.target.value)} placeholder="@handle" className={inputClass} style={inputStyle} />
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

          {/* STATUS */}
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

          {/* DEPOSIT */}
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
            {saving ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Adding…</> : 'Add to Appointments'}
          </button>
        </div>
      </div>
    </div>
  );
}
