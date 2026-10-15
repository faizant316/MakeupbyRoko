'use client';
// The top of Home: the greeting, a row of chips that say what is waiting, and
// the next appointment with a countdown to it. The one place in the dashboard
// that is allowed to be a little theatrical, because it is the first thing
// Roko sees and the question she opens it to answer: what's next, and is it
// ready.

import { useEffect, useRef, useState } from 'react';
import { isBridalService } from './statusColors';
import { isBookingUnseen } from './bookingSeen';
import { isDepositUnseen } from './depositState';
import { bookingOccasion } from './bookingNotes';
import { localDateKey } from './todayItems';
import { timeToMinutes } from './timeline';
import { displayLocation, isStudioLocation } from '@/lib/location';
import { phoneHref } from '@/lib/phone';
import { scrollToTarget } from '@/lib/lenis';
import { cx } from './ui';

// ---- greeting ------------------------------------------------------------------------

// Plays the first time the dashboard opens, not every time she comes back to Home.
let greeted = false;

function Kinetic({ text }) {
  const [play] = useState(() => !greeted);
  useEffect(() => { greeted = true; }, []);
  if (!play) return text;
  return text.split(' ').map((w, i, all) => (
    <span key={i}>
      <span className="kin"><span style={{ '--i': i }}>{w}</span></span>
      {i < all.length - 1 ? ' ' : null}
    </span>
  ));
}

const partOfDay = (h) => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');

// ---- time ----------------------------------------------------------------------------

const DAY = 864e5;

// "12:00 PM – 2:00 PM" (or a single "10:00 AM") as minutes since midnight. A
// single time is given two hours, the length of most of her appointments.
function window_(time) {
  if (!time) return null;
  const [a, b] = String(time).split(/\s*[–—-]\s*/);
  const start = timeToMinutes(a);
  if (start === 9999) return null;
  const end = b ? timeToMinutes(b) : 9999;
  return { start, end: end === 9999 || end <= start ? start + 120 : end };
}

const at = (dateKey, minutes) => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setMinutes(minutes);
  return d.getTime();
};

// The next appointment that hasn't finished yet, soonest first. Consultations
// and classes stay in the list below; this is the job she gets ready for.
export function nextAppointment(bookings, now = Date.now()) {
  const today = localDateKey(new Date(now));
  return (bookings || [])
    .filter(b => b.date && b.date >= today && ['pending', 'confirmed'].includes(b.status || 'pending'))
    .map(b => {
      const w = window_(b.time);
      return {
        b,
        timed: !!w,
        start: w ? at(b.date, w.start) : at(b.date, 0),
        end: w ? at(b.date, w.end) : at(b.date, 24 * 60),
      };
    })
    .filter(x => x.end > now)
    .sort((x, y) => x.start - y.start)[0] || null;
}

// Ticks once a second while the card is on screen and the tab is visible, and
// not at all otherwise. The light under the card stops drifting with it.
function useNow(ref) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id = 0;
    let seen = true;
    const tick = () => setNow(Date.now());
    const run = () => {
      clearInterval(id);
      const on = seen && !document.hidden;
      ref.current?.setAttribute('data-still', on ? 'false' : 'true');
      if (on) { tick(); id = setInterval(tick, 1000); }
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); });
    if (ref.current) io.observe(ref.current);
    document.addEventListener('visibilitychange', run);
    run();
    return () => {
      clearInterval(id);
      io.disconnect();
      document.removeEventListener('visibilitychange', run);
    };
  }, [ref]);
  return now;
}

const split = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

// ---- rolling digits ---------------------------------------------------------------------

