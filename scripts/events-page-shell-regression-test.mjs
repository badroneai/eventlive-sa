import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const eventsHtmlPath = path.join(root, 'dist', 'events.html');
const eventsJsonPath = path.join(root, 'dist', 'events.json');
const serviceWorkerPath = path.join(root, 'dist', 'sw.js');

assert.equal(fs.existsSync(eventsHtmlPath), true, 'dist/events.html must exist; run npm run build first');
assert.equal(fs.existsSync(eventsJsonPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(serviceWorkerPath), true, 'dist/sw.js must exist; run npm run build first');

const html = fs.readFileSync(eventsHtmlPath, 'utf8');
const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
const htmlBytes = fs.statSync(eventsHtmlPath).size;
const jsonBytes = fs.statSync(eventsJsonPath).size;

assert.ok(htmlBytes < 260_000, `events.html should be a lightweight shell, got ${htmlBytes} bytes`);
assert.ok(jsonBytes > htmlBytes, 'events.json should carry the event payload instead of duplicating it in events.html');
assert.match(html, /const eventsFeedUrl = '\.\/events\.json'/, 'events.html must load the external events feed');
assert.doesNotMatch(html, /const events = \[\{/, 'events.html must not inline the full event catalog');
assert.match(html, /تعذر تحميل ملف الفعاليات/, 'events.html must include a friendly feed-load failure message');
assert.match(html, /function applyInitialSearchQuery\(\)/, 'events.html must support query-string search bootstrapping');
assert.match(html, /new URLSearchParams\(window\.location\.search\)/, 'events.html must read q/search/query URL parameters');
assert.match(html, /params\.get\('q'\).*params\.get\('search'\).*params\.get\('query'\)/s, 'events.html must accept q, search, and query parameters');
assert.match(html, /setupFilters\(\);\s*applyInitialSearchQuery\(\);\s*renderStatusCenter\(\);/s, 'events.html must apply URL search before rendering results');
assert.match(serviceWorker, /"\.\/events\.json"/, 'service worker must precache events.json for the async catalog shell');

console.log('events-page-shell-regression-test: ok');
