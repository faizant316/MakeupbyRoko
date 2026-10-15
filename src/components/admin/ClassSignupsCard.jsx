import { useMemo } from 'react';
import { classesOfReg } from '@/lib/classCatalog';
import { relativeDate } from './timeline';
import StatusBadge from './StatusBadge';
import { cx } from './ui';

// The date a class actually sits on: the confirmed appointment date, else (in
// person only) the client's chosen Wednesday. Mirrors the Class Sign-Ups page.
function classDate(reg) {
  return reg.appointment_date || (reg.class_format === 'in_person' ? reg.preferred_date : null);
}

// Home overview card for class sign-ups: the breakdown (Pending / Confirmed /
// Enrolled) and a real "just signed up" list, so it's obvious who registered
// and when, at a glance. One square panel on hairlines, the rows drawn the way
// Recent bookings draws its own.

const FORMAT_SHORT = { online: 'Online', in_person: 'In Person' };

const STATUS_META = {
  pending:   { dot: 'bg-tone-pending',   label: 'Pending'   },
  confirmed: { dot: 'bg-tone-confirmed', label: 'Confirmed' },
  enrolled:  { dot: 'bg-tone-confirmed', label: 'Enrolled'  },
};

// Where the class sits relative to today, in the same tones the appointment
// rows use for their dates.
const DATE_TONE = { accent: 'text-rose', past: 'text-tone-alert', muted: 'text-ink-muted/70' };

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function classLabelOf(reg) {
  const cls = classesOfReg(reg);
  const label = cls.length ? cls.map(c => c.title.replace('Makeup ', '')).join(' · ') : 'Makeup Class';
  const fmt = FORMAT_SHORT[reg.class_format];
  return fmt ? `${fmt} · ${label}` : label;
}

// eslint-disable-next-line no-unused-vars
export default function ClassSignupsCard({ classRegs = [], onOpenAll, onOpenReg, darkMode: dm }) {
  const counts = useMemo(() => ({
    pending:   classRegs.filter(r => (r.status || 'pending') === 'pending').length,
    confirmed: classRegs.filter(r => r.status === 'confirmed').length,
    enrolled:  classRegs.filter(r => r.status === 'enrolled').length,
  }), [classRegs]);

  const recent = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return classRegs
      .filter(r => r.created_date && new Date(r.created_date).getTime() > dayAgo)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [classRegs]);

  return (
    <section className="mb-8 w-full rounded-card border border-line bg-paper">
      {/* Header: opens the full Class Sign-Ups tab */}
      <button
        type="button"
        onClick={onOpenAll}
        className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-canvas/50 sm:px-5"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.98rem] font-semibold tracking-[-0.01em] text-ink">Class sign-ups</span>
          <span className="mt-1 block text-[0.76rem] tabular-nums text-ink-muted">
            {classRegs.length} {classRegs.length === 1 ? 'registration' : 'registrations'}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[0.78rem] font-medium text-ink-muted transition-colors group-hover:text-ink">
          View all
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </button>

      {/* Status breakdown: three counts side by side on hairlines */}
      <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
        {['pending', 'confirmed', 'enrolled'].map(k => {
          const m = STATUS_META[k];
          return (
            <div key={k} className="px-4 py-3 sm:px-5">
              <span className={cx('block text-[1.35rem] font-semibold leading-none tracking-[-0.02em] tabular-nums', counts[k] > 0 ? 'text-ink' : 'text-ink-muted/60')}>
                {counts[k]}
              </span>
              <span className="mt-2 flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', m.dot)} />
                {m.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Just signed up: registrations from the last 24 hours, each opens the reg */}
      {recent.length > 0 && (
        <div className="border-t border-line">
          <div className="flex items-center gap-2 px-4 pb-2 pt-3 sm:px-5">
            <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-rose">Just signed up</span>
          </div>
          <div className="divide-y divide-line border-t border-line">
            {recent.slice(0, 3).map(r => {
              const status = STATUS_META[r.status || 'pending'] ? (r.status || 'pending') : 'pending';
              const initial = (r.full_name || '?').trim().charAt(0).toUpperCase() || '?';
              const rel = relativeDate(classDate(r));
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onOpenReg?.(r)}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-canvas/60 active:bg-canvas sm:px-5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-wash text-[0.84rem] font-medium text-rose">
                    {initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.88rem] font-medium text-ink">{r.full_name || 'Unknown'}</span>
                    <span className="mt-0.5 block truncate text-[0.76rem] text-ink-muted">
                      {classLabelOf(r)} · {timeAgo(r.created_date)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={cx('whitespace-nowrap text-[0.74rem] font-semibold tabular-nums', DATE_TONE[rel.tone] || 'text-ink-muted')}>
                      {rel.label}
                      {r.appointment_time && <span className="font-normal text-ink-muted"> · {r.appointment_time}</span>}
                    </span>
                    <StatusBadge status={status} />
                  </span>
                </button>
              );
            })}
          </div>
          {recent.length > 3 && (
            <button
              type="button"
              onClick={onOpenAll}
              className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-[0.76rem] font-medium text-ink-soft transition-colors hover:bg-canvas/60 hover:text-ink sm:px-5"
            >
              +{recent.length - 3} more
            </button>
          )}
        </div>
      )}
    </section>
  );
}
