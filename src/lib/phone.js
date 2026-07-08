// Phone number formatting — one source of truth for the whole site.
// Display + as-you-type both use formatPhone(); it is progressive (handles a
// half-typed number) and idempotent (re-formatting an already-formatted value
// is a no-op), so it is safe to run on every keystroke and on stored values.
//
// Output shape: (xxx) xxx-xxxx  e.g. (916) 559-0506
// No browser globals in here — email.js imports it server-side too.

// Strip to at most 10 significant digits, dropping a leading US country code.
export function phoneDigits(value) {
  let d = String(value ?? '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d.slice(0, 10);
}

// Format any phone-like string to (xxx)xxx-xxxx. Partial input formats as far
// as it can so typing feels natural.
export function formatPhone(value) {
  const d = phoneDigits(value);
  if (!d) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// Bare digits for tel:/sms: hrefs so the dialer always gets a clean target.
export function phoneHref(value) {
  return phoneDigits(value);
}
