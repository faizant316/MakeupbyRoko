import { useState, useEffect, useRef } from 'react';
import { formatPhone } from '@/lib/phone';
import { AdminDatePicker } from './SchedulePicker';
import TimeWindowPicker from './TimeWindowPicker';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { cityFromLocation } from '@/lib/location';
import { Button, Chevron, Label, Sheet, cx, inputClass } from './ui';

const TIMES = [
  '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM',
];

const STATUSES = [
  { value: 'pending',   label: 'Pending',   dot: 'bg-tone-pending' },
  { value: 'confirmed', label: 'Confirmed', dot: 'bg-tone-confirmed' },
  { value: 'completed', label: 'Completed', dot: 'bg-tone-done' },
  { value: 'cancelled', label: 'Cancelled', dot: 'bg-tone-alert' },
];

const areaClass = cx(inputClass.replace('h-11 ', ''), 'block min-h-[88px] resize-none py-2.5 leading-relaxed');
const fieldLabel = 'mb-1.5 block text-[0.8rem] font-medium text-ink-soft';

// One part of the form: a small label, its fields, a hairline before the next.
function Section({ title, children }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <h3 className="mb-4 text-[0.68rem] leading-snug"><Label>{title}</Label></h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

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
    location: booking.location || '',
  });
  // Keep the city derived from the address rather than editable on its own.
  // Two fields that can disagree is how a row ends up saying "Fremont" next to
  // a Hayward street.
  const set = (k, v) => setForm(f => (
    k === 'location'
      ? { ...f, location: v, location_city: cityFromLocation(v) }
      : { ...f, [k]: v }
  ));

  // The page lock (Lenis paused, body pinned) and Escape come from Sheet.

  useEffect(() => {
    const handler = (e) => { if (svcRef.current && !svcRef.current.contains(e.target)) setSvcOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const dateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const footer = (
    <div className="flex gap-2.5 sm:justify-end">
      <Button variant="quiet" size="lg" onClick={onClose} className="max-sm:flex-1 sm:h-10 sm:px-5">Cancel</Button>
      <Button type="submit" form="edit-appt-form" variant="solid" size="lg" disabled={saving}
        className="max-sm:flex-[2] sm:h-10 sm:min-w-[10rem] sm:px-5">
        {saving
          ? <><span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" /> Saving…</>
          : 'Save changes'}
      </Button>
    </div>
  );

  return (
    <Sheet open onClose={onClose} size="lg" eyebrow="Admin" title="Edit appointment" footer={footer}>
      <form id="edit-appt-form" onSubmit={handleSubmit} className="divide-y divide-line">

        <Section title="Client">
          <div>
            <label htmlFor="eb-name" className={fieldLabel}>Name</label>
            <input id="eb-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Client name" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <div>
              <label htmlFor="eb-phone" className={fieldLabel}>Phone</label>
              <input id="eb-phone" type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(555) 000-0000" className={inputClass} />
            </div>
            <div>
              <label htmlFor="eb-email" className={fieldLabel}>Email</label>
              <input id="eb-email" type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className={inputClass} />
            </div>
          </div>
        </Section>

        <Section title="Service">
          <div ref={svcRef} className="relative">
            <button type="button" onClick={() => setSvcOpen(o => !o)} aria-expanded={svcOpen}
              className={cx(inputClass, 'flex items-center justify-between gap-2 text-left', svcOpen && 'border-ink/60')}>
              <span className={cx('truncate', form.service ? 'text-ink' : 'text-ink-muted/70')}>{form.service || 'Select a service…'}</span>
              <Chevron open={svcOpen} className="h-3.5 w-3.5 text-ink-muted" />
            </button>
            {svcOpen && (
              <div className="pop-in absolute left-0 right-0 top-full z-50 mt-1 max-h-[240px] overflow-y-auto overscroll-contain rounded-card border border-line bg-paper p-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
                style={{ '--origin': 'top left' }} data-lenis-prevent>
                {SERVICES.length === 0 && <p className="px-3 py-2.5 text-[0.8rem] text-ink-muted">Loading services…</p>}
                {SERVICES.map(s => (
                  <button key={s} type="button"
                    onClick={() => { set('service', s); setSvcOpen(false); }}
                    className={cx('flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-[0.86rem] transition-colors',
                      form.service === s ? 'bg-canvas font-medium text-ink' : 'text-ink-soft hover:bg-canvas/60')}>
                    <span className="truncate">{s}</span>
                    {form.service === s && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-rose" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Date and time">
          <div>
            <p className={fieldLabel}>Date</p>
            <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} />
            {dateFormatted && <p className="mt-2 text-[0.8rem] font-medium text-rose">{dateFormatted}</p>}
          </div>
          <div>
            <p className={fieldLabel}>Appointment time window</p>
            <TimeWindowPicker value={form.time} onChange={v => set('time', v)} slots={TIMES} dm={dm} />
          </div>
        </Section>

        {/* LOCATION: editable so Roko can correct an imported address or add
            one the client gave her over text, which is where most of them
            actually arrive. Blank means the studio. */}
        <Section title="Client location">
          <div>
            <LocationAutocomplete value={form.location} onChange={v => set('location', v)} placeholder="Address or venue (leave blank for studio)" dm={dm} />
            <p className="mt-2 text-[0.8rem] text-ink-muted">
              Shows on the appointment list so you can see where you're going without opening the card.
            </p>
          </div>
        </Section>

        <Section title="Notes">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} aria-label="Notes"
            placeholder="Ready-by time, makeup vision, special requests…" className={areaClass} />
        </Section>

        <Section title="Status">
          <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-px rounded-ctl overflow-hidden border border-line bg-line sm:grid-cols-4">
            {STATUSES.map(s => {
              const on = form.status === s.value;
              return (
                <button key={s.value} type="button" role="radio" aria-checked={on} onClick={() => set('status', s.value)}
                  className={cx('flex min-h-[52px] items-center gap-2.5 px-3 text-left text-[0.86rem] font-medium transition-colors duration-200 sm:px-4',
                    on ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-canvas')}>
                  <span aria-hidden className={cx('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Deposit">
          <button type="button" role="switch" aria-checked={form.deposit_received} aria-label="Zelle deposit received"
            onClick={() => set('deposit_received', !form.deposit_received)}
            className="flex min-h-[44px] w-full items-center justify-between gap-4 text-left">
            <span className="min-w-0">
              <span className="block text-[0.86rem] font-medium text-ink">Zelle deposit received</span>
              <span className="mt-0.5 block text-[0.8rem] text-ink-muted">Toggle once the deposit is confirmed</span>
            </span>
            <span aria-hidden className={cx('flex h-[26px] w-11 shrink-0 items-center rounded-full px-[3px] transition-colors duration-200', form.deposit_received ? 'bg-ink' : 'bg-line-strong')}>
              <span className={cx('h-5 w-5 rounded-full bg-paper transition-transform duration-300 ease-quint', form.deposit_received && 'translate-x-[18px]')} />
            </span>
          </button>
        </Section>
      </form>
    </Sheet>
  );
}
