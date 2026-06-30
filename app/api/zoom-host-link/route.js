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

    // Preferred path: read the meeting. Its start_url carries a fresh host ZAK,
    // so opening it starts the meeting with Roko as the host.
    let startUrl = null;
    let joinUrl = null;

    const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const meeting = await res.json();
      startUrl = meeting.start_url || null;
      joinUrl = meeting.join_url || null;
    } else {
      const err = await res.json().catch(() => ({}));
      console.error('zoom-host-link meeting read failed:', res.status, JSON.stringify(err));
    }

    // Fallback: build the host link from a fresh ZAK token. This works even when
    // the app can't read the meeting (e.g. missing meeting:read scope), so Roko
    // never gets silently dropped in as a plain participant.
    if (!startUrl) {
      try {
        const zakRes = await fetch('https://api.zoom.us/v2/users/me/token?type=zak', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (zakRes.ok) {
          const { token: zak } = await zakRes.json();
          if (zak) startUrl = `https://zoom.us/s/${meetingId}?zak=${encodeURIComponent(zak)}`;
        } else {
          const zerr = await zakRes.json().catch(() => ({}));
          console.error('zoom-host-link zak failed:', zakRes.status, JSON.stringify(zerr));
        }
      } catch (e) {
        console.error('zoom-host-link zak error:', e);
      }
    }

    if (!startUrl) {
      return NextResponse.json(
        { error: 'Could not generate a host link for this meeting. Check Zoom app scopes (meeting:read / user:read).' },
        { status: 502 }
      );
    }

    return NextResponse.json({ start_url: startUrl, join_url: joinUrl });
  } catch (err) {
    console.error('zoom-host-link:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
