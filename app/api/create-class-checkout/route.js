import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';
import { raiseAlert } from '../../../src/lib/alerts';

import { CLASS_CATALOG, CLASS_FORMATS, classMeta, startWindows } from '../../../src/lib/classCatalog';
import { isBookableWednesday, regHoldsDate, regDateOf, DATE_HOLD_COLUMNS } from '../../../src/lib/classSchedule';

export async function POST(req) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();

    const body = await req.json();
    const { full_name, email, phone, additional_notes, selected_classes, class_format, preferred_time, success_url, cancel_url, preferred_date } = body;

    if (!full_name || !email || !phone || !selected_classes?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const invalid = selected_classes.find(k => !CLASS_CATALOG[k]);
    if (invalid) return NextResponse.json({ error: 'Invalid class selected' }, { status: 400 });

    if (!CLASS_FORMATS[class_format]) {
      return NextResponse.json({ error: 'Please choose online or in person' }, { status: 400 });
    }

    // Classes are bookable on any Wednesday at least two weeks out, at a start
    // time that fits the class inside Roko's 11 AM to 7 PM day.
    if (!isBookableWednesday(preferred_date)) {
      return NextResponse.json({ error: 'Please pick a Wednesday at least two weeks out' }, { status: 400 });
    }

    const classData = selected_classes.map(k => classMeta(k, class_format));
    const badWindow = preferred_time && selected_classes.some(k => !startWindows(k, class_format).includes(preferred_time));
    if (!preferred_time || badWindow) {
      return NextResponse.json({ error: 'Please pick a class time' }, { status: 400 });
    }

    // One client per Wednesday: if any active registration already holds this
    // date, the seat is gone. Only rows that could possibly hold THIS date are
    // fetched — regDateOf() reads appointment_date first and falls back to
    // preferred_date, so a row qualifies if either column matches.
    const { data: existing, error: existErr } = await supabase
      .from('class_registrations')
      .select(DATE_HOLD_COLUMNS)
      .neq('status', 'cancelled')
      .neq('status', 'declined')
      .or(`appointment_date.eq.${preferred_date},preferred_date.eq.${preferred_date}`);
    if (existErr) throw existErr;
    const dateTaken = (existing || []).some(r => regDateOf(r) === preferred_date && regHoldsDate(r));
    if (dateTaken) {
      return NextResponse.json({ error: 'That Wednesday was just booked. Please pick another date.' }, { status: 409 });
    }

    const totalAmount = classData.reduce((sum, c) => sum + c.price, 0);

    // Create pending record first so reg_id is available for the Stripe success URL
    const classFlags = {};
    selected_classes.forEach(k => { classFlags[k] = true; });

    const { data: reg, error: dbErr } = await supabase
      .from('class_registrations')
      .insert({
        full_name,
        email,
        phone,
        additional_notes: additional_notes || null,
        ...classFlags,
        status: 'pending',
        payment_status: 'pending',
        amount_paid: totalAmount,
      })
      .select('id')
      .single();

    if (dbErr) throw dbErr;

    const formatLabel = CLASS_FORMATS[class_format].label;
    const lineItems = classData.map(cls => ({
      price_data: {
        currency: 'usd',
        product_data: { name: `${cls.title} (${formatLabel})`, description: `${cls.duration} · Wednesday ${preferred_date} · ${preferred_time}` },
        unit_amount: cls.price * 100,
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      // Format + schedule ride along in metadata so the finalizer can still do
      // the right thing even if the new columns (migration 0004) lag behind.
      metadata: {
        registration_id: reg.id,
        class_format,
        preferred_date: preferred_date || '',
        preferred_time: preferred_time || '',
      },
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&reg_id=${reg.id}`,
      cancel_url: `${cancel_url}?cancelled=true`,
      payment_intent_data: {
        description: `Makeup class (${formatLabel}) · ${full_name}`,
      },
    });

    await supabase
      .from('class_registrations')
      .update({ stripe_session_id: session.id })
      .eq('id', reg.id);

    // Best-effort: store the chosen Wednesday, time window, and format. Wrapped
    // so lagging columns (migrations 0003/0004) never block checkout, but
    // awaited so the row has them before the webhook/confirm route reads it.
    // Each column separately, so one missing column doesn't drop the others.
    for (const patch of [{ preferred_date }, { preferred_time }, { class_format }]) {
      const { error: colErr } = await supabase.from('class_registrations').update(patch).eq('id', reg.id);
      if (colErr) console.error(`class checkout column write skipped (${Object.keys(patch)[0]}):`, colErr.message);
    }

    // Best-effort: store the signed agreement. Kept separate from the required
    // updates so a missing contract column (migration 0002 not yet applied to
    // class_registrations) never blocks checkout. The signature is also in
    // additional_notes as a fallback.
    if (body.contract_signed) {
      await supabase
        .from('class_registrations')
        .update({
          contract_signed: true,
          contract_signed_name: body.contract_signed_name,
          contract_signed_at: body.contract_signed_at,
          contract_version: body.contract_version,
          contract_photo_consent: body.contract_photo_consent,
        })
        .eq('id', reg.id);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Money is involved here, so a failure can also mean a charge with no
    // registration behind it. Always worth waking someone up for.
    await raiseAlert({
      source: 'api/create-class-checkout', kind: 'checkout_failed', severity: 'critical',
      message: 'A class checkout failed. If Stripe took payment, there may be a charge with no registration attached to it.',
      context: { error: err?.message, code: err?.code },
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
