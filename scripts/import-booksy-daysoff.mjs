// Import Roko's Booksy days off into blocked_dates.
//
// Booksy has no export and no public API for availability, so the input is a
// HAR file: Chrome DevTools -> Network -> click through the calendar months ->
// right-click -> "Save all as HAR with content". That records every response
// the browser received, which beats trying to patch fetch (Booksy's bundle
// captures its own fetch reference before any console snippet can hook it).
//
// Their response shape isn't documented, so this walks the whole payload
// looking for anything that reads as time off rather than assuming a schema.
// Always dry-runs first.
//
//   node scripts/import-booksy-daysoff.mjs booksy.har --staffer Roko --verbose
//   node scripts/import-booksy-daysoff.mjs booksy.har --staffer Roko --apply
//
// Flags
//   --apply            actually write to blocked_dates (default: dry run)
//   --verbose          print every matched object so the heuristic can be checked
//   --staffer NAME     keep only that staff member's time off (her Booksy has 3)
//   --include-weekly   also close her recurring weekly days off, date by date
//   --months N         how far ahead --include-weekly materializes (default 12)
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
const file = args.find(a => !a.startsWith('--')) || 'booksy-capture.json';
const has = (f) => args.includes(f);
const APPLY = has('--apply');
const VERBOSE = has('--verbose');
const WEEKLY = has('--include-weekly');
const MONTHS = parseInt(args[args.indexOf('--months') + 1], 10) || 12;
const STAFFER = has('--staffer') ? args[args.indexOf('--staffer') + 1] : null;

// ── helpers ─────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = ymd(new Date());
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmt = (k) => new Date(k + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function* walk(node, path = '$') {
  if (!node || typeof node !== 'object') return;
  yield [node, path];
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* walk(node[i], `${path}[${i}]`);
  } else {
    for (const [k, v] of Object.entries(node)) yield* walk(v, `${path}.${k}`);
  }
}

// ── what counts as "off" ────────────────────────────────────
// Three shapes show up in booking systems: a labelled time-off record, a
// boolean flag, or a day cell explicitly marked not-available.
const OFF_WORDS = /time.?off|day.?off|unavailab|not.?available|vacation|holiday|absence|absent|blocked|block(ed)?.?time|closed|sick|leave/i;
const LABEL_KEYS = /^(type|kind|status|reason|title|name|category|subtype|event_type|slot_type)$/i;
const OFF_FLAGS = /^(is_)?(time_?off|blocked|closed|day_?off|unavailable|holiday|vacation|absence)$/i;
const OPEN_FLAGS = /^(available|is_available|working|is_working|open|is_open|has_availability)$/i;
const DATE_KEYS = /^(date|day|start|start_date|start_time|from|date_from|begin|begins_at|start_at|starts_at)$/i;
const END_KEYS = /^(end|end_date|end_time|to|date_to|finish|ends_at|end_at|until)$/i;
const CLIENT_KEYS = /^(customer|client|customer_id|client_id|booking_id|appointment_id)$/i;
// Her Booksy has multiple staff (Roko, Shak, Maryam). Time off is per staffer,
// so we track who each block belongs to and let --staffer narrow it down.
const STAFF_KEYS = /^(staffer|staff|staff_member|employee|resource|staffer_id|staff_id|employee_id|resource_id|staffer_name|staff_name)$/i;

const isoDate = (v) => {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
};

function classify(obj) {
  let date = null, end = null, offReason = null, looksLikeAppointment = false, staffer = null;

  for (const [k, v] of Object.entries(obj)) {
    if (STAFF_KEYS.test(k) && v != null) {
      // may be a bare id, a name, or a nested { id, name } object
      if (typeof v === 'object') staffer = staffer || v.name || v.full_name || (v.id != null ? String(v.id) : null);
      else staffer = staffer || String(v);
    }
    // A nested customer/client object is the strongest "this is a real
    // appointment" signal, so check that before dropping to scalars.
    if (CLIENT_KEYS.test(k) && v && typeof v === 'object' && Object.keys(v).length) looksLikeAppointment = true;
    if (v && typeof v === 'object') continue; // scalars only from here
    if (!date && DATE_KEYS.test(k)) date = isoDate(v);
    if (!end && END_KEYS.test(k)) end = isoDate(v);
    if (LABEL_KEYS.test(k) && typeof v === 'string' && OFF_WORDS.test(v)) offReason = v;
    if (OFF_FLAGS.test(k) && v === true) offReason = offReason || k;
    if (OPEN_FLAGS.test(k) && v === false) offReason = offReason || 'marked unavailable';
    if (CLIENT_KEYS.test(k) && v != null && v !== '' && v !== 0) looksLikeAppointment = true;
  }

  // A record attached to a real customer is a client appointment, never a day
  // off, even when its status happens to read as "closed". Booksy models
  // blocked time as a pseudo-appointment with no customer, so this stays safe.
  if (looksLikeAppointment) return null;
  if (!date || !offReason) return null;
  return { date, end: end && end >= date ? end : date, reason: String(offReason).trim(), staffer };
}

