// One source of truth for where a booking's deposit stands, so the list row,
// the alert bar and the client card can never disagree with each other.
//
// Three facts, each answering a different question (migrations 0009 + 0010):
//   zelle_uploaded_at  the client sent proof
//   deposit_received   the money is in (set automatically by the upload)
//   deposit_seen_at    Roko has laid eyes on it
//
// There is no confirm step. Her bank already tells her a Zelle landed, so
// asking her to agree with the screenshot was re-entering something she knew.
// What the alert needs isn't a decision, it's an acknowledgment, and opening
// the client card is acknowledgment enough.

export const DEPOSIT_INK = {
  // Money just arrived and she hasn't looked yet. The only attention-worthy one.
  new:     { key: '#2563EB', light: { fg: '#1D4ED8', bg: 'rgba(37,99,235,0.10)',  line: '#D7E2F7' },
                             dark:  { fg: '#93B4F7', bg: 'rgba(59,130,246,0.16)', line: '#33415C' } },
  // Nothing sent yet.
  waiting: { key: '#F59E0B', light: { fg: '#A9660B', bg: 'rgba(245,158,11,0.12)', line: '#F0E0C4' },
                             dark:  { fg: '#F5B83C', bg: 'rgba(245,158,11,0.16)', line: '#4A3D24' } },
  // Settled history. Deliberately quiet so it doesn't read as a task.
  in:      { key: '#64748B', light: { fg: '#64748B', bg: 'rgba(100,116,139,0.10)', line: '#E2E5EA' },
                             dark:  { fg: '#A7B2C4', bg: 'rgba(148,163,184,0.14)', line: '#3A414D' } },
};

export function depositTone(kind, dm) {
  const set = DEPOSIT_INK[kind] || DEPOSIT_INK.in;
  return { key: set.key, ...(dm ? set.dark : set.light) };
}

// "just now" / "20m ago" / "3h ago" / "2 days ago". Coarse past a day on
// purpose: it matters that it was Tuesday, not that it was 51 hours.
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

// The alert condition. Compared by timestamp rather than presence: a card she
// happened to open on Monday must not swallow a deposit that landed Wednesday,
// which would silence exactly the clients she's most involved with.
//
// Only client uploads alert. A deposit she marked herself needs no telling.
export function isDepositUnseen(b) {
  if (!b || !b.deposit_received || !b.zelle_uploaded_at) return false;
  if (b.status === 'cancelled') return false;
  if (!b.deposit_seen_at) return true;
  return new Date(b.deposit_seen_at) < new Date(b.zelle_uploaded_at);
}

// Booked, still upcoming, nothing sent. The money that hasn't shown up.
export function isAwaitingDeposit(b) {
  if (!trackable(b) || b.deposit_received) return false;
  return !b.zelle_uploaded_at && !b.zelle_screenshot;
}

// The single line a row shows about its deposit. `kind` drives the color.
export function depositState(b) {
  if (!b) return { kind: 'none', label: '' };

  if (isDepositUnseen(b)) {
    return {
      kind: 'new',
      at: b.zelle_uploaded_at,
      label: `Deposit received, ${timeAgo(b.zelle_uploaded_at)}`,
    };
  }

  if (b.deposit_received) {
    // Prefer when the money actually landed over when the flag was set; they're
    // the same for uploads and only differ when she marked it by hand.
    const at = b.zelle_uploaded_at || b.deposit_confirmed_at;
    return {
      kind: 'in',
      at,
      // Older rows have no timestamp at all; say less rather than invent a date.
      label: at ? `Deposit received ${shortDate(at)}` : 'Deposit received',
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

  // Screenshot on file but she's marked it not received: something was wrong
  // with it. Reuses the waiting tone because that's what it means in practice.
  if (b.zelle_screenshot || b.zelle_uploaded_at) {
    return { kind: 'waiting', label: 'Screenshot on file, marked not received' };
  }

  return { kind: 'none', label: '' };
}