// One digit as a column of 0 to 9 behind a window one digit tall. A change
// slides the column to the new number, the way an iPhone timer rolls.
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function Roll({ d }) {
  return (
    <span aria-hidden className="relative inline-block h-[1.15em] w-[0.62em] overflow-hidden">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(-${Number(d) * 10}%)` }}
      >
        {DIGITS.map(n => <span key={n} className="flex h-[1.15em] items-center justify-center">{n}</span>)}
      </span>
    </span>
  );
}

function RollNumber({ value, pad = 2, className }) {
  const s = String(Math.max(0, value)).padStart(pad, '0');
  return (
    <span className={cx('inline-flex tabular-nums', className)}>
      {s.split('').map((d, i) => <Roll key={s.length - i} d={d} />)}
    </span>
  );
}

// ---- the chips ----------------------------------------------------------------------------

const CHIP_TONE = {
  ink: 'border-line-strong text-ink',
  confirmed: 'border-tone-confirmed/30 text-tone-confirmed',
  pending: 'border-tone-pending/30 text-tone-pending',
};
const DOT_TONE = { ink: 'bg-ink', confirmed: 'bg-tone-confirmed', pending: 'bg-tone-pending' };

// Scroll to whichever copy of a section is showing (the rail renders in one
// place on a phone and another on a laptop).
function goTo(selector) {
  const el = [...document.querySelectorAll(selector)].find(n => n.offsetParent !== null);
  if (el) scrollToTarget(el, { offset: -72 });
}

function Pulse({ chips }) {
  if (!chips.length) {
    return (
      <p className="rise-in inline-flex h-9 items-center gap-2 border border-line-strong bg-paper px-3 text-[0.8rem] font-medium text-ink-soft" style={{ '--i': 3 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
        All caught up
      </p>
    );
  }
  return (
    // Scrolls sideways on a phone instead of wrapping into a paragraph, and
    // fades at the right edge to say there is more that way.
    <ul className="no-bar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,#000_86%,transparent)] sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]">
      {chips.map((c, i) => (
        <li key={c.key} className="rise-in shrink-0" style={{ '--i': i + 3 }}>
          <button
            type="button"
            onClick={c.onClick}
            className={cx('press inline-flex h-9 shrink-0 items-center gap-2 border bg-paper px-3 text-[0.8rem] font-medium tabular-nums transition-colors hover:bg-canvas', CHIP_TONE[c.tone])}
          >
            <span className={cx('h-2 w-2 shrink-0 rounded-full', DOT_TONE[c.tone], c.live && 'live-dot')} />
            {c.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---- next up ------------------------------------------------------------------------------

function ReadyCell({ label, ok, late }) {
  return (
    <li className="flex min-w-0 flex-col items-center gap-1.5 bg-[#17121a]/70 px-1 py-2.5">
      <span className={cx(
        'flex h-5 w-5 items-center justify-center rounded-full',
        ok ? 'bg-[#E9C2D0] text-[#17121a]' : late ? 'bg-[#E0675C] text-white' : 'border border-white/35',
      )}>
        {ok ? (
          <svg viewBox="0 0 12 12" className="tick h-3 w-3" aria-hidden>
            <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : late ? <span className="text-[0.7rem] font-bold leading-none">!</span> : null}
      </span>
      <span className={cx('max-w-full truncate text-[0.68rem] font-medium', ok ? 'text-white' : late ? 'text-[#FFB0A8]' : 'text-white/70')}>
        {label}
        <span className="sr-only">{ok ? ' done' : late ? ' overdue' : ' not yet'}</span>
      </span>
    </li>
  );
}

const ghostBtn = 'press inline-flex h-10 items-center gap-1.5 rounded border border-white/25 px-3.5 text-[0.8rem] font-medium text-white transition-colors hover:border-white/60';

function NextUp({ bookings, onOpen }) {
  const ref = useRef(null);
  const now = useNow(ref);
  const next = nextAppointment(bookings, now);

  // Stays dark in both themes: it is the one dark moment on the page.
  const shell = 'relative overflow-hidden border border-transparent bg-[#17121a] text-white [.admin-dark_&]:border-white/10';

  if (!next) {
    return (
      <section ref={ref} className={cx(shell, 'rise-in px-5 py-6 sm:px-7')} style={{ '--i': 2 }}>
        <div aria-hidden className="mesh"><i /><i /><i /></div>
        <div className="relative">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/70">Next up</p>
          <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.02em]">Nothing booked ahead</p>
          <p className="mt-1 text-[0.86rem] text-white/70">New bookings land in Recent bookings below.</p>
        </div>
      </section>
    );
  }

  const { b, timed, start, end } = next;
  const live = timed && now >= start;
  const left = split((live ? end : start) - now);
  const todayKey = localDateKey(new Date(now));
  const tomorrowKey = localDateKey(new Date(now + DAY));
  const daysAway = Math.round((new Date(`${b.date}T00:00:00`) - new Date(`${todayKey}T00:00:00`)) / DAY);
  const pct = live ? Math.min(100, ((now - start) / (end - start)) * 100) : 0;

  const dateLabel = new Date(`${b.date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(new Date(`${b.date}T00:00:00`).getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}),
  });
  const eyebrow = live ? 'Happening now'
    : b.date === todayKey ? 'Today'
    : b.date === tomorrowKey ? 'Tomorrow'
    : `Next up · ${dateLabel}`;

  // What a booking needs before the day. Booksy keeps its own deposit and
  // agreement, so those two only count for bookings made here. A bride also
  // needs her consultation. Anything still missing inside a week turns red.
  const bridal = isBridalService(b.service);
  const booksy = b.source === 'booksy';
  const soon = daysAway <= 7;
  const checks = [
    { key: 'time', label: 'Time', ok: !!b.time },
    { key: 'confirmed', label: 'Confirmed', ok: b.status === 'confirmed' },
    ...(booksy ? [] : [
      { key: 'deposit', label: 'Deposit', ok: !!b.deposit_received },
      { key: 'contract', label: 'Contract', ok: !!(b.contract_signed_at || b.contract_signed) },
    ]),
    ...(bridal ? [{ key: 'consult', label: 'Consult', ok: !!b.consultation_date }] : []),
  ];
  const ready = checks.every(c => c.ok);

  const units = !timed
    ? [[left.d, left.d === 1 ? 'day' : 'days']]
    : live
      ? [[left.h, 'hrs'], [left.m, 'min'], [left.s, 'sec']]
      : left.d > 0
        ? [[left.d, left.d === 1 ? 'day' : 'days'], [left.h, 'hrs'], [left.m, 'min'], [left.s, 'sec']]
        : [[left.h, 'hrs'], [left.m, 'min'], [left.s, 'sec']];

  const occasion = bookingOccasion(b.notes);
  const place = displayLocation(b.location) || b.location_city || '';
  const travelling = place && !isStudioLocation(b.location);
  const first = (b.name || '').trim().split(/\s+/)[0] || 'client';

  return (
    <section ref={ref} aria-label="Next appointment" className={cx(shell, 'rise-in')} style={{ '--i': 2 }}>
      <div aria-hidden className="mesh"><i /><i /><i /></div>

      <div className="relative px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/75">
              {(live || b.date === todayKey) && <span className={cx('live-dot h-2 w-2 rounded-full', live ? 'bg-[#E0675C]' : 'bg-[#E9C2D0]')} />}
              {eyebrow}
            </p>
            <p className="text-[0.76rem] tabular-nums text-white/70 lg:hidden">{b.time || 'No time set'}</p>
          </div>

          <button type="button" onClick={() => onOpen(b)} className="group mt-3 block text-left">
            <h2 className="text-balance text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[1.8rem]">
              {b.name || 'Client'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 inline h-5 w-5 -translate-y-px text-white/50 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </h2>
            <p className="mt-1 text-[0.86rem] text-white/70">
              {[b.service, occasion].filter(Boolean).join(' · ')}
            </p>
            {place && (
              <p className="mt-0.5 truncate text-[0.82rem] text-white/55">{place}</p>
            )}
          </button>

          {/* The countdown. Read out once for a screen reader, as a sentence,
              rather than as a string of tiles changing every second. */}
          <div className="mt-5 flex items-end gap-2 sm:gap-2.5">
            <p className="sr-only">
              {live ? `Ends in ${left.h} hours and ${left.m} minutes`
                : `Starts in ${left.d ? `${left.d} days, ` : ''}${left.h} hours and ${left.m} minutes`}
            </p>
            {units.map(([v, label], i) => (
              <div key={label} className={cx(
                'flex min-w-[3.6rem] flex-col items-center bg-white/[0.07] px-2 pb-2 pt-2.5 ring-1 ring-inset ring-white/10 sm:min-w-[4.2rem] sm:px-3',
                i === units.length - 1 && units.length > 3 && 'max-[360px]:hidden',
              )}>
                <RollNumber value={v} pad={label.startsWith('day') && v > 99 ? 3 : 2} className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em] sm:text-[2.1rem]" />
                <span className="mt-1.5 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-white/70">{label}</span>
              </div>
            ))}
            <p className="mb-1 ml-auto hidden max-w-[9rem] text-right text-[0.8rem] leading-snug text-white/75 sm:block lg:hidden">
              {!timed ? 'away. No time set yet' : live ? 'until you finish' : 'until you start'}
            </p>
          </div>

          {live && (
            <div className="mt-4 h-[3px] w-full bg-white/15">
              <div className="h-full bg-[#E9C2D0] transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-end">
          <p className="hidden text-right text-[0.8rem] tabular-nums text-white/70 lg:block">
            {dateLabel} · {b.time || 'No time set'}
          </p>
          <ul
            aria-label="Ready for the day"
            className="mt-5 grid gap-px overflow-hidden bg-white/10 lg:mt-auto"
            style={{ gridTemplateColumns: `repeat(${checks.length}, minmax(0, 1fr))` }}
          >
            {checks.map(c => <ReadyCell key={c.key} label={c.label} ok={c.ok} late={!c.ok && soon} />)}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(b)}
              className="press inline-flex h-10 items-center gap-1.5 rounded bg-white px-4 text-[0.8rem] font-semibold text-[#17121a] transition-colors hover:bg-white/90"
            >
              {ready ? 'Open card' : 'Get it ready'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
            </button>
            {b.phone && (
              <a href={`tel:${phoneHref(b.phone)}`} aria-label={`Call ${first}`} className={ghostBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call {first}
              </a>
            )}
            {travelling && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`} target="_blank" rel="noopener noreferrer" className={ghostBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="2.6" />
                </svg>
                Directions
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- the whole top -----------------------------------------------------------------------

export default function HomeTop({ bookings, onOpen, onAddClient, onShowPending }) {
  const now = new Date();
  const greeting = `Good ${partOfDay(now.getHours())}, Roqia`;
  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // What is waiting, each one a tap from the thing it counts. Only what asks
  // something of her; a quiet day says so.
  const live = (bookings || []).filter(b => b.status !== 'cancelled' && b.status !== 'completed');
  const unseen = live.filter(isBookingUnseen).length;
  const deposits = (bookings || []).filter(isDepositUnseen).length;
  const toConfirm = live.filter(b => (b.status || 'pending') === 'pending' && (b.date || b.consultation_date)).length;
  const noTime = live.filter(b => !b.time && b.date).length;
  const chips = [
    unseen > 0 && { key: 'new', tone: 'ink', live: true, label: `${unseen} new ${unseen === 1 ? 'booking' : 'bookings'}`, onClick: () => goTo('[data-rail]') },
    deposits > 0 && { key: 'deposit', tone: 'confirmed', label: `${deposits} ${deposits === 1 ? 'deposit' : 'deposits'} in`, onClick: () => goTo('#bookings-list') },
    toConfirm > 0 && { key: 'confirm', tone: 'pending', label: `${toConfirm} to confirm`, onClick: () => { onShowPending?.(); goTo('#bookings-list'); } },
    noTime > 0 && { key: 'time', tone: 'pending', label: `${noTime} ${noTime === 1 ? 'needs' : 'need'} a time`, onClick: () => goTo('[data-rail]') },
  ].filter(Boolean);

  return (
    <div className="mb-7 sm:mb-9">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 data-bar-title="Home" className="text-[clamp(1.95rem,4.4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.028em] text-ink">
            <Kinetic text={greeting} />
          </h1>
          <p className="rise-in mt-2 text-[0.92rem] text-ink-muted" style={{ '--i': 2 }}>{date}</p>
        </div>
        {onAddClient && (
          <button
            type="button"
            onClick={onAddClient}
            className="press hidden h-11 shrink-0 items-center gap-2 rounded bg-ink px-5 text-[0.86rem] font-medium text-paper transition-colors hover:bg-ink/85 sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            Add client
          </button>
        )}
      </div>

      <div className="mt-5">
        <Pulse chips={chips} />
      </div>

      <div className="mt-6">
        <NextUp bookings={bookings} onOpen={onOpen} />
      </div>
    </div>
  );
}