// ── weekly closed days (working hours) ──────────────────────
function findWeeklyClosed(root) {
  const closed = new Set();
  for (const [obj] of walk(root)) {
    if (Array.isArray(obj)) continue;
    const keys = Object.keys(obj);

    // shape A: { day_of_week: 1, closed: true } / { weekday: 'Monday', open: false }
    const dowKey = keys.find(k => /^(day_of_week|weekday|day_index|dow)$/i.test(k));
    if (dowKey) {
      const shut = keys.some(k => (OFF_FLAGS.test(k) && obj[k] === true) || (OPEN_FLAGS.test(k) && obj[k] === false));
      if (shut) {
        const raw = obj[dowKey];
        const idx = typeof raw === 'number' ? raw % 7 : DAY_NAMES.findIndex(d => d.toLowerCase() === String(raw).toLowerCase());
        if (idx >= 0) closed.add(idx);
      }
      continue;
    }

    // shape B: { monday: {...}, tuesday: null, ... }
    const named = keys.filter(k => DAY_NAMES.some(d => d.toLowerCase() === k.toLowerCase()));
    if (named.length >= 5) {
      for (const k of named) {
        const v = obj[k];
        const shut = v === null || v === false || (Array.isArray(v) && v.length === 0) ||
          (v && typeof v === 'object' && Object.entries(v).some(([kk, vv]) => (OFF_FLAGS.test(kk) && vv === true) || (OPEN_FLAGS.test(kk) && vv === false)));
        if (shut) closed.add(DAY_NAMES.findIndex(d => d.toLowerCase() === k.toLowerCase()));
      }
    }
  }
  return [...closed].sort();
}

// ── read the capture ────────────────────────────────────────
let capture;
try {
  capture = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`Could not read ${file}: ${e.message}`);
  console.error('Expected a HAR file saved from Chrome DevTools -> Network -> "Save all as HAR with content".');
  process.exit(1);
}

