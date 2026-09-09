#!/usr/bin/env node
// Scroll regression check for the Lenis-driven modals.
//
// WHY THIS EXISTS
// Every booking sheet on this site scrolls through Lenis rather than natively
// (see src/lib/modalLenis.js). Lenis caches the scrollable height instead of
// reading it every frame, and when that cache goes stale the sheet silently
// refuses to scroll past wherever the content used to end. Nothing throws,
// nothing logs, the build is green, and the only symptom is a client who
// cannot reach the rest of the form.
//
// That shipped once: Lenis was watching the sheet's first child for size
// changes, which is a strip that is hidden on desktop and never changes
// height, so choosing "Roko travels to me" unfolded an explainer, an address
// field and a price breakdown that were all unreachable.
//
// So this asserts the one invariant that catches the whole class of bug:
//
//     lenis.limit === el.scrollHeight - el.clientHeight
//
// If those ever disagree, some part of the sheet cannot be scrolled to.
//
// USAGE
//   npm run test:scroll                 # starts its own server, checks, exits
//   E2E_URL=http://localhost:3000 npm run test:scroll   # use a running one
//   HEADED=1 npm run test:scroll        # watch it drive the browser
//
// The server it starts builds into .next-e2e (see NEXT_DIST_DIR in
// next.config.mjs) so it can never scribble on a dev server someone else has
// open, which is a failure mode this repo has already had.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.E2E_PORT || 3210);
const EXTERNAL = process.env.E2E_URL;
const BASE = EXTERNAL || `http://localhost:${PORT}`;
const HEADED = Boolean(process.env.HEADED);

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const failures = [];
const notes = [];
function pass(msg) { console.log(`  \x1b[32mok\x1b[0m    ${msg}`); }
function fail(msg) { console.log(`  \x1b[31mFAIL\x1b[0m  ${msg}`); failures.push(msg); }
function note(msg) { console.log(`        ${msg}`); notes.push(msg); }

// ── server ──────────────────────────────────────────────────────────────────

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

async function startServer() {
  if (EXTERNAL) {
    if (!(await reachable(EXTERNAL))) {
      console.error(`Nothing answering at ${EXTERNAL}.`);
      process.exit(1);
    }
    console.log(`Using the server already running at ${EXTERNAL}\n`);
    return null;
  }
  if (await reachable(BASE)) {
    console.log(`Reusing the server already on port ${PORT}\n`);
    return null;
  }
  console.log(`Starting a dev server on port ${PORT} (building into .next-e2e)…`);
  const proc = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'dev', '-p', String(PORT)],
    { env: { ...process.env, NEXT_DIST_DIR: '.next-e2e' }, stdio: 'ignore', shell: process.platform === 'win32' }
  );
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (await reachable(BASE)) { console.log('Server up.\n'); return proc; }
    await new Promise(r => setTimeout(r, 1500));
  }
  proc.kill();
  console.error('Server never came up within 3 minutes.');
  process.exit(1);
}

// ── the invariant ───────────────────────────────────────────────────────────

// Read every Lenis-driven modal scroller on the page and compare what Lenis
// believes it can scroll against what the DOM actually needs.
function measure(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-modal-scroll]')) {
      const lenis = el.__modalLenis;
      out.push({
        hasLenis: Boolean(lenis),
        // What the DOM says is scrollable.
        native: el.scrollHeight - el.clientHeight,
        // What Lenis will actually let you reach.
        limit: lenis ? lenis.limit : el.scrollHeight - el.clientHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      });
    }
    return out;
  });
}

// Lenis resizes off a ResizeObserver, which lands on a later frame than the
// click that grew the content. Give it a couple of frames before judging it.
async function settle(page) {
  await page.waitForTimeout(250);
}

async function expectReachable(page, label) {
  await settle(page);
  const scrollers = await measure(page);
  if (scrollers.length === 0) { fail(`${label}: no modal scroller on the page`); return; }
  for (const s of scrollers) {
    if (!s.hasLenis) { note(`${label}: scroller is native (reduced motion?), skipped`); continue; }
    const drift = Math.abs(s.limit - s.native);
    if (drift > 2) {
      fail(
        `${label}: Lenis stops at ${Math.round(s.limit)}px but the content needs ` +
        `${Math.round(s.native)}px. ${Math.round(drift)}px of this sheet cannot be reached.`
      );
    } else {
      pass(`${label}: scrollable to the end (${Math.round(s.native)}px)`);
    }
  }
}

