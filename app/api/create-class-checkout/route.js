import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';

// Server-side source of truth — prices never come from the client
const CLASS_CATALOG = {
  private_basic_lesson: { title: 'Private Basic Makeup Lesson', duration: '1.5 hours', price: 300 },
  virtual_lesson:       { title: 'Virtual Makeup Lesson',        duration: '2 hours',   price: 400 },
  intermediate_lesson:  { title: 'Intermediate Makeup Lesson',   duration: '2.5 hours', price: 500 },
  glam_class:           { title: 'Glam Makeup Class',            duration: '3 hours',   price: 600 },
  masterclass:          { title: 'Makeup Masterclass',           duration: '4 hours · 2 days', price: 1500 },
};

export async function POST(req) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();

    const { full_name, email, phone, additional_notes, selected_classes, success_url, cancel_url } = await req.json();

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
      payment_method_types: ['card'],
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

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('create-class-checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