// HAR files nest everything under log.entries; response bodies are strings
// (sometimes base64) so they need decoding and parsing before the walk.
function bodiesFromHar(har) {
  const out = [];
  let booksyCalls = 0;
  for (const entry of har.log?.entries || []) {
    const url = entry.request?.url || '';
    if (!/booksy\.(com|net)/i.test(url)) continue;
    booksyCalls++;
    const content = entry.response?.content;
    let text = content?.text;
    if (!text) continue;
    if (content.encoding === 'base64') {
      try { text = Buffer.from(text, 'base64').toString('utf8'); } catch { continue; }
    }
    if (!/^[\s]*[{[]/.test(text)) continue; // not JSON
    try { out.push({ url, body: JSON.parse(text) }); } catch { /* truncated or not JSON */ }
  }
  return { out, booksyCalls };
}

let bodies, totalCalls;
if (capture.log?.entries) {
  const { out, booksyCalls } = bodiesFromHar(capture);
  bodies = out.map(x => x.body);
  totalCalls = booksyCalls;
  console.log(`\nRead ${file} (HAR): ${capture.log.entries.length} requests, ${booksyCalls} to Booksy, ${bodies.length} with JSON bodies.\n`);
} else {
  // legacy shape from the old console-snippet capture
  bodies = (capture.calls || []).map(c => c.body).filter(b => b && typeof b === 'object');
  totalCalls = (capture.calls || []).length;
  console.log(`\nRead ${file}: ${totalCalls} calls, ${bodies.length} with JSON bodies.\n`);
}

if (!bodies.length) {
  console.error('No Booksy JSON responses in that file.');
  console.error('Make sure you saved with "Save all as HAR with content" (the plain "Save as HAR" drops response bodies),');
  console.error('and that you clicked through calendar months while the Network tab was recording.\n');
  process.exit(1);
}

// ── extract ─────────────────────────────────────────────────
const found = new Map(); // date -> reason
const matches = [];
const staffersSeen = new Set();

for (const body of bodies) {
  for (const [obj, path] of walk(body)) {
    if (Array.isArray(obj)) continue;
    const hit = classify(obj);
    if (!hit) continue;
    matches.push({ ...hit, path });
    if (hit.staffer) staffersSeen.add(hit.staffer);

    // Multiple staff share this calendar, so a block belonging to Shak or
    // Maryam must not close Roko's day. Only skip when a filter was given.
    if (STAFFER && !String(hit.staffer || '').toLowerCase().includes(STAFFER.toLowerCase())) continue;

    // expand multi-day time off into individual dates
    const d = new Date(hit.date + 'T00:00:00');
    const last = new Date(hit.end + 'T00:00:00');
    let guard = 0;
    while (d <= last && guard++ < 400) {
      const k = ymd(d);
      if (!found.has(k)) found.set(k, hit.reason);
      d.setDate(d.getDate() + 1);
    }
  }
}

if (VERBOSE && matches.length) {
  console.log('Matched objects (check these look like real time off):');
  for (const m of matches.slice(0, 60)) {
    console.log(`  ${m.date}${m.end !== m.date ? ` → ${m.end}` : ''}  "${m.reason}"${m.staffer ? `  [${m.staffer}]` : ''}  ${m.path}`);
  }
  if (matches.length > 60) console.log(`  … and ${matches.length - 60} more`);
  console.log('');
}

if (staffersSeen.size > 1) {
  console.log(`Time off found for ${staffersSeen.size} staff: ${[...staffersSeen].join(', ')}`);
  console.log(STAFFER
    ? `  Filtering to "${STAFFER}".\n`
    : '  NOT FILTERED. She shares this calendar, so this may include other staff.\n'
      + '  Re-run with --staffer Roko to keep only hers.\n');
} else if (STAFFER) {
  console.log(`Filtering to "${STAFFER}", but no staffer info was present on the matches, so nothing was excluded.\n`);
}

// weekly pattern
const weeklyClosed = findWeeklyClosed(bodies);
if (weeklyClosed.length) {
  console.log(`Weekly closed days in Booksy: ${weeklyClosed.map(i => DAY_NAMES[i]).join(', ')}`);
  const siteClosed = [1, 4]; // AVAILABLE_DAYS = [0,2,3,5,6] in BookingModal/BridalInquiryForm
  const same = weeklyClosed.length === siteClosed.length && weeklyClosed.every(d => siteClosed.includes(d));
  console.log(same
    ? '  Matches the site (closed Mon, Thu). Nothing to change.\n'
    : `  SITE DIFFERS: site is closed ${siteClosed.map(i => DAY_NAMES[i]).join(', ')}. That's hardcoded in BookingModal.jsx / BridalInquiryForm.jsx.\n`);

  if (WEEKLY) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const stop = new Date(); stop.setMonth(stop.getMonth() + MONTHS);
    while (d <= stop) {
      if (weeklyClosed.includes(d.getDay()) && !found.has(ymd(d))) found.set(ymd(d), 'Booksy weekly day off');
      d.setDate(d.getDate() + 1);
    }
  }
} else {
  console.log('No weekly working-hours pattern found in the capture.\n');
}

const upcoming = [...found.entries()].filter(([k]) => k >= todayKey).sort((a, b) => a[0].localeCompare(b[0]));
const past = found.size - upcoming.length;

if (!upcoming.length) {
  console.log('No upcoming days off found in this capture.');
  console.log('If she definitely has time off booked, re-run the snippet with --verbose to see what was matched,');
  console.log('or open the Booksy tab, click into the month that has the time off, and capture again.\n');
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

const toAdd = upcoming.filter(([k]) => !already.has(k));
const conflicts = toAdd.filter(([k]) => bookingsByDate[k]);

console.log('────────────────────────────────────────────');
console.log(`  Days off found (upcoming):  ${upcoming.length}${past ? `  (+${past} in the past, skipped)` : ''}`);
console.log(`  Already closed on the site: ${upcoming.length - toAdd.length}`);
console.log(`  New, would be added:        ${toAdd.length}`);
console.log('────────────────────────────────────────────\n');

if (toAdd.length) {
  console.log('Would close:');
  for (const [k, reason] of toAdd) console.log(`  ${fmt(k).padEnd(24)} ${reason}`);
  console.log('');
}

if (conflicts.length) {
  console.log('!! HEADS UP: these days already have live bookings on the site.');
  console.log('   Closing a day does not cancel anything, but it means Booksy and the site disagree.\n');
  for (const [k] of conflicts) {
    console.log(`  ${fmt(k)}`);
    for (const b of bookingsByDate[k]) console.log(`      ${b.status.toUpperCase()}  ${b.name || '(no name)'}  ${b.service || ''}`);
  }
  console.log('');
}

if (!APPLY) {
  console.log('DRY RUN. Nothing written.');
  console.log('Re-run with --apply once the list above looks right.\n');
  process.exit(0);
}

// ── write ───────────────────────────────────────────────────
if (!toAdd.length) { console.log('Nothing new to add.\n'); process.exit(0); }

const rows = toAdd.map(([date, reason]) => ({
  date,
  reason: reason.length > 60 ? 'Booksy time off' : `Booksy: ${reason}`,
}));

const { error: wErr } = await supabase.from('blocked_dates').upsert(rows, { onConflict: 'date' });
if (wErr) { console.error('Write failed:', wErr.message); process.exit(1); }

console.log(`✓ Closed ${rows.length} day${rows.length === 1 ? '' : 's'} on the site.`);
console.log('  Check it in admin → Availability. Any of them can be reopened with one tap.\n');
console.log('Delete booksy-capture.json now, it holds her Booksy session token.\n');
