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

// A Zoom join link embeds the meeting id in its /j/<id> path, e.g.
// https://us05web.zoom.us/j/12345678901?pwd=… -> 12345678901. We use this to
// recover a host-capable meeting id for older / manually-scheduled consultations
// that only stored a "Link:" line (no explicit "MeetingId:"), so "Join as host"
// works for them too instead of dropping Roko in as a waiting participant.
export function meetingIdFromUrl(url) {
  if (!url) return '';
  const m = String(url).match(/\/j\/(\d+)/);
  return m ? m[1] : '';
}

// Opens the meeting as host. Mints a fresh start_url from the meeting id, then
// navigates a tab to it. We open the blank tab synchronously (inside the click)
// so the browser's popup blocker lets it through, then redirect once we have the
// link.
//
// Critically, we do NOT silently fall back to the client join link: opening that
// drops Roko in as a plain participant who's stuck "waiting for the host." If the
// host link can't be minted we close the tab and tell her why, only opening the
// participant link if she explicitly chooses to.
export async function openZoomHost(meetingId, fallbackUrl) {
  const win = window.open('', '_blank');

  const offerParticipant = (reason) => {
    if (win) win.close();
    const joinAnyway = fallbackUrl && window.confirm(
      `${reason}\n\nOpen the meeting as a participant instead? You will NOT be the host, and you'll wait until the host starts it.`
    );
    if (joinAnyway) window.open(fallbackUrl, '_blank');
  };

  try {
    const res = await fetch('/api/zoom-host-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.start_url) {
      if (win) win.location.href = data.start_url; else window.open(data.start_url, '_blank');
      return;
    }

    offerParticipant(data.error || `Couldn't generate the host link (HTTP ${res.status}).`);
  } catch (err) {
    offerParticipant(`Couldn't reach the host-link service (${err?.message || 'network error'}).`);
  }
}
