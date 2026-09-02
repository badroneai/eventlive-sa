import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { OWNER_ONLY_PAGES } from './owner-only-pages.mjs';
import { riyadhDateKey } from './riyadh-date-utils.mjs';

// WO-7 gate: "every event that spans more than one day must make that
// visible ON ITS CARD, everywhere cards appear, for all current/ongoing
// and upcoming events" (ended events are archival — out of scope by
// doctrine). The pre-WO-7 defect class was duplicated card renderers with
// divergent date logic: homeEventCard already showed the range,
// eventCard (the shared renderer behind every facet/temporal page) did
// not, and neither did the three vanilla-JS client renderers baked into
// dist/events.html, dist/today.html, dist/my-events.html.
//
// WO-7b corrective round: the WO-7 gate above only checked that the
// range/continuation text was PRESENT in a card's markup somewhere. The
// owner rejected that outcome on live review — the text was landing in
// card-meta (or a meta/label line on the client renderers), never in the
// prominent top date badge the owner actually looks at
// (`.date-tab`/`.event-date-pill`/the date chip). "Present in the DOM,
// invisible to the user" is now a class-ban: Part 4 below asserts actual
// visibility (offsetParent + bounding box), not just text matching.
//
// This test has four parts:
//   1. A static sweep of every public dist/**.html page (AR + dist/en/**)
//      for server-rendered `<article class="card" data-event-start=...>`
//      cards — both eventCard and homeEventCard emit that exact marker
//      attribute set. Any such card whose start/end fall on different
//      Riyadh calendar days and whose status isn't "ended" must carry an
//      accepted range/continuation marker in its visible text.
//   2. Built-output guard assertions on the three committed dist shells
//      whose card-building JS lives directly in the file (no bundler, no
//      generate-site.mjs template — WO-3's riyadhDayKey precedent): if
//      the shell drifts and loses multiDayRangeLabel, nothing else in the
//      battery would catch it.
//   3. Synthetic-fixture coverage for those same three client renderers,
//      using Playwright to actually load the pages with mocked
//      multi-day/single-day/ended events and read the rendered DOM — the
//      static sweep can't see their cards because they don't exist until
//      client JS runs.
//   4. (WO-7b) A real-browser VISIBILITY audit — not text matching — at
//      360px and 1280px, against both the real built pages and the three
//      fixture surfaces, using the same algorithm the PM's own live-site
//      audit uses: find `.date-tab` (falling back to a `.chip` carrying a
//      digit + month name), require offsetParent !== null and a non-zero
//      bounding box, and require at least two day numbers in its text.

const root = process.cwd();
const distDir = path.join(root, 'dist');
const enDir = path.join(distDir, 'en');

assert.ok(fs.existsSync(distDir), 'dist must exist; run npm run build first');

// Accepted markers, matching the PM-approved exception for board-live cards
// ("حتى {end}" continuation is acceptable visibility of continuation) and
// the EN translations already verified live (see scripts/event-date-range.mjs
// header comment + locales pattern in generate-localized-site.mjs).
const RANGE_MARKER_AR = /من[\s\S]{1,40}إلى/u;
const RANGE_MARKER_EN = /from[\s\S]{1,40}to\b/i;
const CONTINUATION_MARKER_AR = /حتى/u;
const CONTINUATION_MARKER_EN = /\b(until|through)\b/i;

function hasAcceptedMarker(text) {
  return RANGE_MARKER_AR.test(text)
    || RANGE_MARKER_EN.test(text)
    || CONTINUATION_MARKER_AR.test(text)
    || CONTINUATION_MARKER_EN.test(text);
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function walkHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtmlFiles(filePath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(filePath);
  }
  return files;
}

// -----------------------------------------------------------------------
// Part 1: static sweep of every server-rendered `.card` across the public
// build (AR root + dist/en/**), owner-only pages excluded — this is the
// gate the owner directive asked for, on the two renderers
// (eventCard/homeEventCard) that produce it.
// -----------------------------------------------------------------------

const CARD_BLOCK_RE = /<article class="card" data-event-start="([^"]*)" data-event-end="([^"]*)" data-event-status="([^"]*)">([\s\S]*?)<\/article>/g;

function isOwnerOnlyPath(filePath) {
  const base = path.basename(filePath);
  return OWNER_ONLY_PAGES.has(base);
}

