import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

function readJson(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist; run npm run build first`);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function readText(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(fullPath, 'utf8');
}

const events = readJson('events.json');
const today = readJson('today.json');
const updates = readJson('updates.json');
const liveStatus = readJson('live-status.json');
const screen = readText('screen.html');
const match = screen.match(/const fallbackToday = (\{[\s\S]*?\});\n\s*const controls =/);

assert.ok(match, 'screen.html must embed fallbackToday before controls');
const fallback = JSON.parse(match[1]);

assert.equal(fallback.generated_at, today.generated_at, 'screen fallback must be regenerated with today.json');
assert.equal(fallback.generated_at, events.generated_at, 'screen fallback must match events.json generation time');
assert.deepEqual(fallback.focus, today.focus, 'screen fallback focus must match today.json');
assert.deepEqual(fallback.queue, today.queue.slice(0, 4), 'screen fallback must embed only the visible priority queue');
assert.ok(fallback.queue.length <= 4, 'screen fallback must not embed the full operational queue');
assert.equal(fallback.signals.events, events.events.length, 'screen fallback event signal must match events.json');
assert.equal(fallback.signals.actionable, today.queue.length, 'screen fallback actionable signal must match today queue');
assert.equal(fallback.signals.live_schedule_ready, liveStatus.totals.live_schedule_ready, 'screen fallback ready signal must match live-status.json');
assert.equal(fallback.live_updates.totals.updates, updates.totals.updates, 'screen fallback update count must match updates.json');
assert.equal(fallback.live_updates.totals.urgent, updates.totals.urgent, 'screen fallback urgent updates must match updates.json');
assert.equal(fallback.live_updates.focus?.id || '', updates.focus?.id || '', 'screen fallback update focus must match updates.json');
assert.ok(Buffer.byteLength(screen, 'utf8') <= 500_000, 'screen.html must stay within the 500KB performance budget');

for (const forbidden of [
  '2026-07-05T07:31:50.651Z',
  '"events":340',
  'categories/conferences-forums.html',
  'categories/technology-bootcamp.html',
  'categories/sports-families.html'
]) {
  assert.equal(screen.includes(forbidden), false, `screen.html must not keep stale embedded value: ${forbidden}`);
}

assert.match(screen, /"dateModified":"[^"]+"/, 'screen structured data must expose dateModified');
assert.match(screen, new RegExp(`"dateModified":"${events.generated_at.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), 'screen structured data dateModified must match build time');
assert.doesNotMatch(screen, /<a\b[^>]*href=["']\.\/events\.json["']/i, 'screen.html must not expose owner-only events.json as a public link');
assert.doesNotMatch(screen, /<a\b[^>]*href=["']\.\/today\.json["']/i, 'screen.html must not expose operational JSON as a screen action');
assert.doesNotMatch(screen, /<strong>\s*<span class="brand-word"[\s\S]*?شاشة الحضور الحية/, 'screen.html must not duplicate the EventLive brand in the screen header');
assert.match(screen, /event\.city_label \|\| event\.city/, 'screen queue must prefer Arabic city labels');
assert.match(screen, /focus\.city_label \|\| focus\.city/, 'screen focus meta must prefer Arabic city labels');
assert.match(screen, /فعالية في المنصة/, 'screen signals must explain platform totals clearly');
assert.match(screen, /id="eventlive-screen-fit"/, 'screen.html must include the no-scroll screen layout patch');
assert.match(screen, /body > \.site-head \{ display:none !important; \}/, 'screen.html must hide the public site header in screen mode');
assert.match(screen, /max-height:100vh/, 'screen.html must fit the screen viewport without page scroll');
assert.match(screen, /\.screen \.queue-item span:not\(\.chip\)/, 'screen queue metadata must not squeeze the status chip');
assert.match(screen, /-webkit-line-clamp:2/, 'screen queue titles must clamp cleanly instead of clipping glyphs');
assert.match(screen, /@media \(max-height: 820px\)/, 'screen mode must handle browser-height constrained displays');
assert.match(screen, /\.screen \.qr-panel \{ display:none; \}/, 'screen mode must prioritize readable queue cards over QR on short displays');
assert.match(screen, /requestedEventKey/, 'screen.html must support event-specific screen links');
assert.match(screen, /eventToScreenData/, 'screen.html must transform an event schedule into screen data');
assert.match(screen, /fetch\('\.\/events\.json'/, 'screen event mode must load the catalog only when an event key is requested');
assert.match(screen, /شاشة تشغيل الفعالية/, 'screen event mode must clearly identify the event signage purpose');
assert.match(screen, /جدول الفعالية الآن/, 'screen event mode must label the side queue as the event schedule');

console.log(`screen-fallback-regression-test: ok events=${events.events.length} queue=${today.queue.length} updates=${updates.totals.updates}`);
