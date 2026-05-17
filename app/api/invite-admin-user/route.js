import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role: 'admin' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupbyroko.com'}/admin`,
    });

    if (error) throw error;
    return NextResponse.json({ success: true, user: data });
  } catch (err) {
    console.error('invite-admin-user:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