function sweepFiles(files, label) {
  const failures = [];
  let cardsSeen = 0;
  let multiDayCardsSeen = 0;
  for (const filePath of files) {
    if (isOwnerOnlyPath(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    for (const match of html.matchAll(CARD_BLOCK_RE)) {
      const [, start, end, status, body] = match;
      cardsSeen += 1;
      if (status === 'ended') continue;
      const startKey = riyadhDateKey(start);
      const endKey = riyadhDateKey(end);
      if (!startKey || !endKey || startKey === endKey) continue;
      multiDayCardsSeen += 1;
      const visibleText = stripTags(body);
      if (!hasAcceptedMarker(visibleText)) {
        failures.push(`${path.relative(root, filePath)} [${label}]: multi-day card (status="${status}", ${start} → ${end}) has no visible range/continuation marker — text: "${visibleText.slice(0, 160)}"`);
      }
    }
  }
  return { failures, cardsSeen, multiDayCardsSeen };
}

// dist/en is nested inside dist/, so the AR sweep walks every top-level
// entry except the "en" directory to avoid double-counting its pages under
// the AR label.
const arFiles = fs.readdirSync(distDir, { withFileTypes: true })
  .filter((entry) => entry.name !== 'en')
  .flatMap((entry) => {
    const filePath = path.join(distDir, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(filePath);
    return entry.name.endsWith('.html') ? [filePath] : [];
  });
const enFiles = fs.existsSync(enDir) ? walkHtmlFiles(enDir) : [];

const arOnly = sweepFiles(arFiles, 'AR');
const enOnly = sweepFiles(enFiles, 'EN');

const staticFailures = [...arOnly.failures, ...enOnly.failures];
const staticSummary = {
  arCardsSeen: arOnly.cardsSeen,
  arMultiDayCardsSeen: arOnly.multiDayCardsSeen,
  enCardsSeen: enOnly.cardsSeen,
  enMultiDayCardsSeen: enOnly.multiDayCardsSeen,
  totalFailures: staticFailures.length
};

console.log(`[multiday-card] static sweep: AR ${staticSummary.arCardsSeen} cards / ${staticSummary.arMultiDayCardsSeen} multi-day, EN ${staticSummary.enCardsSeen} cards / ${staticSummary.enMultiDayCardsSeen} multi-day, ${staticSummary.totalFailures} failing`);

assert.ok(arOnly.cardsSeen > 50, `suspiciously few AR cards found (${arOnly.cardsSeen}) — the sweep must run on a complete build`);
assert.ok(arOnly.multiDayCardsSeen > 0, 'the sweep found no multi-day cards at all — fixture/catalog data must include at least one multi-day event to exercise this gate');

assert.equal(
  staticFailures.length,
  0,
  `${staticFailures.length} card(s) span more than one Riyadh day, are not ended, and show no range/continuation marker:\n${staticFailures.slice(0, 25).join('\n')}${staticFailures.length > 25 ? `\n...and ${staticFailures.length - 25} more` : ''}`
);

// -----------------------------------------------------------------------
// Part 2: built-output guard assertions — the three client renderers whose
// card-building JS is hand-edited directly into the committed dist shell
// (no generate-site.mjs template regenerates them; see WO-3's
// riyadhDayKey precedent in dist/today.html). If any of the three ever
// drifts back to a bare fmtDate(starts_at) call with no
// multiDayRangeLabel, nothing in the static sweep above can see it
// (client-built cards don't exist in the shipped HTML) — these guards are
// the only thing standing between a shell edit and a silent regression.
// -----------------------------------------------------------------------

const clientShells = [
  { file: 'events.html', calls: ['multiDayRangeLabel(event)'] },
  { file: 'today.html', calls: ['multiDayRangeLabel(event)'] },
  { file: 'my-events.html', calls: ['multiDayRangeLabel(event)'] }
];

for (const shell of clientShells) {
  const shellPath = path.join(distDir, shell.file);
  assert.ok(fs.existsSync(shellPath), `dist/${shell.file} must exist; run npm run build first`);
  const html = fs.readFileSync(shellPath, 'utf8');
  assert.match(
    html,
    /function multiDayRangeLabel\(event\)/,
    `dist/${shell.file} no longer defines multiDayRangeLabel — the WO-7 client-side multi-day range helper was removed or the shell drifted. Re-port it from the other two shells / scripts/event-date-range.mjs.`
  );
  assert.match(
    html,
    /function isMultiDayEventClient\(event\)/,
    `dist/${shell.file} no longer defines isMultiDayEventClient — the WO-7 client-side multi-day predicate was removed or the shell drifted.`
  );
  for (const call of shell.calls) {
    assert.ok(
      html.includes(call),
      `dist/${shell.file} no longer calls ${call} from its card renderer — the WO-7 wiring was removed or the shell drifted, so the client-rendered cards would silently go back to showing only a bare start date.`
    );
  }
}

// -----------------------------------------------------------------------
// Part 3: synthetic-fixture coverage — actually run the three client
// renderers in a browser against controlled fixture data (a multi-day
// upcoming event, a single-day upcoming event, and a multi-day ENDED
// event that must NOT show the range) and read the rendered card text.
// -----------------------------------------------------------------------

const port = Number(process.env.EVENTLIVE_MULTIDAY_TEST_PORT || 4196);

function contentType(filePath) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml'
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', `http://127.0.0.1:${port}`).pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(distDir, relative));
    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(filePath), 'cache-control': 'no-store' });
    fs.createReadStream(filePath).pipe(response);
  });
  server.listen(port, '127.0.0.1');
  return server;
}

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

