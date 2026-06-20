import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

// A meeting's start_url (the host link) carries a short-lived ZAK token that
// expires ~2 hours after it's generated, so a link stored at schedule time is
// useless for a lesson days away. Instead we store only the meeting id and mint
// a fresh host link on demand, right when Roko taps "Join as host".

async function getZoomToken() {
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token error: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { meetingId } = await req.json();
    if (!meetingId) {
      return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 });
    }

    const token = await getZoomToken();

    const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('zoom-host-link fetch failed:', JSON.stringify(err));
      return NextResponse.json({ error: err.message || `Zoom error ${res.status}` }, { status: res.status });
    }

    const meeting = await res.json();
    return NextResponse.json({ start_url: meeting.start_url, join_url: meeting.join_url });
  } catch (err) {
    console.error('zoom-host-link:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
