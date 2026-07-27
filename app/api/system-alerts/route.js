// Unresolved alerts for the failure banner, and marking one handled.
//
// Developer-only, not merely admin-only. These name Postgres error codes and
// internal columns. Roko is the second admin, and showing her "insert_failed on
// bridal_inquiries" would tell her the site she paid for is broken while giving
// her nothing to do about it. Enforced on the server, not by hiding the banner
// in the browser, so the data never reaches a client that shouldn't have it.
import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { isDeveloperEmail } from '../../../src/lib/adminAllowlist';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { authError, session } = await requireAdmin();
  if (authError) return authError;
  // An empty list, not a 403: for any other admin there is simply nothing to
  // show, and the banner renders nothing rather than an error.
  if (!isDeveloperEmail(session?.user?.email)) return NextResponse.json([]);
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('system_alerts')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    // Before migration 0014 lands there is no table, and a dashboard that
    // won't load because its alert banner can't query is a worse outcome than
    // a missing banner. Degrade to "nothing to report".
    console.error('GET /api/system-alerts:', err.message);
    return NextResponse.json([]);
  }
}

export async function PATCH(req) {
  const { authError, session } = await requireAdmin();
  if (authError) return authError;
  if (!isDeveloperEmail(session?.user?.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = createClient();
    const { id, all } = await req.json();
    const patch = { resolved_at: new Date().toISOString() };
    // `all` is the "I've dealt with the underlying cause" button: one broken
    // migration can raise dozens of rows and dismissing them one by one would
    // train her to ignore the banner.
    const q = all
      ? supabase.from('system_alerts').update(patch).is('resolved_at', null)
      : supabase.from('system_alerts').update(patch).eq('id', id);
    const { error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/system-alerts:', err.message);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
