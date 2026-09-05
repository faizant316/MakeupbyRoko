import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// How far the venue a bride is typing sits from the studio, in driving minutes.
//
// Two things make this fiddly, and react-query handles both: she types, so the
// lookup has to be debounced rather than fired per keystroke; and she edits, so
// an older in-flight answer must never land on top of a newer venue. Keying the
// query by the settled venue string means a stale response can only ever resolve
// into its own cache entry, never into the one on screen. A venue's drive time
// does not change, so results are cached for the life of the sheet and going
// back to a previous venue costs nothing.
//
// `enabled` is the caller's job: there is no travel to measure when the bride is
// coming to the studio, and an out-of-state wedding is quoted per trip rather
// than by the hour rule.

const DEBOUNCE_MS = 600;
// Below this a query is still mid-word ("nap", "the "). Measuring it wastes a
// call and, worse, briefly reports a confident distance for the wrong place.
const MIN_QUERY = 4;
// Past this the answer is not worth waiting for. She is held at Review & Sign
// while a lookup is in flight, so an unbounded wait is a locked form.
const TIMEOUT_MS = 8000;

/**
 * Returns a single `status` rather than a set of booleans the caller has to
 * reassemble, because the states are genuinely exclusive and one of them is easy
 * to lose: while she is still typing there is a venue on screen and no verdict
 * yet. Reporting that as "not far away" would open the gate for the 600ms of
 * debounce plus however long Google takes, which is exactly long enough to tap
 * the button underneath it.
 *
 *   'idle'         nothing to measure (disabled, or too few characters typed)
 *   'checking'     a venue is on screen and we do not have its answer yet
 *   'measured'     `minutes` is real
 *   'unmeasurable' Google answered and could not place it
 */
export function useTravelDistance(destination, { enabled = true } = {}) {
  const [settled, setSettled] = useState('');
  const typed = (destination || '').trim();

  useEffect(() => {
    if (typed.length < MIN_QUERY) { setSettled(''); return; }
    const t = setTimeout(() => setSettled(typed), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [typed]);

  const { data, isError } = useQuery({
    queryKey: ['travel-distance', settled],
    // Never rejects. A thrown query would leave `data` undefined forever, and
    // undefined is the same shape as "still checking", which is what the form
    // blocks Review & Sign on. A dead network would then lock a bride out of
    // her own booking, which is the precise outcome this feature must not have.
    queryFn: async () => {
      // The route has no timeout of its own, so a hung Google connection would
      // otherwise hold the query open indefinitely.
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
      try {
        const res = await fetch('/api/travel-distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: settled }),
          signal: abort.signal,
        });
        if (!res.ok) return { ok: false, reason: `HTTP_${res.status}` };
        return await res.json();
      } catch {
        return { ok: false, reason: 'UNREACHABLE' };
      } finally {
        clearTimeout(timer);
      }
    },
    enabled: enabled && settled.length >= MIN_QUERY,
    // A venue does not move, and this is free-flow time rather than live
    // traffic, so there is never a reason to ask twice.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const watching = enabled && typed.length >= MIN_QUERY;
  // `data` belongs to `settled`. Only trust it once the debounce has caught up
  // with what is actually in the field.
  const current = watching && settled === typed ? data : null;

  const status = !watching ? 'idle'
    // Belt and braces: queryFn swallows its own failures, so isError should be
    // unreachable. If react-query ever surfaces one anyway, it resolves to the
    // fallback rather than to a permanent "checking".
    : isError ? 'unmeasurable'
    : !current ? 'checking'
    : current.ok ? 'measured'
    : 'unmeasurable';

  return {
    status,
    minutes: status === 'measured' ? current.minutes : null,
    miles: status === 'measured' ? current.miles : null,
    // The address Google actually matched the typed venue to. The caller uses it
    // to tell a local venue from a destination one, since the form does not ask
    // about out-of-state until further down the page.
    matched: status === 'measured' ? current.matched : null,
  };
}
