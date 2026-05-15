import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../src/lib/supabase/server';

const CLASS_PRICES = {
  private_basic_lesson: 300,
  virtual_lesson: 400,
  intermediate_lesson: 500,
  glam_class: 600,
  masterclass: 1500,
};

const CLASS_LABELS = {
  private_basic_lesson: 'Private Basic Lesson',
  virtual_lesson: 'Virtual Lesson',
  intermediate_lesson: 'Intermediate Lesson',
  glam_class: 'Glam Class',
  masterclass: 'Masterclass',
};

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient();
    const body = await req.json();
    const { full_name, email, phone, selectedClasses = [] } = body;

    const lineItems = selectedClasses
      .filter(k => CLASS_PRICES[k])
      .map(k => ({
        price_data: {
          currency: 'usd',
          product_data: { name: CLASS_LABELS[k] },
          unit_amount: Math.round(CLASS_PRICES[k] * 50),
        },
        quantity: 1,
      }));

    if (!lineItems.length) {
      return NextResponse.json({ error: 'No classes selected' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupbyroko.com'}/?class_success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://makeupbyroko.com'}/?class_cancelled=1`,
      customer_email: email,
      metadata: { full_name, phone, classes: selectedClasses.join(',') },
    });

    // Create registration record
    const regData = { full_name, email, phone, status: 'new', payment_status: 'pending', stripe_session_id: session.id };
    selectedClasses.forEach(k => { if (k in CLASS_PRICES) regData[k] = true; });
    await supabase.from('class_registrations').insert(regData);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('create-class-checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
