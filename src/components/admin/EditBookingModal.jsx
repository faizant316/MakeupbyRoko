import { useState, useEffect, useRef } from 'react';
import { lenisStop, lenisStart } from '@/lib/lenis';
import { AdminDatePicker } from './SchedulePicker';
import TimeWindowPicker from './TimeWindowPicker';

const TIMES = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM',
];

const STATUSES = [
  { value: 'pending',   label: 'Pending',   color: '#F59E0B' },
  { value: 'confirmed', label: 'Confirmed', color: '#2563EB' },
  { value: 'completed', label: 'Completed', color: '#64748B' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
];

export default function EditBookingModal({ booking, onSave, onClose, darkMode: dm }) {
  const [SERVICES, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const svcRef = useRef(null);

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => setServices(Array.isArray(data) ? data.map(s => s.title).filter(Boolean) : []))
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    name: booking.name || '',
    email: booking.email || '',
    phone: booking.phone || '',
    service: booking.service || '',
    date: booking.date || '',
    time: booking.time || '',
    notes: booking.notes || '',
    status: booking.status || 'pending',
    deposit_received: booking.deposit_received || false,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Lock the page behind the modal. Lenis owns scrolling site-wide, so
  // overflow:hidden alone won't stop the wheel — pause Lenis too (this is what
  // fixes the old base44 modal scrolling the background behind it).
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
    const handler = (e) => { if (svcRef.current && !svcRef.current.contains(e.target)) setSvcOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  // Theme tokens (match ServiceFormModal)
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

  const Section = ({ children }) => (
    <p className="flex items-center gap-2.5 pt-1" style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: sectionLabelColor }}>
      <span className="w-4 h-px" style={{ background: dm ? '#3f3f46' : '#E2E4EA' }} />
      {children}
    </p>
  );

  const dateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[620px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl sm:rounded-[24px]"
        style={{ background: modalBg, border: dm ? `1px solid ${borderColor}` : 'none', animation: 'fadeSlideDown 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex-none flex justify-between items-center px-5 sm:px-6 border-b"
          style={{ borderColor, paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '1rem' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: dm ? '#3f3f46' : '#f8f1ee' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.6" className="w-4 h-4">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.16em] uppercase" style={{ color: '#D4A0B0' }}>Admin</p>
              <h3 className="font-serif text-[1.25rem] leading-none mt-0.5" style={{ color: textPrimary }}>Edit Appointment</h3>
            </div>
          </div>
          <button onClick={onClose} type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: dm ? '#3f3f46' : '#f4f0ec', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form id="edit-appt-form" onSubmit={handleSubmit} data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>

          {/* CLIENT */}
          <Section>Client</Section>
          <div>
            <label style={labelStyle}>Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Client name" className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* SERVICE */}
          <Section>Service</Section>
          <div ref={svcRef} className="relative">
            <button type="button" onClick={() => setSvcOpen(o => !o)}
              className={`${inputClass} text-left flex items-center justify-between cursor-pointer`} style={inputStyle}>
              <span style={{ color: form.service ? textPrimary : textMuted }}>{form.service || 'Select a service…'}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2"
                className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${svcOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {svcOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] py-1.5 z-50 max-h-[240px] overflow-y-auto"
                style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${borderColor}`, animation: 'fadeSlideDown 0.15s ease-out' }} data-lenis-prevent>
                {SERVICES.length === 0 && <p className="px-4 py-2.5 text-[0.8rem]" style={{ color: textMuted }}>Loading services…</p>}
                {SERVICES.map(s => (
                  <button key={s} type="button"
                    onClick={() => { set('service', s); setSvcOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[0.8rem] transition-colors"
                    style={{
                      color: form.service === s ? textPrimary : textMuted,
                      background: form.service === s ? (dm ? '#3f3f46' : '#FAF5F2') : 'transparent',
                      fontWeight: form.service === s ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (form.service !== s) e.currentTarget.style.background = dm ? '#3f3f46' : '#f9f6f3'; }}
                    onMouseLeave={e => { if (form.service !== s) e.currentTarget.style.background = 'transparent'; }}>
                    {s}
                    {form.service === s && <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
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

          {/* NOTES */}
          <Section>Notes</Section>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Ready-by time, makeup vision, special requests…"
            className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: 84, fontSize: '16px' }} />

          {/* STATUS */}
          <Section>Status</Section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          <Section>Deposit</Section>
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
            <div>
              <p className="text-[0.82rem] font-medium" style={{ color: textPrimary }}>Zelle Deposit Received</p>
              <p className="text-[0.7rem]" style={{ color: textMuted }}>Toggle once the deposit is confirmed</p>
            </div>
            <button type="button" onClick={() => set('deposit_received', !form.deposit_received)}
              className="relative w-12 h-7 rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0"
              style={{ background: form.deposit_received ? '#22c55e' : (dm ? '#3f3f46' : '#e2e8f0') }}>
              <div className="w-6 h-6 rounded-full shadow transition-transform duration-200"
                style={{ background: '#fff', transform: form.deposit_received ? 'translateX(20px)' : 'translateX(0px)' }} />
            </button>
          </div>
        </form>

        {/* Pinned footer */}
        <div className="flex-none px-5 sm:px-6 py-3.5 border-t flex items-center gap-3"
          style={{ borderColor, background: modalBg, paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose}
            className="px-5 py-3 text-[0.78rem] font-medium rounded-xl border transition-all active:scale-[0.98]"
            style={{ borderColor: inputBorder, color: textMuted, background: 'transparent' }}>Cancel</button>
          <button type="submit" form="edit-appt-form" disabled={saving}
            className="flex-1 py-3 text-[0.82rem] font-medium tracking-[0.04em] rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.99]"
            style={{ background: dm ? '#f4f4f5' : '#111111', color: dm ? '#111111' : '#ffffff' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