// Belt and braces: actually drive the scroller to the bottom and confirm the
// last thing in it is on screen. The invariant above should make this
// redundant, and if it ever isn't, this is the check that says so.
async function expectBottomVisible(page, label) {
  const reached = await page.evaluate(async () => {
    const el = document.querySelector('[data-modal-scroll]');
    if (!el) return null;
    const lenis = el.__modalLenis;
    if (lenis) lenis.scrollTo(lenis.limit, { immediate: true });
    else el.scrollTop = el.scrollHeight;
    await new Promise(r => setTimeout(r, 300));
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    return { gap: Math.round(gap) };
  });
  if (!reached) { fail(`${label}: no scroller to drive`); return; }
  if (reached.gap > 4) fail(`${label}: scrolled as far as it goes and still ${reached.gap}px short of the bottom`);
  else pass(`${label}: reaches the bottom`);
}

// ── driving the booking sheet ───────────────────────────────────────────────

async function openNonBridalSheet(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // The homepage renders client-side, so wait for real content, not the shell.
  await page.getByRole('button', { name: 'Book Now' }).first().waitFor({ timeout: 60000 });
  // "Non-Bridal Makeup" is the service the reported bug was filed against.
  const card = page.locator('div').filter({ hasText: /^Non-Bridal Makeup/ }).last();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  const book = card.getByRole('button', { name: 'Book Now' }).last();
  if (await book.count()) await book.click();
  else await page.getByRole('button', { name: 'Book Now' }).last().click();
  await page.locator('[data-modal-scroll]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(700); // sheet entrance animation
}

// Click the first day the calendar will actually accept.
async function pickADate(page) {
  const days = page.locator('[data-modal-scroll] button:not([disabled])');
  const n = await days.count();
  for (let i = 0; i < n; i++) {
    const d = days.nth(i);
    const text = ((await d.textContent()) || '').trim();
    if (!/^\d{1,2}$/.test(text)) continue;
    if (!(await d.isVisible())) continue;
    await d.click();
    // The footer CTA only turns into "Continue" once a date is really selected.
    const cta = page.getByRole('button', { name: /Continue/ });
    if (await cta.count()) return true;
  }
  return false;
}

async function runFlow(page, vp) {
  console.log(`\n\x1b[1m${vp.name} (${vp.width}x${vp.height})\x1b[0m`);

  await openNonBridalSheet(page);
  await expectReachable(page, 'step 1, date');

  if (!(await pickADate(page))) { fail(`${vp.name}: could not select any date`); return; }
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByText("What's the occasion?").waitFor({ timeout: 15000 });
  await expectReachable(page, 'step 2, details');

  // Growing the form is the actual regression. Each of these unfolds content
  // BELOW the fold, which is exactly what a stale scroll limit hides.
  await page.getByRole('button', { name: 'Other' }).click();
  await expectReachable(page, 'step 2, after "Other" opens its text box');

  await page.getByRole('button', { name: 'Roko travels to me' }).click();
  await expectReachable(page, 'step 2, after choosing travel');
  await expectBottomVisible(page, 'step 2, after choosing travel');

  // And back down again — shrinking has to re-measure too, or the sheet keeps
  // a phantom empty space under it.
  await page.getByRole('button', { name: "Roko's studio" }).click();
  await expectReachable(page, 'step 2, after switching back to the studio');
}

// ── main ────────────────────────────────────────────────────────────────────

const server = await startServer();
const browser = await chromium.launch({ headless: !HEADED });
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    });
    const page = await context.newPage();
    page.on('pageerror', e => fail(`${vp.name}: page threw "${e.message}"`));
    try {
      await runFlow(page, vp);
    } catch (err) {
      fail(`${vp.name}: ${err.message.split('\n')[0]}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

console.log('');
if (failures.length) {
  console.log(`\x1b[31m${failures.length} scroll problem${failures.length > 1 ? 's' : ''}:\x1b[0m`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\x1b[32mEvery modal scrolls to the end of its content.\x1b[0m');
