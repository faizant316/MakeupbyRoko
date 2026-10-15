import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { scrollModalTop } from '@/lib/modalLenis';
import { TRAVEL_NOTE } from '@/lib/travelPricing';
import { formatPhone } from '@/lib/phone';
import { AdminDatePicker } from './SchedulePicker';
import TimeWindowPicker from './TimeWindowPicker';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { CLASS_FORMATS, CLASS_CATALOG, classMeta, startWindows } from '@/lib/classCatalog';
import { parseRange } from '@/lib/timeWindow';
import { STUDIO_DISPLAY } from '@/lib/studio';
import { windowsOverlap, blockLabel } from '@/lib/timeBlocks';
import { timeToMinutes } from './timeline';
import { useTimeBlocks } from './useTimeBlocks';
import { BLOCK_INK, EVENT_COLORS, blockHatch } from './statusColors';
import { Button, Chevron, Fold, Label, Segmented, Sheet, buttonClass, cx, inputClass } from './ui';

const TIMES = [
  '4:00 AM','4:30 AM','5:00 AM','5:30 AM',
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM',
];

const STATUSES = [
  { value: 'pending', label: 'Pending', dot: 'bg-tone-pending' },
  { value: 'confirmed', label: 'Confirmed', dot: 'bg-tone-confirmed' },
  { value: 'completed', label: 'Completed', dot: 'bg-tone-done' },
];

