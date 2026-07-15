import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export async function GET(req) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    let query = supabase.from('services').select('*').order('sort_order', { ascending: true });

    const isActive = searchParams.get('is_active');
    if (isActive !== null) query = query.eq('is_active', isActive === 'true');

    const category = searchParams.get('category');
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/services:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const body = await req.json();
    const { data, error } = await supabase.from('services').insert(body).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/services:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
