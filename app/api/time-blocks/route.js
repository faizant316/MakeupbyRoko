import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { cleanTimeBlock } from '../../../src/lib/timeBlocks';

// Roko's blocked time (see migration 0021). Admin only in BOTH directions: the
// reasons are personal, so unlike blocked_dates there is no public read.
export async function GET() {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('time_blocks').select('*').order('date', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const { row, error: invalid } = cleanTimeBlock(await req.json());
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const supabase = createClient();
    const { data, error } = await supabase.from('time_blocks').insert(row).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
