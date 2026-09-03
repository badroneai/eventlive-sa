import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const eventsHtmlPath = path.join(root, 'dist', 'events.html');
const eventsJsonPath = path.join(root, 'dist', 'events.json');
const catalogJsonPath = path.join(root, 'dist', 'events-catalog.json');
const serviceWorkerPath = path.join(root, 'dist', 'sw.js');

assert.equal(fs.existsSync(eventsHtmlPath), true, 'dist/events.html must exist; run npm run build first');
assert.equal(fs.existsSync(eventsJsonPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(catalogJsonPath), true, 'dist/events-catalog.json must exist; run npm run build first');
assert.equal(fs.existsSync(serviceWorkerPath), true, 'dist/sw.js must exist; run npm run build first');

const html = fs.readFileSync(eventsHtmlPath, 'utf8');
const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
const htmlBytes = fs.statSync(eventsHtmlPath).size;
const jsonBytes = fs.statSync(eventsJsonPath).size;
const catalogBytes = fs.statSync(catalogJsonPath).size;

assert.ok(htmlBytes < 260_000, `events.html should be a lightweight shell, got ${htmlBytes} bytes`);
assert.ok(jsonBytes > htmlBytes, 'events.json should carry the event payload instead of duplicating it in events.html');
assert.ok(catalogBytes < jsonBytes * 0.35, `events-catalog.json should omit heavy detail/session payloads, got ${catalogBytes} of ${jsonBytes} bytes`);
assert.match(html, /const eventsFeedUrl = '\.\/events-catalog\.json'/, 'events.html must load the compact external catalog feed');
assert.doesNotMatch(html, /const events = \[\{/, 'events.html must not inline the full event catalog');
// The failure message must describe a PARTIAL catalog, not a missing one: the
// page now ships the nearest upcoming events server-rendered, so the rows stay
// on screen when the fetch fails. Saying "could not load the events" over a
// visible list — or wiping the list to match the message — is the defect
// scripts/crawler-visible-content-regression-test.mjs exists to prevent.
assert.match(html, /تعذّر تحميل الكتالوج الكامل/, 'events.html must include a friendly partial-catalog failure message');
assert.doesNotMatch(html, /catch[\s\S]{0,600}?grid\.innerHTML\s*=\s*'<div class="empty"/, 'the fetch failure branch must not erase the server-rendered rows');
assert.match(html, /function applyInitialSearchQuery\(\)/, 'events.html must support query-string search bootstrapping');
assert.match(html, /new URLSearchParams\(window\.location\.search\)/, 'events.html must read q/search/query URL parameters');
assert.match(html, /params\.get\('q'\).*params\.get\('search'\).*params\.get\('query'\)/s, 'events.html must accept q, search, and query parameters');
assert.match(html, /setupFilters\(\);\s*applyInitialSearchQuery\(\);\s*renderStatusCenter\(\);/s, 'events.html must apply URL search before rendering results');
assert.match(html, /function cityIntentForQuery\(value\)/, 'events search must recognize exact city intent');
assert.match(html, /targetCity \? event\.city !== targetCity/, 'city-intent search must require the canonical event city');
assert.match(html, /id="sortFilter"/, 'events.html must expose explicit result sorting');
assert.match(html, /id="loadMoreEvents"/, 'events.html must progressively reveal the catalog instead of rendering every card at once');
assert.match(html, /let visibleLimit = 24/, 'events.html must start with a bounded first page of results');
assert.match(html, /const pageSize = 24/, 'events.html must use a stable catalog page size');
assert.match(html, /categoryGroups = new Map/, 'events.html must deduplicate raw category labels in the category filter');
assert.match(html, /visibleRows = rows\.slice\(0, visibleLimit\)/, 'events.html must render only the visible slice of filtered rows');
assert.match(html, /controls\.loadMore\.addEventListener\('click'/, 'events.html must let users load more matching events');
assert.match(html, /id="catalogMetricEvents"/, 'events.html must expose data-driven catalog metrics');
assert.match(html, /function updateCatalogMetrics\(\)/, 'events.html must refresh catalog metrics from events.json');
assert.match(html, /<div class="label">الجلسات الرسمية<\/div>/, 'events.html must label only official sessions as sessions');
assert.match(html, /<div class="label">أجندات متعددة الجلسات<\/div>/, 'events.html must distinguish multi-session agendas from generic schedules');
assert.match(html, /Number\(event\.official_sessions_count \|\| 0\)/, 'events.html must count verified official sessions');
assert.match(html, /events\.filter\(\(event\) => event\.agenda_ready\)\.length/, 'events.html must count only multi-session agendas');
assert.doesNotMatch(html, /Array\.isArray\(event\.sessions\) \? event\.sessions\.length/, 'events.html must not count attendance windows or opening hours as sessions');
assert.match(html, /updateCatalogMetrics\(\);\s*setupFilters\(\);/s, 'events.html must refresh metrics before rendering filters');
assert.doesNotMatch(serviceWorker, /"\.\/events\.json"/, 'service worker must not promote owner-only events.json through public precache');

console.log('events-page-shell-regression-test: ok');
