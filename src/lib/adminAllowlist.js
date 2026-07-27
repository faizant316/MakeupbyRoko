// Single source of truth for "who is allowed into the admin dashboard".
//
// Why an allowlist and not just "any logged-in user": the public anon key ships
// in the browser, and if Supabase email sign-ups are ever enabled a stranger
// could self-register an account. That account would be `authenticated`, which
// is all our old check looked for. Pinning to a short list of known emails means
// a random signup still can't touch admin pages or admin APIs.
//
// Override in prod by setting ADMIN_EMAILS (comma-separated) in Vercel. The
// baked-in fallback keeps things safe even if that env var is never set.
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'roko@makeupbyroko.org,faizant316@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());
}

// Who sees the plumbing. Roko is an admin, not an engineer: a red bar quoting a
// Postgres error code tells her the thing she paid for is broken, and gives her
// nothing she can act on. System alerts are for whoever maintains the site, so
// the failure banner and the alert emails go here rather than to every admin.
// Override with DEVELOPER_EMAILS (comma-separated) in Vercel.
export const DEVELOPER_EMAILS = (process.env.DEVELOPER_EMAILS || 'faizant316@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isDeveloperEmail(email) {
  return !!email && DEVELOPER_EMAILS.includes(String(email).toLowerCase());
}
