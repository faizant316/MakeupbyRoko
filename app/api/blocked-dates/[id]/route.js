import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';

export async function DELETE(_req, { params }) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('blocked_dates').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
