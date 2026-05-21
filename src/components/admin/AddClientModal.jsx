import { useState, useEffect } from 'react';

const TIMES = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM',
];

const STATUSES = [
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
  { value: 'confirmed', label: 'Confirmed', color: '#3B82F6' },
  { value: 'completed', label: 'Completed', color: '#22C55E' },
];

const HOW_HEARD = ['Instagram', 'TikTok', 'Google', 'Referral / Word of Mouth', 'Other'];

function Field({ label, required, children, dm }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase" style={{ color: dm ? '#71717a' : '#aaa' }}>
        {label}{required && <span style={{ color: '#D4A0B0' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddClientModal({ onSave, onClose, darkMode: dm }) {
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', service: '', date: '', time: '',
    notes: '', status: 'confirmed',
  });
  const [bridal, setBridal] = useState({
    bride_name: '', soon_to_be_last_name: '',
    wedding_date: '', event_start_time: '',
    venue_access_time: '', ready_by_time: '',
    photographer_arrival_time: '', num_people_glam: '',
    event_location: '', photographer: '', hairstylist: '',
    instagram_handle: '', how_heard: '', additional_details: '',
  });

  const isBridal = /bridal|bride|wedding|full.?day/i.test(form.service);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBr = (k, v) => setBridal(b => ({ ...b, [k]: v }));

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => setServices(Array.isArray(data) ? data.map(s => s.title).filter(Boolean) : []));
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.service.trim()) return;
    setSaving(true);
    try {
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim(), source: 'admin' }),
      });
      const booking = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(booking.error || 'Failed to create booking');

      if (isBridal) {
        await fetch('/api/bridal-inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bridal,
            email: form.email,
            phone: form.phone,
            service: form.service,
            source: 'admin',
          }),
        });
      }

      onSave(booking);
    } catch (err) {
      alert(err.message);
      setSaving(false);
    }
  };

  const cardBg = dm ? '#27272a' : '#ffffff';
  const border = dm ? '#3f3f46' : '#EDE6DF';
  const sectionBg = dm ? '#1e1e24' : '#FAF7F4';
  const textPrimary = dm ? '#f4f4f5' : '#1a1a1a';
  const textMuted = dm ? '#71717a' : '#aaa';
  const inputBase = { color: textPrimary, fontSize: '16px', background: 'transparent', outline: 'none' };
  const fieldInput = {
    ...inputBase,
    border: `1px solid ${border}`,
    borderRadius: '10px',
    padding: '10px 14px',
    width: '100%',
    background: dm ? '#1e1e24' : '#fafafa',
  };
  const fieldSelect = { ...fieldInput, cursor: 'pointer' };

  const SectionHeader = ({ icon, title }) => (
    <div className="flex items-center gap-2 px-4 py-3" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
      <span className="text-[0.85rem]">{icon}</span>
      <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>{title}</p>
    </div>
  );

  const dateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:px-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[780px] max-h-[92vh] sm:max-h-[calc(100vh-4rem)] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ background: cardBg, border: `1px solid ${border}`, animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: dm ? '#2e2e38' : '#F7EEF2' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.16em] uppercase" style={{ color: '#D4A0B0' }}>Admin</p>
              <h3 className="font-serif text-[1.15rem] leading-tight" style={{ color: textPrimary }}>Add Client</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: dm ? '#3f3f46' : '#f0ece8', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">

            {/* Row 1: Client + Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CLIENT */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                <SectionHeader icon="👤" title="Client" />
                <div className="p-4 flex flex-col gap-3">
                  <Field label="Name" required dm={dm}>
                    <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="Client name" required style={fieldInput} />
                  </Field>
                  <Field label="Phone" dm={dm}>
                    <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                      placeholder="(555) 000-0000" style={fieldInput} />
                  </Field>
                  <Field label="Email" dm={dm}>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="email@example.com" style={fieldInput} />
                  </Field>
                </div>
              </div>

              {/* DATE & TIME */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                <SectionHeader icon="📅" title="Date & Time" />
                <div className="p-4 flex flex-col gap-3">
                  <Field label="Date" dm={dm}>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={fieldInput} />
                  </Field>
                  {dateFormatted && (
                    <p className="text-[0.72rem] font-medium -mt-1" style={{ color: '#D4A0B0' }}>{dateFormatted}</p>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase" style={{ color: textMuted }}>
                        Time
                      </label>
                      {form.time && (
                        <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: dm ? '#2e2e38' : '#F7EEF2', color: '#D4A0B0' }}>
                          {form.time}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {TIMES.map(t => (
                        <button key={t} type="button"
                          onClick={() => set('time', form.time === t ? '' : t)}
                          className="py-2 rounded-lg text-[0.65rem] font-medium transition-all text-center touch-manipulation"
                          style={form.time === t
                            ? { background: '#111', color: '#fff', border: '1px solid #111' }
                            : { background: dm ? '#1e1e24' : '#F5F0EC', color: dm ? '#71717a' : '#888', border: `1px solid ${border}` }
                          }
                        >{t}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Service + Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SERVICE */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                <SectionHeader icon="✦" title={`Service${isBridal ? ' — Bridal' : ''}`} />
                <div className="p-4">
                  <Field label="Service" required dm={dm}>
                    <div className="relative">
                      <select
                        value={form.service}
                        onChange={e => set('service', e.target.value)}
                        required
                        style={{ ...fieldSelect, paddingRight: '32px', appearance: 'none', WebkitAppearance: 'none' }}
                      >
                        <option value="">Select service…</option>
                        {services.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2"
                        className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </Field>
                  {isBridal && (
                    <p className="mt-3 text-[0.68rem] font-medium px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(212,160,176,0.1)', color: '#A0607A' }}>
                      Bridal fields unlocked below — fill in all available details.
                    </p>
                  )}
                </div>
              </div>

              {/* NOTES */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                <SectionHeader icon="📝" title="Notes" />
                <div className="p-4">
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    className="w-full resize-none leading-relaxed outline-none"
                    style={{ color: textPrimary, fontSize: '16px', background: 'transparent', minHeight: '120px' }}
                    placeholder="Ready by time, makeup vision, special requests…" />
                </div>
              </div>
            </div>

            {/* BRIDAL DETAILS — shown when bridal service selected */}
            {isBridal && (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                <SectionHeader icon="💍" title="Bridal Details" />
                <div className="p-4 flex flex-col gap-4">
                  {/* Bride */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Bride's First Name" dm={dm}>
                      <input type="text" value={bridal.bride_name} onChange={e => setBr('bride_name', e.target.value)}
                        placeholder="First name" style={fieldInput} />
                    </Field>
                    <Field label="Soon-to-be Last Name" dm={dm}>
                      <input type="text" value={bridal.soon_to_be_last_name} onChange={e => setBr('soon_to_be_last_name', e.target.value)}
                        placeholder="Last name" style={fieldInput} />
                    </Field>
                  </div>

                  {/* Wedding date + Event start */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Wedding Date" dm={dm}>
                      <input type="date" value={bridal.wedding_date} onChange={e => setBr('wedding_date', e.target.value)} style={fieldInput} />
                    </Field>
                    <Field label="Event Start Time" dm={dm}>
                      <div className="relative">
                        <select value={bridal.event_start_time} onChange={e => setBr('event_start_time', e.target.value)}
                          style={{ ...fieldSelect, paddingRight: '32px', appearance: 'none', WebkitAppearance: 'none' }}>
                          <option value="">Select time…</option>
                          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </Field>
                  </div>

                  {/* Venue access + Ready by */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Venue Access Time" dm={dm}>
                      <div className="relative">
                        <select value={bridal.venue_access_time} onChange={e => setBr('venue_access_time', e.target.value)}
                          style={{ ...fieldSelect, paddingRight: '32px', appearance: 'none', WebkitAppearance: 'none' }}>
                          <option value="">Select time…</option>
                          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </Field>
                    <Field label="Artist Arrive By (Ready By)" dm={dm}>
                      <div className="relative">
                        <select value={bridal.ready_by_time} onChange={e => setBr('ready_by_time', e.target.value)}
                          style={{ ...fieldSelect, paddingRight: '32px', appearance: 'none', WebkitAppearance: 'none' }}>
                          <option value="">Select time…</option>
                          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </Field>
                  </div>

                  {/* Photographer arrival + # people */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Photographer Arrival Time" dm={dm}>
                      <div className="relative">
                        <select value={bridal.photographer_arrival_time} onChange={e => setBr('photographer_arrival_time', e.target.value)}
                          style={{ ...fieldSelect, paddingRight: '32px', appearance: 'none', WebkitAppearance: 'none' }}>
                          <option value="">Select time…</option>
                          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </Field>
                    <Field label="# People Getting Glam" dm={dm}>
                      <input type="number" min="1" value={bridal.num_people_glam} onChange={e => setBr('num_people_glam', e.target.value)}
                        placeholder="e.g. 4" style={fieldInput} />
                    </Field>
                  </div>

                  {/* Event location */}
                  <Field label="Event / Venue Location" dm={dm}>
                    <input type="text" value={bridal.event_location} onChange={e => setBr('event_location', e.target.value)}
                      placeholder="Venue name or address" style={fieldInput} />
                  </Field>

                  {/* Vendors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Photographer" dm={dm}>
                      <input type="text" value={bridal.photographer} onChange={e => setBr('photographer', e.target.value)}
                        placeholder="@handle or name" style={fieldInput} />
                    </Field>
                    <Field label="Hairstylist" dm={dm}>
                      <input type="text" value={bridal.hairstylist} onChange={e => setBr('hairstylist', e.target.value)}
                        placeholder="@handle or name" style={fieldInput} />
                    </Field>
                  </div>

                  {/* Social + How heard */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Instagram / TikTok" dm={dm}>
                      <input type="text" value={bridal.instagram_handle} onChange={e => setBr('instagram_handle', e.target.value)}
                        placeholder="@handle" style={fieldInput} />
                    </Field>
                    <Field label="How Did They Hear About You" dm={dm}>
                      <div className="relative">
                        <select value={bridal.how_heard} onChange={e => setBr('how_heard', e.target.value)}
                          style={{ ...fieldSelect, paddingRight: '32px', appearance: 'none', WebkitAppearance: 'none' }}>
                          <option value="">Select…</option>
                          {HOW_HEARD.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </Field>
                  </div>

                  {/* Makeup vision */}
                  <Field label="Makeup Vision / Additional Details" dm={dm}>
                    <textarea value={bridal.additional_details} onChange={e => setBr('additional_details', e.target.value)}
                      className="w-full resize-none leading-relaxed outline-none"
                      style={{ color: textPrimary, fontSize: '16px', background: dm ? '#1e1e24' : '#fafafa', minHeight: '80px', border: `1px solid ${border}`, borderRadius: '10px', padding: '10px 14px' }}
                      placeholder="Describe the makeup look, inspo, any special requests…" />
                  </Field>
                </div>
              </div>
            )}

            {/* STATUS */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <SectionHeader icon="🏷️" title="Status" />
              <div className="flex gap-2 p-3">
                {STATUSES.map(s => (
                  <button key={s.value} type="button" onClick={() => set('status', s.value)}
                    className="flex-1 py-2.5 rounded-xl text-[0.72rem] font-semibold tracking-[0.04em] uppercase transition-all touch-manipulation"
                    style={form.status === s.value
                      ? { background: s.color, color: '#fff', border: `1px solid ${s.color}` }
                      : { background: dm ? '#1e1e24' : '#F5F0EC', color: dm ? '#52525b' : '#bbb', border: `1px solid ${border}` }
                    }
                  >{s.label}</button>
                ))}
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex gap-3 px-5 sm:px-6 pb-8 pt-2">
            <button type="submit" disabled={saving || !form.name.trim() || !form.service.trim()}
              className="flex-1 py-3.5 rounded-xl text-[0.82rem] font-semibold tracking-[0.04em] transition-all flex items-center justify-center gap-2"
              style={!form.name.trim() || !form.service.trim()
                ? { background: dm ? '#2e2e38' : '#f0ece8', color: dm ? '#52525b' : '#bbb', cursor: 'not-allowed' }
                : { background: '#111', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }
              }>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding…</>
                : 'Add to Appointments'
              }
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-3.5 rounded-xl text-[0.82rem] font-medium transition-all"
              style={{ color: textMuted, border: `1px solid ${border}` }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
