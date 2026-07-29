// Backfill client addresses onto Booksy-imported bookings.
//
// WHY THIS EXISTS
//   The 2026-07-16 Booksy migration pulled names, phones, emails, services and
//   dates, but Booksy's CSV has no address column, so every travelling job came
//   across with no idea where it was. Roko travels to roughly half her work and
//   asked to see the city on the appointment list (2026-07-28).
//
// WHERE THE DATA LIVES (learned from a real capture, 2026-07-28)
//   The address is NOT on the calendar list response — only on the appointment
//   detail, under `appointment.traveling`:
//     GET /core/v2/business_api/me/businesses/<id>/appointments/<uid>/
//     → { appointment: { traveling: { address_line_1, apartment_number,
//                                     city, zipcode, price, ... } } }
//   In the Booksy UI this is the "MOBILE SERVICES" tab on an appointment.
//   The appointment uids come from the calendar endpoint, walked 28 days at a
//   time. Both need her logged-in session headers, so the input here is a HAR
//   file: Chrome DevTools -> Network -> Preserve log -> ⬇ Export HAR.
//
// TWO KINDS OF ADDRESS THAT MUST NOT BE IMPORTED
//   1. Her own studio. Booksy stamps 1301 S Durant Terrace / 95391 on
//      appointments where the CLIENT CAME TO HER. Importing those would tell
//      her she is driving to her own house (199 rows in the first pull).
//   2. Placeholders. "Online", "n/a" and one-character entries (100 rows).
//   Both are dropped, not guessed at. A blank location is honest; a wrong one
//   sends her to the wrong town.
//
//   node scripts/import-booksy-addresses.mjs booksy.com.har
//   node scripts/import-booksy-addresses.mjs booksy.com.har --apply
//
// Flags
//   --apply     write to bookings (default: dry run, writes nothing)
//   --verbose   list every match and every skip
//
// Only ever fills a BLANK location. Never overwrites an address already on a
// booking: a site booking's own address is what she is actually driving to,
// whereas Booksy history is a record of where that client was once before.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* env may already be in the environment */ }

const args = process.argv.slice(2);
const harFile = args.find(a => !a.startsWith('--')) || 'booksy.com.har';
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');
const CACHE = new URL('../.booksy-addresses.json', import.meta.url);

const BUSINESS_ID = 949167;
const API = `https://us.booksy.com/core/v2/business_api/me/businesses/${BUSINESS_ID}`;

// Her studio. Typed at least eight ways across three years ("1301 S Durant
// terrace", "1301 s durant terr", "1301 Durant Terr", "1301 s durant", and a
// "1201 s Durant" typo), so matching the full street is hopeless. The street
// NAME is the reliable signal: there is no client on a Durant anything, and
// the failure modes are not symmetric — skipping a real client costs a blank
// location, while keeping one of these tells Roko to drive to her own house.
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isStudioAddress = (a) => /durant/.test(norm(a));
const isPlaceholder = (a) => {
  const n = norm(a);
  return !n || n.length < 4 || ['online', 'na', 'none', 'tbd', 'home'].includes(n);
};

// ── session headers out of the HAR ──────────────────────────────────────────
function sessionHeaders(file) {
  let har;
  try { har = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.error(`Could not read ${file}: ${e.message}`); process.exit(1); }
  if (!har.log?.entries) {
    console.error('That is not a HAR file. Export one from DevTools -> Network -> the ⬇ button.');
    process.exit(1);
  }
  const entry = har.log.entries.find(e => /booksy\.com\/core\//.test(e.request.url));
  if (!entry) {
    console.error('No Booksy API calls in that capture. Was "Preserve log" ticked?');
    process.exit(1);
  }
  const want = ['x-api-key', 'x-fingerprint', 'x-access-token', 'accept-language', 'x-app-version', 'accept', 'user-agent'];
  const headers = {};
  for (const h of entry.request.headers) if (want.includes(h.name.toLowerCase())) headers[h.name] = h.value;
  if (!headers['X-Access-Token']) {
    console.error('No X-Access-Token in the capture — that session is not signed in.');
    process.exit(1);
  }
  return headers;
}

const pad = (n) => String(n).padStart(2, '0');
const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Every appointment uid Booksy knows about, walked a month at a time. */
async function listAppointments(headers) {
  const found = {};
  let cur = new Date(2023, 0, 1);
  const end = new Date(2027, 11, 31);
  while (cur <= end) {
    const from = new Date(cur);
    const till = new Date(cur); till.setDate(till.getDate() + 27);
    const url = `${API}/calendar?start_date=${dkey(from)}&end_date=${dkey(till > end ? end : till)}`
      + '&include_unconfirmed=true&version=3&resources_per_page=10';
    const r = await fetch(url, { headers });
    if (r.status === 401 || r.status === 403) {
      console.error('\nBooksy rejected the session — the token in that HAR has expired.');
      console.error('Re-export a fresh HAR from a logged-in tab and run this again.');
      process.exit(1);
    }
    if (r.status !== 200) { console.error(`calendar ${dkey(from)} → ${r.status}, skipping`); }
    else {
      const j = await r.json();
      for (const b of Object.values(j.bookings || {})) {
        if (b.type !== 'B') continue; // 'R' is a time reservation, not a client
        found[b.appointment_uid] = {
          uid: b.appointment_uid,
          name: b.customer?.name || '',
          phone: b.customer?.phone || '',
          date: (b.booked_from || '').slice(0, 10),
        };
      }
    }
    cur.setDate(cur.getDate() + 28);
  }
  return Object.values(found);
}

/**
 * The address for one appointment. Retries on 429: Booksy throttles hard at
 * this volume, and a silently dropped appointment is a client who looks like
 * she has no address when she does.
 */
async function appointmentAddress(uid, headers) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch(`${API}/appointments/${uid}/`, { headers });
      if (r.status === 429 || r.status >= 500) {
        await new Promise(s => setTimeout(s, 1500 * (attempt + 1)));
        continue;
      }
      if (r.status !== 200) return null;
      const t = (await r.json())?.appointment?.traveling;
      if (!t) return null;
      return {
        street: [t.address_line_1, t.apartment_number].filter(Boolean).join(' ').trim(),
        city: t.city || '',
        zip: t.zipcode || '',
        fee: t.price != null ? Number(t.price) : null,
      };
    } catch {
      await new Promise(s => setTimeout(s, 1000));
    }
  }
  return null;
}

