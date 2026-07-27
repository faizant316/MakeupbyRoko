// Does the live database still accept what the live forms actually send?
//
//   npm run db:check
//
// This exists because of one specific bug. A question gets dropped from a form,
// the matching column stays NOT NULL in Postgres, and from that moment every
// submission is rejected with 23502. Nothing looks wrong: the booking saves in
// its own request, both emails render from the in-memory form object rather
// than the saved row, and the admin card just renders less. The gap surfaces
// days later when someone opens a client card and finds it empty.
//
// The rule enforced here, and by /api/health on a schedule in production:
//
//   A column the form does not GUARANTEE to send must be nullable.
//
// Run after touching a public form, an insert route, or a migration. Exits
// non-zero so it can gate a deploy. The contract itself lives in
// src/lib/schemaContract.mjs, shared with the production health check so the two
// can never drift apart.
import { readFileSync, readdirSync } from 'node:fs';
import { CONTRACT, checkSchema } from '../src/lib/schemaContract.mjs';

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

console.log(`\nChecking ${new URL(url).hostname.split('.')[0]}\n`);

let result;
try {
  result = await checkSchema(url, key);
} catch (err) {
  console.error(`  ${err.message}\n`);
  process.exit(1);
}

const byTable = new Map();
for (const p of result.problems) {
  if (!byTable.has(p.table)) byTable.set(p.table, []);
  byTable.get(p.table).push(p);
}

for (const table of Object.keys(CONTRACT)) {
  const problems = byTable.get(table);
  if (!problems) {
    const info = result.tables.find(t => t.table === table);
    console.log(`  ok    ${table}  (requires ${info?.required.join(', ') || 'nothing beyond defaults'})`);
    continue;
  }
  console.log(`  FAIL  ${table}`);
  for (const p of problems) console.log(`        ${p.detail}`);
  console.log(`        Written by: ${problems[0].written_by}`);
  console.log(`        Fix: drop the NOT NULL in a migration, or make the route guarantee it.\n`);
}

// Migration files are only half the story: 0006 sat in this folder for weeks
// while the column it adds did not exist in the live database.
const migrations = readdirSync(new URL('../supabase/migrations', import.meta.url))
  .filter(f => f.endsWith('.sql')).sort();
console.log(`\n  ${migrations.length} migration files, latest: ${migrations.at(-1)}`);
console.log('  Run `npm run db:push` to apply anything the live database is missing.');

console.log(result.ok ? '\nAll insert paths match the live schema.\n'
  : `\n${result.problems.length} problem(s) found.\n`);
process.exit(result.ok ? 0 : 1);
