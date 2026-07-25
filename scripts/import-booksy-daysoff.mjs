// Import Roko's Booksy days off into blocked_dates.
//
// Booksy has no export and no public API for availability, so the input is a
// HAR file: Chrome DevTools -> Network -> click through the calendar months ->
// the ⬇ Export HAR button. That records every response the browser received.
//
// HOW BOOKSY MODELS THIS (learned from a real capture, 2026-07-24)
//   GET /core/v2/business_api/me/businesses/<id>/monthly_bookings
//   returns { "YYYY-MM-DD": { counter, bookings: [...] }, ... } where each
//   booking is either type "B" (a real client booking) or type "R" (a time
//   reservation, which is how blocked time is stored). An R carries
//   reserved_from/reserved_till and a resources[] naming the staff member.
//
// A day off is an R block covering essentially her whole working day. Short
// R blocks are personal appointments and lunch breaks, so they must NOT close
// the day. Her working window is 07:00 to 19:30, hence the 10 hour default.
//
//   node scripts/import-booksy-daysoff.mjs booksy.com.har
//   node scripts/import-booksy-daysoff.mjs booksy.com.har --apply
//
// Flags
//   --apply          write to blocked_dates (default: dry run, writes nothing)
//   --staffer NAME   whose time off to import (default Roko; her Booksy also
//                    has Shak and Maryam, whose days off are not hers)
//   --min-hours N    hours of coverage before a day counts as off (default 10)
//   --verbose        show every time reservation found, including short ones
//
// Only ever adds. Never deletes an existing day off, never touches bookings.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- load .env.local (Node doesn't do this automatically) ---
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* env may already be in the environment */ }

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--')) || 'booksy.com.har';
const has = (f) => args.includes(f);
const APPLY = has('--apply');
const VERBOSE = has('--verbose');
const STAFFER = has('--staffer') ? args[args.indexOf('--staffer') + 1] : 'Roko';
const MIN_HOURS = parseFloat(has('--min-hours') ? args[args.indexOf('--min-hours') + 1] : '') || 10;

