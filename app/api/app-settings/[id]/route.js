import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

export async function PATCH(req, { params }) {
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