// WO-7b bugfix: "NOW + N days" inherits whatever time-of-day the test
// happens to run at. A single-day fixture built that way (start + a few
// hours) can silently cross a Riyadh calendar-day boundary depending on
// wall-clock time, making isMultiDayEvent() correctly — but flakily —
// report it as multi-day. Anchor every fixture to a fixed, safe
// mid-morning Riyadh time so day-count math is deterministic regardless
// of when this test executes.
function riyadhAnchor(daysFromNow) {
  const base = new Date(NOW + daysFromNow * DAY_MS);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Riyadh'
  }).formatToParts(base).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  // 09:00 Riyadh (UTC+3) == 06:00 UTC — nowhere near a midnight boundary.
  return new Date(`${parts.year}-${parts.month}-${parts.day}T06:00:00.000Z`).getTime();
}

function fixtureEvent(overrides) {
  return {
    id: 'fixture-multiday-upcoming',
    slug: 'fixture-multiday-upcoming',
    title: 'Fixture Multi-Day Event',
    organizer: 'EventLive QA',
    city: 'Riyadh',
    city_label: 'الرياض',
    venue: 'Riyadh Front',
    category: 'conference',
    category_label: 'مؤتمر',
    summary: 'Synthetic fixture for WO-7 regression coverage.',
    detail_url: './events/fixture-multiday-upcoming.html',
    url: './events/fixture-multiday-upcoming.html',
    live_url: '',
    ics_url: './events/fixture-multiday-upcoming.ics',
    calendar_url: './events/fixture-multiday-upcoming.ics',
    directions_url: '#',
    status: 'upcoming',
    status_label: 'قادمة',
    live_schedule_ready: false,
    signage_url: '',
    audience_urls: [],
    sessions_count: 1,
    tracks_count: 1,
    rooms_count: 1,
    live_updates_count: 0,
    approval_status_label: 'منشور',
    ...overrides
  };
}

// Deliberately different start times (not just different end times) so the
// fixture cards can be told apart by their data-event-start attribute alone
// once rendered — two cards sharing an identical start would make the
// find()-by-start lookups below ambiguous.
const multiDayUpcoming = fixtureEvent({
  id: 'fixture-multiday-upcoming',
  title: 'Fixture Multi-Day Upcoming',
  starts_at: new Date(riyadhAnchor(5)).toISOString(),
  ends_at: new Date(riyadhAnchor(8)).toISOString(),
  status: 'upcoming',
  status_label: 'قادمة'
});
const singleDayUpcoming = fixtureEvent({
  id: 'fixture-singleday-upcoming',
  title: 'Fixture Single-Day Upcoming',
  starts_at: new Date(riyadhAnchor(12)).toISOString(),
  ends_at: new Date(riyadhAnchor(12) + 3 * 60 * 60 * 1000).toISOString(),
  status: 'upcoming',
  status_label: 'قادمة'
});
const multiDayEnded = fixtureEvent({
  id: 'fixture-multiday-ended',
  title: 'Fixture Multi-Day Ended',
  starts_at: new Date(riyadhAnchor(-10)).toISOString(),
  ends_at: new Date(riyadhAnchor(-7)).toISOString(),
  status: 'ended',
  status_label: 'منتهية'
});

