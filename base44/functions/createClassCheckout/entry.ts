import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { full_name, email, phone, selected_classes, additional_notes, success_url, cancel_url } = body;

    if (!full_name || !email || !phone || !selected_classes?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const CLASS_PRICES = {
      private_basic_lesson: { name: 'Private Basic Makeup Lesson', price: 300, deposit: 150 },
      virtual_lesson: { name: 'Virtual Makeup Lesson', price: 400, deposit: 200 },
      intermediate_lesson: { name: 'Intermediate Makeup Lesson', price: 500, deposit: 250 },
      glam_class: { name: 'Glam Makeup Class', price: 600, deposit: 300 },
      masterclass: { name: 'Makeup Masterclass', price: 1500, deposit: 750 },
    };

    const line_items = selected_classes.map(key => {
      const cls = CLASS_PRICES[key];
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${cls.name} — 50% Deposit`,
            description: `Deposit to secure your spot. Remaining $${cls.deposit} due at appointment.`,
          },
          unit_amount: cls.deposit * 100,
        },
        quantity: 1,
      };
    });

    // Create registration record first
    const regData = {
      full_name,
      email,
      phone,
      additional_notes: additional_notes || '',
      status: 'new',
      payment_status: 'pending',
    };
    selected_classes.forEach(key => { regData[key] = true; });

    const registration = await base44.asServiceRole.entities.ClassRegistration.create(regData);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: email,
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&reg_id=${registration.id}`,
      cancel_url: `${cancel_url}?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        registration_id: registration.id,
        customer_name: full_name,
        customer_phone: phone,
      },
    });

    // Update registration with session id
    await base44.asServiceRole.entities.ClassRegistration.update(registration.id, {
      stripe_session_id: session.id,
    });

    console.log(`Created checkout session ${session.id} for registration ${registration.id}`);
    return Response.json({ url: session.url, session_id: session.id, registration_id: registration.id });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});