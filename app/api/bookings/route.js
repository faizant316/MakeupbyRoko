import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { requireAdmin, isAdminRequest } from '../../../src/lib/requireAdmin';
import { NON_BRIDAL_LEAD_DAYS, meetsLead } from '../../../src/lib/bookingLeadTime';
import { cityFromLocation } from '../../../src/lib/location';
import { raiseAlert, keysOf } from '../../../src/lib/alerts';
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
  // Hoisted so a failure can report which fields the form actually sent.
  let body = null;
  try {
    const supabase = createClient();
    body = await req.json();

    const { name, email, phone, service, date, time, notes, status, reference_photos, deposit_received, source } = body;
    if (!name || !service) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    // Site bookings must carry an email. Imported clients (Booksy CSV) often
    // only have a phone number, so imports may omit it — but never fake it.
    const isImport = source === 'booksy';
    if (!email && !isImport) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    if (!email && !phone) return NextResponse.json({ error: 'Need an email or phone' }, { status: 400 });

    // ── Lead time ───────────────────────────────────────────────────────────
    // The calendar already greys out dates that are too soon, but that is only
    // the browser's opinion: a tab left open overnight, a resubmitted form or a
    // hand-rolled POST would all sail past it. Roko is exempt (she books
    // walk-ins from admin), and so are Booksy imports of appointments that
    // already happened.
    if (date && !isImport && !(await isAdminRequest())) {
      // Bridal keeps the shorter window, so the rule turns on what was actually
      // booked. Read from the service's category rather than its title: the
      // titles get edited live in Supabase, categories don't.
      const { data: svc } = await supabase
        .from('services').select('category').eq('title', service).maybeSingle();
      // Unknown service falls back to the stricter window rather than the
      // looser one, so a renamed service can never quietly reopen the calendar.
      const isBridalService = svc?.category === 'bridal';
      if (!isBridalService && !meetsLead(date, NON_BRIDAL_LEAD_DAYS)) {
        return NextResponse.json({
          error: 'Non-bridal appointments are booked at least 1 month ahead. Please pick a later date.',
        }, { status: 400 });
      }
    }

    const upload_token = body.upload_token || uuidv4();
    const insert = { name, email: email || null, phone, service, date, time, notes, status, reference_photos, upload_token };
    if (deposit_received !== undefined) insert.deposit_received = deposit_received;
    if (source) insert.source = source;
    // Travel bookings only (0015). Derive the city here rather than trusting a
    // client-sent one, so the chip in the admin list always matches the address
    // sitting next to it.
    if (body.location) {
      insert.location = body.location;
      insert.location_city = body.location_city || cityFromLocation(body.location);
    }
    if (body.travel_fee != null) insert.travel_fee = body.travel_fee;

    let { data, error } = await supabase.from('bookings').insert(insert).select().single();
    // If migration 0007 hasn't been applied yet the `source` column doesn't
    // exist — retry without it so the import itself still lands.
    if (error && source && /source/i.test(error.message || '')) {
      delete insert.source;
      ({ data, error } = await supabase.from('bookings').insert(insert).select().single());
    }
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
            // The window this first signature covers. Often blank on bridal,
            // where Roko sets the time later — that is accurate, not a gap.
            contract_signed_for: [
              data.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '',
              data.time || '',
            ].filter(Boolean).join(' · ') || null,
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
    // A booking that doesn't save is a client who thinks she has an appointment
    // and a Roko who has never heard of her. Loudest possible signal.
    await raiseAlert({
      source: 'api/bookings', kind: 'insert_failed', severity: 'critical',
      message: 'A booking could not be saved. If the client reached a confirmation screen, she believes she is booked and there is no appointment on file.',
      context: { error: err?.message, code: err?.code, sent_keys: keysOf(body) },
    });
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