// WO-7b: read both the text AND the actual rendered visibility of a
// card's date element, using the exact algorithm the PM's own live-site
// audit uses — prefer `.date-tab`, fall back to a `.chip` carrying a
// digit + month name, and only count it "visible" if it has a non-null
// offsetParent and a non-zero-width bounding box. This is what catches
// "present in the DOM, invisible to the user" (the owner's rejection).
// Returns one row per data-event-start/-end card on the page, WITHOUT
// pre-filtering to multi-day (that decision is made by the caller in
// Node — a fixture surface needs the single-day card's row too, to prove
// it does NOT get a false-positive dual-date element).
function dualDateAuditFn() {
  const cards = [...document.querySelectorAll('[data-event-start][data-event-end]')];
  return cards.map((c) => {
    const s = (c.dataset.eventStart || '').slice(0, 10);
    const e = (c.dataset.eventEnd || '').slice(0, 10);
    const st = c.dataset.eventStatus || '';
    const dateEl = c.querySelector('.date-tab') || [...c.querySelectorAll('.chip')].find((x) => /\d/.test(x.textContent) && /(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر|January|February|March|April|May|June|July|August|September|October|November|December)/.test(x.textContent));
    const visible = Boolean(dateEl) && dateEl.offsetParent !== null && dateEl.getBoundingClientRect().width > 0;
    const txt = dateEl ? dateEl.textContent.replace(/\s+/g, ' ').trim() : '(no date element)';
    const nums = (txt.match(/[\d٠-٩]+/g) || []).length;
    return {
      start: c.dataset.eventStart,
      end: c.dataset.eventEnd,
      status: st,
      isMultiDay: Boolean(s && e && s !== e),
      dateText: txt,
      visible,
      dayNumbers: nums,
      ok: visible && nums >= 2
    };
  });
}

const VIEWPORTS = [
  { width: 360, height: 800, label: '360px' },
  { width: 1280, height: 900, label: '1280px' }
];

