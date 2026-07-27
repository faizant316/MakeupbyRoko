// Unresolved alerts for the admin banner, and marking one handled.
//
// Admin-only: these describe internal failures and name the columns involved.
import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { authError } = await requireAdmin();
  if (authError) return authError;
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
  const { authError } = await requireAdmin();
  if (authError) return authError;
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
