// One source of truth for where a booking's deposit stands, so the list row,
// the alert bars and the client card can never disagree with each other.
//
// Two separate facts, deliberately kept apart (see migration 0009):
//   zelle_uploaded_at  the client sent proof
//   deposit_received   Roko looked at it and agreed
//
// The gap between them is the whole feature. A deposit that arrived but hasn't
// been confirmed is the thing worth surfacing, and confirming it is also how
// the alert clears, so there's no separate "seen" state to maintain.

export const DEPOSIT_INK = {
  arrived:   { key: '#2563EB', light: { fg: '#1D4ED8', bg: 'rgba(37,99,235,0.10)',  line: '#D7E2F7' },
                               dark:  { fg: '#93B4F7', bg: 'rgba(59,130,246,0.16)', line: '#33415C' } },
  waiting:   { key: '#F59E0B', light: { fg: '#A9660B', bg: 'rgba(245,158,11,0.12)', line: '#F0E0C4' },
                               dark:  { fg: '#F5B83C', bg: 'rgba(245,158,11,0.16)', line: '#4A3D24' } },
  confirmed: { key: '#64748B', light: { fg: '#64748B', bg: 'rgba(100,116,139,0.10)', line: '#E2E5EA' },
                               dark:  { fg: '#A7B2C4', bg: 'rgba(148,163,184,0.14)', line: '#3A414D' } },
};

export function depositTone(kind, dm) {
  const set = DEPOSIT_INK[kind] || DEPOSIT_INK.confirmed;
  return { key: set.key, ...(dm ? set.dark : set.light) };
}

// "just now" / "20m ago" / "3h ago" / "2 days ago". Deliberately coarse past a
// day: Roko cares that it was Tuesday, not that it was 51 hours.
export function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins)) return '';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

// Whole days between two instants, floored. Used for "waiting 4 days".
export function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

export function shortDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Booksy imports are historical rows with no deposit flow attached, and
// finished or cancelled work is nobody's problem anymore.
function trackable(b) {
  return !!b
    && b.source !== 'booksy'
    && b.status !== 'cancelled'
    && b.status !== 'completed';
}

// Client sent proof, Roko hasn't confirmed. The review queue.
export function isDepositArrived(b) {
  if (!b || b.deposit_received) return false;
  if (b.status === 'cancelled') return false;
  // zelle_screenshot alone covers rows uploaded before migration 0009 ran.
  return !!(b.zelle_uploaded_at || b.zelle_screenshot);
}

// Booked, nothing sent, still upcoming. The money that hasn't shown up.
export function isAwaitingDeposit(b) {
  if (!trackable(b) || b.deposit_received) return false;
  return !b.zelle_uploaded_at && !b.zelle_screenshot;
}

// The single line a row shows about its deposit. `kind` drives the color.
export function depositState(b) {
  if (!b) return { kind: 'none', label: '' };

  if (isDepositArrived(b)) {
    const at = b.zelle_uploaded_at;
    return {
      kind: 'arrived',
      at,
      label: at ? `Deposit received, ${timeAgo(at)}` : 'Deposit received',
    };
  }

  if (b.deposit_received) {
    const at = b.deposit_confirmed_at;
    return {
      kind: 'confirmed',
      at,
      // Older rows have no timestamp; say less rather than invent a date.
      label: at ? `Deposit confirmed ${shortDate(at)}` : 'Deposit confirmed',
    };
  }

  if (isAwaitingDeposit(b)) {
    const days = daysSince(b.created_date || b.created_at);
    return {
      kind: 'waiting',
      days,
      label: days === null ? 'Waiting on deposit'
        : days === 0 ? 'Waiting on deposit, today'
        : days === 1 ? 'Waiting on deposit, 1 day'
        : `Waiting on deposit, ${days} days`,
    };
  }

  return { kind: 'none', label: '' };
}
