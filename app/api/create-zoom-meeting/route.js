import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../src/lib/requireAdmin';
import { createZoomMeeting } from '../../../src/lib/zoomMeeting';

export async function POST(req) {
  try {
    const { authError } = await requireAdmin();
    if (authError) return authError;

    const { topic, duration = 30, date, time } = await req.json();
    const meeting = await createZoomMeeting({ topic, duration, date, time });
    return NextResponse.json(meeting);
  } catch (err) {
    console.error('create-zoom-meeting:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
