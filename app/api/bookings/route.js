import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const { authError } = await requireAdmin();
  if (authError) return authError;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = data.map(r => ({ ...r, created_date: r.created_at }));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/bookings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const supabase = createClient();
    const body = await req.json();

    const { name, email, phone, service, date, time, notes, status, reference_photos, deposit_received } = body;
    if (!name || !email || !service) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

    const upload_token = body.upload_token || uuidv4();
    const insert = { name, email, phone, service, date, time, notes, status, reference_photos, upload_token };
    if (deposit_received !== undefined) insert.deposit_received = deposit_received;

    const { data, error } = await supabase.from('bookings').insert(insert).select().single();
    if (error) throw error;

    // Attach signed-contract fields as a separate, best-effort update. Kept
    // apart from the core insert so that if the contract columns are not yet
    // present (migration 0002 not applied), the booking itself still succeeds.
    // The signature is also embedded in `notes`, so it is never lost.
    if (body.contract_signed) {
      try {
        const { data: updated, error: cErr } = await supabase
          .from('bookings')
          .update({
            contract_signed: true,
            contract_signed_name: body.contract_signed_name,
            contract_signed_at: body.contract_signed_at,
            contract_version: body.contract_version,
            contract_photo_consent: body.contract_photo_consent,
          })
          .eq('id', data.id)
          .select()
          .single();
        if (!cErr && updated) {
          return NextResponse.json({ ...updated, created_date: updated.created_at }, { status: 201 });
        }
      } catch { /* columns not present yet; booking already saved */ }
    }

    return NextResponse.json({ ...data, created_date: data.created_at }, { status: 201 });
  } catch (err) {
    console.error('POST /api/bookings:', err);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
