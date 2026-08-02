import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { eventCountLabel } from './event-count-label.mjs';
import { homeCalendarStrip, remainingMonthDays, riyadhMonthEndExclusive } from './home-month-calendar.mjs';

// WO-2: homepage "this month" section + mini calendar strip.
//
// Covers, in order:
//  1. eventCountLabel — the Arabic count-agreement buckets (same rule as
//     home-board-live.mjs's liveCountLabel).
//  2. riyadhMonthEndExclusive / remainingMonthDays — pure date math with
//     synthetic fixtures, including the December -> January rollover and a
//     synthetic empty-catalog fixture that exercises the graceful
//     degradation path the real catalog cannot reliably exercise on any
//     given build day.
//  3. homeCalendarStrip — pure HTML templating from a `days` array.
//  4. Built-output assertions against a fresh `npm run build`: the 'month'
//     section and calendar strip exist in both dist/index.html and
//     dist/en/index.html, the section's card list matches the same
//     usedIds-exclusion chain used by the other three windows, the strip's
//     day count matches the remaining days of the current Riyadh month, and
//     every #day-YYYY-MM-DD link on the homepage resolves to a matching
//     anchor in dist/this-month.html (Arabic and English).
//  5. Built-output guard: the literal-string .replace() splice in
//     patchHomePage (scripts/generate-site.mjs) that strips a stale
//     tomorrow/week/month section before re-inserting the current one — the
//     same WO-3/WO-1 "guard against silent shell drift" pattern.

// ---------------------------------------------------------------------------
// 1. eventCountLabel
// ---------------------------------------------------------------------------
assert.equal(eventCountLabel(1), 'فعالية واحدة', 'bucket 1 must use the singular-with-"واحدة" form');
assert.equal(eventCountLabel(2), 'فعاليتان', 'bucket 2 must use the dual form');
assert.equal(eventCountLabel(3), '3 فعاليات', 'bucket 3-10 must use the digit + plural form');
assert.equal(eventCountLabel(10), '10 فعاليات', 'bucket 3-10 (upper edge) must use the digit + plural form');
assert.equal(eventCountLabel(11), '11 فعالية', 'bucket >=11 must use the digit + singular form');
assert.equal(eventCountLabel(0), '0 فعالية', 'zero must not crash and must use the >=11-style singular form');

// ---------------------------------------------------------------------------
// 2. riyadhMonthEndExclusive / remainingMonthDays (synthetic fixtures)
// ---------------------------------------------------------------------------
{
  // A 31-day month, reference two days before month end.
  const reference = Date.parse('2026-07-29T10:00:00+03:00');
  assert.equal(
    new Date(riyadhMonthEndExclusive(reference)).toISOString(),
    '2026-07-31T21:00:00.000Z',
    'riyadhMonthEndExclusive must resolve to 2026-08-01T00:00:00+03:00 for a July reference'
  );

  const events = [
    { id: 'a', status: 'confirmed', starts_at: '2026-07-29T18:00:00+03:00' },
    { id: 'b', status: 'confirmed', starts_at: '2026-07-30T09:00:00+03:00' },
    { id: 'c', status: 'ended', starts_at: '2026-07-30T09:00:00+03:00' }, // ended: excluded
    { id: 'd', status: 'confirmed', starts_at: '2026-08-01T09:00:00+03:00' }, // next month: excluded
    { id: 'e', status: 'confirmed', starts_at: '2026-06-30T09:00:00+03:00' } // last month: excluded
  ];
  const days = remainingMonthDays(events, reference);
  assert.deepEqual(days.map((day) => day.key), ['2026-07-29', '2026-07-30', '2026-07-31'], 'remaining days must run from the reference day through the last day of its month, inclusive');
  assert.equal(days[0].events.length, 1, 'day 29 must only see event a');
  assert.equal(days[1].events.length, 1, 'day 30 must see event b but not the ended event c');
  assert.equal(days[2].events.length, 0, 'day 31 must have zero events (no fixture event lands there)');

  // December -> January rollover: must stop at Dec 31, never bleed into January.
  const decReference = Date.parse('2026-12-30T10:00:00+03:00');
  const decDays = remainingMonthDays([{ id: 'jan', status: 'confirmed', starts_at: '2027-01-01T09:00:00+03:00' }], decReference);
  assert.deepEqual(decDays.map((day) => day.key), ['2026-12-30', '2026-12-31'], 'December reference must not roll into January');
  assert.equal(decDays[0].events.length + decDays[1].events.length, 0, 'the January-dated fixture event must never attach to a December day');

  // The last day of the month as the reference: still exactly 1 remaining day.
  const lastDayReference = Date.parse('2026-07-31T22:00:00+03:00');
  const lastDayDays = remainingMonthDays([], lastDayReference);
  assert.equal(lastDayDays.length, 1, 'on the last day of the month, remainingMonthDays must still return exactly 1 day (today) — the list is never empty');

  // Synthetic empty-catalog fixture — the real catalog cannot reliably
  // exercise "every remaining day has zero events" on a given build day, so
  // this is the fixture that proves the degrade path.
  const emptyDays = remainingMonthDays([], reference);
  assert.equal(emptyDays.length, 3, 'an empty catalog must still produce one entry per remaining calendar day');
  assert.ok(emptyDays.every((day) => day.events.length === 0), 'an empty catalog must produce dot-less days, not fewer days');
}

