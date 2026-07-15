// One-off: create (or reset the password of) the studio admin login.
// Uses the Supabase service-role key from .env.local — run locally only.
//
//   node scripts/provision-admin.mjs roko@makeupbyroko.org
//
// Prints the email + a freshly generated password. Safe to re-run: if the user
// already exists it just resets the password and re-confirms the email.
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// --- load .env.local (Node doesn't do this automatically) ---
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* env may already be in the environment */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const email = (process.argv[2] || 'roko@makeupbyroko.org').trim().toLowerCase();
const fullName = process.argv[3] || 'Roqia Moshref';

// Strong but typeable: no ambiguous chars (0/O, 1/l/I), grouped for readability.
function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(20);
  let raw = '';
  for (let i = 0; i < 20; i++) raw += chars[bytes[i] % chars.length];
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const password = genPassword();

// Find existing user by email (paginate a couple pages just in case).
async function findUser(targetEmail) {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find(u => (u.email || '').toLowerCase() === targetEmail);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

const existing = await findUser(email);

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(existing.user_metadata || {}), full_name: existing.user_metadata?.full_name || fullName },
  });
  if (error) { console.error('Update failed:', error.message); process.exit(1); }
  console.log('\n✓ Existing admin password RESET.\n');
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) { console.error('Create failed:', error.message); process.exit(1); }
  console.log('\n✓ New admin account CREATED.\n');
}

console.log('  ────────────────────────────────');
console.log('   Login URL:  ' + (process.env.NEXT_PUBLIC_SITE_URL || '') + '/login');
console.log('   Email:      ' + email);
console.log('   Password:   ' + password);
console.log('  ────────────────────────────────\n');
console.log('Save this now. Re-run this script anytime to reset the password.\n');
