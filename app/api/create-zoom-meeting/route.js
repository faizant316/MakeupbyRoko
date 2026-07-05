import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { parseRange } from '../../../src/lib/timeWindow';

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

    const { topic, duration = 30, date, time } = await req.json();

    const token = await getZoomToken();

    // Build start_time from date + time if provided. `time` may be a single
    // value ("1:00 PM") or a window ("1:00 PM – 1:30 PM") — only the start
    // matters for scheduling the meeting, so pull just that out first.
    let start_time;
    if (date && time) {
      const t = parseRange(time).start || time;
      const [h, m] = t.replace(/\s?(AM|PM)/gi, '').trim().split(':').map(Number);
      const isPM = /PM/i.test(t) && !t.trim().startsWith('12');
      const isAM12 = t.trim().startsWith('12') && /AM/i.test(t);
      const hour24 = isAM12 ? 0 : isPM ? h + 12 : h;
      if (!Number.isNaN(hour24) && !Number.isNaN(m)) {
        const d = new Date(`${date}T${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
        if (!Number.isNaN(d.getTime())) start_time = d.toISOString().replace('.000Z', 'Z');
      }
    }

    const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic || 'Makeup by Roko — Consultation',
        type: 2, // scheduled meeting
        duration,
        ...(start_time ? { start_time } : {}),
        settings: {
          // Host-controlled: the meeting can't start until Roko joins as host
          // (via start_url), and she gets the "End meeting for all" option.
          join_before_host: false,
          waiting_room: false,
          auto_recording: 'none',
        },
      }),
    });

    if (!meetingRes.ok) {
      const err = await meetingRes.json();
      console.error('Zoom meeting creation failed:', JSON.stringify(err));
      throw new Error(`Zoom error ${meetingRes.status}: ${err.message || JSON.stringify(err)}`);
    }

    const meeting = await meetingRes.json();
    return NextResponse.json({ join_url: meeting.join_url, start_url: meeting.start_url, meeting_id: meeting.id, password: meeting.password });
  } catch (err) {
    console.error('create-zoom-meeting:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
