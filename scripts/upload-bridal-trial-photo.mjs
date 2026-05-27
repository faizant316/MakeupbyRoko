/**
 * One-time script: upload bridal trial photo to Supabase Storage
 * and update the Bridal Trial service record with the new URL.
 *
 * Usage:
 *   node scripts/upload-bridal-trial-photo.mjs
 *
 * Prerequisites:
 *   1. Save the photo to public/bridal_trial.jpg
 *   2. Run: node scripts/upload-bridal-trial-photo.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Config ────────────────────────────────────────────────
const SUPABASE_URL        = 'https://xrmzdxogbwcbyeiarhux.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybXpkeG9nYndjYnllaWFyaHV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc5MTY2MSwiZXhwIjoyMDk0MzY3NjYxfQ.Y_hCKS8aARLbEiVBUcm7gUdkLsUTBbY7TEVPZLRqcvY';
const IMAGE_PATH          = join(ROOT, 'public', 'bridal_trial.png');
const SERVICE_TITLE       = 'Bridal Trial';
const BUCKET              = 'reference-photos';
// ─────────────────────────────────────────────────────────

async function main() {
  // 1. Check file exists
  if (!existsSync(IMAGE_PATH)) {
    console.error(`\n❌  Image not found at:\n   ${IMAGE_PATH}\n\nSave the photo as public/bridal_trial.jpg and re-run.\n`);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 2. Find the Bridal Trial service
  const { data: services, error: fetchErr } = await supabase
    .from('services')
    .select('id, title, photo')
    .eq('title', SERVICE_TITLE);

  if (fetchErr) { console.error('❌  DB fetch error:', fetchErr.message); process.exit(1); }
  if (!services?.length) { console.error(`❌  No service found with title "${SERVICE_TITLE}"`); process.exit(1); }

  const svc = services[0];
  console.log(`✓  Found service: "${svc.title}" (id: ${svc.id})`);
  if (svc.photo) console.log(`   Current photo: ${svc.photo}`);

  // 3. Upload image to Supabase Storage
  const fileBuffer = readFileSync(IMAGE_PATH);
  const storagePath = `photos/bridal-trial-${Date.now()}.png`;

  console.log(`\n↑  Uploading to storage bucket "${BUCKET}"...`);
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType: 'image/png', upsert: false });

  if (uploadErr) { console.error('❌  Upload error:', uploadErr.message); process.exit(1); }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  console.log(`✓  Uploaded. Public URL:\n   ${publicUrl}`);

  // 4. Update the service record
  const { error: updateErr } = await supabase
    .from('services')
    .update({ photo: publicUrl })
    .eq('id', svc.id);

  if (updateErr) { console.error('❌  DB update error:', updateErr.message); process.exit(1); }

  console.log(`\n✅  Done! "${SERVICE_TITLE}" photo updated successfully.\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
