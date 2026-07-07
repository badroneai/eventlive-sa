import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
assert.match(html, new RegExp(`<span><b>${liveReadyCount}</b>جدول حي جاهز</span>`), 'home board must reflect live-ready count');
assert.match(html, new RegExp(`${events.length}\\s+فعالية من\\s+\\d+\\s+مصدرًا مسجلًا`), 'home trust band must reflect catalog size');

const soonSectionMatch = html.match(/<section class="h-section" id="soon"[^>]*data-temporal-window-hours="72"[^>]*>([\s\S]*?)(?=\s*<section class="h-section" id="tech"[^>]*>)/);
assert.ok(soonSectionMatch, 'home page must expose a 72-hour starts-soon section');

const soonSection = soonSectionMatch[1];
const soonCards = [...soonSection.matchAll(/<article class="card"[^>]*data-event-start="([^"]*)"[^>]*data-event-end="([^"]*)"[^>]*data-event-status="([^"]*)"/g)];
assert.equal(soonCards.length, Math.min(12, todayEvents.length), 'home starts-soon cards must mirror the 72-hour today-events feed');

const now = Date.now();
const windowMs = 72 * 60 * 60 * 1000;
const toleranceMs = 5 * 60 * 1000;
for (const [, startsAt, endsAt, status] of soonCards) {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt || startsAt).getTime();
  assert.ok(Number.isFinite(startMs), `home starts-soon card must have a valid start time: ${startsAt}`);
  assert.notEqual(status, 'ended', `home starts-soon card must not be ended: ${startsAt}`);
  const isActive = startMs <= now + toleranceMs && Number.isFinite(endMs) && endMs >= now - toleranceMs && startMs >= now - windowMs - toleranceMs;
  const isUpcomingSoon = startMs >= now - toleranceMs && startMs <= now + windowMs + toleranceMs;
  assert.ok(isActive || isUpcomingSoon, `home starts-soon card is outside the 72-hour window: ${startsAt}`);
}

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
if (ticker.length) {
  assert.equal(ticker[0].id, upcoming[0].id, 'home ticker order must follow upcoming events');
  assert.ok(String(ticker[0].u || '').startsWith('./events/') || ticker[0].u === './event.html', 'home ticker URLs must be public event URLs');
}

const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
const itemList = jsonLd.find((entry) => entry['@type'] === 'ItemList');
assert.ok(itemList, 'home page must include ItemList JSON-LD');
assert.equal(itemList.numberOfItems, upcoming.length, 'home ItemList JSON-LD must reflect upcoming count');
assert.ok(itemList.itemListElement.every((item) => String(item.url || '').startsWith('https://eventme.live/')), 'home ItemList URLs must be canonical');

console.log('home-page-data-regression-test: ok');