async function runBrowserFixtures(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const results = {};
  // events.html: mock the events-catalog.json fetch with our fixture
  // rows (the page's own eventsFeedUrl constant — not events.json).
  {
    const page = await context.newPage();
    await page.route('**/events-catalog.json', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generated_at: new Date().toISOString(),
        platform: 'EventLive',
        canonical_domain: 'eventme.live',
        catalog_source: 'fixture',
        events: [multiDayUpcoming, singleDayUpcoming, multiDayEnded]
      })
    }));
    await page.goto(`http://127.0.0.1:${port}/events.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#eventGrid .event-card', { timeout: 8000 });
    results.eventsHtml = await page.evaluate(dualDateAuditFn);
    await page.close();
  }

  // today.html: mock the today.json fetch — renderCard only sees
  // sortedActionable() rows, which already exclude ended events, so the
  // ended fixture is intentionally left out of this payload's queue.
  {
    const page = await context.newPage();
    await page.route('**/today.json', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generated_at: new Date().toISOString(),
        platform: 'EventLive',
        canonical_domain: 'eventme.live',
        timezone: 'Asia/Riyadh',
        intent: 'attendance',
        storage_key: 'eventlive-saved-events',
        queue: [multiDayUpcoming, singleDayUpcoming],
        live_updates: [],
        signals: {},
        links: {}
      })
    }));
    await page.goto(`http://127.0.0.1:${port}/today.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.event-card', { timeout: 8000 });
    results.todayHtml = await page.evaluate(dualDateAuditFn);
    await page.close();
  }

  // my-events.html: seed localStorage with saved-event records (the
  // shape eventSaveRecord() in dist/events.html actually writes) before
  // the page's own render() runs on load.
  {
    const page = await context.newPage();
    const records = {};
    for (const event of [multiDayUpcoming, singleDayUpcoming, multiDayEnded]) {
      records[event.id] = {
        id: event.id,
        title: event.title,
        organizer: event.organizer,
        city: event.city,
        venue: event.venue,
        category: event.category,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        detail_url: event.detail_url,
        live_url: '',
        calendar_url: event.calendar_url,
        directions_url: '',
        live_schedule_ready: false,
        saved_at: new Date().toISOString()
      };
    }
    await page.addInitScript((seed) => {
      localStorage.setItem('eventlive-saved-events', JSON.stringify(seed));
    }, records);
    await page.goto(`http://127.0.0.1:${port}/my-events.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.event-card', { timeout: 8000 });
    // "all" view (default) surfaces every saved record including ended.
    results.myEventsHtml = await page.evaluate(dualDateAuditFn);
    await page.close();
  }

  await context.close();
  return results;
}

// WO-7b (retargeted 2026-09-02): this originally rode on dist/weekend.html,
// which was a legacy/frozen page (see removeDeadEventLinks's `legacyPages`
// list in scripts/generate-site.mjs) with static cards carrying no
// data-event-* attributes and no live JS renderer — neither the static sweep
// nor route-mocking could exercise it with real multi-day data. weekend.html
// is now a redirect stub (LEGACY_TOP_LEVEL_REDIRECTS in
// scripts/legacy-redirect-pages.mjs) that forwards to
// saudi-events-weekend.html and carries no page chrome of its own, so this
// check moved to saudi-events-weekend.html — the live "weekend" page,
// generated fresh every build, which still carries the global brandCss (see
// scripts/generate-site.mjs's WO-7b comment: ".date-tab" scoping applies to
// every current and future page automatically). Inject a synthetic card
// using the exact markup/classes homeEventCard would produce
// (.date-tab.date-tab-range, scoped via ".event-cover .date-tab" in this
// file's own <style>) to prove the mechanism renders visibly here too, per
// the coordinator's explicit fallback instruction.
async function runWeekendSyntheticCheck(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/saudi-events-weekend.html`, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    const article = document.createElement('article');
    article.className = 'event-card';
    article.setAttribute('data-event-start', '2026-08-31T09:00:00+03:00');
    article.setAttribute('data-event-end', '2026-09-02T18:00:00+03:00');
    article.setAttribute('data-event-status', 'upcoming');
    article.innerHTML = '<a class="event-cover" href="#" style="display:block;position:relative;width:260px;height:140px;">' +
      '<span class="date-tab date-tab-range">' +
        '<span class="date-tab-part"><b>٣١</b><span>أغسطس</span></span>' +
        '<span class="date-tab-sep" aria-hidden="true">–</span>' +
        '<span class="date-tab-part"><b>٢</b><span>سبتمبر</span></span>' +
      '</span>' +
    '</a>';
    document.body.appendChild(article);
    const dateEl = article.querySelector('.date-tab');
    const visible = Boolean(dateEl) && dateEl.offsetParent !== null && dateEl.getBoundingClientRect().width > 0;
    const txt = dateEl ? dateEl.textContent.replace(/\s+/g, ' ').trim() : '';
    const nums = (txt.match(/[\d٠-٩]+/g) || []).length;
    article.remove();
    return { visible, nums, txt };
  });
  await context.close();
  assert.ok(result.visible, `saudi-events-weekend.html synthetic date-tab-range check @ ${viewport.label}: element not visible (the .event-cover .date-tab CSS scoping must still apply on this page)`);
  assert.ok(result.nums >= 2, `saudi-events-weekend.html synthetic date-tab-range check @ ${viewport.label}: expected >=2 day numbers, got ${result.nums} (text: "${result.txt}")`);
}

// WO-7b: real-page visibility sweep — navigate to actual built pages (not
// fixtures) and run the same visibility audit against whatever multi-day
// cards the current catalog happens to contain.
const REAL_AUDIT_PAGES = [
  'index.html',
  'this-week.html',
  'this-month.html',
  'today-events.html',
  'saudi-events-tomorrow.html',
  'cities/riyadh.html',
  'categories/culture-arts.html',
  'en/index.html',
  'en/this-week.html'
];

