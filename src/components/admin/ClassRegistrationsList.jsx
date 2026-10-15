import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from './StatusBadge';
import { Archive } from './Glyphs';
import { groupByTime, relativeDate, daysUntil } from './timeline';
import { classesOfReg, regTotal } from '@/lib/classCatalog';
import { phoneHref } from '@/lib/phone';
import { Chevron, Fold, RowPanel, Segmented, Tag, cx } from './ui';

// The enrollment states a registration can show. Anything else (a legacy
// 'new' or 'contacted' row) reads as pending, the way it always has.
const ENROLLMENT_STATES = ['pending', 'confirmed', 'enrolled', 'cancelled'];
export const enrollmentKey = (status) => (ENROLLMENT_STATES.includes(status) ? status : 'pending');

// Online or in person. A quiet neutral tag in this list; the colours are for
// the detail page's format chip.
export const FORMAT_META = {
  online:    { label: 'Online',    short: 'Zoom',   color: '#2D8CFF', bg: 'rgba(45,140,255,0.1)'  },
  in_person: { label: 'In Person', short: 'Studio', color: '#8A63A8', bg: 'rgba(138,99,168,0.12)' },
};

// Where the money stands, as a small tinted chip. Rose for not paid yet (the
// same chip the appointments list uses), blue for paid, red for refunded.
export const PAYMENT_META = {
  unpaid:   { label: 'Unpaid',   cls: 'bg-rose/10 text-rose' },
  paid:     { label: 'Paid',     cls: 'bg-tone-confirmed/10 text-tone-confirmed' },
  refunded: { label: 'Refunded', cls: 'bg-tone-alert/10 text-tone-alert' },
};

function normalizePaymentStatus(raw) {
  if (!raw || raw === 'pending' || raw === 'unpaid') return 'unpaid';
  if (['paid', 'deposit_paid', 'paid_in_full'].includes(raw)) return 'paid';
  if (raw === 'refunded') return 'refunded';
  return 'unpaid';
}

// A registration is "closed" once it's been cancelled/declined or the payment
// was refunded. These are kept for the record (money trail, reporting, client
// history) but pulled out of the active timeline so the day-to-day list stays
// clean. They live in a collapsed section at the bottom instead.
function isClosedReg(reg) {
  return reg.status === 'cancelled' || reg.status === 'declined'
    || normalizePaymentStatus(reg.payment_status) === 'refunded';
}

