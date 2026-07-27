// What each insert path promises the database, in one place.
//
// Imported by BOTH `npm run db:check` (before a deploy) and /api/health (on a
// schedule, in production). Two copies of this contract would drift, and a
// drifting check is worse than none: it reports "ok" while being wrong.
//
// The rule, learned the hard way when a NOT NULL column outlived the form
// question that fed it and six days of bridal inquiries were discarded:
//
//   A column the route does not guarantee to send must be nullable.

// Postgres fills these itself; no form is expected to send them.
export const DB_MANAGED = ['id', 'created_at'];

// `always` = what the route sends on EVERY insert, because it either validates
// the field (rejecting the request without it) or substitutes its own value.
// Only add a column here after making the route genuinely guarantee it.
export const CONTRACT = {
  bridal_inquiries: {
    route: 'app/api/bridal-inquiries/route.js',
    written_by: 'public bridal inquiry + trial forms',
    // The route 400s without these two and coerces every other answer to ''.
    always: ['bride_name', 'email'],
  },
  bookings: {
    route: 'app/api/bookings/route.js',
    written_by: 'every public booking form + admin Add Client',
    always: ['name', 'service'],
  },
  class_registrations: {
    route: 'app/api/create-class-checkout/route.js',
    written_by: 'public class checkout',
    always: ['full_name', 'email', 'phone'],
  },
  reviews: {
    route: 'app/api/reviews/route.js',
    written_by: 'public review form',
    // rating and highlights are defaulted by the route (5 and []), so they
    // count as guaranteed even when the client leaves them out.
    always: ['name', 'message', 'rating', 'highlights'],
  },
};

/**
 * Compare the contract above against the live database.
 *
 * Read-only on purpose. A synthetic probe that inserted real rows would risk
 * leaving a fake booking in Roko's dashboard if the cleanup ever failed, and
 * PostgREST reports NOT NULL-without-default columns directly, which is the
 * exact drift that caused the outage. Anything this can't see (a genuinely
 * broken query, a Stripe failure) is caught at runtime by raiseAlert instead.
 *
 * @returns {Promise<{ok: boolean, problems: Array, tables: Array}>}
 */
export async function checkSchema(url, key) {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Could not read the live schema (HTTP ${res.status})`);
  const spec = await res.json();

  const problems = [];
  const tables = [];

  for (const [table, { route, written_by, always }] of Object.entries(CONTRACT)) {
    const def = spec.definitions?.[table];
    if (!def) {
      problems.push({ table, route, written_by, issue: 'missing_table',
        detail: 'the table is not exposed by the API' });
      continue;
    }
    // PostgREST marks a column `required` exactly when it is NOT NULL with no
    // default, which is precisely the set that can reject an insert.
    const required = (def.required || []).filter(c => !DB_MANAGED.includes(c));
    const unpromised = required.filter(c => !always.includes(c));
    if (unpromised.length) {
      problems.push({ table, route, written_by, issue: 'unpromised_not_null', columns: unpromised,
        detail: `NOT NULL in the database, but ${route} does not send ${unpromised.join(', ')} on every insert. A client submission that omits it will be discarded.` });
    }
    // The other direction: the route promises a column the table doesn't have.
    const columns = Object.keys(def.properties || {});
    const ghosts = always.filter(c => !columns.includes(c));
    if (ghosts.length) {
      problems.push({ table, route, written_by, issue: 'missing_column', columns: ghosts,
        detail: `${route} writes ${ghosts.join(', ')}, which the live table has no column for. Run \`npm run db:push\`.` });
    }
    tables.push({ table, required });
  }

  return { ok: problems.length === 0, problems, tables };
}
