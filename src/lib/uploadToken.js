// The random string in a client's booking link.
//
// This token is the ONLY credential on the client-facing side of the site: with
// it you can read a booking in full (/api/get-booking-by-token), cancel it
// (/api/cancel-booking), re-sign its agreement (/api/resign-contract) and
// attach a deposit screenshot (/api/zelle-upload). There is no password behind
// it, so it has to be genuinely unguessable.
//
// It used to be `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
// which is neither: Date.now() is public knowledge (it is roughly when the
// confirmation email was sent) and Math.random() is a fast non-cryptographic
// PRNG, so the whole thing came to about 40 guessable bits. crypto.randomUUID
// is seeded by the OS and gives 122 bits that no amount of guessing reaches.
//
// The bridal flow stamps ONE token onto both the inquiry row and its booking
// row — that shared value is the exact 1:1 link the admin card pairs them by
// (see Admin.jsx) — so the token is still minted here on the client and sent
// with both inserts rather than being generated per-row on the server.
export function newUploadToken() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().replace(/-/g, '');
    if (typeof crypto.getRandomValues === 'function') {
      // Safari below 15.4 has getRandomValues but not randomUUID.
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  }
  // Unreachable in any browser this site supports, and deliberately loud rather
  // than silently handing back a weak token that looks just like a strong one.
  throw new Error('Secure random number generator unavailable');
}