// The date a class effectively sits on: the confirmed appointment date, else
// (in person only) the client's chosen Wednesday. One Wednesday per client, so
// an in-person sign-up's day is already fixed (there's nothing to schedule), so
// it groups by that Wednesday. An online sign-up with no appointment date is
// left null on purpose so it lands in "Needs scheduling" (it still needs a time).
function effectiveDate(reg) {
  if (reg.appointment_date) return reg.appointment_date;
  if (reg.class_format === 'in_person') return reg.preferred_date || null;
  return null;
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// The heading colour a group wears, the same scale the appointments list
// uses: rose for today, tomorrow and anything waiting on her, red for past
// due, quieter ink for the named days further out.
function groupTone(group, needsScheduling) {
  if (group.key === 'pastdue') return 'text-[0.98rem] font-semibold text-tone-alert';
  if (needsScheduling || (group.accent && group.day)) return 'text-[0.98rem] font-semibold text-rose';
  if (group.day) return 'text-[0.86rem] font-semibold text-ink-soft';
  return 'text-[0.98rem] font-semibold text-ink';
}

// Payment chips beside the status badge, the same size as it. Laptop only.
const payChip = 'hidden h-[22px] shrink-0 items-center rounded-full px-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] sm:inline-flex';

const iconLink = 'press flex h-8 w-8 items-center justify-center rounded-ctl border border-line text-ink-muted hover:border-line-strong hover:text-ink';

// One line, mirroring the appointments list. `recent` is the copy shown
// inside the Just signed up band: it swaps the redundant New tag for how long
// ago they signed up.
//
// A div, not a <button>: on a laptop the row carries email and text links of
// its own, and a link inside a button is invalid HTML.
function ClassRow({ reg, onSelect, recent = false, dimmed = false }) {
  const selectedClasses = classesOfReg(reg);
  const totalPrice = regTotal(reg);
  const classLabel = selectedClasses.length > 0 ? selectedClasses.map(c => c.title).join(' · ') : 'No classes selected';
  const fmt = FORMAT_META[reg.class_format];
  const payState = normalizePaymentStatus(reg.payment_status);
  const isRefunded = payState === 'refunded';
  const isUnpaid = payState === 'unpaid' && !reg.stripe_session_id;
  const isNew = reg.created_date && (Date.now() - new Date(reg.created_date).getTime()) < 24 * 60 * 60 * 1000;
  const rel = relativeDate(effectiveDate(reg));
  const initial = (reg.full_name || '?').trim().charAt(0).toUpperCase() || '?';
  const dateClass = rel.tone === 'accent' ? 'text-rose' : rel.tone === 'past' ? 'text-tone-alert' : 'text-ink-muted';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(reg)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(reg); } }}
      className={cx(
        'group flex w-full cursor-pointer items-center gap-3 bg-paper px-4 py-3.5 text-left outline-none transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:gap-3.5 sm:px-5',
        dimmed && 'opacity-60',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-wash text-[0.86rem] font-medium text-rose">
        {initial}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 break-words text-[0.9rem] font-semibold leading-snug text-ink">{reg.full_name || 'Unknown'}</p>
          {fmt && <Tag>{fmt.label}</Tag>}
          {isNew && !recent && <Tag className="bg-ink text-paper">New</Tag>}
        </div>
        <p className="mt-0.5 truncate text-[0.76rem] text-ink-muted">
          {classLabel}
          {totalPrice > 0 && <span className="tabular-nums">{` · $${totalPrice.toLocaleString()}`}</span>}
          {recent && reg.created_date && <span>{` · ${timeAgo(reg.created_date)}`}</span>}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        <span className={cx('whitespace-nowrap text-[0.74rem] font-semibold', dateClass)}>{rel.label}</span>
        {reg.appointment_time && (
          <span className="-mt-0.5 whitespace-nowrap text-[0.7rem] tabular-nums text-ink-muted">{reg.appointment_time}</span>
        )}
        <span className="flex items-center gap-1.5">
          {isUnpaid && <span className={cx(payChip, PAYMENT_META.unpaid.cls)}>Unpaid</span>}
          {isRefunded && <span className={cx(payChip, PAYMENT_META.refunded.cls)}>Refunded</span>}
          <StatusBadge status={enrollmentKey(reg.status || 'pending')} />
        </span>
      </div>

      {/* Reach her without opening the card. Laptop only, and only on hover,
          so a list of twenty rows isn't forty icons. */}
      <div className="hidden w-[68px] shrink-0 items-center justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 md:flex">
        {reg.email && (
          <a
            href={`mailto:${reg.email}?subject=Makeup Class with Roko`}
            onClick={e => e.stopPropagation()}
            aria-label="Email registrant"
            className={iconLink}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
            </svg>
          </a>
        )}
        {reg.phone && (
          <a
            href={`sms:${phoneHref(reg.phone)}`}
            onClick={e => e.stopPropagation()}
            aria-label="Text registrant"
            className={iconLink}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

// The heading over a group of rows: dot, title, count, and a chevron when it
// folds.
function GroupHead({ dot, title, titleClass, count, hint, open, onToggle, icon }) {
  const inner = (
    <>
      {icon}
      {dot && <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', dot)} />}
      <h3 className={titleClass}>{title}</h3>
      <span className="text-[0.74rem] tabular-nums text-ink-muted">{count}</span>
      {hint && <span className="hidden text-[0.74rem] text-ink-muted sm:inline">{hint}</span>}
      <span className="flex-1" />
      {onToggle && <Chevron open={open} className="text-ink-muted" />}
    </>
  );
  if (!onToggle) return <div className="mb-2.5 flex w-full items-center gap-2.5">{inner}</div>;
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className="mb-2.5 flex w-full items-center gap-2.5 text-left">
      {inner}
    </button>
  );
}

export default function ClassRegistrationsList({ darkMode: dm, onSelect }) {
  const { data: rawRegistrations = [], isLoading } = useQuery({
    queryKey: ['class-registrations'],
    queryFn: () => api.entities.ClassRegistration.list('-created_date', 100),
  });
  const [collapsedGroups, setCollapsedGroups] = useState({ later: true });
  const [formatFilter, setFormatFilter] = useState('all'); // all | online | in_person
  const [closedOpen, setClosedOpen] = useState(false); // cancelled/refunded fold, closed by default

  const registrations = [...rawRegistrations].sort((a, b) => {
    const aDate = a.appointment_date ? new Date(a.appointment_date) : null;
    const bDate = b.appointment_date ? new Date(b.appointment_date) : null;
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate - bDate;
  });

  // Holds the list's shape while the fetch is in flight, so nothing jumps
  // when it lands.
  if (isLoading) {
    return (
      <RowPanel aria-hidden="true">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
            <span className="h-9 w-9 shrink-0 rounded-full bg-line/50" />
            <span className="min-w-0 flex-1">
              <span className="block h-3.5 w-32 bg-line/70" />
              <span className="mt-2.5 block h-2.5 w-44 max-w-full bg-line/50" />
            </span>
          </div>
        ))}
      </RowPanel>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="rounded-card border border-line bg-paper px-5 py-16 text-center">
        <p className="text-[0.98rem] font-semibold text-ink">No class registrations yet</p>
        <p className="mt-1.5 text-[0.8rem] text-ink-muted">Registrations from the website will appear here</p>
      </div>
    );
  }

  // Format filter first, then the timeline grouping runs on what's visible.
  const visible = formatFilter === 'all'
    ? registrations
    : registrations.filter(r => r.class_format === formatFilter);

  // Split off cancelled/refunded rows: they keep their record but sit in a
  // collapsed section at the bottom rather than cluttering the live timeline.
  const active = visible.filter(r => !isClosedReg(r));
  const closed = visible
    .filter(isClosedReg)
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  // Surface the just-signed-up / not-yet-scheduled sign-ups: pull the
  // "Unscheduled" bucket to the very top and name it as the job it is, then
  // the timeline (this week, this month, later) follows beneath it.
  const timeGroups = groupByTime(active, effectiveDate);
  const orderedGroups = [
    ...timeGroups.filter(g => g.key === 'unscheduled'),
    ...timeGroups.filter(g => g.key !== 'unscheduled'),
  ];
  const unscheduledCount = active.filter(r => !effectiveDate(r)).length;
  const weekCount = active.filter(r => { const d = daysUntil(effectiveDate(r)); return d >= 0 && d <= 7; }).length;
  const countOf = (f) => registrations.filter(r => r.class_format === f).length;

  // Just signed up: registrations created in the last 24 hrs, newest first. Shown
  // at the very top so a fresh sign-up is impossible to miss, even when its
  // class date lands deep in a collapsed group like "Later".
  const recent = active
    .filter(r => r.created_date && (Date.now() - new Date(r.created_date).getTime()) < 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const stats = [
    { label: 'Needs scheduling', value: unscheduledCount, accent: unscheduledCount > 0 },
    { label: 'This week', value: weekCount },
    { label: 'Total', value: active.length },
  ];

  return (
    <div>
      {/* Where things stand, at a glance. One strip on hairlines. */}
      <div className="mb-5 grid grid-cols-3 divide-x divide-line rounded-card overflow-hidden border border-line bg-paper">
        {stats.map(s => (
          <div key={s.label} className="min-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
            <p className={cx('text-[1.45rem] font-semibold leading-none tabular-nums tracking-[-0.02em]', s.accent ? 'text-rose' : 'text-ink')}>{s.value}</p>
            <p className="mt-2 text-[0.62rem] font-semibold uppercase leading-snug tracking-[0.12em] text-ink-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <Segmented
        className="mb-6"
        value={formatFilter}
        onChange={setFormatFilter}
        options={[
          { value: 'all', label: 'All', count: registrations.length },
          { value: 'online', label: 'Online', count: countOf('online') },
          { value: 'in_person', label: 'In person', count: countOf('in_person') },
        ]}
      />

      {/* Just signed up: fresh registrations pulled to the top so they're
          impossible to miss, even when the class date sits in a folded group. */}
      {recent.length > 0 && (
        <div className="mb-7">
          <GroupHead dot="bg-rose" title="Just signed up" titleClass="text-[0.98rem] font-semibold text-rose" count={recent.length} hint="in the last 24 hours" />
          <RowPanel>
            {recent.map(reg => (
              <ClassRow key={`recent-${reg.id}`} reg={reg} onSelect={onSelect} recent />
            ))}
          </RowPanel>
        </div>
      )}

      {active.length === 0 && closed.length === 0 && (
        <p className="py-14 text-center text-[0.86rem] text-ink-muted">
          No {formatFilter === 'online' ? 'online' : 'in-person'} sign-ups yet
        </p>
      )}

      {/* Time-grouped rows */}
      <div className="flex flex-col gap-5">
        {orderedGroups.map(group => {
          const open = !collapsedGroups[group.key];
          const isNeedsScheduling = group.key === 'unscheduled';
          const dot = isNeedsScheduling || (group.accent && group.day) ? 'bg-rose'
            : group.key === 'pastdue' ? 'bg-tone-alert' : null;
          return (
            <div key={group.key}>
              <GroupHead
                dot={dot}
                title={isNeedsScheduling ? 'Needs scheduling' : group.label}
                titleClass={groupTone(group, isNeedsScheduling)}
                count={group.items.length}
                hint={isNeedsScheduling ? 'confirm to send it' : null}
                open={open}
                onToggle={() => setCollapsedGroups(p => ({ ...p, [group.key]: !p[group.key] }))}
              />
              <Fold open={open}>
                <RowPanel>
                  {group.items.map(reg => (
                    <ClassRow key={reg.id} reg={reg} onSelect={onSelect} />
                  ))}
                </RowPanel>
              </Fold>
            </div>
          );
        })}
      </div>

      {/* Cancelled & refunded: kept for the record (money trail, reporting,
          client history) but tucked into a fold that starts closed so they
          never crowd the live list. Cancelling or refunding already frees the
          Wednesday, so nothing here is holding a date. */}
      {closed.length > 0 && (
        <div className="mt-7 border-t border-line pt-6">
          <GroupHead
            icon={<Archive className="h-4 w-4 shrink-0 text-ink-muted" />}
            title="Cancelled & refunded"
            titleClass="text-[0.98rem] font-semibold text-ink-soft"
            count={closed.length}
            open={closedOpen}
            onToggle={() => setClosedOpen(o => !o)}
          />
          <Fold open={closedOpen} lazy>
            <RowPanel>
              {closed.map(reg => (
                <ClassRow key={reg.id} reg={reg} onSelect={onSelect} dimmed />
              ))}
            </RowPanel>
          </Fold>
        </div>
      )}
    </div>
  );
}
