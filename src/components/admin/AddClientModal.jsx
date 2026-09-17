import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { lenisStop, lenisStart } from '@/lib/lenis';
import { useModalLenis, scrollModalTop } from '@/lib/modalLenis';
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
import { BLOCK_INK, blockHatch } from './statusColors';

const TIMES = [
  '4:00 AM','4:30 AM','5:00 AM','5:30 AM',
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM',
];

const STATUSES = [
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
  { value: 'confirmed', label: 'Confirmed', color: '#2563EB' },
  { value: 'completed', label: 'Completed', color: '#64748B' },
];

const HOW_HEARD = ['Instagram', 'TikTok', 'Facebook', 'Vendor Referral', 'Client Referral', 'Google', 'Other'];
const LESSON_ACCENT = '#5BB0CC';
const ROSE = '#C4849A';
// Booksy's own teal, the same one the Booksy chip wears on every list.
const BOOKSY = { ink: '#0E8F98', inkDark: '#5EEAD4', tint: '#E0F5F6', tintDark: 'rgba(14,165,175,0.16)' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fmtShortDate = (key) => (key
  ? new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  : '');

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
  const border = dm ? '#3f3f46' : '#E4E2E8';
  const bg = dm ? '#18181b' : '#ffffff';
  const text = dm ? '#f4f4f5' : '#1a1a1f';
  const muted = dm ? '#8e8e99' : '#9b98a2';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full h-11 px-3.5 rounded-xl text-[16px] sm:text-[0.85rem] outline-none flex items-center justify-between transition-all cursor-pointer"
        style={{ background: bg, border: `1px solid ${open ? ROSE : border}`, boxShadow: open ? `0 0 0 3px ${ROSE}1f` : 'none', color: value ? text : muted }}>
        <span className="truncate">{value || placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"
          className={`w-3.5 h-3.5 flex-shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-[0_12px_36px_rgba(20,10,20,0.16)] py-1.5 z-50 max-h-[260px] overflow-y-auto overscroll-contain"
          style={{ background: dm ? '#27272a' : '#fff', border: `1px solid ${border}`, animation: 'fadeSlideDown 0.15s ease-out' }} data-lenis-prevent>
          {options.length === 0 && <p className="px-4 py-2.5 text-[0.8rem]" style={{ color: muted }}>Loading…</p>}
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[0.84rem] transition-colors"
              style={{ color: value === o ? text : (dm ? '#c4c4cc' : '#55535b'), background: value === o ? (dm ? '#3f3f46' : '#F7F4F6') : 'transparent', fontWeight: value === o ? 600 : 400 }}
              onMouseEnter={e => { if (value !== o) e.currentTarget.style.background = dm ? '#3f3f46' : '#F7F5F8'; }}
              onMouseLeave={e => { if (value !== o) e.currentTarget.style.background = 'transparent'; }}>
              {o}
              {value === o && <svg viewBox="0 0 24 24" fill="none" stroke={ROSE} strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function YesNo({ value, onChange, dm, yes = 'Yes', no = 'No' }) {
  const border = dm ? '#3f3f46' : '#E4E2E8';
  const idle = { background: dm ? '#1e1e24' : '#fff', color: dm ? '#a1a1aa' : '#77747d', border: `1px solid ${border}` };
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)} className="flex-1 h-10 rounded-xl text-[0.76rem] font-semibold transition-all"
        style={value === true ? { background: '#D4A0B0', color: '#fff', border: '1px solid #D4A0B0' } : idle}>{yes}</button>
      <button type="button" onClick={() => onChange(false)} className="flex-1 h-10 rounded-xl text-[0.76rem] font-semibold transition-all"
        style={value === false ? { background: dm ? '#f4f4f5' : '#1a1a1f', color: dm ? '#111' : '#fff', border: `1px solid ${dm ? '#f4f4f5' : '#1a1a1f'}` } : idle}>{no}</button>
    </div>
  );
}

function Toggle({ on, onChange, color = ROSE, dm, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="relative w-11 h-[26px] rounded-full transition-colors duration-200 flex items-center px-[3px] flex-shrink-0"
      style={{ background: on ? color : (dm ? '#3f3f46' : '#E3E1E6') }}>
      <span className="w-5 h-5 rounded-full shadow-sm transition-transform duration-200"
        style={{ background: '#fff', transform: on ? 'translateX(18px)' : 'translateX(0)' }} />
    </button>
  );
}

// One white card per part of the form, on a faintly grey panel, so the sections
// read as groups instead of one long column of fields. Module-level so typing in
// a field inside it never remounts the field and drops focus.
function Card({ title, hint, accent, dm, children }) {
  return (
    <section className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5"
      style={{ background: dm ? '#27272e' : '#ffffff', border: `1px solid ${dm ? '#34343d' : '#ECEAEE'}` }}>
      {title && (
        <div className="-mb-0.5">
          <h4 className="text-[0.8rem] font-semibold flex items-center gap-2" style={{ color: dm ? '#f4f4f5' : '#1a1a1f' }}>
            {accent && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />}
            {title}
          </h4>
          {hint && <p className="text-[0.7rem] mt-0.5 leading-snug" style={{ color: dm ? '#8e8e99' : '#8f8b95' }}>{hint}</p>}
        </div>
      )}
      {children}
    </section>
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

  const muted = dm ? '#8e8e99' : '#8f8b95';
  const ink = dm ? '#e4e4e7' : '#2a262c';
  const rule = dm ? '#2e2e38' : '#F1EFF3';
  const dot = { appt: '#2563EB', consult: '#6B5A93', class: '#C76BA6', block: BLOCK_INK[dm ? 'dark' : 'light'] };
  const warn = clashes.length > 0;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: dm ? '#27272e' : '#fff', border: `1px solid ${warn ? (dm ? 'rgba(245,158,11,0.45)' : '#F6D9A8') : (dm ? '#34343d' : '#ECEAEE')}` }}>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5"
        style={{ background: warn ? (dm ? 'rgba(245,158,11,0.10)' : '#FFF8EC') : (dm ? '#1e1e24' : '#FAF9FB') }}>
        <span className="text-[0.62rem] font-semibold tracking-[0.12em] uppercase" style={{ color: warn ? '#B26A04' : muted }}>
          {warn ? (clashes.length === 1 ? `Overlaps ${clashes[0].name}` : `Overlaps ${clashes.length} on this day`) : 'Also on this day'}
        </span>
        <span className="text-[0.7rem] font-medium whitespace-nowrap" style={{ color: muted }}>{fmtShortDate(date)}</span>
      </div>
      {dayOff && (
        <p className="px-3.5 py-2.5 text-[0.76rem] font-medium flex items-center gap-2" style={{ color: dm ? '#fca5a5' : '#C0392B', borderTop: `1px solid ${rule}` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-2.5 h-2.5 flex-shrink-0"><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>
          Closed to clients{dayOff.reason ? `: ${dayOff.reason}` : ''}
        </p>
      )}
      {items.length === 0 && !dayOff && (
        <p className="px-3.5 py-3 text-[0.78rem]" style={{ color: muted, borderTop: `1px solid ${rule}` }}>Nothing else on this day.</p>
      )}
      {items.map(it => {
        const hit = clashIds.has(it.id);
        return (
          <div key={it.id} className="flex items-center gap-3 px-3.5 py-2.5"
            style={{ borderTop: `1px solid ${rule}`, background: hit ? (dm ? 'rgba(245,158,11,0.06)' : '#FFFCF5') : (it.kind === 'block' ? blockHatch(dm) : 'transparent') }}>
            <span className={`w-1.5 h-1.5 flex-shrink-0 ${it.kind === 'block' ? 'rounded-[1.5px]' : 'rounded-full'}`} style={{ background: dot[it.kind] }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.8rem] font-medium truncate" style={{ color: ink }}>{it.name}</span>
              <span className="block text-[0.68rem] truncate" style={{ color: muted }}>{it.detail}</span>
            </span>
            <span className="text-[0.72rem] font-semibold tabular-nums text-right flex-shrink-0" style={{ color: hit ? '#B26A04' : muted }}>
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

  // The panel scrolls through its own Lenis instance, the same way the public
  // booking sheets do. Page-level Lenis is stopped underneath while this is
  // open, so without it the wheel fell back to raw native scrolling in here.
  const scrollRef = useRef(null);
  useModalLenis(scrollRef);

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
    // No padding-right compensation here any more. `scrollbar-gutter: stable`
    // on <html> (see index.css) keeps the scrollbar's strip reserved whether or
    // not a scrollbar is painted, so hiding overflow no longer changes the page
    // width. Re-adding the old padding would now SHIFT the page by a scrollbar
    // width rather than hold it still.
    document.body.style.overflow = 'hidden';
    lenisStop();
    return () => {
      document.body.style.overflow = '';
      lenisStart();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchMode = (m) => {
    if (m === mode) return;
    setError('');
    setMode(m);
    // Carry the day across, so flipping tabs doesn't lose it.
    if (m === 'block' && !block.date && form.date) setBlock(b => ({ ...b, date: form.date }));
    if (m === 'client' && !form.date && block.date) setForm(f => ({ ...f, date: block.date }));
    requestAnimationFrame(() => scrollModalTop(scrollRef.current));
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
          // Tags it with the teal Booksy chip, keeps it out of site revenue, and
          // is what lets the route accept a phone number without an email.
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

  // ── Theme ──
  const shellBg = dm ? '#1f1f25' : '#F6F5F7';
  const cardBg = dm ? '#27272e' : '#ffffff';
  const borderColor = dm ? '#34343d' : '#ECEAEE';
  const textPrimary = dm ? '#f4f4f5' : '#1a1a1f';
  const textMuted = dm ? '#8e8e99' : '#8f8b95';
  const inputBg = dm ? '#18181b' : '#ffffff';
  const inputBorder = dm ? '#3f3f46' : '#E4E2E8';
  const subtleBg = dm ? '#1e1e24' : '#FAF9FB';

  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary };
  // 16px on phones so iOS doesn't zoom the whole panel when a field is tapped.
  const inputClass = 'w-full h-11 px-3.5 rounded-xl text-[16px] sm:text-[0.85rem] outline-none transition-all placeholder:opacity-45 focus:border-[#C4849A] focus:shadow-[0_0_0_3px_rgba(196,132,154,0.12)]';
  const areaClass = 'w-full px-3.5 py-3 rounded-xl text-[16px] sm:text-[0.85rem] outline-none transition-all resize-none placeholder:opacity-45 focus:border-[#C4849A] focus:shadow-[0_0_0_3px_rgba(196,132,154,0.12)]';
  const labelStyle = { display: 'block', fontSize: '0.68rem', fontWeight: 600, marginBottom: '6px', color: dm ? '#a1a1aa' : '#6f6b75' };

  const isBlockMode = mode === 'block';
  const activeDate = isBlockMode ? block.date : form.date;
  const dayOff = activeDate ? blockedDates.find(b => b.date === activeDate) : null;

  const footerSummary = isBlockMode
    ? (block.date ? `${fmtShortDate(block.date)} · ${block.allDay ? (block.closeDay ? 'Whole day, closed to clients' : 'All day') : (block.time || 'Pick a time')}` : '')
    : (form.date ? `${fmtShortDate(form.date)}${form.time ? ` · ${form.time}` : ''}` : '');

  const closesDay = block.allDay && block.closeDay;
  const primaryLabel = isBlockMode
    ? (closesDay ? 'Close This Day' : editBlock ? 'Save Changes' : 'Block This Time')
    : isClass ? 'Add Class Registration' : 'Add to Appointments';

  const canSave = isBlockMode
    ? !!block.date
    : !!(form.first_name.trim() && form.service.trim() && (!isClass || (cls.format && cls.classKey)));

  const detailsBody = (
    <>
      {/* ───────── NON-BRIDAL DETAILS ───────── */}
      {isNonBridal && (
        <>
          <div>
            <label style={labelStyle}>Ready by (when the client wants to be done)</label>
            <StyledDropdown value={nb.ready_by_time} onChange={v => setN('ready_by_time', v)} options={TIMES} placeholder="Select a time…" dm={dm} />
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
          {/* Only once she's said she's travelling, since the address is
              meaningless for a studio appointment. */}
          {nb.travel_requested === true && (
            <div>
              <label style={labelStyle}>Where are you going?</label>
              <LocationAutocomplete value={nb.location} onChange={v => setN('location', v)} placeholder="Address or venue" dm={dm} />
            </div>
          )}
        </>
      )}

      {/* ───────── BRIDAL DETAILS ───────── */}
      {isBridal && (
        <>
          <div>
            <label style={labelStyle}>Event or venue location</label>
            <LocationAutocomplete value={bridal.event_location} onChange={v => setBr('event_location', v)} placeholder="Venue name or address" dm={dm} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Event start time</label>
              <StyledDropdown value={bridal.event_start_time} onChange={v => setBr('event_start_time', v)} options={TIMES} placeholder="Select a time…" dm={dm} />
            </div>
            <div>
              <label style={labelStyle}>Ready by</label>
              <StyledDropdown value={bridal.makeup_ready_by_time} onChange={v => setBr('makeup_ready_by_time', v)} options={TIMES} placeholder="Select a time…" dm={dm} />
            </div>
            <div>
              <label style={labelStyle}>Hairstylist arrives</label>
              <StyledDropdown value={bridal.ready_by_time} onChange={v => setBr('ready_by_time', v)} options={TIMES} placeholder="Select a time…" dm={dm} />
            </div>
            <div>
              <label style={labelStyle}>Photographer arrives</label>
              <StyledDropdown value={bridal.photographer_arrival_time} onChange={v => setBr('photographer_arrival_time', v)} options={TIMES} placeholder="Select a time…" dm={dm} />
            </div>
            <div>
              <label style={labelStyle}>Venue access</label>
              <StyledDropdown value={bridal.venue_access_time} onChange={v => setBr('venue_access_time', v)} options={TIMES} placeholder="Select a time…" dm={dm} />
            </div>
            <div>
              <label style={labelStyle}>How they heard about you</label>
              <StyledDropdown value={bridal.how_heard} onChange={v => setBr('how_heard', v)} options={HOW_HEARD} placeholder="Select…" dm={dm} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>Instagram / TikTok</label>
              <input value={bridal.instagram_handle} onChange={e => setBr('instagram_handle', e.target.value)} placeholder="@handle" className={inputClass} style={inputStyle} />
            </div>
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
            {/* Mirrors the public form, which asks the same follow-up the moment
                a bride says yes. Without it, a client Roko adds by hand is the
                one destination booking with no destination on file. */}
            {bridal.out_of_state === true && (
              <div className="mt-2.5">
                <label style={labelStyle}>Where's the wedding?</label>
                <input value={bridal.destination_location} onChange={e => setBr('destination_location', e.target.value)}
                  placeholder="City & state, e.g. Austin, Texas" className={inputClass} style={inputStyle} />
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Makeup vision and other details</label>
            <textarea value={bridal.additional_details} onChange={e => setBr('additional_details', e.target.value)}
              placeholder="The look, inspo, any special requests…" className={areaClass} style={{ ...inputStyle, minHeight: 84 }} />
          </div>
        </>
      )}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[500] flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(12,8,12,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[640px] h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(20,8,16,0.35)] sm:rounded-[26px]"
        style={{ background: shellBg, border: dm ? `1px solid ${borderColor}` : 'none', animation: 'fadeSlideDown 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex-none px-5 sm:px-6 pb-3.5"
          style={{ background: cardBg, borderBottom: `1px solid ${borderColor}`, paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isBlockMode ? (dm ? 'rgba(171,163,174,0.14)' : '#F3F1F4') : (dm ? 'rgba(196,132,154,0.14)' : '#FBF1F5') }}>
                {isBlockMode ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke={BLOCK_INK[dm ? 'dark' : 'light']} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke={ROSE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[0.58rem] font-bold tracking-[0.16em] uppercase" style={{ color: isBlockMode ? textMuted : ROSE }}>
                  {editBlock ? 'Your calendar' : 'Add to calendar'}
                </p>
                <h3 className="font-serif text-[1.3rem] leading-tight truncate" style={{ color: textPrimary }}>
                  {editBlock ? 'Blocked Time' : isBlockMode ? 'Block Off Time' : 'Add Client'}
                </h3>
              </div>
            </div>
            <button onClick={onClose} type="button" aria-label="Close"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
              style={{ background: dm ? '#3f3f46' : '#F2F0F3', color: textMuted }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* The two things that go on her calendar: a client, or time that's hers. */}
          {!editBlock && (
            <div className="grid grid-cols-2 p-1 rounded-xl mt-3.5" style={{ background: dm ? '#1e1e24' : '#F2F0F3' }} role="tablist">
              {[
                { key: 'client', label: 'Client', icon: <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/> },
                { key: 'block', label: 'Block off time', icon: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></> },
              ].map(({ key, label, icon }) => {
                const on = mode === key;
                return (
                  <button key={key} type="button" role="tab" aria-selected={on} onClick={() => switchMode(key)}
                    className="h-9 rounded-lg text-[0.78rem] flex items-center justify-center gap-2 transition-all"
                    style={on
                      ? { background: cardBg, color: textPrimary, fontWeight: 600, boxShadow: dm ? 'none' : '0 1px 3px rgba(30,15,25,0.10)' }
                      : { color: textMuted, fontWeight: 500 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">{icon}</svg>
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable body, driven by its own Lenis (useModalLenis above). No
            data-lenis-prevent here: that would make the modal's Lenis ignore
            the wheel too. Only the nested lists inside carry it. */}
        <form id="add-client-form" ref={scrollRef} data-modal-scroll onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-5 py-4 sm:py-5" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex flex-col gap-3">

          {isBlockMode ? (
            <>
              <Card dm={dm} title="Which day?" hint="Plans, a family event, anything that takes you off the schedule.">
                <AdminDatePicker value={block.date} onChange={v => setB('date', v)} dm={dm} accent={ROSE} />
                <div className="grid grid-cols-2 gap-2">
                  {[[false, 'Part of the day'], [true, 'All day']].map(([val, label]) => {
                    const on = block.allDay === val;
                    return (
                      <button key={label} type="button" onClick={() => setB('allDay', val)}
                        className="h-10 rounded-xl text-[0.78rem] font-semibold transition-all"
                        style={on
                          ? { background: dm ? '#f4f4f5' : '#1a1a1f', color: dm ? '#111' : '#fff', border: `1px solid ${dm ? '#f4f4f5' : '#1a1a1f'}` }
                          : { background: subtleBg, color: textMuted, border: `1px solid ${borderColor}` }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                {!block.allDay && (
                  <TimeWindowPicker value={block.time} onChange={v => setB('time', v)} slots={TIMES} dm={dm} accent={ROSE} />
                )}
                {block.allDay && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                    <div className="min-w-0">
                      <p className="text-[0.8rem] font-medium" style={{ color: textPrimary }}>Close this day to clients</p>
                      <p className="text-[0.7rem] mt-0.5 leading-snug" style={{ color: textMuted }}>
                        {block.closeDay ? "The booking forms won't offer this day." : 'Just a note on your calendar. Clients can still book it.'}
                      </p>
                    </div>
                    <Toggle on={block.closeDay} onChange={v => setB('closeDay', v)} color="#E05549" dm={dm} label="Close this day to clients" />
                  </div>
                )}
              </Card>

              <Card dm={dm} title="What's it for?" hint="Only you see this.">
                <textarea value={block.reason} onChange={e => setB('reason', e.target.value)}
                  placeholder="Concert, sister's bridal shower, dentist…" maxLength={300}
                  className={areaClass} style={{ ...inputStyle, minHeight: 88 }} />
              </Card>

              {block.date && (
                <DayCheck date={block.date} time={block.allDay ? '' : block.time} bookings={bookings} classRegs={classRegs}
                  blocks={timeBlocks} dayOff={dayOff} ignoreBlockId={editBlock?.id} dm={dm} />
              )}
            </>
          ) : (
            <>
              {/* BOOKSY. First, because it changes what the rest of the form asks for. */}
              {!isClass && (
                <section className="rounded-2xl px-4 py-3.5 sm:px-5 flex items-center gap-3.5 transition-colors"
                  style={{
                    background: form.from_booksy ? (dm ? BOOKSY.tintDark : '#F1FAFA') : cardBg,
                    border: `1px solid ${form.from_booksy ? (dm ? 'rgba(94,234,212,0.35)' : '#BFE6E8') : borderColor}`,
                  }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[0.95rem] font-bold"
                    style={{ background: dm ? BOOKSY.tintDark : BOOKSY.tint, color: dm ? BOOKSY.inkDark : BOOKSY.ink }}>B</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.82rem] font-semibold" style={{ color: textPrimary }}>Booked on Booksy</p>
                    <p className="text-[0.7rem] mt-0.5 leading-snug" style={{ color: textMuted }}>
                      {form.from_booksy
                        ? 'A phone number is enough, it gets the Booksy tag, and no email goes to the client.'
                        : 'Already booked there by you or Shaq? Turn this on.'}
                    </p>
                  </div>
                  <Toggle on={form.from_booksy} onChange={v => set('from_booksy', v)} color={BOOKSY.ink} dm={dm} label="Booked on Booksy" />
                </section>
              )}

              <Card dm={dm} title="Client">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>First name</label>
                    <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" autoComplete="off" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Last name</label>
                    <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" autoComplete="off" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input type="tel" value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(555) 000-0000" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email{fromBooksy ? ' (optional)' : ''}</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className={inputClass} style={inputStyle} />
                  </div>
                </div>
              </Card>

              <Card dm={dm} title="Service">
                <StyledDropdown value={form.service} onChange={v => set('service', v)} options={services.map(s => s.title)} placeholder="Select a service…" dm={dm} />
                {isClass && (
                  <p className="text-[0.7rem] font-medium px-3 py-2 rounded-lg" style={{ background: 'rgba(91,176,204,0.12)', color: '#3E8AA3' }}>
                    Makeup course. Choose the format, class, date and time below.
                  </p>
                )}
              </Card>

              {/* ───────── CLASS ───────── */}
              {isClass && (
                <Card dm={dm} title="Class" accent={LESSON_ACCENT}>
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
                          <span className="block text-[0.64rem] opacity-80 mt-0.5">{f.key === 'online' ? 'Live over Zoom' : 'Mountain House studio'}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label style={labelStyle}>Which class</label>
                    <StyledDropdown value={CLASS_OPTIONS.find(o => o.key === cls.classKey)?.title || ''}
                      onChange={t => setC('classKey', CLASS_OPTIONS.find(o => o.title === t)?.key || '')}
                      options={CLASS_OPTIONS.map(o => o.title)} placeholder="Select a class…" dm={dm} />
                  </div>

                  <div>
                    <label style={labelStyle}>Class date</label>
                    <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent={LESSON_ACCENT} />
                  </div>

                  {windows.length > 0 && (
                    <div>
                      <label style={labelStyle}>Start time</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {windows.map(w => {
                          const sel = cls.slot === w;
                          return (
                            <button key={w} type="button" onClick={() => setC('slot', sel ? '' : w)}
                              className="h-10 px-2 rounded-xl text-[0.74rem] font-semibold tabular-nums text-center transition-all"
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
                    <label style={labelStyle}>Amount paid ($)</label>
                    <input type="number" min="0" value={cls.amount_paid} onChange={e => setC('amount_paid', e.target.value)} placeholder="e.g. 520" className={inputClass} style={inputStyle} />
                  </div>

                  {cls.format === 'online' && (
                    <div>
                      <label style={labelStyle}>Zoom link</label>
                      <div className="flex gap-2">
                        <input value={cls.zoom_link} onChange={e => setC('zoom_link', e.target.value)} placeholder="Paste a link or generate one" className={`${inputClass} flex-1`} style={inputStyle} />
                        <button type="button" onClick={generateZoom} disabled={genZoom || !cls.classKey}
                          className="px-3.5 h-11 rounded-xl text-[0.74rem] font-semibold whitespace-nowrap transition-all disabled:opacity-50 flex items-center gap-1.5"
                          style={{ background: LESSON_ACCENT, color: '#fff' }}>
                          {genZoom ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> …</> : 'Generate'}
                        </button>
                      </div>
                      {cls.zoom_link && <p className="text-[0.7rem] mt-1.5" style={{ color: LESSON_ACCENT }}>Link ready. It saves with this class.</p>}
                    </div>
                  )}
                  {cls.format === 'in_person' && (
                    <div className="px-4 py-3 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                      <p className="text-[0.62rem] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: LESSON_ACCENT }}>Studio location</p>
                      <p className="text-[0.8rem]" style={{ color: textPrimary }}>{STUDIO_DISPLAY}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* ───────── WHEN (every booking, bridal included) ───────── */}
              {form.service && !isClass && (
                <Card dm={dm} title={`${dateNoun} date and time`} accent={isBridal ? '#9A5474' : ROSE}>
                  <AdminDatePicker value={form.date} onChange={v => set('date', v)} dm={dm} accent={isBridal ? '#9A5474' : ROSE} />
                  <div>
                    <label style={labelStyle}>{isBridal ? 'Your appointment time with her' : 'Appointment time'}</label>
                    <TimeWindowPicker value={form.time} onChange={v => set('time', v)} slots={TIMES} dm={dm} accent={ROSE} />
                  </div>
                  {form.date && (
                    <DayCheck date={form.date} time={form.time} bookings={bookings} classRegs={classRegs}
                      blocks={timeBlocks} dayOff={dayOff} dm={dm} />
                  )}
                </Card>
              )}

              {/* ───────── DETAILS ───────── */}
              {(isNonBridal || isBridal) && (
                fromBooksy ? (
                  // A Booksy booking rarely comes with any of this, so it folds
                  // away instead of making the form look unfinished.
                  <section className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <button type="button" onClick={() => setShowMore(v => !v)} aria-expanded={showMore}
                      className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left">
                      <span>
                        <span className="block text-[0.8rem] font-semibold" style={{ color: textPrimary }}>{isBridal ? 'Wedding details' : 'Appointment details'}</span>
                        <span className="block text-[0.7rem] mt-0.5" style={{ color: textMuted }}>Optional. Venue, ready-by time, travel and the rest.</span>
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {showMore && (
                      <div className="px-4 sm:px-5 pb-5 pt-4 flex flex-col gap-3.5" style={{ borderTop: `1px solid ${borderColor}` }}>
                        {detailsBody}
                      </div>
                    )}
                  </section>
                ) : (
                  <Card dm={dm} title={isBridal ? 'Wedding details' : 'Appointment details'} accent={isBridal ? '#9A5474' : undefined}>
                    {detailsBody}
                  </Card>
                )
              )}

              <Card dm={dm} title="Notes" hint={fromBooksy ? "Anything from the Booksy note: deposit, balance, who's getting ready." : undefined}>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Anything worth remembering for this client…"
                  className={areaClass} style={{ ...inputStyle, minHeight: 88 }} />
              </Card>

              {/* STATUS, DEPOSIT, EMAIL. Bookings only (classes carry their own paid state) */}
              {!isClass && (
                <Card dm={dm} title="Status">
                  <div className="grid grid-cols-3 gap-2">
                    {STATUSES.map(s => (
                      <button key={s.value} type="button" onClick={() => set('status', s.value)}
                        className="h-10 rounded-xl text-[0.72rem] font-semibold tracking-[0.04em] uppercase transition-all"
                        style={form.status === s.value
                          ? { background: s.color, color: '#fff', border: `1px solid ${s.color}` }
                          : { background: subtleBg, color: textMuted, border: `1px solid ${borderColor}` }
                        }>{s.label}</button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                    <div className="min-w-0">
                      <p className="text-[0.8rem] font-medium" style={{ color: textPrimary }}>Deposit received</p>
                      <p className="text-[0.7rem] mt-0.5" style={{ color: textMuted }}>Turn on if the deposit is already paid</p>
                    </div>
                    <Toggle on={form.deposit_received} onChange={v => set('deposit_received', v)} color="#22c55e" dm={dm} label="Deposit received" />
                  </div>

                  {!fromBooksy && (
                    <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
                      <div className="min-w-0">
                        <p className="text-[0.8rem] font-medium" style={{ color: textPrimary }}>Email the client</p>
                        <p className="text-[0.7rem] mt-0.5" style={{ color: textMuted }}>Off saves quietly. On sends the usual confirmation.</p>
                      </div>
                      <Toggle on={form.notify} onChange={v => set('notify', v)} dm={dm} label="Email the client" />
                    </div>
                  )}
                </Card>
              )}

              {isClass && (
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="min-w-0">
                    <p className="text-[0.8rem] font-medium" style={{ color: textPrimary }}>Email the client</p>
                    <p className="text-[0.7rem] mt-0.5" style={{ color: textMuted }}>Sends the class details with the Zoom link or studio address.</p>
                  </div>
                  <Toggle on={form.notify} onChange={v => set('notify', v)} dm={dm} label="Email the client" />
                </div>
              )}
            </>
          )}
          </div>
        </form>

        {/* Pinned footer: what's about to be saved, any problem with it, and the buttons. */}
        <div className="flex-none px-4 sm:px-6 pt-3"
          style={{ borderTop: `1px solid ${borderColor}`, background: cardBg, paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
          {error ? (
            <p className="text-[0.76rem] font-medium mb-2.5 flex items-start gap-2" style={{ color: '#DC2626' }} role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5 flex-shrink-0 mt-[1px]"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
              {error}
            </p>
          ) : footerSummary ? (
            <p className="text-[0.74rem] font-medium mb-2.5 truncate tabular-nums" style={{ color: textMuted }}>{footerSummary}</p>
          ) : null}
          <div className="flex items-center gap-2.5">
            {editBlock ? (
              <button type="button" onClick={deleteBlock} disabled={saving}
                className="px-4 h-12 text-[0.78rem] font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                style={confirmDelete
                  ? { background: '#DC2626', color: '#fff', border: '1px solid #DC2626' }
                  : { background: 'transparent', color: '#DC2626', border: `1px solid ${dm ? 'rgba(220,38,38,0.45)' : '#F3CFCF'}` }}>
                {confirmDelete ? 'Tap to remove' : 'Remove'}
              </button>
            ) : (
              <button type="button" onClick={onClose}
                className="px-5 h-12 text-[0.8rem] font-medium rounded-xl border transition-all active:scale-[0.98]"
                style={{ borderColor: inputBorder, color: textMuted, background: 'transparent' }}>Cancel</button>
            )}
            <button type="submit" form="add-client-form" disabled={saving || !canSave}
              className="flex-1 h-12 text-[0.84rem] font-semibold tracking-[0.02em] rounded-xl transition-all shadow-sm disabled:opacity-45 active:scale-[0.99] flex items-center justify-center gap-2"
              style={fromBooksy && !isBlockMode
                ? { background: BOOKSY.ink, color: '#fff' }
                : closesDay && isBlockMode
                  ? { background: '#E05549', color: '#fff' }
                  : { background: dm ? '#f4f4f5' : '#1a1a1f', color: dm ? '#111' : '#fff' }}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Saving…</>
                : primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
