import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAdmin } from '../../../../src/lib/requireAdmin';

export async function PATCH(req, { params }) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const body = await req.json();
    const { data, error } = await supabase.from('app_settings').update(body).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
