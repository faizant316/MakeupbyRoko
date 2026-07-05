import { useMemo, useRef, useState } from 'react';
import StatusBadge from './StatusBadge';
import { relativeDate } from './timeline';
import { lenisScrollTo } from '@/lib/lenis';
import { isBridalService } from './statusColors';
import { classesOfReg } from '@/lib/classCatalog';

// Booksy-style Clients section. One directory built automatically from every
// booking and class sign-up: a searchable A-Z list with a jump rail, plus
// smart groups (New, Most Loyal, Slipping Away, Prospects...) computed live
// from appointment history. Tap a client for their card: contact actions,
// stats, and their full appointment + class history.

const todayKey = () => new Date().toISOString().split('T')[0];
const dayKeyOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function classLabelOf(reg) {
  return classesOfReg(reg)[0]?.title || 'Makeup Class';
}

// ── Build the client directory from bookings + class sign-ups ──
function buildClients(bookings, classRegs) {
  const map = new Map();
  const keyFor = (email, phone, name) => {
    if (email) return `e:${email.trim().toLowerCase()}`;
    const digits = (phone || '').replace(/\D/g, '');
    if (digits) return `p:${digits}`;
    if (name) return `n:${name.trim().toLowerCase()}`;
    return null;
  };
  const upsert = (email, phone, name, created) => {
    const key = keyFor(email, phone, name);
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, { key, name: name || 'Client', email: email || '', phone: phone || '', appts: [], classes: [], firstSeen: created || '' });
    }
    const c = map.get(key);
    // Prefer the most complete contact info we've seen.
    if (name && (!c.name || c.name === 'Client')) c.name = name;
    if (email && !c.email) c.email = email;
    if (phone && !c.phone) c.phone = phone;
    if (created && (!c.firstSeen || created < c.firstSeen)) c.firstSeen = created;
    return c;
  };

  bookings.forEach(b => {
    const c = upsert(b.email, b.phone, b.name, b.created_date);
    if (c) c.appts.push(b);
  });
  classRegs.forEach(r => {
    const c = upsert(r.email, r.phone, r.full_name, r.created_date);
    if (c) c.classes.push(r);
  });

  const today = todayKey();
  const cutoff30 = dayKeyOffset(30);
  const cutoff90 = dayKeyOffset(90);

  const clients = [...map.values()].map(c => {
    const activeAppts = c.appts.filter(b => b.status !== 'cancelled');
    const activeClasses = c.classes.filter(r => r.status !== 'declined');
    const dates = [
      ...activeAppts.map(b => b.date).filter(Boolean),
      ...activeClasses.map(r => r.appointment_date).filter(Boolean),
    ];
    const upcoming = dates.filter(d => d >= today);
    const past = dates.filter(d => d < today);
    const nextDate = upcoming.length ? upcoming.reduce((a, b) => (a < b ? a : b)) : null;
    const lastDate = past.length ? past.reduce((a, b) => (a > b ? a : b)) : null;
    // "Visits" = appointments that actually happened (confirmed or completed, in the past).
    const visits90 = activeAppts.filter(b => b.date && b.date < today && b.date >= cutoff90 && ['confirmed', 'completed'].includes(b.status)).length
      + activeClasses.filter(r => r.appointment_date && r.appointment_date < today && r.appointment_date >= cutoff90).length;
    const hasBooked = activeAppts.some(b => ['confirmed', 'completed'].includes(b.status))
      || activeClasses.some(r => r.status === 'enrolled' || r.appointment_date);
    const total = activeAppts.length + activeClasses.length;

    return {
      ...c,
      total,
      upcomingCount: upcoming.length,
      nextDate,
      lastDate,
      completedCount: c.appts.filter(b => b.status === 'completed').length,
      hasToday: dates.includes(today),
      isNew: !!c.firstSeen && c.firstSeen.slice(0, 10) >= cutoff30,
      isLoyal: visits90 >= 3,
      isFirstVisit: total === 1,
      isProspect: !hasBooked,
      isSlipping: hasBooked && upcoming.length === 0 && (!lastDate || lastDate < cutoff30),
    };
  });

  clients.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' }));
  return clients;
}