async function fetchAll(list, headers) {
  // Resumable: a run that dies partway (or gets throttled out) picks up where
  // it stopped rather than re-walking 1,200 appointments.
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const todo = list.filter(a => !(a.uid in cache));
  console.log(`  ${Object.keys(cache).length} cached, ${todo.length} to fetch`);
  let done = 0;
  const queue = [...todo];
  const save = () => writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const a = queue.shift();
      cache[a.uid] = await appointmentAddress(a.uid, headers);
      if (++done % 100 === 0) { save(); process.stdout.write(`  ${done}…\n`); }
    }
  }));
  save();
  return list.map(a => ({ ...a, addr: cache[a.uid] })).filter(a => a.addr);
}

// ── main ────────────────────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / service key in .env.local'); process.exit(1); }
const supabase = createClient(url, key);

console.log(`\nBooksy address backfill${APPLY ? '' : '  (DRY RUN — nothing will be written)'}\n`);

const headers = sessionHeaders(harFile);
console.log('Reading Booksy calendar…');
const appointments = await listAppointments(headers);
console.log(`  ${appointments.length} appointments`);

console.log('Fetching addresses…');
const withAddr = await fetchAll(appointments, headers);

// Drop her studio and the placeholders before anything else sees them.
let studio = 0, placeholder = 0;
const usable = withAddr.filter(a => {
  if (isStudioAddress(a.addr.street)) { studio++; return false; }
  if (isPlaceholder(a.addr.street)) { placeholder++; return false; }
  return !!a.addr.city || !!a.addr.street;
});
console.log(`  ${withAddr.length} carried an address`);
console.log(`    − ${studio} at her own studio (client came to her)`);
console.log(`    − ${placeholder} placeholder / blank`);
console.log(`    = ${usable.length} real travel addresses\n`);

// Newest address per client wins: people move, and the most recent trip is the
// best guess at where they are now.
const byClient = new Map();
for (const a of usable.sort((x, y) => (x.date < y.date ? -1 : 1))) {
  byClient.set(norm(a.name), a);
}

const { data: rows, error } = await supabase
  .from('bookings').select('id, name, date, location, location_city, source');
if (error) { console.error('Could not read bookings:', error.message); process.exit(1); }

// The 2026-07-16 import produced two different kinds of row, and they need
// opposite rules:
//
//   A DATED row is a real appointment. Its address must come from that same
//   appointment in Booksy. Borrowing one from another visit would be a guess
//   about a specific day she is going to drive somewhere, and the most likely
//   reason a dated appointment has no travel address is that it isn't a travel
//   job at all — the client is coming to the studio. Filling that in would
//   invent a trip that was never happening.
//
//   A DATELESS row is a client card from the clients CSV. "Where does this
//   person live" is a property of the client, so their most recent address is
//   exactly the right answer, and the only one available.
const updates = [];
let already = 0, unmatchedDated = 0, unmatchedClient = 0;
for (const b of rows) {
  if (b.location || b.location_city) { already++; continue; }
  const sameDay = b.date
    ? usable.find(a => norm(a.name) === norm(b.name) && a.date === b.date)
    : null;
  const lastKnown = b.date ? null : byClient.get(norm(b.name));
  const hit = sameDay || lastKnown;
  if (!hit) { b.date ? unmatchedDated++ : unmatchedClient++; continue; }
  const { street, city, zip, fee } = hit.addr;
  const location = [street, [city, ['CA', zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')]
    .filter(Boolean).join(', ');
  updates.push({
    id: b.id, name: b.name, location, location_city: city || null,
    // A travel fee belongs to one specific trip, so it only rides along with a
    // same-day match. On a client card it would read as a standing rate.
    travel_fee: sameDay ? fee : null,
    kind: sameDay ? 'appointment' : 'client',
  });
  if (VERBOSE) console.log(`  ${b.name} (${b.date || 'client card'}) → ${location}`);
}

const dated = rows.filter(r => r.date).length;
console.log(`bookings: ${rows.length} total  (${dated} dated appointments, ${rows.length - dated} client cards)`);
console.log(`  ${already} already have a location (left alone)`);
console.log(`  ${unmatchedDated} dated appointments with no travel address that day (studio jobs — left blank on purpose)`);
console.log(`  ${unmatchedClient} client cards with no Booksy address at all`);
console.log(`  ${updates.length} to fill  (${updates.filter(u => u.kind === 'appointment').length} appointments, ${updates.filter(u => u.kind === 'client').length} client cards)\n`);

if (!APPLY) {
  console.log('Dry run. Re-run with --apply to write these.\n');
  process.exit(0);
}

let ok = 0, failed = 0;
for (const u of updates) {
  const { error: uErr } = await supabase.from('bookings')
    .update({ location: u.location, location_city: u.location_city, travel_fee: u.travel_fee })
    .eq('id', u.id);
  if (uErr) { failed++; console.error(`  FAILED ${u.name}: ${uErr.message}`); }
  else ok++;
}
console.log(`\nWrote ${ok} location${ok === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}.\n`);
