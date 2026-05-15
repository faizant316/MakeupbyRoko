import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

export async function PATCH(req, { params }) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const { data, error } = await supabase.from('reviews').update(body).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json({ ...data, created_date: data.created_at });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('reviews').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