const GROUP_DEFS = [
  { key: 'all',        label: 'All Clients',    desc: 'Everyone who has booked or inquired',                 test: () => true },
  { key: 'new',        label: 'New Clients',    desc: 'Clients who first appeared in the last 30 days',      test: c => c.isNew },
  { key: 'loyal',      label: 'Most Loyal',     desc: 'At least three visits in the last three months',      test: c => c.isLoyal },
  { key: 'slipping',   label: 'Slipping Away',  desc: 'No appointment in the last month, nothing upcoming',  test: c => c.isSlipping },
  { key: 'prospects',  label: 'Prospects',      desc: "Inquired but haven't booked with you yet",            test: c => c.isProspect },
  { key: 'firstvisit', label: 'First Visit',    desc: 'Clients on their very first booking',                 test: c => c.isFirstVisit },
  { key: 'today',      label: 'Booking Today',  desc: 'Clients with an appointment today',                   test: c => c.hasToday },
  { key: 'upcoming',   label: 'Upcoming',       desc: 'Clients with a future appointment on the books',      test: c => c.upcomingCount > 0 },
];

function GroupIcon({ color }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function ActionCircle({ href, label, dm, children }) {
  return (
    <a href={href}
      className="flex flex-col items-center gap-1.5 flex-1 py-3 rounded-2xl transition-all hover:opacity-80 active:scale-[0.97]"
      style={{ background: dm ? '#26262e' : '#FAF7F4', border: `1px solid ${dm ? '#2e2e38' : '#f0eae4'}`, minWidth: 0 }}>
      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: dm ? 'rgba(212,160,176,0.14)' : 'rgba(212,160,176,0.16)' }}>
        {children}
      </span>
      <span className="text-[0.62rem] font-semibold tracking-[0.04em]" style={{ color: dm ? '#d4d4d8' : '#555' }}>{label}</span>
    </a>
  );
}

