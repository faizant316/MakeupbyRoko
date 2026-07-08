// Zoom helpers for the admin dashboard.
//
// Every meeting is created as an open "room": anyone with the join link can
// enter at any time and the meeting starts without a host (see
// createZoomMeeting). So Roko and the client use the SAME join link — there is
// no host vs. participant split and no "waiting for the host." These helpers
// just read the stored link/id and open that shared room.
//
// Notes stored against a lesson/consultation look like:
//   Link: https://zoom.us/j/...        (the shared room link)
//   MeetingId: 12345678901
//   <any free-text notes>

export function parseMeetingId(notes) {
  if (!notes) return '';
  const m = notes.match(/^MeetingId: (\S+)\s*$/m);
  return m ? m[1] : '';
}

// A Zoom join link embeds the meeting id in its /j/<id> path, e.g.
// https://us05web.zoom.us/j/12345678901?pwd=… -> 12345678901.
export function meetingIdFromUrl(url) {
  if (!url) return '';
  const m = String(url).match(/\/j\/(\d+)/);
  return m ? m[1] : '';
}

// The shared room URL. Prefer the stored join link; otherwise rebuild a valid
// join link from the meeting id, so older id-only notes still open the room.
export function zoomRoomUrl(joinUrl, meetingId) {
  if (joinUrl) return joinUrl;
  if (meetingId) return `https://zoom.us/j/${meetingId}`;
  return '';
}

// Open the Zoom room in a new tab. Same link for Roko and the client — whoever
// opens it just joins. No server round-trip, so the click always does something.
export function openZoomRoom(joinUrl, meetingId) {
  const url = zoomRoomUrl(joinUrl, meetingId);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
