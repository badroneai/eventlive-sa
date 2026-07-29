import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { homeBoardLiveSection, liveCountLabel } from './home-board-live.mjs';

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

// 6. WO-1: the "يحدث الآن" board must show ALL live events, not one pinned.
//    If the live catalog has >=2 live moments at build time, dist/index.html
//    must carry >=2 static .board-live-card elements (the old bug: the
//    board's client script picked only the FIRST live entry via
//    `if (... && !live) live = ev`, so a second simultaneous live event was
//    silently dropped from view).
const boardLiveCards = [...indexHtml.matchAll(/<article class="board-live-card" data-index="\d+"/g)];
if (liveMoments.length >= 2) {
  assert.ok(
    boardLiveCards.length >= 2,
    `catalog has ${liveMoments.length} live moments at build time but dist/index.html only ` +
      `carries ${boardLiveCards.length} static .board-live-card element(s) — the homepage ` +
      'board must render every live event, not one pinned entry'
  );
  const expectedBadge = `مباشر الآن · ${liveCountLabel(liveMoments.length)}`;
  assert.ok(
    indexHtml.includes(`id="boardLiveBadge"><span class="live-dot"></span>${expectedBadge}`),
    `homepage badge must read "${expectedBadge}" (grammatically correct Arabic count agreement) for ` +
      `${liveMoments.length} live moments`
  );
} else {
  console.log(`WO-1 note: the live catalog had ${liveMoments.length} live moment(s) at build ` +
    'time (<2), so the multi-card rule cannot be exercised against the real build. Exercising ' +
    'the static-injection mechanism directly against a synthetic fixture instead.');
}

// The mechanism itself (scripts/home-board-live.mjs, the only production
// caller being patchHomePage in scripts/generate-site.mjs) is exercised
// unconditionally against a synthetic 3-event fixture, regardless of what
// the real catalog had at build time — this is the "don't skip the
// assertion entirely" requirement from the WO.
{
  const synthetic = [
    { title: 'Synthetic Live One', meta: 'الرياض · حتى ١٠:٠٠ م', url: './events/synthetic-one.html' },
    { title: 'Synthetic Live Two', meta: 'جدة · حتى ١١:٠٠ م', url: './events/synthetic-two.html' },
    { title: 'Synthetic Live Three', meta: 'الظهران · حتى ١٢:٠٠ ص', url: './events/synthetic-three.html' }
  ];
  const html = homeBoardLiveSection(synthetic);
  const cards = [...html.matchAll(/<article class="board-live-card" data-index="(\d+)"( hidden)?>/g)];
  assert.equal(cards.length, 3, 'homeBoardLiveSection must render one static card per live event');
  assert.equal(cards[0][2], undefined, 'the first synthetic card must be visible (no hidden attribute)');
  assert.equal(cards[1][2], ' hidden', 'the second synthetic card must carry the hidden attribute');
  assert.equal(cards[2][2], ' hidden', 'the third synthetic card must carry the hidden attribute');
  assert.match(html, new RegExp(`مباشر الآن · ${liveCountLabel(3)}`), 'the badge must reflect the synthetic live count (3-10 bucket: "N فعاليات")');
  assert.match(html, /board-live-prev/, 'nav arrows must render when more than one live card is present');
  assert.match(html, /board-live-dot/, 'dot indicators must render when more than one live card is present');
  const single = homeBoardLiveSection([synthetic[0]]);
  assert.doesNotMatch(single, /board-live-prev/, 'nav must be omitted entirely for a single live card — nothing to navigate between');
  const empty = homeBoardLiveSection([]);
  assert.match(empty, /<section class="board-live" id="boardLive" hidden>/, 'zero live events must render the section hidden');
}

// PM review of PR #32: `${count} فعاليات` for every count is wrong Arabic
// grammar, most visibly at 1 and 2 ("1 فعاليات" / "2 فعاليات" are not valid
// Arabic). Lock the four count-agreement buckets so this can't regress:
//   1 -> "فعالية واحدة", 2 -> "فعاليتان", 3-10 -> "N فعاليات", 11+ -> "N فعالية".
{
  assert.equal(liveCountLabel(1), 'فعالية واحدة', 'bucket 1 must use the singular-with-"واحدة" form, not "1 فعاليات"');
  assert.equal(liveCountLabel(2), 'فعاليتان', 'bucket 2 must use the dual form, not "2 فعاليات"');
  assert.equal(liveCountLabel(3), '3 فعاليات', 'bucket 3-10 must use the digit + plural form');
  assert.equal(liveCountLabel(10), '10 فعاليات', 'bucket 3-10 (upper edge) must use the digit + plural form');
  assert.equal(liveCountLabel(11), '11 فعالية', 'bucket >=11 must use the digit + singular form, not "11 فعاليات"');

  for (const [count, expectedArabic] of [[1, 'فعالية واحدة'], [2, 'فعاليتان'], [3, '3 فعاليات'], [11, '11 فعالية']]) {
    const cards = Array.from({ length: count }, (_, index) => ({
      title: `Bucket Test Event ${index + 1}`,
      meta: 'الرياض · حتى ١٠:٠٠ م',
      url: `./events/bucket-test-${index + 1}.html`
    }));
    const sectionHtml = homeBoardLiveSection(cards);
    assert.ok(
      sectionHtml.includes(`مباشر الآن · ${expectedArabic}`),
      `homeBoardLiveSection(count=${count}) must render the badge "مباشر الآن · ${expectedArabic}"`
    );
  }
}

console.log(`FIRST_GLANCE_TRUST_OK ticker=${ticker.length} live=${liveMoments.length} future=${futureStarts.length} pages_scanned=${scanPages.length} cards=${cardBlocks.length} board_live_cards=${boardLiveCards.length}`);