// ── Client card (detail) ──
function ClientDetail({ client, dm, onBack, onOpenBooking, onOpenClassReg }) {
  const line = dm ? '#2e2e38' : '#f0eae4';
  const apptRows = [...client.appts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const classRows = [...client.classes].sort((a, b) => (b.appointment_date || '').localeCompare(a.appointment_date || ''));
  const memberSince = client.firstSeen
    ? new Date(client.firstSeen).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-[1100px]">
      <button onClick={onBack} className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[#D4A0B0] hover:text-[#b8849a] transition-colors mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        All Clients
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_minmax(0,1fr)] gap-x-8 items-start">
      <div className="lg:sticky lg:top-20">
      {/* Identity */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[1.3rem]"
          style={{ background: dm ? 'rgba(212,160,176,0.16)' : '#F5E6EC', color: dm ? '#e7c9d5' : '#8A4A63' }}>
          {initialsOf(client.name)}
        </div>
        <div className="min-w-0">
          <h2 className="font-serif text-[1.6rem] leading-tight truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{client.name}</h2>
          {memberSince && (
            <p className="text-[0.72rem] mt-1" style={{ color: dm ? '#71717a' : '#a99e95' }}>Client since {memberSince}</p>
          )}
        </div>
      </div>

      {/* Contact actions */}
      <div className="flex gap-2.5 mb-6">
        {client.phone && (
          <ActionCircle href={`tel:${client.phone}`} label="Call" dm={dm}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 11.7 19.79 19.79 0 0 1 1 3.07 2 2 0 0 1 2.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </ActionCircle>
        )}
        {client.phone && (
          <ActionCircle href={`sms:${client.phone}`} label="Text" dm={dm}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </ActionCircle>
        )}
        {client.email && (
          <ActionCircle href={`mailto:${client.email}`} label="Email" dm={dm}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4849A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>
            </svg>
          </ActionCircle>
        )}
      </div>

      {/* Contact details */}
      <div className="rounded-2xl px-4 py-3.5 mb-6 flex flex-col gap-2" style={{ background: dm ? '#26262e' : '#FAF7F4', border: `1px solid ${line}` }}>
        {client.phone && (
          <div className="flex items-center justify-between gap-3 min-w-0">
            <span className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase flex-shrink-0" style={{ color: dm ? '#71717a' : '#b3a89f' }}>Phone</span>
            <span className="text-[0.82rem] font-medium truncate tabular-nums" style={{ color: dm ? '#e4e4e7' : '#111' }}>{client.phone}</span>
          </div>
        )}
        {client.email && (
          <div className="flex items-center justify-between gap-3 min-w-0">
            <span className="text-[0.6rem] font-semibold tracking-[0.12em] uppercase flex-shrink-0" style={{ color: dm ? '#71717a' : '#b3a89f' }}>Email</span>
            <span className="text-[0.82rem] font-medium truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{client.email}</span>
          </div>
        )}
        {!client.phone && !client.email && (
          <p className="text-[0.78rem]" style={{ color: dm ? '#71717a' : '#b3a89f' }}>No contact info on file</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-8">
        {[
          { label: 'Bookings', value: client.total },
          { label: 'Completed', value: client.completedCount },
          { label: 'Upcoming', value: client.upcomingCount },
        ].map(s => (
          <div key={s.label} className="rounded-2xl py-3.5 text-center" style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${line}` }}>
            <div className="font-serif text-[1.4rem] leading-none" style={{ color: dm ? '#F0EBE6' : '#111' }}>{s.value}</div>
            <div className="text-[0.55rem] font-semibold tracking-[0.12em] uppercase mt-1.5" style={{ color: dm ? '#71717a' : '#A89098' }}>{s.label}</div>
          </div>
        ))}
      </div>
      </div> {/* /left column */}

      <div className="min-w-0">
      {/* Appointments */}
      {apptRows.length > 0 && (
        <div className="mb-8">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Appointments</p>
          <div className="flex flex-col gap-2">
            {apptRows.map(b => {
              const rel = relativeDate(b.date);
              return (
                <button key={b.id} onClick={() => onOpenBooking?.(b)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-90 active:scale-[0.995]"
                  style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${line}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.84rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{b.service || 'Appointment'}</p>
                    <p className="text-[0.7rem] mt-0.5" style={{ color: dm ? '#71717a' : '#a99e95' }}>
                      {rel.label}{b.time ? ` · ${b.time}` : ''}
                      {isBridalService(b.service) ? ' · Bridal' : ''}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                  <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#c5bdb5'} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Classes */}
      {classRows.length > 0 && (
        <div className="mb-8">
          <p className="text-[0.6rem] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: dm ? '#8f8a93' : '#A89098' }}>Makeup Classes</p>
          <div className="flex flex-col gap-2">
            {classRows.map(r => (
              <button key={r.id} onClick={() => onOpenClassReg?.(r)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-90 active:scale-[0.995]"
                style={{ background: dm ? '#26262e' : '#fff', border: `1px solid ${line}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.84rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#111' }}>{classLabelOf(r)}</p>
                  <p className="text-[0.7rem] mt-0.5" style={{ color: dm ? '#71717a' : '#a99e95' }}>
                    {r.appointment_date ? relativeDate(r.appointment_date).label : 'No date set'}
                    {r.appointment_time ? ` · ${r.appointment_time}` : ''}
                  </p>
                </div>
                <span className="text-[0.6rem] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(196,149,106,0.14)', color: '#9C6B38' }}>
                  {r.status === 'enrolled' ? 'Enrolled' : r.status === 'contacted' ? 'Contacted' : 'New'}
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#c5bdb5'} strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {apptRows.length === 0 && classRows.length === 0 && (
        <div className="rounded-2xl py-10 text-center" style={{ background: dm ? '#26262e' : '#FAF7F4', border: `1px solid ${line}` }}>
          <p className="text-[0.82rem]" style={{ color: dm ? '#71717a' : '#b3a89f' }}>No bookings on file yet</p>
        </div>
      )}
      </div> {/* /right column */}
      </div> {/* /two-column grid */}
    </div>
  );
}

export default function ClientsTab({ bookings = [], classRegs = [], darkMode: dm, onOpenBooking, onOpenClassReg }) {
  const [view, setView] = useState('list'); // 'list' | 'groups'
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const [selectedKey, setSelectedKey] = useState(null);
  const letterRefs = useRef({});

  const clients = useMemo(() => buildClients(bookings, classRegs), [bookings, classRegs]);
  const groups = useMemo(
    () => GROUP_DEFS.map(g => ({ ...g, count: clients.filter(g.test).length })),
    [clients]
  );

  const group = groups.find(g => g.key === activeGroup) || groups[0];
  const q = search.trim().toLowerCase();
  const visible = clients.filter(c =>
    group.test(c) &&
    (!q || [c.name, c.email, c.phone].some(f => f?.toLowerCase().includes(q)))
  );

  // A-Z sections
  const sections = useMemo(() => {
    const by = new Map();
    for (const c of visible) {
      const ch = (c.name || '#').trim().charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(ch) ? ch : '#';
      if (!by.has(letter)) by.set(letter, []);
      by.get(letter).push(c);
    }
    return [...by.entries()].sort((a, b) => (a[0] === '#' ? 1 : b[0] === '#' ? -1 : a[0].localeCompare(b[0])));
  }, [visible]);
  const presentLetters = new Set(sections.map(([l]) => l));

  const selectedClient = selectedKey ? clients.find(c => c.key === selectedKey) : null;

  const line = dm ? '#2e2e38' : '#f0eae4';
  const muted = dm ? '#71717a' : '#b3a89f';

  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient} dm={dm}
        onBack={() => setSelectedKey(null)}
        onOpenBooking={onOpenBooking}
        onOpenClassReg={onOpenClassReg}
      />
    );
  }

  const jumpTo = (letter) => {
    const el = letterRefs.current[letter];
    if (el) lenisScrollTo(el, { offset: -72, duration: 0.6 });
  };

  return (
    <div className="max-w-[1100px]">
      {/* List | Groups segmented control (Booksy style) */}
      <div className="flex sm:inline-flex w-full sm:w-auto rounded-full p-1 mb-5"
        style={{ background: dm ? '#26262e' : '#F3EDE7', border: `1px solid ${dm ? '#2e2e38' : '#EBE3DB'}` }}>
        {[
          { key: 'list', label: `List (${clients.length})` },
          { key: 'groups', label: `Groups (${groups.length})` },
        ].map(s => {
          const active = view === s.key;
          return (
            <button key={s.key} onClick={() => setView(s.key)}
              className="flex-1 sm:flex-none sm:min-w-[170px] py-2 px-6 rounded-full text-[0.78rem] font-semibold transition-all duration-200 whitespace-nowrap"
              style={active
                ? { background: dm ? '#3a3a44' : '#fff', color: dm ? '#F0EBE6' : '#111', boxShadow: dm ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 5px rgba(60,45,35,0.14)' }
                : { background: 'transparent', color: muted }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {view === 'groups' ? (
        /* ── Groups view ── */
        <div className="flex flex-col">
          {groups.map((g, i) => (
            <button key={g.key}
              onClick={() => { setActiveGroup(g.key); setView('list'); }}
              className="w-full flex items-center gap-4 py-4 text-left transition-opacity hover:opacity-75"
              style={{ borderBottom: i < groups.length - 1 ? `1px solid ${line}` : 'none' }}>
              <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ border: `1px solid ${dm ? '#3a3a44' : '#e4dcd4'}` }}>
                <GroupIcon color={dm ? '#8a8a93' : '#b3a89f'} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[0.95rem] font-semibold" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>
                  {g.label} <span style={{ color: muted, fontWeight: 500 }}>({g.count})</span>
                </span>
                <span className="block text-[0.74rem] mt-0.5 leading-snug" style={{ color: muted }}>{g.desc}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#52525b' : '#c5bdb5'} strokeWidth="2" className="w-4 h-4 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      ) : (
        /* ── List view ── */
        <>
          {/* Search */}
          <div className="relative mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#b5a99a" strokeWidth="1.5" className="w-[15px] h-[15px] absolute left-3.5 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-10 pr-10 py-2.5 rounded-full text-base sm:text-[0.85rem] focus:ring-1 focus:ring-[#D4A0B0]/20 outline-none transition-all"
              style={{ background: dm ? '#232328' : '#F5F1EC', border: `1px solid ${dm ? '#34343d' : 'transparent'}`, color: dm ? '#e4e4e7' : '#111' }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: dm ? '#3f3f46' : '#e9e2da', touchAction: 'manipulation' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#d4d4d8' : '#8a7e84'} strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Active smart-group chip */}
          {activeGroup !== 'all' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full text-[0.72rem] font-semibold"
                style={{ background: dm ? 'rgba(212,160,176,0.14)' : 'rgba(212,160,176,0.18)', color: dm ? '#e7c9d5' : '#8A4A63' }}>
                {group.label} ({visible.length})
                <button onClick={() => setActiveGroup('all')} aria-label="Show all clients"
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ background: dm ? 'rgba(212,160,176,0.2)' : 'rgba(160,96,122,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </span>
            </div>
          )}

          {visible.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[0.85rem]" style={{ color: dm ? '#52525b' : '#c5bdb5' }}>
                {q ? `No clients match "${search}"` : 'No clients in this group yet'}
              </p>
            </div>
          ) : (
            <div className="flex gap-1">
              {/* Rows */}
              <div className="flex-1 min-w-0">
                {/* Desktop column header */}
                <div className="hidden sm:flex items-center gap-3.5 pt-2 pb-2" style={{ borderBottom: `1px solid ${line}` }}>
                  <span className="w-10 flex-shrink-0" />
                  <span className="flex-1 min-w-0 grid grid-cols-[1.2fr_0.9fr_1.2fr_0.75fr] gap-4">
                    {['Client', 'Phone', 'Email', 'Next visit'].map(h => (
                      <span key={h} className="text-[0.56rem] font-bold tracking-[0.14em] uppercase truncate" style={{ color: dm ? '#5a5a63' : '#c9beb4' }}>{h}</span>
                    ))}
                  </span>
                </div>
                {sections.map(([letter, list]) => (
                  <div key={letter} ref={el => { letterRefs.current[letter] = el; }}>
                    <p className="text-[0.68rem] font-bold tracking-[0.1em] pt-4 pb-1.5" style={{ color: dm ? '#8a8a93' : '#b3a89f' }}>{letter}</p>
                    {list.map((c, i) => {
                      const nextRel = c.nextDate ? relativeDate(c.nextDate) : null;
                      const lastRel = c.lastDate ? relativeDate(c.lastDate) : null;
                      return (
                        <button key={c.key} onClick={() => setSelectedKey(c.key)}
                          className="w-full flex items-center gap-3.5 py-3 text-left transition-opacity hover:opacity-75"
                          style={{ borderBottom: i < list.length - 1 ? `1px solid ${line}` : 'none' }}>
                          <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[0.78rem] font-semibold"
                            style={{ background: dm ? '#2e2e38' : '#EFE9E3', color: dm ? '#a1a1aa' : '#8a7e74' }}>
                            {initialsOf(c.name)}
                          </span>
                          <span className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1.2fr_0.9fr_1.2fr_0.75fr] sm:gap-4 sm:items-center">
                            <span className="min-w-0">
                              <span className="block text-[0.9rem] font-semibold truncate" style={{ color: dm ? '#e4e4e7' : '#1a1a1a' }}>{c.name}</span>
                              <span className="block sm:hidden text-[0.74rem] mt-0.5 truncate tabular-nums" style={{ color: muted }}>
                                {c.phone || c.email || 'No contact info'}
                              </span>
                            </span>
                            <span className="hidden sm:block text-[0.78rem] truncate tabular-nums" style={{ color: dm ? '#a1a1aa' : '#8a7e74' }}>
                              {c.phone || '—'}
                            </span>
                            <span className="hidden sm:block text-[0.78rem] truncate" style={{ color: dm ? '#a1a1aa' : '#8a7e74' }}>
                              {c.email || '—'}
                            </span>
                            <span className="hidden sm:block text-[0.74rem] font-semibold truncate"
                              style={{ color: nextRel ? '#16A34A' : muted }}>
                              {nextRel ? nextRel.label : lastRel ? `Last ${lastRel.label}` : '—'}
                            </span>
                          </span>
                          {c.upcomingCount > 0 && (
                            <span className="sm:hidden w-2 h-2 rounded-full flex-shrink-0" title="Has an upcoming appointment" style={{ background: '#16A34A' }} />
                          )}
                          <svg viewBox="0 0 24 24" fill="none" stroke={dm ? '#3f3f46' : '#ddd2c8'} strokeWidth="2" className="hidden sm:block w-3.5 h-3.5 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* A-Z jump rail */}
              <div className="flex-shrink-0 sticky self-start pl-1" style={{ top: 76 }}>
                <div className="flex flex-col items-center">
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').filter(l => l !== '#' || presentLetters.has('#')).map(l => {
                    const has = presentLetters.has(l);
                    return (
                      <button key={l} onClick={() => has && jumpTo(l)} disabled={!has}
                        className="w-5 text-[0.58rem] font-semibold leading-[15px] text-center"
                        style={{ color: has ? (dm ? '#a1a1aa' : '#8a7e74') : (dm ? '#3a3a44' : '#e0d8d0'), cursor: has ? 'pointer' : 'default', touchAction: 'manipulation' }}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
