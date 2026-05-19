import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';

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

    // Build start_time from date + time if provided
    let start_time;
    if (date && time) {
      const [h, m] = time.replace(' AM', '').replace(' PM', '').split(':').map(Number);
      const isPM = time.includes('PM') && !time.startsWith('12');
      const isAM12 = time.startsWith('12') && time.includes('AM');
      const hour24 = isAM12 ? 0 : isPM ? h + 12 : h;
      const d = new Date(`${date}T${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      start_time = d.toISOString().replace('.000Z', 'Z');
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
          join_before_host: true,
          waiting_room: false,
          auto_recording: 'none',
        },
      }),
    });

    if (!meetingRes.ok) {
      const err = await meetingRes.json();
      throw new Error(err.message || 'Zoom meeting creation failed');
    }

    const meeting = await meetingRes.json();
    return NextResponse.json({ join_url: meeting.join_url, meeting_id: meeting.id, password: meeting.password });
  } catch (err) {
    console.error('create-zoom-meeting:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
