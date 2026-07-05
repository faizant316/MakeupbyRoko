import { parseRange } from './timeWindow';

// Server-side Zoom meeting creation, shared by the admin "Generate Zoom Link"
// route and the class-checkout finalizer (which auto-creates the meeting the
// moment an online class is paid for).

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

// `time` may be a single value ("1:00 PM") or a window ("1:00 PM – 2:30 PM");
// only the start matters for scheduling. The start_time is sent WITHOUT a Z
// suffix alongside an explicit Pacific timezone, so a 11:00 AM class is
// 11:00 AM for Roko no matter where the server runs (Vercel is UTC).
export async function createZoomMeeting({ topic, duration = 30, date, time }) {
  const token = await getZoomToken();

  let start_time;
  if (date && time) {
    const t = parseRange(time).start || time;
    const [h, m] = t.replace(/\s?(AM|PM)/gi, '').trim().split(':').map(Number);
    const isPM = /PM/i.test(t) && !t.trim().startsWith('12');
    const isAM12 = t.trim().startsWith('12') && /AM/i.test(t);
    const hour24 = isAM12 ? 0 : isPM ? h + 12 : h;
    if (!Number.isNaN(hour24) && !Number.isNaN(m)) {
      start_time = `${date}T${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }
  }

  const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: topic || 'Makeup by Roko — Consultation',
      type: 2, // scheduled meeting
      duration,
      ...(start_time ? { start_time, timezone: 'America/Los_Angeles' } : {}),
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
  return { join_url: meeting.join_url, start_url: meeting.start_url, meeting_id: meeting.id, password: meeting.password };
}
