// Two throwaway rows on today's date, so the Home screen can be looked at with
// a Zoom consultation and a Zoom class on it.
//
//   node scripts/demo-today.mjs          # insert them
//   node scripts/demo-today.mjs --clean  # delete them
//
// Writes straight to Postgres rather than going through /api, so nothing emails
// anybody, no Stripe session is opened and no alert fires. Both rows carry FIXED
// ids, so --clean deletes exactly these two and can never touch a real client:
// it deletes by primary key, not by a name match or a date range.
//
// Nothing here updates an existing row. The only statements are insert and
// delete-by-id.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BOOKING_ID = '00000000-0000-4000-8000-0000000d0001';
const CLASS_ID = '00000000-0000-4000-8000-0000000d0002';
const MARK = 'ZZ TEST (delete me)';

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
const db = createClient(url, key, { auth: { persistSession: false } });

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const later = new Date(d); later.setDate(later.getDate() + 90);
const laterKey = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`;

const clean = process.argv.includes('--clean');

if (clean) {
  const a = await db.from('bookings').delete().eq('id', BOOKING_ID).select('id');
  const b = await db.from('class_registrations').delete().eq('id', CLASS_ID).select('id');
  if (a.error) console.error('booking:', a.error.message);
  if (b.error) console.error('class:', b.error.message);
  console.log(`Removed ${(a.data?.length || 0) + (b.data?.length || 0)} demo row(s).`);
  process.exit(0);
}

const notes = (id) => `Link: https://zoom.us/j/${id}\nMeetingId: ${id}\nFake row, safe to delete.`;

const booking = await db.from('bookings').upsert({
  id: BOOKING_ID,
  name: MARK,
  email: 'test@example.com',
  phone: '(555) 000-0000',
  service: 'Luxury Bridal Look',
  // The appointment sits three months out on purpose: only the CONSULTATION is
  // today, which is the row we want to look at.
  date: laterKey,
  time: '10:00 AM – 2:00 PM',
  status: 'confirmed',
  consultation_date: today,
  consultation_time: '9:00 AM',
  consultation_type: 'Zoom',
  consultation_notes: notes('9999999999'),
  notes: 'Temporary demo row created by scripts/demo-today.mjs',
}).select('id, consultation_date, consultation_time');

if (booking.error) console.error('booking:', booking.error.message);
else console.log('Consultation today at 9:00 AM  ->', booking.data?.[0]?.id);

const cls = await db.from('class_registrations').upsert({
  id: CLASS_ID,
  full_name: MARK,
  email: 'test@example.com',
  phone: '(555) 000-0000',
  glam_class: true,
  class_format: 'online',
  appointment_date: today,
  appointment_time: '5:00 PM',
  consultation_type: 'Zoom',
  status: 'enrolled',
  payment_status: 'paid_in_full',
  lesson_notes: notes('8888888888'),
}).select('id, appointment_date, appointment_time');

if (cls.error) console.error('class:', cls.error.message);
else console.log('Online class today at 5:00 PM   ->', cls.data?.[0]?.id);

console.log('\nRefresh the admin Home. Remove with: node scripts/demo-today.mjs --clean');
