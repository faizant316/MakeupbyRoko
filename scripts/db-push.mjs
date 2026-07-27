// Apply every migration the live database hasn't run yet.
//
//   npm run db:push            apply pending migrations
//   npm run db:push -- --dry   list what would run, change nothing
//
// Until now migrations were applied by hand, by pasting SQL into the Supabase
// dashboard. That is how 0006 ended up sitting in supabase/migrations for a
// fortnight while the column it adds did not exist in production, and how the
// bridal inquiry form spent six days throwing every submission away. A file in
// this folder should mean "this ran", and that requires a ledger.
//
// Needs SUPABASE_ACCESS_TOKEN in .env.local: a personal access token from
//   https://supabase.com/dashboard/account/tokens
// It is the only credential that can run DDL. .env.local is gitignored; the
// token must never be committed or pasted into a chat.
import { readFileSync, readdirSync } from 'node:fs';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* env may already be in the environment */ }

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL'); process.exit(1); }
if (!token) {
  console.error('\nMissing SUPABASE_ACCESS_TOKEN.\n');
  console.error('  1. Create one at https://supabase.com/dashboard/account/tokens');
  console.error('  2. Add it to .env.local as SUPABASE_ACCESS_TOKEN=sbp_...');
  console.error('  3. Re-run. .env.local is gitignored, so it stays local.\n');
  process.exit(1);
}

const ref = new URL(url).hostname.split('.')[0];
const dryRun = process.argv.includes('--dry');

// The Management API is the one path that runs arbitrary DDL with just an
// access token (no database password, no direct Postgres connection).
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return null; }
}

console.log(`\nProject ${ref}${dryRun ? '  (dry run)' : ''}\n`);

// Our own ledger rather than supabase_migrations.schema_migrations: the CLI has
// never owned this project, and the hand-applied history predates any ledger.
await sql(`create table if not exists applied_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);`);

const rows = await sql('select version from applied_migrations;');
const applied = new Set((rows || []).map(r => r.version));

const dir = new URL('../supabase/migrations/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
const pending = files.filter(f => !applied.has(f));

if (!pending.length) {
  console.log(`  Up to date. All ${files.length} migrations applied.\n`);
  process.exit(0);
}

// A first run against a database whose history was applied by hand would try to
// re-run everything. That is safe by construction here (every migration in this
// repo is written idempotently: `add column if not exists`, `drop not null`,
// `create index if not exists`), but it should still be a deliberate choice.
if (!applied.size && files.length > 1) {
  console.log(`  No ledger yet, so all ${files.length} migrations count as pending.`);
  console.log('  Every migration in this repo is idempotent, so re-running is safe;');
  console.log('  it simply records what is already true.\n');
}

console.log(`  ${pending.length} pending:\n${pending.map(f => `    ${f}`).join('\n')}\n`);
if (dryRun) { console.log('  Dry run, nothing applied.\n'); process.exit(0); }

for (const file of pending) {
  const body = readFileSync(new URL(file, dir), 'utf8');
  process.stdout.write(`  ${file} ... `);
  try {
    await sql(body);
    await sql(`insert into applied_migrations (version) values ('${file.replace(/'/g, "''")}')
               on conflict (version) do nothing;`);
    console.log('ok');
  } catch (err) {
    // Stop at the first failure: later migrations routinely assume earlier ones
    // landed, so pressing on would turn one broken migration into several.
    console.log('FAILED');
    console.error(`\n  ${err.message}\n`);
    console.error('  Nothing after this was applied. Fix the migration and re-run.\n');
    process.exit(1);
  }
}

console.log('\n  Done. Run `npm run db:check` to confirm the forms still match.\n');
