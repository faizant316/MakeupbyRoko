// The in-person class location. Set NEXT_PUBLIC_STUDIO_ADDRESS in Vercel to
// the full street address (e.g. "123 Example St, Mountain House, CA 95391")
// and it flows into the confirmation emails, the admin panel, and the maps
// link. Until it's set, copy falls back to the town with a "details before
// class" note so nothing ever emails out blank.

export const STUDIO_ADDRESS = process.env.NEXT_PUBLIC_STUDIO_ADDRESS || '';
export const STUDIO_TOWN = 'Mountain House, CA';
export const STUDIO_DISPLAY = STUDIO_ADDRESS || `${STUDIO_TOWN} (exact address shared before your class)`;
export const STUDIO_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO_ADDRESS || STUDIO_TOWN)}`;