const HOW_HEARD = ['Instagram', 'TikTok', 'Facebook', 'Vendor Referral', 'Client Referral', 'Google', 'Other'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fmtShortDate = (key) => (key
  ? new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  : '');

// The notes boxes: the same boxed field as every input, grown to a few lines.
const areaClass = cx(inputClass.replace('h-11 ', ''), 'block min-h-[88px] resize-none py-2.5 leading-relaxed');

const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-rose" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>;

// Module-level so open state and focus survive parent re-renders (typing in one
// field must not close/reset another dropdown).
function StyledDropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className={cx(inputClass, 'flex items-center justify-between gap-2 text-left', open && 'border-ink/60')}>
        <span className={cx('truncate', value ? 'text-ink' : 'text-ink-muted/70')}>{value || placeholder}</span>
        <Chevron open={open} className="h-3.5 w-3.5 text-ink-muted" />
      </button>
      {open && (
        <div className="pop-in absolute left-0 right-0 top-full z-50 mt-1 max-h-[260px] overflow-y-auto overscroll-contain border border-line bg-paper p-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          style={{ '--origin': 'top left' }} data-lenis-prevent>
          {options.length === 0 && <p className="px-3 py-2.5 text-[0.8rem] text-ink-muted">Loading…</p>}
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              className={cx('flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-[0.86rem] transition-colors',
                value === o ? 'bg-canvas font-medium text-ink' : 'text-ink-soft hover:bg-canvas/60')}>
              <span className="truncate">{o}</span>
              {value === o && CHECK}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Pick one of a few, on a hairline bento: the chosen cell turns ink. Takes any
// values, so a yes/no question is two tiles holding true and false, and a
// question nobody has answered yet simply has no ink cell.
function Tiles({ options, value, onChange, label, className = 'grid-cols-2' }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('grid gap-px border border-line bg-line', className)}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cx('flex min-h-[52px] items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-200',
              on ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-canvas')}>
            {o.dot ? <span aria-hidden className={cx('h-1.5 w-1.5 shrink-0 rounded-full', o.dot)} /> : null}
            <span className="min-w-0">
              <span className="block text-[0.86rem] font-medium leading-snug">{o.label}</span>
              {o.sub ? <span className={cx('mt-0.5 block truncate text-[0.74rem]', on ? 'text-paper/60' : 'text-ink-muted')}>{o.sub}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// A setting that is on or off. The whole row is the switch, so a thumb that
// lands on the words still flips it.
function SwitchRow({ title, hint, on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label || title} onClick={() => onChange(!on)}
      className="flex min-h-[44px] w-full items-center justify-between gap-4 text-left">
      <span className="min-w-0">
        <span className="block text-[0.86rem] font-medium text-ink">{title}</span>
        {hint ? <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-muted">{hint}</span> : null}
      </span>
      <span aria-hidden className={cx('flex h-[26px] w-11 shrink-0 items-center rounded-full px-[3px] transition-colors duration-200', on ? 'bg-ink' : 'bg-line-strong')}>
        <span className={cx('h-5 w-5 rounded-full bg-paper transition-transform duration-300 ease-quint', on && 'translate-x-[18px]')} />
      </span>
    </button>
  );
}

// One part of the form: a small label over its fields and a hairline between
// it and the next, instead of a card per group. Module-level so typing in a
// field inside it never remounts the field and drops focus.
function Section({ title, hint, children }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      {title ? (
        <header className="mb-4">
          <h3 className="text-[0.68rem] leading-snug"><Label>{title}</Label></h3>
          {hint ? <p className="mt-1 text-[0.8rem] leading-snug text-ink-muted">{hint}</p> : null}
        </header>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, children }) {
  const cls = 'mb-1.5 block text-[0.8rem] font-medium text-ink-soft';
  return (
    <div>
      {htmlFor ? <label htmlFor={htmlFor} className={cls}>{label}</label> : <p className={cls}>{label}</p>}
      {children}
    </div>
  );
}

// Everything already on the chosen day, and whether the time being typed lands
// on top of any of it. This is the check Shaq's Booksy bride would have hit: a
// second client starting at 1:30 on a day whose first client ends at 1:30 is
// fine, one starting at 1:00 is not, and Roko should see that before she saves.
function DayCheck({ date, time, bookings, classRegs, blocks, dayOff, ignoreBlockId, dm }) {
  if (!date) return null;
  const items = [];
  (bookings || []).forEach(b => {
    if (b.status === 'cancelled') return;
    if (b.date === date) items.push({ id: `a-${b.id}`, kind: 'appt', time: b.time || '', name: b.name || 'Client', detail: b.service || 'Appointment', fallback: 120 });
    if (b.consultation_date === date) items.push({ id: `c-${b.id}`, kind: 'consult', time: b.consultation_time || '', name: b.name || 'Client', detail: `${b.consultation_type || 'Zoom'} consultation`, fallback: 30 });
  });
  (classRegs || []).forEach(r => {
    if (r.status === 'cancelled' || r.appointment_date !== date) return;
    items.push({ id: `l-${r.id}`, kind: 'class', time: r.appointment_time || '', name: r.full_name || 'Client', detail: 'Makeup class', fallback: 90 });
  });
  (blocks || []).forEach(t => {
    if (t.date !== date || t.id === ignoreBlockId) return;
    items.push({ id: `b-${t.id}`, kind: 'block', time: t.time || '', name: blockLabel(t), detail: t.time ? 'Blocked time' : 'Blocked all day', fallback: 60 });
  });
  items.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const clashes = parseRange(time).start
    ? items.filter(it => (it.kind === 'block' && !it.time) || windowsOverlap(time, it.time, it.fallback))
    : [];
  const clashIds = new Set(clashes.map(c => c.id));
  const warn = clashes.length > 0;

  // The calendar's own dot colours, so a day reads the same here as on the grid.
  const dot = {
    appt: { className: 'rounded-full bg-tone-confirmed' },
    consult: { className: 'rounded-full bg-tone-consult' },
    class: { className: 'rounded-full', style: { background: EVENT_COLORS.class } },
    block: { style: { background: BLOCK_INK[dm ? 'dark' : 'light'] } },
  };

  return (
    <div className={cx('border', warn ? 'border-tone-pending/35' : 'border-line')}>
      <div className={cx('flex items-center justify-between gap-2 px-3.5 py-2.5', warn ? 'bg-tone-pending/[0.06]' : 'bg-canvas')}>
        <span className={cx('text-[0.62rem] font-semibold uppercase tracking-[0.14em]', warn ? 'text-tone-pending' : 'text-ink-muted')}>
          {warn ? (clashes.length === 1 ? `Overlaps ${clashes[0].name}` : `Overlaps ${clashes.length} on this day`) : 'Also on this day'}
        </span>
        <span className="whitespace-nowrap text-[0.74rem] font-medium tabular-nums text-ink-muted">{fmtShortDate(date)}</span>
      </div>
      {dayOff && (
        <p className="flex items-center gap-2 border-t border-line px-3.5 py-2.5 text-[0.8rem] font-medium text-tone-alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="h-2.5 w-2.5 shrink-0" aria-hidden><path d="M5 5l14 14M19 5 5 19" /></svg>
          Closed to clients{dayOff.reason ? `: ${dayOff.reason}` : ''}
        </p>
      )}
      {items.length === 0 && !dayOff && (
        <p className="border-t border-line px-3.5 py-3 text-[0.8rem] text-ink-muted">Nothing else on this day.</p>
      )}
      {items.map(it => {
        const hit = clashIds.has(it.id);
        return (
          <div key={it.id} className={cx('flex items-center gap-3 border-t border-line px-3.5 py-2.5', hit && 'bg-tone-pending/[0.04]')}
            style={!hit && it.kind === 'block' ? { background: blockHatch(dm) } : undefined}>
            <span aria-hidden className={cx('h-1.5 w-1.5 shrink-0', dot[it.kind].className)} style={dot[it.kind].style} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.86rem] font-medium text-ink">{it.name}</span>
              <span className="block truncate text-[0.74rem] text-ink-muted">{it.detail}</span>
            </span>
            <span className={cx('shrink-0 text-right text-[0.74rem] font-semibold tabular-nums', hit ? 'text-tone-pending' : 'text-ink-muted')}>
              {it.time || (it.kind === 'block' ? 'All day' : 'No time yet')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const CLASS_OPTIONS = Object.entries(CLASS_CATALOG).map(([key, c]) => ({ key, title: c.title }));

export default function AddClientModal({
  onSave, onClose, darkMode: dm,
  initialDate = null,        // the day picked on the calendar, so a new entry starts there
  initialMode = 'client',    // 'client' | 'block'
  editBlock = null,          // an existing time_blocks row to edit instead of adding
  bookings = [], classRegs = [],
}) {
  const [mode, setMode] = useState(editBlock ? 'block' : initialMode);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', service: '', date: initialDate || '', time: '',
    notes: '', status: 'confirmed', deposit_received: false, notify: false, from_booksy: false,
  });
  const [nb, setNb] = useState({ ready_by_time: '', early_arrival: null, travel_requested: null, location: '' });
  const [bridal, setBridal] = useState({
    event_start_time: '', venue_access_time: '', ready_by_time: '', makeup_ready_by_time: '',
    photographer_arrival_time: '', bridal_party_glam: null, num_people_glam: '',
    event_location: '', photographer: '', hairstylist: '', instagram_handle: '',
    how_heard: '', out_of_state: null, destination_location: '', additional_details: '',
  });
  const [cls, setCls] = useState({ format: '', classKey: '', slot: '', amount_paid: '', zoom_link: '', meeting_id: '' });
  const [genZoom, setGenZoom] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [block, setBlock] = useState(() => ({
    date: editBlock?.date || initialDate || '',
    allDay: editBlock ? !editBlock.time : false,
    time: editBlock?.time || '',
    reason: editBlock?.reason || '',
    // A new whole-day block closes the day by default, which is what an all-day
    // reservation in Booksy did. Editing a note that was deliberately left open
    // keeps it open.
    closeDay: !editBlock,
  }));

  const timeBlocks = useTimeBlocks();
  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.entities.BlockedDate.list(),
    staleTime: 30000,
  });

  const selectedService = services.find(s => s.title === form.service) || null;
  const category = selectedService?.category || '';
  const isBridal = category === 'bridal';
  const isClass = category === 'lessons';
  const isNonBridal = !!form.service && !isBridal && !isClass;
  const fromBooksy = form.from_booksy && !isClass;
  // Whichever branch of the form is showing, one address ends up on the booking.
  const location = (isBridal ? bridal.event_location : nb.location)?.trim() || '';
  const isTrial = /trial/i.test(form.service);
  const dateNoun = isTrial ? 'Trial' : isBridal ? 'Wedding' : 'Appointment';

  const set = (k, v) => { setError(''); setForm(f => ({ ...f, [k]: v })); };
  const setBr = (k, v) => setBridal(b => ({ ...b, [k]: v }));
  const setN = (k, v) => setNb(n => ({ ...n, [k]: v }));
  const setC = (k, v) => setCls(c => ({ ...c, [k]: v }));
  const setB = (k, v) => { setError(''); setConfirmDelete(false); setBlock(b => ({ ...b, [k]: v })); };

  // One human-readable answer for "who needs glam" (matches the public bridal form).
  const glamSummary =
    bridal.bridal_party_glam === true ? (bridal.num_people_glam.trim() || 'Yes, final count to confirm')
    : bridal.bridal_party_glam === false ? 'Just the bride'
    : (bridal.num_people_glam || '');

  const classMetaSel = isClass && cls.classKey && cls.format ? classMeta(cls.classKey, cls.format) : null;
  const windows = classMetaSel ? startWindows(cls.classKey, cls.format) : [];

  // The sheet's body is a plain native scroller (overscroll-contained, and
  // marked so the stopped page Lenis leaves its wheel alone). The form sits
  // inside it; the ref is how a mode switch finds it to jump back to the top.
  const formRef = useRef(null);

  // The page lock, Escape and the page-Lenis pause all come from Sheet now.

  // The Booksy details fold holds dropdowns. A fold clips its contents while it
  // moves, so once it has finished opening it lets them hang out past its edge.
  const [detailsSettled, setDetailsSettled] = useState(false);
  useEffect(() => {
    if (!showMore) { setDetailsSettled(false); return undefined; }
    const t = setTimeout(() => setDetailsSettled(true), 440);
    return () => clearTimeout(t);
  }, [showMore]);

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

  const switchMode = (m) => {
    if (m === mode) return;
    setError('');
    setMode(m);
    // Carry the day across, so flipping tabs doesn't lose it.
    if (m === 'block' && !block.date && form.date) setBlock(b => ({ ...b, date: form.date }));
    if (m === 'client' && !form.date && block.date) setForm(f => ({ ...f, date: block.date }));
    requestAnimationFrame(() => scrollModalTop(formRef.current?.parentElement));
  };

  const fullName = `${form.first_name} ${form.last_name}`.trim();

  // Bridal details for a bride with no email. The inquiry that normally holds
  // them requires an email, so anything typed rides in the booking notes
  // instead of vanishing.
  const bridalDetailLines = () => [
    bridal.event_location && `Venue: ${bridal.event_location}`,
    bridal.event_start_time && `Event starts: ${bridal.event_start_time}`,
    bridal.makeup_ready_by_time && `Ready by: ${bridal.makeup_ready_by_time}`,
    bridal.ready_by_time && `Hairstylist arrives: ${bridal.ready_by_time}`,
    bridal.photographer_arrival_time && `Photographer arrives: ${bridal.photographer_arrival_time}`,
    bridal.venue_access_time && `Venue access: ${bridal.venue_access_time}`,
    glamSummary && `Glam: ${glamSummary}`,
    bridal.photographer && `Photographer: ${bridal.photographer}`,
    bridal.hairstylist && `Hairstylist: ${bridal.hairstylist}`,
    bridal.instagram_handle && `Instagram: ${bridal.instagram_handle}`,
    bridal.out_of_state === true && `Out of state${bridal.destination_location ? `: ${bridal.destination_location}` : ''}`,
    bridal.how_heard && `Heard about Roko: ${bridal.how_heard}`,
    bridal.additional_details && `Details: ${bridal.additional_details}`,
  ].filter(Boolean);
  const hasBridalDetails = bridalDetailLines().length > 0;
  const bridalWithoutEmail = isBridal && !form.email.trim();

  // Non-bridal ready-by / early arrival / travel fold into the notes string in
  // the same format the public form uses, so the card parses them into chips.
  const buildNotes = () => {
    const parts = [form.notes.trim()];
    if (isNonBridal) {
      if (nb.early_arrival === true) parts.push('⏰ Early arrival (before 7 AM) · +$100 surcharge');
      if (nb.ready_by_time) parts.push(`Ready by: ${nb.ready_by_time}`);
      if (nb.travel_requested === true) parts.push(TRAVEL_NOTE);
    }
    if (bridalWithoutEmail) parts.push(...bridalDetailLines());
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

  // Fire the matching client confirmation email (only when the email toggle is on).
  const notifyBooking = async (booking) => {
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupby-roko.vercel.app';
    const uploadUrl = `${siteBase}/upload-zelle?id=${booking.id}&token=${booking.upload_token}`;
    // Package total and the balance left after the deposit, so the bride's
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
          outOfState: bridal.out_of_state, destinationLocation: bridal.out_of_state === true ? bridal.destination_location : '',
          weddingDate: form.date, additionalDetails: bridal.additional_details, howHeard: bridal.how_heard,
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

  const submitClient = async () => {
    const email = form.email.trim();
    if (!form.first_name.trim()) return setError("Add the client's first name.");
    if (fromBooksy) {
      if (!email && !form.phone.trim()) return setError('Add a phone number or an email.');
      if (email && !EMAIL_RE.test(email)) return setError("That email doesn't look right.");
    } else if (!email || !EMAIL_RE.test(email)) {
      return setError('Add a valid email. Booked on Booksy? Turn that on and a phone number is enough.');
    }
    if (!form.service.trim()) return setError('Choose a service.');
    if (isClass && (!cls.format || !cls.classKey)) return setError('Choose the class format and which class.');
    // Same rule as the client card: nothing is Confirmed without a time.
    if (!isClass && form.status === 'confirmed' && !parseRange(form.time).start) {
      return setError(form.date ? 'Add the appointment time, or save it as Pending.' : 'Add the date and time, or save it as Pending.');
    }

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
          name: fullName, email, phone: form.phone, service: form.service,
          date: form.date || null, time: form.time || null,
          notes: buildNotes(), status: form.status, deposit_received: form.deposit_received,
          // She's the one typing it, so it shouldn't come back to her as new.
          entered_in_admin: true,
          // Tags it with the Booksy chip, keeps it out of site revenue, and is
          // what lets the route accept a phone number without an email.
          ...(fromBooksy ? { source: 'booksy' } : {}),
          // A bride's address is captured on her inquiry below, so mirror it onto
          // the booking too. The appointments list reads the booking, and a
          // bride added by hand should show a location like everyone else.
          ...(location ? { location } : {}),
        }),
      });
      const booking = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(booking.error || 'Failed to create booking');

      // Bridal: store the rich details in a linked inquiry (shares the booking's
      // upload_token so the card pairs them 1:1). Required columns are sent as ''
      // (never null) so the insert survives a sparse admin entry. A Booksy bride
      // only gets one when there are details for it to hold.
      if (isBridal && email && (!fromBooksy || hasBridalDetails)) {
        await fetch('/api/bridal-inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bride_name: form.first_name.trim(),
            soon_to_be_last_name: form.last_name.trim(),
            email, phone: form.phone, service: form.service,
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
            destination_location: bridal.out_of_state === true ? bridal.destination_location : '',
            preferred_date: form.date || '',
            upload_token: booking.upload_token, status: 'new',
          }),
        }).catch(() => {});
      }

      // A Booksy client already has Booksy's confirmation. Ours carries a Zelle
      // deposit link, which would read as a second deposit request.
      if (form.notify && !fromBooksy) await notifyBooking(booking);

      onSave(booking, 'booking');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  const submitBlock = async () => {
    if (!block.date) return setError('Pick the day to block.');
    const { start, end } = parseRange(block.time);
    if (!block.allDay && (!start || !end)) return setError('Tap a start and an end time, or switch to All day.');

    setSaving(true);
    try {
      if (block.allDay && block.closeDay) {
        // A whole day closed to clients is a day off, and days off already have
        // a home: the same row the calendar's "Close this day off" writes, which
        // is what the public booking forms read.
        const res = await fetch('/api/blocked-dates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: block.date, reason: block.reason.trim() }),
        });
        const row = await res.json();
        if (!res.ok) throw new Error(row.error || "Couldn't close that day.");
        if (editBlock) await fetch(`/api/time-blocks/${editBlock.id}`, { method: 'DELETE' });
        onSave(row, 'dayoff');
        return;
      }
      const res = await fetch(editBlock ? `/api/time-blocks/${editBlock.id}` : '/api/time-blocks', {
        method: editBlock ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: block.date, time: block.allDay ? '' : block.time, reason: block.reason, source: editBlock?.source }),
      });
      const row = await res.json();
      if (!res.ok) throw new Error(row.error || "Couldn't save that block.");
      onSave(row, 'block');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  // Two taps, so a stray click on the footer can't wipe a block.
  const deleteBlock = async () => {
    if (!editBlock) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/time-blocks/${editBlock.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't remove it.");
      onSave(editBlock, 'block');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'block') submitBlock();
    else submitClient();
  };

  const isBlockMode = mode === 'block';
  const activeDate = isBlockMode ? block.date : form.date;
  const dayOff = activeDate ? blockedDates.find(b => b.date === activeDate) : null;

  const footerSummary = isBlockMode
    ? (block.date ? `${fmtShortDate(block.date)} · ${block.allDay ? (block.closeDay ? 'Whole day, closed to clients' : 'All day') : (block.time || 'Pick a time')}` : '')
    : (form.date ? `${fmtShortDate(form.date)}${form.time ? ` · ${form.time}` : ''}` : '');

  const closesDay = block.allDay && block.closeDay;
  const primaryLabel = isBlockMode
    ? (closesDay ? 'Close this day' : editBlock ? 'Save changes' : 'Block this time')
    : isClass ? 'Add class registration' : 'Add to appointments';

  const canSave = isBlockMode
    ? !!block.date
    : !!(form.first_name.trim() && form.service.trim() && (!isClass || (cls.format && cls.classKey)));

  const detailsBody = (
    <>
      {/* ───────── NON-BRIDAL DETAILS ───────── */}
      {isNonBridal && (
        <>
          <Field label="Ready by (when the client wants to be done)">
            <StyledDropdown value={nb.ready_by_time} onChange={v => setN('ready_by_time', v)} options={TIMES} placeholder="Select a time…" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <Field label="Early arrival (before 7 AM)?">
              <Tiles label="Early arrival (before 7 AM)?" value={nb.early_arrival} onChange={v => setN('early_arrival', v)}
                options={[{ value: true, label: 'Yes (+$100)' }, { value: false, label: 'No' }]} />
            </Field>
            <Field label="Travel to client?">
              <Tiles label="Travel to client?" value={nb.travel_requested} onChange={v => setN('travel_requested', v)}
                options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
            </Field>
          </div>
          {/* Only once she's said she's travelling, since the address is
              meaningless for a studio appointment. */}
          {nb.travel_requested === true && (
            <Field label="Where are you going?">
              <LocationAutocomplete value={nb.location} onChange={v => setN('location', v)} placeholder="Address or venue" dm={dm} />
            </Field>
          )}
        </>
      )}

      {/* ───────── BRIDAL DETAILS ───────── */}
      {isBridal && (
        <>
          <Field label="Event or venue location">
            <LocationAutocomplete value={bridal.event_location} onChange={v => setBr('event_location', v)} placeholder="Venue name or address" dm={dm} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <Field label="Event start time">
              <StyledDropdown value={bridal.event_start_time} onChange={v => setBr('event_start_time', v)} options={TIMES} placeholder="Select a time…" />
            </Field>
            <Field label="Ready by">
              <StyledDropdown value={bridal.makeup_ready_by_time} onChange={v => setBr('makeup_ready_by_time', v)} options={TIMES} placeholder="Select a time…" />
            </Field>
            <Field label="Hairstylist arrives">
              <StyledDropdown value={bridal.ready_by_time} onChange={v => setBr('ready_by_time', v)} options={TIMES} placeholder="Select a time…" />
            </Field>
            <Field label="Photographer arrives">
              <StyledDropdown value={bridal.photographer_arrival_time} onChange={v => setBr('photographer_arrival_time', v)} options={TIMES} placeholder="Select a time…" />
            </Field>
            <Field label="Venue access">
              <StyledDropdown value={bridal.venue_access_time} onChange={v => setBr('venue_access_time', v)} options={TIMES} placeholder="Select a time…" />
            </Field>
            <Field label="How they heard about you">
              <StyledDropdown value={bridal.how_heard} onChange={v => setBr('how_heard', v)} options={HOW_HEARD} placeholder="Select…" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
            <Field label="Instagram / TikTok" htmlFor="ac-ig">
              <input id="ac-ig" value={bridal.instagram_handle} onChange={e => setBr('instagram_handle', e.target.value)} placeholder="@handle" className={inputClass} />
            </Field>
            <Field label="Photographer" htmlFor="ac-photo">
              <input id="ac-photo" value={bridal.photographer} onChange={e => setBr('photographer', e.target.value)} placeholder="@handle or name" className={inputClass} />
            </Field>
            <Field label="Hairstylist" htmlFor="ac-hair">
              <input id="ac-hair" value={bridal.hairstylist} onChange={e => setBr('hairstylist', e.target.value)} placeholder="@handle or name" className={inputClass} />
            </Field>
          </div>

          <Field label="Is she spending her one extra on another person?">
            <Tiles label="Is she spending her one extra on another person?" value={bridal.bridal_party_glam}
              onChange={v => { setBr('bridal_party_glam', v); if (!v) setBr('num_people_glam', ''); }}
              options={[{ value: true, label: 'Yes, add glam' }, { value: false, label: 'Just the bride' }]} />
            {bridal.bridal_party_glam === true && (
              <div className="mt-3">
                <Field label="Who is the extra person?" htmlFor="ac-extra">
                  <input id="ac-extra" value={bridal.num_people_glam} onChange={e => setBr('num_people_glam', e.target.value)} placeholder="e.g. mother of the bride" className={inputClass} />
                </Field>
              </div>
            )}
          </Field>

          <Field label="Out-of-state event?">
            <Tiles label="Out-of-state event?" value={bridal.out_of_state} onChange={v => setBr('out_of_state', v)}
              options={[{ value: true, label: 'Yes, out of state' }, { value: false, label: 'No, local' }]} />
            {/* Mirrors the public form, which asks the same follow-up the moment
                a bride says yes. Without it, a client Roko adds by hand is the
                one destination booking with no destination on file. */}
            {bridal.out_of_state === true && (
              <div className="mt-3">
                <Field label="Where's the wedding?" htmlFor="ac-dest">
                  <input id="ac-dest" value={bridal.destination_location} onChange={e => setBr('destination_location', e.target.value)}
                    placeholder="City & state, e.g. Austin, Texas" className={inputClass} />
                </Field>
              </div>
            )}
          </Field>

          <Field label="Makeup vision and other details" htmlFor="ac-vision">
            <textarea id="ac-vision" value={bridal.additional_details} onChange={e => setBr('additional_details', e.target.value)}
              placeholder="The look, inspo, any special requests…" className={areaClass} />
          </Field>
        </>
      )}
    </>
  );

  const footerNote = error ? (
    <p className="flex min-w-0 items-start gap-2 text-[0.8rem] font-medium text-tone-alert sm:flex-1" role="alert">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h0" /></svg>
      {error}
    </p>
  ) : footerSummary ? (
    <p className="min-w-0 truncate text-[0.8rem] font-medium tabular-nums text-ink-muted sm:flex-1">{footerSummary}</p>
  ) : <span className="hidden sm:block sm:flex-1" />;

  // Pinned under the form: what's about to be saved (or what's stopping it),
  // and the buttons. On a phone the line sits above them, on a laptop beside.
  const footer = (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
      {footerNote}
      <div className="flex gap-2.5">
        {editBlock ? (
          <button type="button" onClick={deleteBlock} disabled={saving}
            className={cx(buttonClass(confirmDelete ? 'solid' : 'danger', 'lg', 'max-sm:flex-1 sm:h-10 sm:px-5'), confirmDelete && '!bg-tone-alert hover:!bg-tone-alert/90')}>
            {confirmDelete ? 'Tap to remove' : 'Remove'}
          </button>
        ) : (
          <Button variant="quiet" size="lg" onClick={onClose} className="max-sm:flex-1 sm:h-10 sm:px-5">Cancel</Button>
        )}
        <Button type="submit" form="add-client-form" variant="solid" size="lg" disabled={saving || !canSave}
          className="max-sm:flex-[2] sm:h-10 sm:min-w-[11rem] sm:px-5">
          {saving
            ? <><span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" /> Saving…</>
            : primaryLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      eyebrow={editBlock ? 'Your calendar' : 'Add to calendar'}
      title={editBlock ? 'Blocked time' : isBlockMode ? 'Block off time' : 'Add client'}
      headerExtra={!editBlock ? (
        // The two things that go on her calendar: a client, or time that's hers.
        <Segmented
          className="mt-4 grid w-[17rem] max-w-full grid-cols-2 [&>button]:h-9 [&>button]:justify-center"
          value={mode}
          onChange={switchMode}
          options={[{ value: 'client', label: 'Client' }, { value: 'block', label: 'Block off time' }]}
        />
      ) : null}
      footer={footer}
    >
      <form id="add-client-form" ref={formRef} onSubmit={handleSubmit} className="divide-y divide-line">
        {isBlockMode ? (
          <>
            <Section title="Which day?" hint="Plans, a family event, anything that takes you off the schedule.">
              <AdminDatePicker value={block.date} onChange={v => setB('date', v)} dm={dm} />
              <Tiles label="How much of the day" value={block.allDay} onChange={v => setB('allDay', v)}
                options={[{ value: false, label: 'Part of the day' }, { value: true, label: 'All day' }]} />
              {!block.allDay && (
                <TimeWindowPicker value={block.time} onChange={v => setB('time', v)} slots={TIMES} dm={dm} />
              )}
              {block.allDay && (
                <SwitchRow title="Close this day to clients" on={block.closeDay} onChange={v => setB('closeDay', v)}
                  hint={block.closeDay ? "The booking forms won't offer this day." : 'Just a note on your calendar. Clients can still book it.'} />
              )}
            </Section>

            <Section title="What's it for?" hint="Only you see this.">
              <textarea value={block.reason} onChange={e => setB('reason', e.target.value)} aria-label="What's it for?"
                placeholder="Concert, sister's bridal shower, dentist…" maxLength={300} className={areaClass} />
            </Section>

            {block.date && (
              <Section>
                <DayCheck date={block.date} time={block.allDay ? '' : block.time} bookings={bookings} classRegs={classRegs}
                  blocks={timeBlocks} dayOff={dayOff} ignoreBlockId={editBlock?.id} dm={dm} />
              </Section>
            )}
          </>
        ) : (
          <>
            {/* BOOKSY. First, because it changes what the rest of the form asks for. */}
            {!isClass && (
              <Section>
                <SwitchRow title="Booked on Booksy" on={form.from_booksy} onChange={v => set('from_booksy', v)}
                  hint={form.from_booksy
                    ? 'A phone number is enough, it gets the Booksy tag, and no email goes to the client.'
                    : 'Already booked there by you or Shaq? Turn this on.'} />
              </Section>
            )}

            <Section title="Client">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
                <Field label="First name" htmlFor="ac-first">
                  <input id="ac-first" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" autoComplete="off" className={inputClass} />
                </Field>
                <Field label="Last name" htmlFor="ac-last">
                  <input id="ac-last" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" autoComplete="off" className={inputClass} />
                </Field>
                <Field label="Phone" htmlFor="ac-phone">
                  <input id="ac-phone" type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(555) 000-0000" className={inputClass} />
                </Field>
                <Field label={`Email${fromBooksy ? ' (optional)' : ''}`} htmlFor="ac-email">
                  <input id="ac-email" type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className={inputClass} />
                </Field>
              </div>
            </Section>

            <Section title="Service">
              <StyledDropdown value={form.service} onChange={v => set('service', v)} options={services.map(s => s.title)} placeholder="Select a service…" />
              {isClass && (
                <p className="text-[0.8rem] text-ink-muted">Makeup course. Choose the format, class, date and time below.</p>
              )}
            </Section>

            {/* ───────── CLASS ───────── */}
            {isClass && (
              <Section title="Class">
                <Tiles label="Class format" value={cls.format} onChange={v => setC('format', v)}
                  options={Object.values(CLASS_FORMATS).map(f => ({ value: f.key, label: f.label, sub: f.key === 'online' ? 'Live over Zoom' : 'Mountain House studio' }))} />

                <Field label="Which class">
                  <Tiles label="Which class" className="grid-cols-1 sm:grid-cols-2" value={cls.classKey} onChange={v => setC('classKey', v)}
                    options={CLASS_OPTIONS.map(o => ({ value: o.key, label: o.title }))} />
                </Field>

                <Field label="Class date">
                  <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} />
                </Field>

                {windows.length > 0 && (
                  <Field label="Start time">
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {windows.map(w => {
                        const sel = cls.slot === w;
                        return (
                          <button key={w} type="button" onClick={() => setC('slot', sel ? '' : w)} aria-pressed={sel}
                            className={cx('press h-11 rounded border px-2 text-center text-[0.8rem] font-medium tabular-nums transition-colors',
                              sel ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink-soft hover:border-ink/40 hover:text-ink')}>
                            {parseRange(w).start}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}

                <Field label="Amount paid ($)" htmlFor="ac-paid">
                  <input id="ac-paid" type="number" inputMode="decimal" min="0" value={cls.amount_paid} onChange={e => setC('amount_paid', e.target.value)} placeholder="e.g. 520" className={cx(inputClass, 'tabular-nums')} />
                </Field>

                {cls.format === 'online' && (
                  <Field label="Zoom link" htmlFor="ac-zoom">
                    <div className="flex gap-2">
                      <input id="ac-zoom" value={cls.zoom_link} onChange={e => setC('zoom_link', e.target.value)} placeholder="Paste a link or generate one" className={cx(inputClass, 'min-w-0 flex-1')} />
                      <Button variant="solid" onClick={generateZoom} disabled={genZoom || !cls.classKey} className="h-11">
                        {genZoom ? <><span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper/30 border-t-paper" /> …</> : 'Generate'}
                      </Button>
                    </div>
                    {cls.zoom_link && <p className="mt-1.5 text-[0.8rem] text-ink-muted">Link ready. It saves with this class.</p>}
                  </Field>
                )}
                {cls.format === 'in_person' && (
                  <div className="border border-line px-4 py-3">
                    <Label className="block">Studio location</Label>
                    <p className="mt-1 text-[0.86rem] text-ink">{STUDIO_DISPLAY}</p>
                  </div>
                )}
              </Section>
            )}

            {/* ───────── WHEN (every booking, bridal included) ───────── */}
            {form.service && !isClass && (
              <Section title={`${dateNoun} date and time`}>
                <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} />
                <Field label={isBridal ? 'Your appointment time with her' : 'Appointment time'}>
                  <TimeWindowPicker value={form.time} onChange={v => set('time', v)} slots={TIMES} dm={dm} />
                </Field>
                {form.date && (
                  <DayCheck date={form.date} time={form.time} bookings={bookings} classRegs={classRegs}
                    blocks={timeBlocks} dayOff={dayOff} dm={dm} />
                )}
              </Section>
            )}

            {/* ───────── DETAILS ───────── */}
            {(isNonBridal || isBridal) && (
              fromBooksy ? (
                // A Booksy booking rarely comes with any of this, so it folds
                // away instead of making the form look unfinished.
                <section className="py-6 first:pt-0 last:pb-0">
                  <button type="button" onClick={() => setShowMore(v => !v)} aria-expanded={showMore}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left">
                    <span className="min-w-0">
                      <Label className="block">{isBridal ? 'Wedding details' : 'Appointment details'}</Label>
                      <span className="mt-1 block text-[0.8rem] leading-snug text-ink-muted">Optional. Venue, ready-by time, travel and the rest.</span>
                    </span>
                    <Chevron open={showMore} className="text-ink-muted" />
                  </button>
                  <Fold open={showMore} lazy className={detailsSettled ? '[&>div]:!overflow-visible' : undefined}>
                    <div className="space-y-4 pt-5">{detailsBody}</div>
                  </Fold>
                </section>
              ) : (
                <Section title={isBridal ? 'Wedding details' : 'Appointment details'}>
                  {detailsBody}
                </Section>
              )
            )}

            <Section title="Notes" hint={fromBooksy ? "Anything from the Booksy note: deposit, balance, who's getting ready." : undefined}>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} aria-label="Notes"
                placeholder="Anything worth remembering for this client…" className={areaClass} />
            </Section>

            {/* STATUS, DEPOSIT, EMAIL. Bookings only (classes carry their own paid state) */}
            {!isClass && (
              <Section title="Status">
                <Tiles label="Status" className="grid-cols-3" value={form.status} onChange={v => set('status', v)}
                  options={STATUSES.map(s => ({ value: s.value, label: s.label, dot: s.dot }))} />
                <SwitchRow title="Deposit received" hint="Turn on if the deposit is already paid"
                  on={form.deposit_received} onChange={v => set('deposit_received', v)} />
                {!fromBooksy && (
                  <SwitchRow title="Email the client" hint="Off saves quietly. On sends the usual confirmation."
                    on={form.notify} onChange={v => set('notify', v)} />
                )}
              </Section>
            )}

            {isClass && (
              <Section>
                <SwitchRow title="Email the client" hint="Sends the class details with the Zoom link or studio address."
                  on={form.notify} onChange={v => set('notify', v)} />
              </Section>
            )}
          </>
        )}
      </form>
    </Sheet>
  );
}
