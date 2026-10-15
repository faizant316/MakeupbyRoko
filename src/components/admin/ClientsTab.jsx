import { useMemo, useRef, useState } from 'react';
import StatusBadge from './StatusBadge';
import { relativeDate } from './timeline';
import { lenisScrollTo } from '@/lib/lenis';
import { isBridalService } from './statusColors';
import { classesOfReg } from '@/lib/classCatalog';
import { formatPhone, phoneHref } from '@/lib/phone';
import { Button, Label, RowPanel, SearchLine, Segmented, Tag, buttonClass, cx } from './ui';

// Booksy-style Clients section. One directory built automatically from every
// booking and class sign-up: a searchable A-Z list with a jump rail, plus
// smart groups (New, Most Loyal, Slipping Away, Prospects...) computed live
// from appointment history. Tap a client for their card: contact actions,
// stats, and their full appointment + class history.
//
// Drawn the way the rest of the dashboard is: rows on hairlines in one square
// panel, the whole row the target, and colour kept for the few things that
// mean something (bridal, a class, a status).

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
  { key: 'all',        label: 'All clients',    desc: 'Everyone who has booked or inquired',                 test: () => true },
  { key: 'new',        label: 'New clients',    desc: 'Clients who first appeared in the last 30 days',      test: c => c.isNew },
  { key: 'loyal',      label: 'Most loyal',     desc: 'At least three visits in the last three months',      test: c => c.isLoyal },
  { key: 'slipping',   label: 'Slipping away',  desc: 'No appointment in the last month, nothing upcoming',  test: c => c.isSlipping },
  { key: 'prospects',  label: 'Prospects',      desc: "Inquired but haven't booked with you yet",            test: c => c.isProspect },
  { key: 'firstvisit', label: 'First visit',    desc: 'Clients on their very first booking',                 test: c => c.isFirstVisit },
  { key: 'today',      label: 'Booking today',  desc: 'Clients with an appointment today',                   test: c => c.hasToday },
  { key: 'upcoming',   label: 'Upcoming',       desc: 'Clients with a future appointment on the books',      test: c => c.upcomingCount > 0 },
];

function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

