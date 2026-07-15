import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAdmin } from '../../../../src/lib/requireAdmin';

export async function PATCH(req, { params }) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const body = await req.json();
    const { data, error } = await supabase.from('class_registrations').update(body).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const { error } = await supabase.from('class_registrations').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
