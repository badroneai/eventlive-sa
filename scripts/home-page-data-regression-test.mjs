import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compareAttendancePriority } from './event-priority.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');
const eventsPath = path.join(distDir, 'events.json');
const todayEventsPath = path.join(distDir, 'today-events.json');

assert.equal(fs.existsSync(indexPath), true, 'dist/index.html must exist; run npm run build first');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(todayEventsPath), true, 'dist/today-events.json must exist; run npm run build first');

const html = fs.readFileSync(indexPath, 'utf8');
const eventsIndex = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const todayEventsIndex = JSON.parse(fs.readFileSync(todayEventsPath, 'utf8'));
const events = Array.isArray(eventsIndex.events) ? eventsIndex.events : [];
const todayEvents = Array.isArray(todayEventsIndex.events) ? todayEventsIndex.events : [];
const upcoming = events.filter((event) => event.status !== 'ended');
const cityCount = new Set(events.map((event) => event.city).filter(Boolean)).size;
const liveReadyCount = events.filter((event) => event.live_schedule_ready).length;

assert.ok(events.length >= 20, 'home page data test expects a useful public catalog');
assert.match(html, new RegExp(`تصفح\\s+${events.length}\\s+فعالية`), 'home CTA must reflect events.json count');
assert.match(html, new RegExp(`<span><b>${cityCount}</b>مدينة</span>`), 'home board must reflect distinct city count');
assert.match(html, new RegExp(`<span><b>${liveReadyCount}</b>فعالية بوقت رسمي</span>`), 'home board must reflect official schedule count');
assert.match(html, new RegExp(`${events.length}\\s+فعالية من\\s+\\d+\\s+مصدرًا مسجلًا`), 'home trust band must reflect catalog size');

const now = Date.now();
const dateKey = (value) => new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Riyadh'
}).format(new Date(value));
const todayKey = dateKey(now);
const tomorrowKey = dateKey(now + 86400000);
const weekLimit = now + (7 * 86400000);
const expectedToday = upcoming.filter((event) => {
  const start = new Date(event.starts_at).getTime();
  const end = new Date(event.ends_at || event.starts_at).getTime();
  return dateKey(start) === todayKey || (event.event_kind !== 'program' && start <= now && end >= now);
});
const used = new Set(expectedToday.map((event) => event.id));
const expectedTomorrow = upcoming.filter((event) => !used.has(event.id) && dateKey(event.starts_at) === tomorrowKey);
expectedTomorrow.forEach((event) => used.add(event.id));
const expectedWeek = upcoming.filter((event) => {
  const start = new Date(event.starts_at).getTime();
  return !used.has(event.id) && start > now && start <= weekLimit;
});

const windows = [
  ['soon', 'today', 'اليوم في السعودية', expectedToday],
  ['tomorrow', 'tomorrow', 'غدًا', expectedTomorrow],
  ['week', 'week', 'هذا الأسبوع', expectedWeek]
];
const allVisibleLinks = [];
for (const [id, windowName, heading, expected] of windows) {
  const match = html.match(new RegExp(`<section class="h-section" id="${id}"[^>]*data-home-window="${windowName}"[^>]*>([\\s\\S]*?)<\\/section>`));
  assert.ok(match, `home page must expose the ${windowName} timeline section`);
  assert.match(match[1], new RegExp(`<h2>${heading}<\\/h2>`), `${windowName} section must have a clear public heading`);
  assert.match(match[1], new RegExp(`<p><b>${expected.length}<\\/b>`), `${windowName} section must disclose its full event count`);
  const links = [...match[1].matchAll(/<article class="card"[\s\S]*?<a class="cover" href="([^"]+)"/g)].map((card) => card[1]);
  assert.equal(links.length, Math.min(8, expected.length), `${windowName} cards must match the public timeline window`);
  allVisibleLinks.push(...links);
}
assert.equal(new Set(allVisibleLinks).size, allVisibleLinks.length, 'home timeline sections must not repeat the same event');

function extractAssignedJson(variableName) {
  const pattern = new RegExp(`var ${variableName} = ([\\s\\S]*?);\\n\\s*var `);
  const match = html.match(pattern);
  assert.ok(match, `home page must define ${variableName}`);
  return JSON.parse(match[1]);
}

const ticker = extractAssignedJson('ticker');
const searchData = extractAssignedJson('searchData');

assert.equal(searchData.length, events.length, 'home search data must cover the full catalog');
assert.equal(ticker.length, Math.min(120, upcoming.length), 'home ticker must be derived from upcoming events');
assert.equal(searchData[0].t, events[0].title, 'home search order must follow events.json');
assert.equal(searchData[0].k, events[0].city, 'home search rows must preserve the canonical city key');
assert.match(html, /function cityIntent\(v\)/, 'home search must recognize exact city intent');
assert.match(html, /events\.html\?q=' \+ encodeURIComponent\(input\.value\.trim\(\)\)/, 'home Enter search must preserve the query');
if (ticker.length) {
  // WO-3: display order derives from the unified attendance-priority rule
  // in scripts/event-priority.mjs (generate-site.mjs's patchHomePage sorts
  // `upcoming` with compareAttendancePriority(a, b, now) before slicing the
  // ticker to its first 120 rows) — tests must never re-derive ordering
  // with an ad-hoc sort (e.g. raw events.json order) or they silently rot
  // the moment the site's ordering rule changes out from under them.
  const prioritizedUpcoming = [...upcoming].sort((a, b) => compareAttendancePriority(a, b, now));
  assert.equal(ticker[0].id, prioritizedUpcoming[0].id, 'home ticker order must follow the unified attendance-priority rule (event-priority.mjs)');
  assert.ok(String(ticker[0].u || '').startsWith('./events/') || ticker[0].u === './event.html', 'home ticker URLs must be public event URLs');
}

const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
const itemList = jsonLd.find((entry) => entry['@type'] === 'ItemList');
assert.ok(itemList, 'home page must include ItemList JSON-LD');
assert.equal(itemList.numberOfItems, upcoming.length, 'home ItemList JSON-LD must reflect upcoming count');
assert.ok(itemList.itemListElement.every((item) => String(item.url || '').startsWith('https://eventme.live/')), 'home ItemList URLs must be canonical');

console.log('home-page-data-regression-test: ok');
