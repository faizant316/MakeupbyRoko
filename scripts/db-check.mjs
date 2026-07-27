// Does the live database still accept what the live forms actually send?
//
//   npm run db:check
//
// This exists because of one specific bug, twice. A question gets dropped from
// a form, the matching column stays NOT NULL in Postgres, and from that moment
// every submission is rejected with 23502. Nothing looks wrong: the booking
// saves in its own request, both emails render from the in-memory form object
// rather than the saved row, and the admin card just renders less. The gap only
// surfaces days later when someone opens a client card and finds it empty.
//
// So the rule this enforces is simple, and it's the one that was broken:
//
//   A column the form does not GUARANTEE to send must be nullable.
//
// Anything NOT NULL that the API doesn't promise on every insert is a landmine
// waiting for the next form edit. Run this after touching a public form, an
// insert route, or a migration. Exits non-zero so it can gate a deploy.
import { readFileSync, readdirSync } from 'node:fs';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* env may already be in the environment */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Postgres fills these itself; a form is never expected to send them.
const DB_MANAGED = ['id', 'created_at'];

// What each insert path PROMISES to send on every single row, verified against
// the route. A promise means the route either validates it (rejecting the
// request when it's absent) or substitutes a value of its own. Anything not
// listed here is optional as far as the app is concerned, so the column has to
// be nullable. Add to a list only after making the route actually guarantee it.
const CONTRACT = {
  bridal_inquiries: {
    route: 'app/api/bridal-inquiries/route.js',
    written_by: 'public bridal inquiry + trial forms',
    // The route 400s without these two, and coerces every other answer to ''.
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
    // count as guaranteed even though the client may leave them out.
    always: ['name', 'message', 'rating', 'highlights'],
  },
};

const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) {
  console.error(`Could not read the live schema (HTTP ${res.status})`);
  process.exit(1);
}
const spec = await res.json();

let failed = 0;
console.log(`\nChecking ${new URL(url).hostname.split('.')[0]}\n`);

for (const [table, { route, written_by, always }] of Object.entries(CONTRACT)) {
  const def = spec.definitions?.[table];
  if (!def) {
    console.log(`  FAIL  ${table}  table is not exposed by the API`);
    failed++;
    continue;
  }
  // PostgREST lists a column as `required` exactly when it is NOT NULL with no
  // default, which is precisely the set that can reject an insert.
  const required = (def.required || []).filter(c => !DB_MANAGED.includes(c));
  const unpromised = required.filter(c => !always.includes(c));

  if (unpromised.length) {
    failed++;
    console.log(`  FAIL  ${table}`);
    console.log(`        NOT NULL, but ${route} does not always send: ${unpromised.join(', ')}`);
    console.log(`        Written by: ${written_by}`);
    console.log(`        Fix: drop the NOT NULL in a migration, or make the route guarantee it.\n`);
  } else {
    console.log(`  ok    ${table}  (requires ${required.join(', ') || 'nothing beyond defaults'})`);
  }

  // The other direction: a promise the table no longer has a column for. Means
  // the route is writing a field that will be silently rejected.
  const columns = Object.keys(def.properties || {});
  const ghosts = always.filter(c => !columns.includes(c));
  if (ghosts.length) {
    failed++;
    console.log(`  FAIL  ${table}  route sends columns the table doesn't have: ${ghosts.join(', ')}`);
  }
}

// Migration files are only half the story: 0006 sat in this folder for weeks
// while the column it adds did not exist in the live database. List them so the
// count can be eyeballed against the applied ledger.
const migrations = readdirSync(new URL('../supabase/migrations', import.meta.url))
  .filter(f => f.endsWith('.sql')).sort();
console.log(`\n  ${migrations.length} migration files, latest: ${migrations.at(-1)}`);
console.log('  Run `npm run db:push` to apply anything the live database is missing.');

console.log(failed ? `\n${failed} problem(s) found.\n` : '\nAll insert paths match the live schema.\n');
process.exit(failed ? 1 : 0);
