// Generate a fresh GOOGLE_REFRESH_TOKEN so the admin dashboard can read Google
// Analytics again. The old one returned `invalid_grant` (expired/revoked).
//
//   node scripts/google-oauth-token.mjs
//
// It reads GOOGLE_OAUTH_CLIENT_ID / _SECRET from .env.local, opens a Google
// consent URL, catches the redirect on a tiny local server, and writes the new
// refresh token straight back into .env.local.
//
// ONE-TIME prerequisites in Google Cloud Console (project that owns the client):
//   1. APIs & Services → OAuth consent screen → set Publishing status to
//      "In production". (In "Testing" mode Google expires refresh tokens after
//      7 days — the most likely reason this broke.)
//   2. APIs & Services → Credentials → your OAuth 2.0 Client → add this to
//      "Authorized redirect URIs":  http://localhost:4173/oauth2callback
//   3. Your Google account must have access to GA4 property 536969013.
import { readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { OAuth2Client } from 'google-auth-library';

const ENV_PATH = new URL('../.env.local', import.meta.url);
const raw = readFileSync(ENV_PATH, 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CLIENT_ID = env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORT = 4173;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.local');
  process.exit(1);
}

const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const authUrl = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',           // force Google to mint a brand-new refresh token
  scope: [SCOPE],
});

// Drop the URL to a file too, so it can be picked up without scraping stdout.
try { writeFileSync(new URL('../_oauth-url.txt', import.meta.url), authUrl); } catch { /* ok */ }

console.log('\nOpen this URL, sign in with the Analytics-owner Google account, and approve:\n');
console.log(authUrl + '\n');
console.log(`Waiting for the redirect to ${REDIRECT} ...\n`);

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) { res.writeHead(404); res.end(); return; }
  const url = new URL(req.url, REDIRECT);
  const err = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  if (err) {
    res.end('Consent error: ' + err + '. You can close this tab.');
    console.error('Consent error:', err);
    process.exit(1);
  }
  if (!code) { res.writeHead(400); res.end('No code in redirect.'); return; }
  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      res.end('No refresh token returned. Revoke access at myaccount.google.com/permissions and re-run.');
      console.error('\nNo refresh_token returned. Revoke prior access at https://myaccount.google.com/permissions then re-run.');
      process.exit(1);
    }
    const next = /^GOOGLE_REFRESH_TOKEN=/m.test(raw)
      ? raw.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
      : raw.trimEnd() + `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    writeFileSync(ENV_PATH, next);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2 style="font-family:sans-serif">Success. Refresh token captured.</h2><p style="font-family:sans-serif">You can close this tab and return to the terminal.</p>');
    console.log('\n✓ New GOOGLE_REFRESH_TOKEN written to .env.local');
    console.log('REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nNow also set this same value in Vercel (Settings -> Environment Variables -> GOOGLE_REFRESH_TOKEN) and redeploy.');
    server.close();
    setTimeout(() => process.exit(0), 300);
  } catch (e) {
    res.writeHead(500); res.end('Token exchange failed: ' + e.message);
    console.error('Token exchange failed:', e.message);
    process.exit(1);
  }
});
server.listen(PORT, () => {});
