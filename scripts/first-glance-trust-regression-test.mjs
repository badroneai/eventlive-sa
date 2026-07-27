import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// First-glance trust gate (owner mandate 2026-07-27): a new visitor must never
// see a dead live element. Every check here failed silently in production at
// least once before this gate existed — see PR #15 for the incident set.

const root = process.cwd();
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');

assert.ok(fs.existsSync(indexPath), 'dist/index.html must exist; run npm run build first');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

// 1. The hero countdown must have a reachable target: at least one running
//    non-program moment or one future-starting event in the board ticker.
//    (Incident: ticker head was saturated by long-running programs — the
//    countdown rendered dead dashes forever.)
const tickerMatch = indexHtml.match(/var ticker = (\[[\s\S]*?\]);\n/);
assert.ok(tickerMatch, 'homepage must embed the board ticker payload');
const ticker = JSON.parse(tickerMatch[1]);
assert.ok(ticker.length > 0, 'board ticker must not be empty');
const now = Date.now();
const liveMoments = ticker.filter((row) => {
  const start = new Date(row.s).getTime();
  const end = new Date(row.e).getTime();
  return row.k !== 'program' && Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now);
});
const futureStarts = ticker.filter((row) => new Date(row.s).getTime() > now);
assert.ok(
  liveMoments.length + futureStarts.length > 0,
  'board ticker must contain at least one live moment or future start so the countdown has a target'
);

// 2. Board runtime hardening must stay in place: hide the countdown instead of
//    dead dashes when no target exists, and keep "city · datetime" in the meta.
assert.ok(indexHtml.includes('boardCountdownBox'), 'board script must hide the countdown when no target exists');
assert.ok(indexHtml.includes('metaWhen'), 'board script must render city + datetime in the board meta');

// 3. No dead waiting placeholders anywhere a first-time visitor lands.
//    (Incident: "جاري حساب الوقت..." rendered forever when JS failed.)
const placeholder = 'جاري حساب الوقت';
const scanPages = [
  ...fs.readdirSync(distDir).filter((name) => name.endsWith('.html')).map((name) => path.join(distDir, name)),
  ...(fs.existsSync(path.join(distDir, 'en'))
    ? fs.readdirSync(path.join(distDir, 'en')).filter((name) => name.endsWith('.html')).map((name) => path.join(distDir, 'en', name))
    : [])
];
for (const page of scanPages) {
  const html = fs.readFileSync(page, 'utf8');
  assert.ok(!html.includes(placeholder), `${path.relative(root, page)} must not ship a dead waiting placeholder`);
}

// 4. Every server-rendered live-time element must carry a truthful static
//    fallback text, not an empty shell.
const liveTimeTexts = [...indexHtml.matchAll(/<(?:div|span|b) class="[^"]*"[^>]*data-live-time[^>]*>([^<]*)</g)]
  .map((match) => match[1].trim());
for (const text of liveTimeTexts) {
  assert.ok(text.length > 0, 'data-live-time elements must ship a static fallback text');
}

// 5. Multi-day cards must show their full window on the card itself.
//    (Incident: a card reading "٢٣ يوليو" alone on the 27th looks stale even
//    when the event is legitimately still running.)
const cardBlocks = [...indexHtml.matchAll(/<article class="card" data-event-start="([^"]*)" data-event-end="([^"]*)"[\s\S]*?<\/article>/g)];
assert.ok(cardBlocks.length > 0, 'homepage must render event cards');
for (const [block, start, end] of cardBlocks) {
  if (!start || !end) continue;
  const startDay = String(start).slice(0, 10);
  const endDay = String(end).slice(0, 10);
  if (startDay === endDay) continue;
  const showsRange = /من [^<·]+ إلى/.test(block) || /<b>[^<]*–[^<]*<\/b>/.test(block);
  assert.ok(showsRange, `multi-day card (${startDay} → ${endDay}) must show its start–end window on the card`);
}

console.log(`FIRST_GLANCE_TRUST_OK ticker=${ticker.length} live=${liveMoments.length} future=${futureStarts.length} pages_scanned=${scanPages.length} cards=${cardBlocks.length}`);
