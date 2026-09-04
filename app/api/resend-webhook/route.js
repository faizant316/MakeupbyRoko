// What Resend saw AFTER we handed the email over.
//
// Our own send only ever proves one thing: Resend accepted the message. That is
// not the same as it landing in a bride's inbox, and the gap between the two is
// exactly where the failure nobody notices lives. A typo'd address, a full
// mailbox, a domain that rejects us: all of those look like a clean send from
// our side and produce no alert at all.
//
// Resend reports what happened next as webhooks, and this route folds each one
// onto the matching email_log row so the admin card can say "delivered" rather
// than "we tried". A hard bounce also raises an alert, because it is the one
// outcome that guarantees a client received nothing and nobody would otherwise
// find out.
//
// SETUP: create a webhook in the Resend dashboard pointing at
//   {NEXT_PUBLIC_SITE_URL}/api/resend-webhook
// subscribed to email.delivered, email.bounced, email.complained and
// email.delivery_delayed, then put its signing secret in Vercel as
// RESEND_WEBHOOK_SECRET.
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { applyResendEvent } from '../../../src/lib/emailLog';
import { raiseAlert } from '../../../src/lib/alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Resend signs with Svix. Replays are the reason for the timestamp window: a
// captured request is otherwise valid forever, and a replayed "bounced" event
// would put a false red mark on a client card.
const TOLERANCE_MS = 5 * 60 * 1000;

function verify(rawBody, headers, secret) {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signature = headers.get('svix-signature');
  if (!id || !timestamp || !signature) return 'missing signature headers';

  const sentAt = Number(timestamp) * 1000;
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > TOLERANCE_MS) {
    return 'timestamp outside tolerance';
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`).digest();

  // The header carries a space-separated list so a secret can be rotated
  // without dropping events: any one version matching is a pass.
  const ok = signature.split(' ').some((part) => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
  return ok ? null : 'signature mismatch';
}

export async function POST(req) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  // Fail closed. An unsigned endpoint that writes delivery status would let
  // anyone mark a client's email as bounced, or as delivered when it wasn't.
  if (!secret) {
    console.error('resend-webhook: RESEND_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const problem = verify(rawBody, req.headers, secret);
  if (problem) {
    console.error('resend-webhook rejected:', problem);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: 'Bad payload' }, { status: 400 }); }

  const type = event?.type;
  const resendId = event?.data?.email_id;
  const at = event?.created_at ? new Date(event.created_at).toISOString() : new Date().toISOString();

  const result = await applyResendEvent({ resendId, type, at });

  // An event for an email we have no row for is normal and not an error: every
  // send from before this table existed, plus the alert emails we deliberately
  // don't log. 200 either way, so Resend doesn't retry something unfixable.
  if (!result.matched) return NextResponse.json({ ok: true, matched: false });

  if (type === 'email.bounced') {
    const bounce = event?.data?.bounce || {};
    await raiseAlert({
      source: 'resend-webhook', kind: 'email_bounced', severity: 'critical',
      message: `An email bounced, so the recipient definitely did not receive it. Someone needs to reach this client another way.`,
      // Same rule as everywhere else: the domain, never the client's address.
      context: {
        kind: result.kind,
        recipient_domain: String(result.recipient || '').split('@')[1] || 'unknown',
        booking_id: result.bookingId || 'none',
        bounce_type: bounce.type || 'unknown',
        bounce_reason: String(bounce.message || bounce.subType || '').slice(0, 300),
      },
    });
  }

  return NextResponse.json({ ok: true, matched: true, status: result.status });
}
