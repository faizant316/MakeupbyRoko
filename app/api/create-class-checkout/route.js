import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';

import { CLASS_CATALOG } from '../../../src/lib/classCatalog';

export async function POST(req) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();

    const body = await req.json();
    const { full_name, email, phone, additional_notes, selected_classes, success_url, cancel_url, preferred_date } = body;

    if (!full_name || !email || !phone || !selected_classes?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const invalid = selected_classes.find(k => !CLASS_CATALOG[k]);
    if (invalid) return NextResponse.json({ error: 'Invalid class selected' }, { status: 400 });

    const classData = selected_classes.map(k => CLASS_CATALOG[k]);
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

    const lineItems = classData.map(cls => ({
      price_data: {
        currency: 'usd',
        product_data: { name: cls.title, description: cls.duration },
        unit_amount: cls.price * 100,
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      metadata: { registration_id: reg.id },
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&reg_id=${reg.id}`,
      cancel_url: `${cancel_url}?cancelled=true`,
      payment_intent_data: {
        description: `Makeup class — ${full_name}`,
      },
    });

    await supabase
      .from('class_registrations')
      .update({ stripe_session_id: session.id })
      .eq('id', reg.id);

    // Best-effort: store the client's chosen Wednesday. Wrapped so a lagging
    // preferred_date column (migration 0003) never blocks checkout, but awaited
    // so the row has the date before the webhook/confirm route reads it.
    if (preferred_date) {
      try {
        await supabase
          .from('class_registrations')
          .update({ preferred_date })
          .eq('id', reg.id);
      } catch (e) {
        console.error('preferred_date write skipped:', e?.message);
      }
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
    console.error('create-class-checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
