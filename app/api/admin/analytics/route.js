import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { OAuth2Client } from 'google-auth-library';

// Auth-gated (reads the session cookie), so it can never be statically rendered.
export const dynamic = 'force-dynamic';
import { requireAdmin } from '../../../../src/lib/requireAdmin';

const PROPERTY = `properties/${process.env.GA4_PROPERTY_ID || '536969013'}`;

function makeClient() {
  const auth = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return new BetaAnalyticsDataClient({ authClient: auth });
}

export async function GET() {
  const { authError } = await requireAdmin();
  if (authError) return authError;

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    return NextResponse.json({ notConfigured: true });
  }

  const ga    = makeClient();
  const range = [{ startDate: '30daysAgo', endDate: 'today' }];

  try {
    const [
      [overviewRes],
      [trafficRes],
      [pagesRes],
      [devicesRes],
      [locationRes],
      [realtimeRes],
    ] = await Promise.all([
      ga.runReport({
        property: PROPERTY,
        dateRanges: range,
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
        ],
      }),
      ga.runReport({
        property: PROPERTY,
        dateRanges: range,
        dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),
      ga.runReport({
        property: PROPERTY,
        dateRanges: range,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 7,
      }),
      ga.runReport({
        property: PROPERTY,
        dateRanges: range,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
      ga.runReport({
        property: PROPERTY,
        dateRanges: range,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 6,
      }),
      ga.runRealtimeReport({
        property: PROPERTY,
        metrics: [{ name: 'activeUsers' }],
      }),
    ]);

    const row0 = overviewRes.rows?.[0];
    const overview = row0 ? {
      activeUsers:        +row0.metricValues[0].value,
      sessions:           +row0.metricValues[1].value,
      avgSessionDuration: +row0.metricValues[2].value,
      newUsers:           +row0.metricValues[3].value,
      pageViews:          +row0.metricValues[4].value,
    } : null;

    const traffic = (trafficRes.rows || []).map(r => ({
      channel:  r.dimensionValues[0].value,
      sessions: +r.metricValues[0].value,
    }));

    const topPages = (pagesRes.rows || []).map(r => ({
      path:  r.dimensionValues[0].value,
      views: +r.metricValues[0].value,
    }));

    const devices = (devicesRes.rows || []).map(r => ({
      device: r.dimensionValues[0].value,
      users:  +r.metricValues[0].value,
    }));

    const locations = (locationRes.rows || []).map(r => ({
      country: r.dimensionValues[0].value,
      users:   +r.metricValues[0].value,
    }));

    const realtimeUsers = +(realtimeRes.rows?.[0]?.metricValues?.[0]?.value || 0);

    return NextResponse.json({ overview, traffic, topPages, devices, locations, realtimeUsers });
  } catch (err) {
    console.error('GA4 API error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
