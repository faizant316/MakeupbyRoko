// Admin-side helpers for joining a Zoom meeting as the host.
//
// Notes stored against a lesson/consultation look like:
//   Link: https://zoom.us/j/...        (the client's join link)
//   MeetingId: 12345678901             (used to mint a fresh host link)
//   <any free-text notes>
//
// We never store the host start_url itself because its token expires in ~2 hrs.

export function parseMeetingId(notes) {
  if (!notes) return '';
  const m = notes.match(/^MeetingId: (\S+)\s*$/m);
  return m ? m[1] : '';
}

// Opens the meeting as host. Mints a fresh start_url from the meeting id, then
// navigates a tab to it. We open the blank tab synchronously (inside the click)
// so the browser's popup blocker lets it through, then redirect once we have the
// link. Falls back to the client join link if anything goes wrong.
export async function openZoomHost(meetingId, fallbackUrl) {
  const win = window.open('', '_blank');
  try {
    const res = await fetch('/api/zoom-host-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    });
    const data = await res.json();
    const url = data.start_url || fallbackUrl;
    if (!url) { if (win) win.close(); return; }
    if (win) win.location.href = url; else window.open(url, '_blank');
  } catch {
    if (fallbackUrl) { if (win) win.location.href = fallbackUrl; else window.open(fallbackUrl, '_blank'); }
    else if (win) win.close();
  }
}
