// The check that runs when nobody is watching.
//
// `npm run db:check` only helps if someone remembers to run it. This is the
// same check, on a Vercel cron, against production. If the schema and the forms
// ever drift apart again, this notices within a day and emails, rather than
// waiting for a bride to submit an inquiry that gets thrown away.
//
// It is READ-ONLY by design. A synthetic probe that inserted real rows could
// leave a fake booking in Roko's dashboard if cleanup ever failed, which trades
// one embarrassment for another. Runtime raiseAlert() calls cover everything a
// schema check can't see.
import { NextResponse } from 'next/server';
import { createClient } from '../../../src/lib/supabase/server';
import { checkSchema } from '../../../src/lib/schemaContract.mjs';
import { raiseAlert } from '../../../src/lib/alerts';
import { requireAdmin } from '../../../src/lib/requireAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // Vercel cron sends `Authorization: Bearer $CRON_SECRET`. A logged-in admin
  // can also run it on demand from the dashboard. Anyone else gets nothing:
  // this reports on internal structure and shouldn't be a public endpoint.
  const secret = process.env.CRON_SECRET;
  const authed = secret && req.headers.get('authorization') === `Bearer ${secret}`;
  if (!authed) {
    const { authError } = await requireAdmin();
    if (authError) return authError;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const checkedAt = new Date().toISOString();

  let schema;
  try {
    schema = await checkSchema(url, key);
  } catch (err) {
    await raiseAlert({
      source: 'api/health', kind: 'check_failed', severity: 'critical',
      message: 'The scheduled health check could not read the database schema, so nothing is currently verifying that the booking forms still save.',
      context: { error: err?.message },
    });
    return NextResponse.json({ ok: false, checkedAt, error: err?.message }, { status: 500 });
  }

  if (!schema.ok) {
    // One alert naming every drifted table: four separate emails about one
    // migration would be four chances to skim past it.
    await raiseAlert({
      source: 'api/health', kind: 'schema_drift', severity: 'critical',
      message: `The database no longer matches what the forms send. ${schema.problems.length} write path(s) affected. Client submissions to these are being discarded.`,
      context: Object.fromEntries(schema.problems.map(p => [p.table, p.detail])),
    });
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  // Going live means swapping Stripe env vars by hand, which is exactly the
  // kind of step that gets half-done. Test keys in production decline every
  // real card, and a missing webhook secret means paid classes never finalize:
  // both are silent from the outside, so they get checked every day rather
  // than remembered.
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const stripe = {
    mode: stripeKey.startsWith('sk_live_') ? 'live' : stripeKey.startsWith('sk_test_') ? 'test' : 'unset',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'missing',
  };
  if (stripe.mode !== 'live' || stripe.webhookSecret === 'missing') {
    await raiseAlert({
      source: 'api/health', kind: 'stripe_misconfigured', severity: 'critical',
      message: stripe.mode !== 'live'
        ? `Production is running Stripe in ${stripe.mode} mode. Real cards will be declined, so nobody can buy a class.`
        : 'STRIPE_WEBHOOK_SECRET is missing in production, so paid classes will never be finalized: no confirmation, no Zoom link, no date.',
      context: stripe,
    });
  }

  // A rolling 24h window rather than "unresolved": alerts are emailed, not
  // triaged in an app, so nothing ever marks one handled and an all-time list
  // would report the site as unhealthy forever after a single old blip.
  let recentAlerts = [];
  try {
    const supabase = createClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('system_alerts')
      .select('id, created_at, source, kind, severity, message')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);
    recentAlerts = data || [];
  } catch { /* the alerts table not existing must not fail the schema check */ }

  return NextResponse.json({
    ok: schema.ok && stripe.mode === 'live' && stripe.webhookSecret === 'set' && recentAlerts.length === 0,
    checkedAt,
    schema: { ok: schema.ok, problems: schema.problems, tables: schema.tables },
    stripe,
    alertsLast24h: recentAlerts,
  }, { status: 200 });
}
