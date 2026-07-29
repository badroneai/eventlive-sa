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
// This test has three parts:
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
  starts_at: new Date(NOW + 5 * DAY_MS).toISOString(),
  ends_at: new Date(NOW + 8 * DAY_MS).toISOString(),
  status: 'upcoming',
  status_label: 'قادمة'
});
const singleDayUpcoming = fixtureEvent({
  id: 'fixture-singleday-upcoming',
  title: 'Fixture Single-Day Upcoming',
  starts_at: new Date(NOW + 12 * DAY_MS).toISOString(),
  ends_at: new Date(NOW + 12 * DAY_MS + 3 * 60 * 60 * 1000).toISOString(),
  status: 'upcoming',
  status_label: 'قادمة'
});
const multiDayEnded = fixtureEvent({
  id: 'fixture-multiday-ended',
  title: 'Fixture Multi-Day Ended',
  starts_at: new Date(NOW - 10 * DAY_MS).toISOString(),
  ends_at: new Date(NOW - 7 * DAY_MS).toISOString(),
  status: 'ended',
  status_label: 'منتهية'
});

async function runBrowserFixtures() {
  const server = startServer();
  await once(server, 'listening');
  const browser = await chromium.launch();
  const results = {};
  try {
    // events.html: mock the events-catalog.json fetch with our fixture
    // rows (the page's own eventsFeedUrl constant — not events.json).
    {
      const page = await browser.newPage();
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
      results.eventsHtml = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('#eventGrid .event-card')];
        return cards.map((card) => ({
          text: (card.textContent || '').replace(/\s+/g, ' ').trim(),
          start: card.getAttribute('data-event-start'),
          status: card.getAttribute('data-event-status')
        }));
      });
      await page.close();
    }

    // today.html: mock the today.json fetch — renderCard only sees
    // sortedActionable() rows, which already exclude ended events, so the
    // ended fixture is intentionally left out of this payload's queue.
    {
      const page = await browser.newPage();
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
      results.todayHtml = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.event-card')];
        return cards.map((card) => ({
          text: (card.textContent || '').replace(/\s+/g, ' ').trim(),
          start: card.getAttribute('data-event-start'),
          status: card.getAttribute('data-event-status')
        }));
      });
      await page.close();
    }

    // my-events.html: seed localStorage with saved-event records (the
    // shape eventSaveRecord() in dist/events.html actually writes) before
    // the page's own render() runs on load.
    {
      const page = await browser.newPage();
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
      results.myEventsHtml = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.event-card')];
        return cards.map((card) => ({
          text: (card.textContent || '').replace(/\s+/g, ' ').trim(),
          start: card.getAttribute('data-event-start'),
          status: card.getAttribute('data-event-status')
        }));
      });
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
    await once(server, 'close');
  }
  return results;
}

const fixtures = await runBrowserFixtures();

function assertSurface(label, cards) {
  assert.ok(cards.length >= 2, `${label}: expected at least the two non-ended fixture cards to render, got ${cards.length}`);
  const multiDayCard = cards.find((card) => card.start === multiDayUpcoming.starts_at);
  const singleDayCard = cards.find((card) => card.start === singleDayUpcoming.starts_at);
  assert.ok(multiDayCard, `${label}: multi-day upcoming fixture card did not render`);
  assert.ok(singleDayCard, `${label}: single-day upcoming fixture card did not render`);
  assert.ok(
    hasAcceptedMarker(multiDayCard.text),
    `${label}: multi-day upcoming fixture card has no range/continuation marker — text: "${multiDayCard.text}"`
  );
  assert.ok(
    !hasAcceptedMarker(singleDayCard.text),
    `${label}: single-day upcoming fixture card unexpectedly shows a range marker (false positive) — text: "${singleDayCard.text}"`
  );
  const endedCard = cards.find((card) => card.status === 'ended');
  if (endedCard) {
    assert.ok(
      !hasAcceptedMarker(endedCard.text),
      `${label}: ended multi-day fixture card shows a range marker — ended events are archival and out of scope (doctrine: الإصلاح للقادم ليس لما فات) — text: "${endedCard.text}"`
    );
  }
}

assertSurface('dist/events.html', fixtures.eventsHtml || []);
assertSurface('dist/today.html', fixtures.todayHtml || []);
assertSurface('dist/my-events.html', fixtures.myEventsHtml || []);

console.log('[multiday-card] synthetic-fixture coverage passed for events.html, today.html, my-events.html');
console.log(`[multiday-card] all checks passed: ${staticSummary.arCardsSeen + staticSummary.enCardsSeen} cards swept, ${staticSummary.arMultiDayCardsSeen + staticSummary.enMultiDayCardsSeen} multi-day, 0 failures`);
