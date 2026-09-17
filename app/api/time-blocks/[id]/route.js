import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAdmin } from '../../../../src/lib/requireAdmin';
import { cleanTimeBlock } from '../../../../src/lib/timeBlocks';

export async function PATCH(req, { params }) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const { row, error: invalid } = cleanTimeBlock(await req.json());
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const supabase = createClient();
    const { data, error } = await supabase.from('time_blocks').update(row).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const { error } = await supabase.from('time_blocks').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