// The "this opens" chevron at the end of a row. Nudges right under a pointer.
function RowChevron({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={cx('h-3.5 w-3.5 shrink-0 text-ink-muted/60 transition-transform duration-200 group-hover:translate-x-0.5', className)} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// The same rose-wash circle in the directory and on the card, so the person
// you tapped is recognisably the person who opens.
function Avatar({ name, large = false }) {
  return (
    <span aria-hidden className={cx(
      'flex shrink-0 items-center justify-center rounded-full bg-rose-wash font-semibold text-rose',
      large ? 'h-16 w-16 text-[1.15rem]' : 'h-10 w-10 text-[0.74rem]',
    )}>
      {initialsOf(name)}
    </span>
  );
}

// Call / Text / Email. Equal widths, so none of them reads as the main one.
function ContactButton({ href, label, children }) {
  return (
    <a href={href} className={buttonClass('quiet', 'md', 'h-11 flex-1 px-2')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ink-muted" aria-hidden>
        {children}
      </svg>
      {label}
    </a>
  );
}

const historyRow = 'group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 sm:px-5';

// ── Client card (detail) ──
function ClientDetail({ client, onBack, onOpenBooking, onOpenClassReg }) {
  const apptRows = [...client.appts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const classRows = [...client.classes].sort((a, b) => (b.appointment_date || '').localeCompare(a.appointment_date || ''));
  const memberSince = client.firstSeen
    ? new Date(client.firstSeen).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-[1100px]">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        All clients
      </Button>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <Avatar name={client.name} large />
            <div className="min-w-0">
              <h2 className="break-words text-[1.55rem] font-semibold leading-tight tracking-[-0.02em] text-ink">{client.name}</h2>
              {memberSince && <p className="mt-1 text-[0.8rem] text-ink-muted">Client since {memberSince}</p>}
            </div>
          </div>

          {/* Contact actions */}
          {(client.phone || client.email) && (
            <div className="flex gap-2">
              {client.phone && (
                <ContactButton href={`tel:${phoneHref(client.phone)}`} label="Call">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 11.7 19.79 19.79 0 0 1 1 3.07 2 2 0 0 1 2.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </ContactButton>
              )}
              {client.phone && (
                <ContactButton href={`sms:${phoneHref(client.phone)}`} label="Text">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </ContactButton>
              )}
              {client.email && (
                <ContactButton href={`mailto:${client.email}`} label="Email">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>
                </ContactButton>
              )}
            </div>
          )}

          {/* Contact details */}
          <RowPanel>
            {client.phone && (
              <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                <Label className="shrink-0">Phone</Label>
                <span className="truncate text-[0.86rem] font-medium tabular-nums text-ink">{formatPhone(client.phone)}</span>
              </div>
            )}
            {client.email && (
              <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                <Label className="shrink-0">Email</Label>
                <span className="truncate text-[0.86rem] font-medium text-ink">{client.email}</span>
              </div>
            )}
            {!client.phone && !client.email && (
              <p className="px-4 py-3 text-[0.8rem] text-ink-muted">No contact info on file</p>
            )}
          </RowPanel>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-line border border-line bg-paper">
            {[
              { label: 'Bookings', value: client.total },
              { label: 'Completed', value: client.completedCount },
              { label: 'Upcoming', value: client.upcomingCount },
            ].map(s => (
              <div key={s.label} className="min-w-0 px-4 py-4">
                <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{s.label}</p>
                <p className="mt-2 text-[1.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{s.value}</p>
              </div>
            ))}
          </div>
        </div> {/* /left column */}

        <div className="flex min-w-0 flex-col gap-8">
          {/* Appointments. Bridal ones wear the rose wash, the same as on Home. */}
          {apptRows.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-baseline gap-2">
                <Label>Appointments</Label>
                <span className="text-[0.74rem] tabular-nums text-ink-muted">{apptRows.length}</span>
              </div>
              <RowPanel>
                {apptRows.map(b => {
                  const rel = relativeDate(b.date);
                  const bridal = isBridalService(b.service);
                  return (
                    <button key={b.id} type="button" onClick={() => onOpenBooking?.(b)}
                      className={cx(historyRow, bridal ? 'bg-rose-wash hover:bg-rose-soft/20 active:bg-rose-soft/25' : 'hover:bg-canvas/60 active:bg-canvas')}>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="min-w-0 truncate text-[0.88rem] font-semibold text-ink">{b.service || 'Appointment'}</span>
                          {bridal && <Tag className="bg-rose/10 text-rose">Bridal</Tag>}
                          {b.source === 'booksy' && <Tag title="Imported from Booksy">Booksy</Tag>}
                        </span>
                        <span className="mt-0.5 block text-[0.76rem] tabular-nums text-ink-muted">
                          {rel.label}{b.time ? ` · ${b.time}` : ''}
                        </span>
                      </span>
                      <StatusBadge status={b.status} />
                      <RowChevron />
                    </button>
                  );
                })}
              </RowPanel>
            </section>
          )}

          {/* Classes */}
          {classRows.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-baseline gap-2">
                <Label>Makeup classes</Label>
                <span className="text-[0.74rem] tabular-nums text-ink-muted">{classRows.length}</span>
              </div>
              <RowPanel>
                {classRows.map(r => (
                  <button key={r.id} type="button" onClick={() => onOpenClassReg?.(r)}
                    className={cx(historyRow, 'hover:bg-canvas/60 active:bg-canvas')}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88rem] font-semibold text-ink">{classLabelOf(r)}</span>
                      <span className="mt-0.5 block text-[0.76rem] tabular-nums text-ink-muted">
                        {r.appointment_date ? relativeDate(r.appointment_date).label : 'No date set'}
                        {r.appointment_time ? ` · ${r.appointment_time}` : ''}
                      </span>
                    </span>
                    <span className="inline-flex h-[22px] shrink-0 items-center bg-rose/10 px-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-rose">
                      {r.status === 'enrolled' ? 'Enrolled' : r.status === 'contacted' ? 'Contacted' : 'New'}
                    </span>
                    <RowChevron />
                  </button>
                ))}
              </RowPanel>
            </section>
          )}

          {apptRows.length === 0 && classRows.length === 0 && (
            <p className="border border-line bg-paper px-5 py-10 text-center text-[0.86rem] text-ink-muted">No bookings on file yet</p>
          )}
        </div> {/* /right column */}
      </div> {/* /two-column grid */}
    </div>
  );
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
const COLUMNS = 'sm:grid-cols-[1.2fr_0.9fr_1.2fr_0.75fr]';

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

  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
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
      {/* List | Groups. Full width on a phone, so each half is an easy tap. */}
      <Segmented
        options={[
          { value: 'list', label: 'List', count: clients.length },
          { value: 'groups', label: 'Groups', count: groups.length },
        ]}
        value={view}
        onChange={setView}
        className="mb-6 w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center sm:[&>button]:min-w-[140px]"
      />

      {view === 'groups' ? (
        /* ── Groups view ── */
        <RowPanel>
          {groups.map(g => (
            <button key={g.key} type="button"
              onClick={() => { setActiveGroup(g.key); setView('list'); }}
              className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted">
                <GroupIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-[0.92rem] font-semibold text-ink">{g.label}</span>
                  <span className="text-[0.8rem] tabular-nums text-ink-muted">{g.count}</span>
                </span>
                <span className="mt-0.5 block text-[0.76rem] leading-snug text-ink-muted">{g.desc}</span>
              </span>
              <RowChevron />
            </button>
          ))}
        </RowPanel>
      ) : (
        /* ── List view ── */
        <>
          <SearchLine value={search} onChange={setSearch} placeholder="Search clients" className="mb-4" />

          {/* The smart group you came in through, and the way back out of it. */}
          {activeGroup !== 'all' && (
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded border border-line-strong bg-paper pl-3 pr-1 text-[0.8rem] font-medium text-ink">
                {group.label}
                <span className="tabular-nums text-ink-muted">{visible.length}</span>
                <button type="button" onClick={() => setActiveGroup('all')} aria-label="Show all clients"
                  className="press ml-0.5 flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-canvas hover:text-ink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </span>
            </div>
          )}

          {visible.length === 0 ? (
            <p className="py-16 text-center text-[0.86rem] text-ink-muted">
              {q ? `No clients match "${search}"` : 'No clients in this group yet'}
            </p>
          ) : (
            <div className="flex gap-1.5">
              {/* Rows, in one panel. Each letter is a quiet strip across it. */}
              <div className="min-w-0 flex-1 self-start border border-line bg-paper">
                {/* Column heads, laptop only */}
                <div className="hidden items-center gap-3.5 border-b border-line px-5 py-2.5 sm:flex">
                  <span className="w-10 shrink-0" />
                  <span className={cx('grid min-w-0 flex-1 gap-4', COLUMNS)}>
                    {['Client', 'Phone', 'Email', 'Next visit'].map(h => (
                      <span key={h} className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{h}</span>
                    ))}
                  </span>
                  <span className="w-3.5 shrink-0" />
                </div>
                {sections.map(([letter, list], si) => (
                  <div key={letter} ref={el => { letterRefs.current[letter] = el; }} className={cx(si > 0 && 'border-t border-line')}>
                    <p className="border-b border-line bg-canvas/50 px-4 py-1.5 text-[0.68rem] font-semibold tracking-[0.1em] text-ink-muted sm:px-5">{letter}</p>
                    <div className="divide-y divide-line">
                      {list.map(c => {
                        const nextRel = c.nextDate ? relativeDate(c.nextDate) : null;
                        const lastRel = c.lastDate ? relativeDate(c.lastDate) : null;
                        return (
                          <button key={c.key} type="button" onClick={() => setSelectedKey(c.key)}
                            className="group flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:px-5">
                            <Avatar name={c.name} />
                            <span className={cx('grid min-w-0 flex-1 grid-cols-1 sm:items-center sm:gap-4', COLUMNS)}>
                              <span className="min-w-0">
                                <span className="block break-words text-[0.9rem] font-semibold text-ink sm:truncate">{c.name}</span>
                                <span className="mt-0.5 block truncate text-[0.76rem] tabular-nums text-ink-muted sm:hidden">
                                  {formatPhone(c.phone) || c.email || 'No contact info'}
                                </span>
                              </span>
                              <span className="hidden truncate text-[0.8rem] tabular-nums text-ink-soft sm:block">
                                {formatPhone(c.phone) || '–'}
                              </span>
                              <span className="hidden truncate text-[0.8rem] text-ink-soft sm:block">
                                {c.email || '–'}
                              </span>
                              <span className={cx('hidden truncate text-[0.8rem] tabular-nums sm:block', nextRel ? 'font-medium text-ink' : 'text-ink-muted')}>
                                {nextRel ? nextRel.label : lastRel ? `Last ${lastRel.label}` : '–'}
                              </span>
                            </span>
                            {c.upcomingCount > 0 && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-rose-soft sm:hidden" title="Has an upcoming appointment" />
                            )}
                            <RowChevron className="hidden sm:block" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* A-Z jump rail */}
              <div className="sticky top-[76px] shrink-0 self-start">
                <div className="flex flex-col items-center">
                  {LETTERS.filter(l => l !== '#' || presentLetters.has('#')).map(l => {
                    const has = presentLetters.has(l);
                    return (
                      <button key={l} type="button" onClick={() => has && jumpTo(l)} disabled={!has}
                        className={cx('w-5 text-center text-[0.6rem] font-semibold leading-[15px] transition-colors', has ? 'text-ink-muted hover:text-ink' : 'cursor-default text-line-strong')}>
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