async function runRealPageVisibilityAudit(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const failures = [];
  let cardsSeen = 0;
  for (const relPage of REAL_AUDIT_PAGES) {
    if (!fs.existsSync(path.join(distDir, relPage))) continue;
    await page.goto(`http://127.0.0.1:${port}/${relPage}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    const rows = (await page.evaluate(dualDateAuditFn)).filter((row) => row.isMultiDay && row.status !== 'ended');
    cardsSeen += rows.length;
    for (const row of rows) {
      if (!row.ok) {
        failures.push(`${relPage} @ ${viewport.label}: multi-day card (${row.start} → ${row.end}, status="${row.status}") dual-date element ${row.visible ? `visible but only ${row.dayNumbers} day number(s)` : 'not visible/found'} — text: "${row.dateText}"`);
      }
    }
  }
  await context.close();
  return { failures, cardsSeen };
}

function assertFixtureSurface(label, viewportLabel, rows) {
  assert.ok(rows.length >= 2, `${label} @ ${viewportLabel}: expected at least the two non-ended fixture cards to render, got ${rows.length}`);
  const multiDayCard = rows.find((row) => row.start === multiDayUpcoming.starts_at);
  const singleDayCard = rows.find((row) => row.start === singleDayUpcoming.starts_at);
  assert.ok(multiDayCard, `${label} @ ${viewportLabel}: multi-day upcoming fixture card did not render`);
  assert.ok(singleDayCard, `${label} @ ${viewportLabel}: single-day upcoming fixture card did not render`);
  assert.ok(
    multiDayCard.ok,
    `${label} @ ${viewportLabel}: multi-day upcoming fixture's date element is ${multiDayCard.visible ? `visible but only has ${multiDayCard.dayNumbers} day number(s)` : 'not visible'} — text: "${multiDayCard.dateText}"`
  );
  assert.ok(
    !(singleDayCard.visible && singleDayCard.dayNumbers >= 2),
    `${label} @ ${viewportLabel}: single-day upcoming fixture unexpectedly shows a dual-date element (false positive) — text: "${singleDayCard.dateText}"`
  );
  const endedCard = rows.find((row) => row.status === 'ended');
  if (endedCard) {
    assert.ok(
      !(endedCard.visible && endedCard.dayNumbers >= 2),
      `${label} @ ${viewportLabel}: ended multi-day fixture shows a dual-date element — ended events are archival and out of scope (doctrine: الإصلاح للقادم ليس لما فات) — text: "${endedCard.dateText}"`
    );
  }
}

const browser = await chromium.launch();
const server = startServer();
await once(server, 'listening');

let totalRealCardsSeen = 0;
const realPageFailures = [];
try {
  for (const viewport of VIEWPORTS) {
    const fixtures = await runBrowserFixtures(browser, viewport);
    assertFixtureSurface('dist/events.html', viewport.label, fixtures.eventsHtml || []);
    assertFixtureSurface('dist/today.html', viewport.label, fixtures.todayHtml || []);
    assertFixtureSurface('dist/my-events.html', viewport.label, fixtures.myEventsHtml || []);

    await runWeekendSyntheticCheck(browser, viewport);

    const { failures, cardsSeen } = await runRealPageVisibilityAudit(browser, viewport);
    totalRealCardsSeen += cardsSeen;
    realPageFailures.push(...failures);
  }
} finally {
  await browser.close();
  server.close();
  await once(server, 'close');
}

assert.equal(
  realPageFailures.length,
  0,
  `${realPageFailures.length} real-page multi-day card(s) fail the visibility audit (present in DOM but not visibly showing both day numbers):\n${realPageFailures.slice(0, 25).join('\n')}${realPageFailures.length > 25 ? `\n...and ${realPageFailures.length - 25} more` : ''}`
);
assert.ok(totalRealCardsSeen > 0, 'the real-page visibility audit found zero multi-day cards across both viewports — the catalog snapshot must include at least one to exercise this gate');

console.log(`[multiday-card] visibility audit (360px + 1280px): ${totalRealCardsSeen} real multi-day cards checked across ${REAL_AUDIT_PAGES.length} pages, 0 failures`);
console.log('[multiday-card] synthetic-fixture + visibility coverage passed for events.html, today.html, my-events.html, and saudi-events-weekend.html (synthetic)');
console.log(`[multiday-card] all checks passed: ${staticSummary.arCardsSeen + staticSummary.enCardsSeen} cards swept, ${staticSummary.arMultiDayCardsSeen + staticSummary.enMultiDayCardsSeen} multi-day, 0 failures`);
