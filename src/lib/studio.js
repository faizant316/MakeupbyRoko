// The in-person class location. The real street address lives here as the
// default and flows into the confirmation emails, the admin panel, and the
// maps link. NEXT_PUBLIC_STUDIO_ADDRESS in Vercel overrides it (takes effect
// on the next deploy) if the studio ever moves.
// Note: Mountain House addresses also resolve under the legacy USPS city
// "Tracy, CA" with the same 95391 ZIP; both point to the same door.

export const STUDIO_ADDRESS = process.env.NEXT_PUBLIC_STUDIO_ADDRESS || '1301 S Durant Terrace, Mountain House, CA 95391';
export const STUDIO_TOWN = 'Mountain House, CA';
export const STUDIO_DISPLAY = STUDIO_ADDRESS || `${STUDIO_TOWN} (exact address shared before your class)`;
export const STUDIO_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO_ADDRESS || STUDIO_TOWN)}`;
