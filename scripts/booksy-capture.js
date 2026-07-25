/* ============================================================
   BOOKSY CAPTURE  (browser console snippet, not a Node script)

   Booksy has no export and no public API, so we borrow the calls the
   Booksy web app already makes while Roko is logged in. This records
   those calls, replays the calendar one across a date range, and hands
   back a single JSON file for scripts/import-booksy-daysoff.mjs.

   HOW TO RUN
     1. Log into Booksy Biz in Chrome, open the Calendar.
     2. F12 -> Console. If Chrome blocks pasting, type: allow pasting
     3. Paste this whole file, press Enter.
     4. Click around the calendar: switch to month view, page forward a
        couple of months. This is what teaches it the calendar endpoint.
     5. Run:  await __booksy.replay(12)
     6. Run:  __booksy.save()          -> downloads booksy-capture.json
     7. Move that file into this repo's project root.

   Nothing is sent anywhere. It only reads what the page already loads,
   and the file stays on disk. It does contain a session token, so treat
   it like a password and delete it once the import is done.
   ============================================================ */

(() => {
  const HOST_RE = /booksy\.(com|net)/i;
  const API_RE = /\/api\//i;
  const MAX_BODY = 2_000_000; // don't hoard giant responses

  const store = {
    calls: [],       // { method, url, status, reqHeaders, body }
    auth: null,      // headers worth replaying with
    capturedAt: new Date().toISOString(),
  };

  const interesting = (url) => {
    try {
      const u = new URL(url, location.origin);
      return HOST_RE.test(u.host) && API_RE.test(u.pathname);
    } catch { return false; }
  };

  // Booksy authenticates with a handful of x- headers plus a bearer token.
  // Keep anything that smells like auth so replay looks identical to the app.
  const AUTH_HEADER_RE = /^(authorization|x-access-token|x-api-key|x-fingerprint|x-app|accept-language|content-type)$/i;

  const rememberAuth = (headers) => {
    const keep = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (AUTH_HEADER_RE.test(k)) keep[k] = v;
    }
    if (Object.keys(keep).length >= 2) store.auth = { ...(store.auth || {}), ...keep };
  };

  const record = (method, url, status, reqHeaders, body) => {
    if (!interesting(url)) return;
    rememberAuth(reqHeaders);
    store.calls.push({ method, url, status, body });
    log();
  };

  let logTimer;
  const log = () => {
    clearTimeout(logTimer);
    logTimer = setTimeout(() => {
      console.log(`%c[booksy] ${store.calls.length} calls captured${store.auth ? ', auth ✓' : ', auth not seen yet'}`,
        'color:#A0607A;font-weight:600');
    }, 400);
  };

  // ── fetch ────────────────────────────────────────────────
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    let reqHeaders = {};
    try {
      const h = init?.headers || (input instanceof Request ? input.headers : null);
      if (h instanceof Headers) h.forEach((v, k) => { reqHeaders[k] = v; });
      else if (Array.isArray(h)) h.forEach(([k, v]) => { reqHeaders[k] = v; });
      else if (h) reqHeaders = { ...h };
    } catch { /* header shapes vary, best effort */ }

    const res = await origFetch.apply(this, arguments);
    if (interesting(url)) {
      res.clone().text().then(txt => {
        let body = txt.slice(0, MAX_BODY);
        try { body = JSON.parse(txt); } catch { /* keep as text */ }
        record(init?.method || 'GET', url, res.status, reqHeaders, body);
      }).catch(() => {});
    }
    return res;
  };

  // ── XMLHttpRequest ───────────────────────────────────────
  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  const XH = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__bk = { method, url, headers: {} };
    return XO.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this.__bk) this.__bk.headers[k] = v;
    return XH.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (this.__bk) {
      this.addEventListener('load', () => {
        let body = (this.responseText || '').slice(0, MAX_BODY);
        try { body = JSON.parse(this.responseText); } catch { /* keep as text */ }
        record(this.__bk.method, this.__bk.url, this.status, this.__bk.headers, body);
      });
    }
    return XS.apply(this, arguments);
  };

  // ── replay across a date range ───────────────────────────
  // Finds the captured GET that carries YYYY-MM-DD params (that's the
  // calendar/agenda feed) and re-requests it month by month so we get
  // every day off, not just the month she happened to be looking at.
  const DATEISH = /(date|from|to|start|end|since|until)/i;

  const dateParams = (url) => {
    const u = new URL(url, location.origin);
    const hits = [];
    u.searchParams.forEach((v, k) => {
      if (DATEISH.test(k) && /^\d{4}-\d{2}-\d{2}/.test(v)) hits.push(k);
    });
    return hits;
  };

  const candidates = () =>
    store.calls
      .filter(c => (c.method || 'GET').toUpperCase() === 'GET' && c.status === 200 && dateParams(c.url).length)
      // de-dupe by path, keep the one with the most date params (widest window)
      .reduce((acc, c) => {
        const path = new URL(c.url, location.origin).pathname;
        const prev = acc.get(path);
        if (!prev || dateParams(c.url).length > dateParams(prev.url).length) acc.set(path, c);
        return acc;
      }, new Map());

  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  window.__booksy = {
    store,

    calendars() {
      const c = [...candidates().values()];
      console.table(c.map(x => ({ path: new URL(x.url).pathname, params: dateParams(x.url).join(', ') })));
      return c;
    },

    // months: how far ahead to walk. Also walks 1 month back for context.
    async replay(months = 12) {
      const targets = [...candidates().values()];
      if (!targets.length) {
        console.warn('[booksy] No calendar-looking request captured yet. Switch to month view and page forward once, then re-run.');
        return;
      }
      if (!store.auth) console.warn('[booksy] No auth headers captured; replay may 401.');

      let added = 0;
      for (const t of targets) {
        const keys = dateParams(t.url);
        const start = new Date(); start.setDate(1); start.setMonth(start.getMonth() - 1);

        for (let i = 0; i <= months; i++) {
          const from = new Date(start.getFullYear(), start.getMonth() + i, 1);
          const to = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);
          const u = new URL(t.url);

          // Params named *from/start/since get the month start, the rest the month end.
          keys.forEach(k => u.searchParams.set(k, /from|start|since/i.test(k) ? ymd(from) : ymd(to)));
          if (keys.length === 1) u.searchParams.set(keys[0], ymd(from));

          try {
            const res = await origFetch(u.toString(), { headers: store.auth || {}, credentials: 'include' });
            const txt = await res.text();
            let body = txt.slice(0, MAX_BODY);
            try { body = JSON.parse(txt); } catch { /* keep as text */ }
            store.calls.push({ method: 'GET', url: u.toString(), status: res.status, body, replayed: true });
            added++;
            if (res.status !== 200) console.warn(`[booksy] ${res.status} on ${ymd(from)}`);
          } catch (e) {
            console.warn('[booksy] replay failed', ymd(from), e.message);
          }
          await new Promise(r => setTimeout(r, 250)); // be polite to their API
        }
      }
      console.log(`%c[booksy] replay done, +${added} responses. Now run __booksy.save()`, 'color:#2563EB;font-weight:600');
    },

    save(filename = 'booksy-capture.json') {
      const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      console.log(`%c[booksy] saved ${filename} (${store.calls.length} calls)`, 'color:#2563EB;font-weight:600');
    },

    help() {
      console.log([
        'Click around the calendar first (month view, page forward once).',
        '  __booksy.calendars()   see which endpoints look like the calendar',
        '  await __booksy.replay(12)   pull the next 12 months',
        '  __booksy.save()        download booksy-capture.json',
      ].join('\n'));
    },
  };

  console.log('%c[booksy] capture armed. Click around the calendar, then run __booksy.help()', 'color:#A0607A;font-weight:600;font-size:13px');
})();