const pad = (n) => String(n).padStart(2, '0');
const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
const fmtDay = (k) => new Date(k + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const hhmm = (iso) => iso.slice(11, 16);
const clock = (t) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${((h + 11) % 12) + 1}:${pad(m)} ${ap}`; };

// ── read the HAR ────────────────────────────────────────────
let har;
try {
  har = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`Could not read ${file}: ${e.message}`);
  process.exit(1);
}
if (!har.log?.entries) {
  console.error('That is not a HAR file. Export one from DevTools -> Network -> the ⬇ button.');
  process.exit(1);
}

// Merge every monthly_bookings response. Months overlap at the edges, so
// bookings are de-duped by their Booksy id.
const byDate = {};
let responses = 0;
for (const entry of har.log.entries) {
  if (!/monthly_bookings/.test(entry.request?.url || '')) continue;
  const content = entry.response?.content;
  let text = content?.text;
  if (!text) continue;
  if (content.encoding === 'base64') {
    try { text = Buffer.from(text, 'base64').toString('utf8'); } catch { continue; }
  }
  let json;
  try { json = JSON.parse(text); } catch { continue; }
  responses++;
  for (const [date, payload] of Object.entries(json)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    (byDate[date] ||= new Map());
    for (const b of payload?.bookings || []) byDate[date].set(b.id, b);
  }
}

if (!responses) {
  console.error('No monthly_bookings responses in that HAR.');
  console.error('Open the Booksy calendar in Month view with the Network tab recording, page through the months, then export again.\n');
  process.exit(1);
}

const dates = Object.keys(byDate).sort();
console.log(`\nRead ${file}: ${responses} calendar responses covering ${dates.length} days (${dates[0]} to ${dates[dates.length - 1]}).\n`);

// ── pull out this staffer's time reservations ───────────────
const mine = (b) => (b.resources || []).some(r => String(r.name || '').toLowerCase().includes(STAFFER.toLowerCase()));

const perDay = {}; // date -> [{from, till, hours}]
const staffSeen = new Set();
for (const [date, m] of Object.entries(byDate)) {
  for (const b of m.values()) {
    (b.resources || []).forEach(r => r.name && staffSeen.add(r.name));
    if (b.type !== 'R' || !mine(b)) continue;
    const from = b.reserved_from, till = b.reserved_till;
    if (!from || !till) continue;
    (perDay[date] ||= []).push({ from, till, hours: (new Date(till) - new Date(from)) / 3.6e6, reason: b.reason });
  }
}

// Overlapping blocks would double-count, so merge before measuring coverage.
function coveredHours(blocks) {
  const iv = blocks.map(b => [new Date(b.from).getTime(), new Date(b.till).getTime()]).sort((a, b) => a[0] - b[0]);
  let total = 0, [cs, ce] = iv[0];
  for (const [s, e] of iv.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else { total += ce - cs; [cs, ce] = [s, e]; }
  }
  return (total + (ce - cs)) / 3.6e6;
}

const full = [], partial = [];
for (const [date, blocks] of Object.entries(perDay)) {
  const hours = coveredHours(blocks);
  (hours >= MIN_HOURS ? full : partial).push({ date, hours, blocks });
}
full.sort((a, b) => a.date.localeCompare(b.date));
partial.sort((a, b) => a.date.localeCompare(b.date));

console.log(`Staff on this calendar: ${[...staffSeen].join(', ') || 'none found'}`);
console.log(`Importing time off for "${STAFFER}" only.\n`);

if (VERBOSE && partial.length) {
  console.log(`Partial blocks (under ${MIN_HOURS}h, treated as appointments, NOT closing the day):`);
  for (const p of partial) {
    const spans = p.blocks.map(b => `${clock(hhmm(b.from))}-${clock(hhmm(b.till))}`).join(', ');
    console.log(`  ${fmtDay(p.date).padEnd(24)} ${p.hours.toFixed(1)}h   ${spans}`);
  }
  console.log('');
}

const upcoming = full.filter(f => f.date >= todayKey);
const pastCount = full.length - upcoming.length;

if (!upcoming.length) {
  console.log(`No upcoming full days off found (${pastCount} were in the past).`);
  console.log('If she has time off further out, page through more months in Booksy and export again.\n');
  process.exit(0);
}

// ── compare against what's already live ─────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existing, error: exErr } = await supabase.from('blocked_dates').select('date');
if (exErr) { console.error('Could not read blocked_dates:', exErr.message); process.exit(1); }
const already = new Set((existing || []).map(r => r.date));

const { data: bookingRows, error: bkErr } = await supabase
  .from('bookings').select('date, status, name, service')
  .gte('date', todayKey).in('status', ['pending', 'confirmed']);
if (bkErr) { console.error('Could not read bookings:', bkErr.message); process.exit(1); }
const bookingsByDate = (bookingRows || []).reduce((m, b) => { (m[b.date] ||= []).push(b); return m; }, {});

const toAdd = upcoming.filter(f => !already.has(f.date));

console.log('────────────────────────────────────────────');
console.log(`  Full days off, upcoming:    ${upcoming.length}${pastCount ? `  (+${pastCount} already past, skipped)` : ''}`);
console.log(`  Partial blocks ignored:     ${partial.length}`);
console.log(`  Already closed on the site: ${upcoming.length - toAdd.length}`);
console.log(`  New, would be added:        ${toAdd.length}`);
console.log('────────────────────────────────────────────\n');

if (toAdd.length) {
  console.log('Would close these days:');
  for (const f of toAdd) {
    // A day can be covered by more than one block (e.g. broken by a lunch
    // gap), so show them all rather than implying a single span.
    const spans = f.blocks
      .sort((a, b) => a.from.localeCompare(b.from))
      .map(b => `${clock(hhmm(b.from))} - ${clock(hhmm(b.till))}`)
      .join('  +  ');
    console.log(`  ${fmtDay(f.date).padEnd(24)} ${spans}  (${f.hours.toFixed(1)}h)`);
  }
  console.log('');
}

const conflicts = toAdd.filter(f => bookingsByDate[f.date]);
if (conflicts.length) {
  console.log('!! HEADS UP: these days already have live bookings on the site.');
  console.log('   Closing a day does not cancel anything, it only stops NEW bookings.\n');
  for (const f of conflicts) {
    console.log(`  ${fmtDay(f.date)}`);
    for (const b of bookingsByDate[f.date]) console.log(`      ${b.status.toUpperCase()}  ${b.name || '(no name)'}  ${b.service || ''}`);
  }
  console.log('');
}

if (!APPLY) {
  console.log('DRY RUN. Nothing written.');
  console.log('Re-run with --apply once the list above looks right.\n');
  process.exit(0);
}

if (!toAdd.length) { console.log('Nothing new to add.\n'); process.exit(0); }

const { error: wErr } = await supabase
  .from('blocked_dates')
  .upsert(toAdd.map(f => ({ date: f.date, reason: 'Booksy time off' })), { onConflict: 'date' });
if (wErr) { console.error('Write failed:', wErr.message); process.exit(1); }

console.log(`✓ Closed ${toAdd.length} day${toAdd.length === 1 ? '' : 's'} on the site.`);
console.log('  Check admin → Availability. Any of them can be reopened with one tap.\n');
console.log(`Delete ${file} now, it holds her Booksy session cookies.\n`);
