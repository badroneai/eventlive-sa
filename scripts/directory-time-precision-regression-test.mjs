import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { load } from 'cheerio';
import { chromium } from 'playwright';
import { AUDIENCE_TAXONOMY, audienceObjects } from './audience-utils.mjs';

// Exercise the real projection and renderer, without executing the site builder
// or relying on a particular third-party event staying in the public catalog.
const source = fs.readFileSync('scripts/generate-site.mjs', 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const directories = [
  ['cities', 'cityDirectoryRows', 'cityDirectoryCard'],
  ['categories', 'categoryDirectoryRows', 'categoryDirectoryCard'],
  ['audiences', 'audienceDirectoryRows', 'audienceDirectoryCard']
];
const names = [
  'escapeHtml', 'dateValue', 'formatShortDate', 'staticWhenText', 'runtimeAttrs',
  ...directories.flatMap(([, rows, card]) => [rows, card])
];
const functions = names.map((name) => {
  const node = ast.body.find((item) => item.type === 'FunctionDeclaration' && item.id.name === name);
  assert.ok(node, `missing ${name}`);
  return source.slice(node.start, node.end);
});
const builders = vm.runInNewContext(`${functions.join('\n')}; ({${names.join(',')}})`, {
  fs, path, feedsDir: path.resolve('dist/feeds'), AUDIENCE_TAXONOMY, audienceObjects,
  citySlug: () => 'riyadh', cityLabel: (city) => city, placesOnlyCitySlugs: () => []
});
const fixture = {
  title: 'Directory clock fixture', city: 'Riyadh', category_slug: 'technology-innovation',
  category_label: 'Technology', audience_labels: [{ slug: 'tech', label: 'Technology' }],
  starts_at: '2026-10-01T09:00:00+03:00', ends_at: '2026-10-01T18:00:00+03:00',
  event_kind: 'moment', status: 'upcoming', detail_url: './events/clock-fixture.html'
};
function assertProjection(next, event, label) {
  assert.equal(next.time_precision, event.time_precision || 'unknown', `${label}: projection must retain precision`);
  assert.equal(next.starts_at, event.starts_at, `${label}: projection must retain start`);
  assert.equal(next.ends_at, event.ends_at, `${label}: projection must retain actual end`);
  assert.equal(next.event_kind, event.event_kind, `${label}: projection must retain event kind`);
}
function assertClockAttributes(clock, event, label) {
  assert.equal(clock.attr('data-time-precision'), event.time_precision || 'unknown', `${label}: clock must retain precision`);
  assert.equal(clock.attr('data-start'), event.starts_at, `${label}: clock must retain start`);
  assert.equal(clock.attr('data-end'), event.ends_at || event.starts_at, `${label}: clock must retain actual end`);
  assert.equal(clock.attr('data-kind'), event.event_kind || 'moment', `${label}: clock must retain event kind`);
}
const cases = [
  ['exact', { time_precision: 'exact' }],
  ['official', { time_precision: 'official-session-times' }],
  ['unknown', { time_precision: 'unknown' }],
  ['missing', {}],
  ['date-only', { time_precision: 'date-only-defaulted' }],
  ['program', { time_precision: 'exact', event_kind: 'program' }],
  ['multiday', { time_precision: 'exact', ends_at: '2026-10-03T18:00:00+03:00' }]
];

// A separately runnable deterministic oracle for environments without browser
// binaries: node scripts/directory-time-precision-regression-test.mjs --vm-only
// The blocking gate still requires Chromium by default; browser failures never
// silently fall back to this mode.
export function createDirectoryVmRuntime(runtime, html) {
  const $ = load(html);
  const elements = new Map($('[id]').toArray().map((node) => {
    const clock = $(node).find('[data-live-time]');
    return [$(node).attr('id'), {
      dataset: {
        start: clock.attr('data-start'), end: clock.attr('data-end'),
        kind: clock.attr('data-kind'), timePrecision: clock.attr('data-time-precision')
      },
      textContent: clock.text(),
      hasAttribute: (name) => clock.attr(name) !== undefined
    }];
  }));
  let now = Date.parse('2026-10-01T08:00:00+03:00');
  class FixtureDate extends Date { static now() { return now; } }
  const context = {
    Date: FixtureDate, setInterval() {}, navigator: {},
    window: { location: { hostname: 'example.test' } },
    document: {
      querySelector: () => null,
      querySelectorAll: (selector) => selector === '[data-live-time]' ? [...elements.values()] : []
    }
  };
  vm.runInNewContext(runtime, context);
  return {
    readAt(time) {
      now = Date.parse(time);
      context.window.EventLiveRuntimeClock.update();
      return Object.fromEntries([...elements].map(([id, node]) => [id, node.textContent]));
    },
    removePrecision() { delete elements.get('exact').dataset.timePrecision; },
    collapseEnd() { elements.get('official').dataset.end = elements.get('official').dataset.start; }
  };
}

const cards = new Map();
let projectionChecks = 0;
for (const [directory, rowsName, cardName] of directories) {
  const rendered = [];
  for (const [id, overrides] of cases) {
    const event = { ...fixture, ...overrides };
    const row = builders[rowsName]([event]).find((item) => item.next_event);
    assertProjection(row.next_event, event, `${directory}/${id}`);
    const html = builders[cardName](row);
    assertClockAttributes(load(html)('[data-live-time]'), event, `${directory}/${id}`);
    rendered.push(`<div id="${id}">${html}</div>`);
    projectionChecks += 1;
  }
  cards.set(directory, rendered.join(''));

  const exact = { ...fixture, time_precision: 'exact' };
  const row = builders[rowsName]([exact]).find((item) => item.next_event);
  assert.throws(() => assertProjection({ ...row.next_event, time_precision: undefined }, exact, 'lost precision'), /projection must retain precision/);
  const broken = load(builders[cardName](row));
  broken('[data-live-time]').removeAttr('data-time-precision');
  assert.throws(() => assertClockAttributes(broken('[data-live-time]'), exact, 'lost attribute'), /clock must retain precision/);
}

// Check final emitted Arabic AND English directories against the public catalog,
// then execute each page's actual clock against fixed fixtures in a real browser.
// No event-volume or exact-title assertion depends on external source changes.
const catalog = JSON.parse(fs.readFileSync('dist/events.json', 'utf8')).events;
const byUrl = new Map(catalog.map((event) => [event.detail_url || event.url, event]));
const vmOnly = process.argv.includes('--vm-only');
const browser = vmOnly ? null : await chromium.launch({ headless: true });
let outputChecks = 0;
let browserChecks = 0;
try {
  for (const [directory] of directories) {
    const rows = JSON.parse(fs.readFileSync(`dist/${directory}.json`, 'utf8'))[directory];
    for (const locale of ['', 'en/']) {
      const relativePath = `${locale}${directory}.html`;
      const $ = load(fs.readFileSync(`dist/${relativePath}`, 'utf8'));
      for (const row of rows.filter((item) => item.next_event)) {
        const event = byUrl.get(row.next_event.url);
        assert.ok(event, `${relativePath}: next event must exist in catalog`);
        assertProjection(row.next_event, event, relativePath);
        const card = $('article.activation-card').filter((_, item) =>
          $(item).find('h2 a').attr('href')?.replace(/^\/en\//, './') === row.url
        );
        assert.equal(card.length, 1, `${relativePath}: directory row must have one card`);
        assertClockAttributes(card.find('[data-live-time]'), event, `${relativePath}/${row.slug}`);
        outputChecks += 1;
      }
      const runtime = $('script').toArray().map((item) => $(item).html()).find((script) => script.includes('window.EventLiveRuntimeClock ='));
      assert.ok(runtime, `${relativePath}: emitted live clock must exist`);
      const page = browser ? await browser.newPage() : null;
      const vmRuntime = vmOnly ? createDirectoryVmRuntime(runtime, cards.get(directory)) : null;
      if (page) {
        await page.evaluate(() => {
          window.__directoryNow = Date.parse('2026-10-01T08:00:00+03:00');
          Date.now = () => window.__directoryNow;
        });
        await page.setContent(`${cards.get(directory)}<script>${runtime}</script>`);
      }
      const readAt = async (time) => vmRuntime ? vmRuntime.readAt(time) : page.evaluate((now) => {
        window.__directoryNow = Date.parse(now);
        window.EventLiveRuntimeClock.update();
        return Object.fromEntries([...document.querySelectorAll('[id]')].map((node) => [node.id, node.querySelector('[data-live-time]').textContent]));
      }, time);
      const uncertain = locale ? /Time not confirmed/ : /وقت غير مؤكد/;
      const starts = locale ? /^Starts in / : /^يبدأ بعد /;
      const ends = locale ? /^Ends in / : /^ينتهي بعد /;
      const ended = locale ? /^Ended / : /^انتهت منذ /;
      const previousDay = await readAt('2026-09-30T23:59:59+03:00');
      const dateBoundary = await readAt('2026-10-01T00:00:00+03:00');
      const before = await readAt('2026-10-01T08:59:59+03:00');
      const during = await readAt('2026-10-01T09:00:00+03:00');
      const endBoundary = await readAt('2026-10-01T18:00:00+03:00');
      const after = await readAt('2026-10-01T18:00:01+03:00');
      const late = await readAt('2026-10-01T23:59:59+03:00');
      const tomorrow = await readAt('2026-10-02T00:00:00+03:00');
      for (const id of ['exact', 'official']) {
        assert.match(before[id], starts, `${relativePath}/${id}: before exact start`);
        assert.match(during[id], ends, `${relativePath}/${id}: at exact start`);
        assert.match(endBoundary[id], ends, `${relativePath}/${id}: at exact end`);
        assert.match(after[id], ended, `${relativePath}/${id}: after exact end`);
        browserChecks += 4;
      }
      for (const id of ['unknown', 'missing', 'date-only']) {
        assert.match(previousDay[id], locale ? /^Starts on / : /^تبدأ في /);
        assert.match(previousDay[id], uncertain);
        assert.equal(dateBoundary[id], before[id], `${relativePath}/${id}: unknown time starts on the Riyadh date boundary`);
        assert.match(before[id], uncertain);
        assert.equal(late[id], before[id], `${relativePath}/${id}: unknown hours retain the full Riyadh date`);
        assert.match(tomorrow[id], locale ? /^Ended on / : /^انتهت في /);
        assert.match(tomorrow[id], uncertain);
        browserChecks += 7;
      }
      assert.match(during.program, locale ? /^Program window/ : /^نافذة البرنامج/);
      assert.match(tomorrow.multiday, locale ? /^(?:Continues|Ongoing)/ : /^مستمرة حتى/);
      if (locale) assert.doesNotMatch(Object.values(during).join(' '), /[ء-ي]/u);
      browserChecks += 2;

      // These real-browser mutations reproduce both regressions: a lost verdict
      // downgrades exact time to unknown; a lost end prematurely ends the event.
      if (vmRuntime) vmRuntime.removePrecision();
      else await page.locator('#exact [data-live-time]').evaluate((node) => node.removeAttribute('data-time-precision'));
      const noPrecision = await readAt('2026-10-01T12:00:00+03:00');
      assert.throws(() => assert.match(noPrecision.exact, ends));
      if (vmRuntime) vmRuntime.collapseEnd();
      else await page.locator('#official [data-live-time]').evaluate((node) => { node.dataset.end = node.dataset.start; });
      const noEnd = await readAt('2026-10-01T12:00:00+03:00');
      assert.throws(() => assert.match(noEnd.official, ends));
      if (page) await page.close();
    }
  }
} finally {
  if (browser) await browser.close();
}
console.log(`DIRECTORY_TIME_PRECISION_OK projections=${projectionChecks} emitted_cards=${outputChecks} boundary_checks=${browserChecks} runtime=${vmOnly ? 'vm' : 'chromium'} locales=ar,en negative_controls=18`);