// ---------------------------------------------------------------------------
// 3. homeCalendarStrip (pure templating)
// ---------------------------------------------------------------------------
{
  const days = [
    { key: '2026-07-29', date: new Date('2026-07-29T00:00:00+03:00'), events: [] },
    { key: '2026-07-30', date: new Date('2026-07-30T00:00:00+03:00'), events: [{ id: 'x' }] },
    { key: '2026-07-31', date: new Date('2026-07-31T00:00:00+03:00'), events: [{ id: 'y' }, { id: 'z' }] }
  ];
  const html = homeCalendarStrip(days);
  assert.equal((html.match(/class="cal-day/g) || []).length, 3, 'the strip must render exactly one cell per remaining day');
  assert.equal((html.match(/class="cal-day has-events/g) || []).length, 2, 'only days with events get the has-events/linked treatment');
  assert.ok(!/cal-day has-events" data-day="2026-07-29"/.test(html), 'the zero-event day must not be linked');
  assert.match(html, /href="\.\/this-month\.html#day-2026-07-30"/, 'a day with events must link to its this-month.html anchor');
  assert.match(html, /aria-label="٣٠ يوليو · فعالية واحدة"/, 'a single-event day must use the singular count label');
  assert.match(html, /aria-label="٣١ يوليو · فعاليتان"/, 'a two-event day must use the dual count label');

  // Graceful degradation: an all-empty `days` list (impossible in practice
  // per the invariant above, but the function itself must not crash or
  // render broken markup if it ever receives one) — assert the documented
  // "hide entirely if there is nothing to render" contract.
  assert.equal(homeCalendarStrip([]), '', 'an empty days array must render nothing rather than an empty wrapper');
}

// ---------------------------------------------------------------------------
// 4 + 5. Built-output assertions (require a fresh `npm run build`)
// ---------------------------------------------------------------------------
const root = process.cwd();
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');
const enIndexPath = path.join(distDir, 'en', 'index.html');
const thisMonthPath = path.join(distDir, 'this-month.html');
const enThisMonthPath = path.join(distDir, 'en', 'this-month.html');
const eventsPath = path.join(distDir, 'events.json');

for (const [label, p] of [
  ['dist/index.html', indexPath],
  ['dist/en/index.html', enIndexPath],
  ['dist/this-month.html', thisMonthPath],
  ['dist/en/this-month.html', enThisMonthPath],
  ['dist/events.json', eventsPath]
]) {
  assert.ok(fs.existsSync(p), `${label} must exist; run npm run build first`);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const enIndexHtml = fs.readFileSync(enIndexPath, 'utf8');
const thisMonthHtml = fs.readFileSync(thisMonthPath, 'utf8');
const enThisMonthHtml = fs.readFileSync(enThisMonthPath, 'utf8');
const eventsIndex = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const events = Array.isArray(eventsIndex.events) ? eventsIndex.events : [];
assert.ok(events.length >= 20, 'home month calendar test expects a useful public catalog');

// 4a. Section presence + structural guard (WO-3/WO-1 pattern): if the
// committed dist/index.html shell drifts out from under patchHomePage's
// literal-string splice, these markers silently stop appearing.
const monthSectionMatch = indexHtml.match(/<section class="h-section" id="month"[^>]*data-home-window="month"[^>]*>([\s\S]*?)<\/section>/);
assert.ok(monthSectionMatch, 'dist/index.html must expose the "month" timeline section — patchHomePage\'s splice may have no-oped');
assert.match(monthSectionMatch[1], /<h2>هذا الشهر<\/h2>/, 'month section must have a clear public heading');
assert.match(monthSectionMatch[1], /class="cal-strip"/, 'the calendar strip must live inside the month section (same splice point, so it can never go stale independently)');

const genSource = fs.readFileSync(path.join(root, 'scripts', 'generate-site.mjs'), 'utf8');
assert.ok(
  genSource.includes('id=\\"(?:tomorrow|week|month)\\"'),
  'patchHomePage\'s stale-section-stripping regex must include "month" — otherwise a rebuild accumulates duplicate month sections/calendar strips over time'
);

// 4b. The month section's card list must follow the same usedIds-exclusion
// chain as today/tomorrow/week (soon -> tomorrow -> week -> month), mirrored
// here exactly as scripts/generate-site.mjs's patchHomePage computes it.
const now = Date.now();
const dateKey = (value) => new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Riyadh'
}).format(new Date(value));
const todayKey = dateKey(now);
const tomorrowKey = dateKey(now + 86400000);
const weekLimit = now + (7 * 86400000);
const upcoming = events.filter((event) => event.status !== 'ended');
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
expectedWeek.forEach((event) => used.add(event.id));
const monthEnd = riyadhMonthEndExclusive(now);
const expectedMonth = upcoming.filter((event) => {
  const start = new Date(event.starts_at).getTime();
  return !used.has(event.id) && start > weekLimit && start < monthEnd;
});

assert.match(monthSectionMatch[1], new RegExp(`<p><b>${expectedMonth.length}</b>`), 'month section must disclose its full (usedIds-excluded) event count');
const monthLinks = [...monthSectionMatch[1].matchAll(/<article class="card"[\s\S]*?<a class="cover" href="([^"]+)"/g)].map((card) => card[1]);
assert.equal(monthLinks.length, Math.min(12, expectedMonth.length), 'month section must cap at 12 cards (not the 8-card cap used by the other three windows)');
if (expectedMonth.length === 0) {
  assert.match(monthSectionMatch[1], /class="empty-state"/, 'an empty month window (everything already surfaced by today/tomorrow/week) must degrade to the shared empty-state pattern');
}

// 4c. Calendar strip day count = remaining Riyadh days of the current month,
// and every linked day matches remainingMonthDays()'s own event membership.
const expectedDays = remainingMonthDays(events, now);
// a11y-prod-pipeline-fix: the strip's container must be a real
// <ul class="cal-strip" role="list"> — this regex literally requires both
// the `<ul class="cal-strip"` tag AND the explicit `role="list"` in that
// exact attribute order (matching the literal template in
// home-month-calendar.mjs), not just the class attribute. Reverting the
// container back to a bare `<div ... role="list">`, OR dropping the
// explicit role="list" from the <ul> (WebKit strips list semantics from
// a <ul style="list-style:none"> without it — see the comment on
// assertStripAriaContract below), makes this match fail to find the
// strip at all, which fails the very next assert.ok with a clear message
// instead of silently matching stale markup.
const stripMatch = indexHtml.match(/(<ul class="cal-strip" role="list"[^>]*>)([\s\S]*?)<\/ul>\s*<div class="h-section-head">/);
assert.ok(stripMatch, 'dist/index.html must expose the calendar strip as a real <ul class="cal-strip" role="list"> immediately before the month section head');
const stripCellCount = (stripMatch[2].match(/class="cal-day/g) || []).length;
assert.equal(stripCellCount, expectedDays.length, 'calendar strip day count must equal the remaining days of the current Riyadh month');
const expectedLinkedDays = expectedDays.filter((day) => day.events.length).map((day) => day.key);
const actualLinkedDays = [...stripMatch[2].matchAll(/class="cal-day has-events" data-day="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(actualLinkedDays.sort(), expectedLinkedDays.sort(), 'exactly the days with events must be linked/dotted, no more, no less');

// 4c-bis. ARIA-contract guard (a11y-prod-pipeline-fix): axe's
// aria-required-children rule fails ANY role="list" element (explicit or,
// as here, the <ul>'s implicit role) whose direct children are not
// listitems — that is exactly the bug that shipped with WO-2 (a bare
// `<div role="list">` wrapping bare `<a>`/`<span>` cells) and turned the
// production Lighthouse a11y gate red for 5 days (2026-07-29 to
// 2026-08-02). This reads the REAL built Arabic AND English homepage
// output, not a synthetic fixture, so reintroducing that shape — or the
// equally-broken variant of bolting role="listitem" straight onto the <a>
// (which would overwrite its link role) — fails this test immediately.
//
// The explicit-role="list" half of this guard exists for a second,
// quieter failure mode axe cannot see at all: WebKit/Safari (all iOS
// browsers) strips list semantics from the accessibility tree for any
// <ul>/<ol> styled with `list-style: none` (which .cal-strip is) unless
// role="list" is explicit — VoiceOver stops announcing "list, N items"
// and the <li> children stop being exposed as listitems. axe/Lighthouse
// run on Chromium and will never catch that regression; only this
// literal-string check does.
function assertStripAriaContract(openTag, stripHtml, label) {
  assert.match(openTag, /\brole="list"/, `${label}: the <ul class="cal-strip"> must carry an explicit role="list" — list-style:none strips implicit list semantics from the accessibility tree in WebKit/Safari, so the implicit role from <ul> alone is not enough there`);
  const liWrappers = [...stripHtml.matchAll(/<li class="cal-cell">([\s\S]*?)<\/li>/g)];
  const cellCount = (stripHtml.match(/class="cal-day/g) || []).length;
  assert.ok(cellCount > 0, `${label}: calendar strip must contain at least one .cal-day cell to assert the ARIA contract over`);
  assert.equal(liWrappers.length, cellCount, `${label}: every .cal-day cell must be wrapped in exactly one <li class="cal-cell"> — a cal-day with no <li> listitem wrapper is the aria-required-children violation this test exists to catch`);
  for (const [, inner] of liWrappers) {
    assert.ok(
      /^<a class="cal-day has-events"[\s\S]*<\/a>$/.test(inner) || /^<span class="cal-day"[\s\S]*<\/span>$/.test(inner),
      `${label}: each <li class="cal-cell"> must wrap exactly one .cal-day cell (a linked has-events <a> or an unlinked <span>), found: ${inner.slice(0, 160)}`
    );
  }
  assert.ok(!/role="listitem"/.test(stripHtml), `${label}: listitem semantics must come from real <li> elements, never role="listitem" bolted onto the <a> (that would overwrite the day's link role)`);
}
assertStripAriaContract(stripMatch[1], stripMatch[2], 'dist/index.html');

// 4d. Anchor resolution: every homepage #day-YYYY-MM-DD link must resolve on
// this-month.html, in both Arabic and English.
const homepageDayLinks = [...indexHtml.matchAll(/href="\.\/this-month\.html#(day-\d{4}-\d{2}-\d{2})"/g)].map((match) => match[1]);
assert.ok(homepageDayLinks.length === expectedLinkedDays.length, 'every linked calendar day must produce exactly one homepage #day-… link');
const thisMonthAnchorIds = new Set([...thisMonthHtml.matchAll(/id="(day-\d{4}-\d{2}-\d{2})"/g)].map((match) => match[1]));
for (const anchor of homepageDayLinks) {
  assert.ok(thisMonthAnchorIds.has(anchor), `dist/index.html links to #${anchor} but dist/this-month.html has no matching id="${anchor}"`);
}

const enHomepageDayLinks = [...enIndexHtml.matchAll(/href="\.\/this-month\.html#(day-\d{4}-\d{2}-\d{2})"/g)].map((match) => match[1]);
const enThisMonthAnchorIds = new Set([...enThisMonthHtml.matchAll(/id="(day-\d{4}-\d{2}-\d{2})"/g)].map((match) => match[1]));
assert.equal(enHomepageDayLinks.length, homepageDayLinks.length, 'the English homepage must expose the same set of day links as the Arabic homepage');
for (const anchor of enHomepageDayLinks) {
  assert.ok(enThisMonthAnchorIds.has(anchor), `dist/en/index.html links to #${anchor} but dist/en/this-month.html has no matching id="${anchor}"`);
}

// 4e. Bilingual chrome: the calendar strip and month section head carry no
// leftover Arabic on the English homepage (the broader en-surface-sweep
// gate covers every page; this pins the two specific new strings so a
// regression here fails fast with a precise message).
//
// Scoped to CHROME only — the cal-strip block plus the h-section-head block,
// which is what this test was written to pin — and deliberately excludes the
// card-row that follows. Running doesNotMatch over the *entire* month section
// also matched (a) legitimate Arabic URL slugs baked into card hrefs/srcs
// (e.g. "event-معسكر-...") and (b) event titles still pending the autonomous
// ar->en translation queue (e.g. "أوركسترا Game of Thrones"). Both are
// tolerated by the site-wide policy in scripts/en-surface-sweep-regression-
// test.mjs, which strips tags, checks visible text + alt/title/aria-label/
// placeholder attributes, and only hard-fails on template chrome — card
// content is that policy's job, not this test's.
assert.match(enIndexHtml, /<h2>This month<\/h2>/, 'English homepage must render the translated month section heading');
assert.match(enIndexHtml, /aria-label="Remaining days of the month"/, 'English homepage calendar strip must carry the translated aria-label');
const enMonthSectionHtml = enIndexHtml.match(/<section class="h-section" id="month"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
const enMonthChromeMatch = enMonthSectionHtml.match(/<ul class="cal-strip"[\s\S]*?(?=<div class="card-row")/);
assert.ok(enMonthChromeMatch, 'English month section must expose the cal-strip (as a real <ul>) + h-section-head chrome block ahead of the card row');
assert.doesNotMatch(enMonthChromeMatch[0], /[ء-ي]/u, 'English month section chrome (calendar strip + section head) must contain no leftover Arabic characters');
// Split the English chrome block back into the strip's own opening tag +
// inner cells so assertStripAriaContract can check role="list" the same
// way it does for the Arabic side (see stripMatch above for why both the
// tag and the explicit role are asserted together).
const enStripSplit = enMonthChromeMatch[0].match(/^(<ul class="cal-strip"[^>]*>)([\s\S]*?)<\/ul>/);
assert.ok(enStripSplit, 'dist/en/index.html calendar strip must close its own </ul> inside the month section chrome block');
assertStripAriaContract(enStripSplit[1], enStripSplit[2], 'dist/en/index.html');

console.log(`home-month-calendar-regression-test: ok month_events=${expectedMonth.length} remaining_days=${expectedDays.length} linked_days=${expectedLinkedDays.length}`);
