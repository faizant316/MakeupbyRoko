import { useState, useEffect } from 'react';

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
  { value: 'confirmed', label: 'Confirmed', color: '#3B82F6' },
  { value: 'completed', label: 'Completed', color: '#22C55E' },
];

export default function AddClientModal({ onSave, onClose, darkMode: dm }) {
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [serviceInput, setServiceInput] = useState('');
  const [serviceOpen, setServiceOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    time: '',
    notes: '',
    status: 'confirmed',
  });

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => setServices(Array.isArray(data) ? data.map(s => s.title).filter(Boolean) : []));
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredServices = services.filter(s =>
    !serviceInput || s.toLowerCase().includes(serviceInput.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.service.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          source: 'admin',
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Failed to create booking');
      onSave(created);
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

  const dateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const inputStyle = { color: textPrimary, fontSize: '16px' };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[500px] max-h-[92vh] sm:max-h-[calc(100vh-3rem)] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: dm ? '#2e2e38' : '#F7EEF2' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D4A0B0" strokeWidth="1.5" className="w-4 h-4">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="text-[0.55rem] font-bold tracking-[0.16em] uppercase" style={{ color: '#D4A0B0' }}>Admin</p>
              <h3 className="font-serif text-[1.15rem] leading-tight" style={{ color: textPrimary }}>Add Client</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: dm ? '#3f3f46' : '#f0ece8', color: textMuted }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 flex flex-col gap-5">

            {/* CLIENT */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">👤</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Client</p>
              </div>
              {[
                { key: 'name', label: 'Name', type: 'text', ph: 'Client name', required: true },
                { key: 'phone', label: 'Phone', type: 'tel', ph: '(555) 000-0000' },
                { key: 'email', label: 'Email', type: 'email', ph: 'email@example.com' },
              ].map(({ key, label, type, ph, required }, i, arr) => (
                <div key={key} className="flex items-center px-4 py-3.5 gap-3"
                  style={{ borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <p className="text-[0.72rem] w-12 flex-shrink-0" style={{ color: textMuted }}>
                    {label}{required && <span style={{ color: '#D4A0B0' }}> *</span>}
                  </p>
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                    className="flex-1 bg-transparent outline-none font-medium"
                    style={inputStyle} placeholder={ph} required={required} />
                </div>
              ))}
            </div>

            {/* SERVICE */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">✦</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>
                  Service <span style={{ color: '#D4A0B0' }}>*</span>
                </p>
              </div>
              <div className="px-4 py-3 relative">
                <input
                  type="text"
                  value={form.service || serviceInput}
                  onChange={e => { setServiceInput(e.target.value); set('service', e.target.value); setServiceOpen(true); }}
                  onFocus={() => setServiceOpen(true)}
                  onBlur={() => setTimeout(() => setServiceOpen(false), 150)}
                  placeholder="Type or select service…"
                  className="w-full bg-transparent outline-none font-medium"
                  style={inputStyle}
                  required
                />
                {serviceOpen && filteredServices.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 rounded-xl shadow-lg overflow-hidden"
                    style={{ background: cardBg, border: `1px solid ${border}`, maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredServices.map(s => (
                      <button key={s} type="button"
                        onMouseDown={() => { set('service', s); setServiceInput(s); setServiceOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[0.82rem] transition-colors"
                        style={s === form.service
                          ? { background: 'rgba(212,160,176,0.1)', color: '#D4A0B0', fontWeight: 600 }
                          : { color: dm ? '#a1a1aa' : '#444' }
                        }
                      >{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* DATE & TIME */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">📅</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Date &amp; Time</p>
              </div>

              <div className="flex items-center px-4 py-3.5 gap-3" style={{ borderBottom: `1px solid ${border}` }}>
                <p className="text-[0.72rem] w-12 flex-shrink-0" style={{ color: textMuted }}>Date</p>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="flex-1 bg-transparent outline-none font-medium cursor-pointer"
                  style={inputStyle} />
              </div>

              {dateFormatted && (
                <div className="px-4 py-2" style={{ borderBottom: `1px solid ${border}` }}>
                  <p className="text-[0.72rem] font-medium" style={{ color: '#D4A0B0' }}>{dateFormatted}</p>
                </div>
              )}

              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[0.72rem] font-medium" style={{ color: textMuted }}>Appointment Time</p>
                  {form.time && (
                    <span className="text-[0.72rem] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: dm ? '#2e2e38' : '#F7EEF2', color: '#D4A0B0' }}>
                      {form.time}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {TIMES.map(t => (
                    <button key={t} type="button"
                      onClick={() => set('time', form.time === t ? '' : t)}
                      className="py-2.5 rounded-xl text-[0.68rem] font-medium transition-all text-center touch-manipulation"
                      style={form.time === t
                        ? { background: '#111', color: '#fff', border: '1px solid #111' }
                        : { background: dm ? '#1e1e24' : '#F5F0EC', color: dm ? '#71717a' : '#888', border: `1px solid ${border}` }
                      }
                    >{t}</button>
                  ))}
                </div>
                <p className="text-[0.62rem] mt-2" style={{ color: textMuted }}>Tap to assign · tap again to clear.</p>
              </div>
            </div>

            {/* NOTES */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">📝</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Notes</p>
              </div>
              <div className="p-4">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  className="w-full bg-transparent outline-none resize-none leading-relaxed"
                  style={{ color: textPrimary, minHeight: 72, fontSize: '16px' }}
                  placeholder="Ready by time, makeup vision, special requests…" />
              </div>
            </div>

            {/* STATUS */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: sectionBg, borderBottom: `1px solid ${border}` }}>
                <span className="text-[0.85rem]">🏷️</span>
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: dm ? '#52525b' : '#C4B0A4' }}>Status</p>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3">
                {STATUSES.map(s => (
                  <button key={s.value} type="button" onClick={() => set('status', s.value)}
                    className="py-2.5 rounded-xl text-[0.72rem] font-semibold tracking-[0.04em] uppercase transition-all touch-manipulation"
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
          <div className="flex-shrink-0 flex gap-3 px-5 pb-8 pt-2">
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
