import assert from 'node:assert/strict';
import { canonicalEventPage } from './event-canonical-aliases.mjs';
import { legacyRedirectTarget } from './legacy-redirect-pages.mjs';
import { loadUrlLedger } from './published-url-ledger.mjs';

// A redirect stub canonicalises to its replacement on BOTH surfaces.
const movedEventTargets = new Map(Object.entries(loadUrlLedger().events || {})
  .filter(([, entry]) => entry?.moved_to)
  .map(([slug, entry]) => [`events/${slug}.html`, `events/${entry.moved_to}.html`]));
const redirectTargetFor = (relativePath) => movedEventTargets.get(relativePath) || legacyRedirectTarget(relativePath);
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { load } from 'cheerio';

import { NOINDEX_PUBLIC_PAGES } from './noindex-public-pages.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
const routeFile = path.join(dist, 'locale-routes.json');
assert.ok(fs.existsSync(routeFile), 'locale-routes.json must be generated');

const registry = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
assert.deepEqual(registry.locales, ['ar-SA', 'en-SA']);
assert.ok(registry.routes.length > 1000, 'all public routes must be localized');
let eventDetailScriptChecked = false;
let eventJsonLdNodesChecked = 0;

// WO Aug1 (2026-08 source-sync freeze recovery): regression coverage for
// three localizer leaks fixed this cycle in scripts/generate-localized-
// site.mjs — translateText()/wordReplacementPatterns/stripEmbeddedLabel
// aren't exported (the file runs top-level build side effects at import
// time, so it can't be safely required for unit testing), so — consistent
// with this file's existing built-output idiom (see the corrupted-Arabic-
// word PM/AM check in inspect() below) — these are pinned against the
// actual dist/en build output rather than unit-tested in isolation.
//
// (a) trust-tooltip chrome leak: "المصدر: X · آخر تحقق: DATE" must translate
//     in full, with no leftover Arabic and an explicit "Last verified:".
// (b) month/day word-boundary corruption: a blind replaceAll('الأحد',
//     'Sunday') turns "الأحداث" (events) into "Sundayاث" — reproduced by
//     dist/en/this-week.html's hero description, which contains "الأحداث"
//     and must never contain the corrupted "Sundayاث" fusion.
// (c) embedded "الموقع:"/"المنظم:" chrome leak: the recurring-debt report's
//     top offender ("The event takes place in Dhahran, الموقع: Children's
//     Museum.") must be fully translated with no leftover Arabic.
let trustTooltipChecked = false;
let venueLeakChecked = false;
// Same targeted idiom as the PM/AM corrupted-word check below (not a bare
// Latin/Arabic-adjacency regex, which would false-positive on ordinary mixed
// strings like "EventLive على" or a city name next to a source label): only
// the 19 words the localizer's wordReplacements table can corrupt.
const MONTH_DAY_WORDS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WORD_FUSION_PATTERN = new RegExp(`[ء-ي](?:${MONTH_DAY_WORDS.join('|')})|(?:${MONTH_DAY_WORDS.join('|')})[ء-ي]`, 'u');

function collectEventJsonLd(value, events = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectEventJsonLd(item, events);
    return events;
  }
  if (!value || typeof value !== 'object') return events;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes('Event')) events.push(value);
  for (const child of Object.values(value)) collectEventJsonLd(child, events);
  return events;
}

function eventJsonLdFromPage($) {
  const events = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    collectEventJsonLd(JSON.parse($(element).html() || '{}'), events);
  });
  return events;
}

function resolveUnicodePath(base, relative) {
  let current = base;
  for (const segment of relative.split(path.sep)) {
    const exact = path.join(current, segment);
    if (fs.existsSync(exact)) {
      current = exact;
      continue;
    }
    const normalized = segment.normalize('NFC');
    const match = fs.readdirSync(current).find((entry) => entry.normalize('NFC') === normalized);
    assert.ok(match, `missing localized page segment: ${exact}`);
    current = path.join(current, match);
  }
  return current;
}

function inspect(file, locale, direction, canonical, isRedirectStub = false) {
  assert.ok(fs.existsSync(file), `missing localized page: ${file}`);
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(!source.includes('/en/en/'), `${file} contains a duplicated locale segment`);
  if (locale === 'en-SA') {
    assert.ok(!/[\u0621-\u064a]PM|PM[\u0621-\u064a]/u.test(source), `${file} contains a corrupted Arabic word from time localization`);
  }
  const $ = load(source);
  if (locale === 'en-SA') {
    $('[aria-label],[placeholder]').each((_, element) => {
      for (const attribute of ['aria-label', 'placeholder']) {
        const value = $(element).attr(attribute) || '';
        assert.ok(!/[\u0600-\u06ff]/u.test(value), `${file} contains an untranslated ${attribute}: ${value}`);
      }
    });
    if (file.endsWith(`${path.sep}en${path.sep}index.html`)) {
      for (const phrase of ['يحدث الآن — ينتهي خلال', 'أقرب فعالية — تبدأ خلال', 'افتح الجدول الحي']) {
        assert.ok(!source.includes(phrase), `${file} contains an untranslated live-home runtime phrase: ${phrase}`);
      }
    }
  }
  assert.equal($('html').attr('lang'), locale, `${file} has the wrong language`);
  assert.equal($('html').attr('dir'), direction, `${file} has the wrong direction`);
  assert.equal($('link[rel="canonical"]').attr('href'), canonical, `${file} has the wrong canonical URL`);
  // A redirect stub canonicalises to another page, and Google ignores hreflang
  // on a non-canonical page — alternates between two stubs are noise. The stub
  // must still EXIST on both surfaces; that is rule 7 of
  // scripts/search-indexability-regression-test.mjs.
  for (const alternate of ['ar-SA', 'en-SA', 'x-default']) {
    assert.equal(
      $(`link[rel="alternate"][hreflang="${alternate}"]`).length,
      isRedirectStub ? 0 : 1,
      `${file} must have ${isRedirectStub ? 'no' : 'one'} ${alternate} alternate`
    );
  }
  assert.equal($('.language-switch').length, 1, `${file} must have one language switch`);
  assert.equal($('.language-suggestion').length, 0, `${file} must not interrupt visitors with a language suggestion`);
  assert.ok(!source.includes('EventLive is available in English.'), `${file} must not contain the retired language prompt`);
  if (locale === 'en-SA') assert.ok(!/[\u0600-\u06ff]/u.test($('.footer').text()), `${file} contains untranslated footer text`);
  assert.equal($('#eventlive-language-runtime').length, 1, `${file} must persist language preference`);
  if (locale === 'en-SA') assert.equal($('link[rel="manifest"]').attr('href'), '/en/manifest.webmanifest');
  const isEnglishEventDetail = locale === 'en-SA' && file.includes(`${path.sep}en${path.sep}events${path.sep}`);
  if (isEnglishEventDetail) {
    assert.ok(!source.includes('درجة جاهزية الحضور'), `${file} exposes the retired internal readiness score`);
    assert.ok(!/<dd>\s*(?:حضوري|عن بعد)\s*<\/dd>/u.test(source), `${file} contains an untranslated attendance type`);
    // Template chrome must never render in Arabic on English event pages.
    // These are exact tag-delimited template literals from generate-site.mjs,
    // so they cannot false-positive on event content prose.
    for (const phrase of [
      '>من المصدر الرسمي<', '>المزود<', '>الأهداف<', '>المميزات<', '>المتطلبات<', '>المدة<',
      '>إغلاق التسجيل<', '>الدخول أو التسجيل<', '>انتهت<', '>يجري الآن<', '>التالي<',
      '>كل القاعات<', '>لا توجد جلسة جارية الآن<', '>برنامج ممتد<',
      '>مستمرة حتى ', '>متى تبدأ ', '>أين تقام ', 'تعتمد EventLive على ',
      'يحفظ الصفحة والجدول على هذا الجهاز'
    ]) {
      assert.ok(!source.includes(phrase), `${file} contains untranslated event-page chrome: ${phrase}`);
    }
  }
  const shouldCheckScripts = locale === 'en-SA' && (!isEnglishEventDetail || !eventDetailScriptChecked);
  if (shouldCheckScripts) {
    $('script:not([src]):not([type="application/ld+json"]):not([type="module"])').each((index, element) => {
      assert.doesNotThrow(() => new vm.Script($(element).html() || '', { filename: `${file}#script-${index}` }), `${file} contains invalid inline JavaScript`);
    });
    if (isEnglishEventDetail) eventDetailScriptChecked = true;
  }
  return { $, source };
}

for (const route of registry.routes) {
  const relative = route.key;
  // hreflang stays self-referential (this page's twin is this page in the other
  // language), but a duplicate event record canonicalises to its primary on
  // BOTH surfaces — see scripts/event-canonical-aliases.mjs.
  const canonicalRelative = canonicalEventPage(relative) || redirectTargetFor(relative) || relative;
  const arCanonical = `https://eventme.live/${canonicalRelative === 'index.html' ? '' : canonicalRelative}`;
  const enCanonical = `https://eventme.live/en/${canonicalRelative === 'index.html' ? '' : canonicalRelative}`;
  const arSelf = `https://eventme.live/${relative === 'index.html' ? '' : relative}`;
  const enSelf = `https://eventme.live/en/${relative === 'index.html' ? '' : relative}`;
  const isStub = Boolean(redirectTargetFor(relative));
  const ar = inspect(resolveUnicodePath(dist, relative), 'ar-SA', 'rtl', arCanonical, isStub);
  const en = inspect(resolveUnicodePath(path.join(dist, 'en'), relative), 'en-SA', 'ltr', enCanonical, isStub);
  assert.equal(ar.$('.language-switch').attr('href'), route['en-SA']);
  assert.equal(en.$('.language-switch').attr('href'), route['ar-SA']);
  if (!isStub) {
    assert.equal(ar.$('link[hreflang="en-SA"]').attr('href'), enSelf);
    assert.equal(en.$('link[hreflang="ar-SA"]').attr('href'), arSelf);
  }

  // A renamed event's old URL is a redirect stub, not an event page — the Event
  // structured data lives on the page it canonicalises to.
  if (!isStub && /^events\/.+\.html$/u.test(relative)) {
    for (const [locale, page] of [['ar-SA', ar], ['en-SA', en]]) {
      const eventNodes = eventJsonLdFromPage(page.$);
      assert.ok(eventNodes.length >= 1, `${relative} ${locale} must expose at least one Event node`);
      for (const eventNode of eventNodes) {
        eventJsonLdNodesChecked += 1;
        assert.ok(eventNode.description?.trim(), `${relative} ${locale} Event nodes must include description`);
        assert.ok(Array.isArray(eventNode.image) && eventNode.image.length > 0, `${relative} ${locale} Event nodes must include image`);
      }
    }
  }

  en.$('script[type="application/ld+json"]').each((_, element) => {
    const value = JSON.parse(en.$(element).html() || '{}');
    const serialized = JSON.stringify(value);
    assert.ok(!serialized.includes('https://eventme.live/events/'), `${relative} English JSON-LD points to an Arabic event route`);
    assert.ok(!/(?:Day|Cities|PM|AM)[\u0621-\u064a]|[\u0621-\u064a](?:Day|Cities|PM|AM)/u.test(serialized), `${relative} English JSON-LD contains a mixed-language word`);
    // WO Aug1 (b): the same class of corruption, extended to every month/day
    // name the localizer's wordReplacements table can fuse into an Arabic
    // word (e.g. "\u0627\u0644\u0623\u062d\u062f\u0627\u062b" -> "Sunday\u0627\u062b" from a blind replaceAll('\u0627\u0644\u0623\u062d\u062f',
    // 'Sunday')). JSON-LD FAQ/Event text goes through a separate code path
    // (localizeJsonLdValue) from plain HTML text nodes, so this is checked
    // here independently of the WORD_FUSION_PATTERN check on visible text
    // below.
    assert.ok(!WORD_FUSION_PATTERN.test(serialized), `${relative} English JSON-LD contains a month/day name fused into an Arabic word (word-boundary regression): ${serialized.match(WORD_FUSION_PATTERN)?.[0]}`);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value['@type'] === 'WebSite') {
        assert.deepEqual(value.inLanguage, ['ar-SA', 'en-SA'], 'the global WebSite entity must declare both supported languages');
      } else {
        assert.equal(value.inLanguage, 'en-SA');
      }
    }
  });

  // WO Aug1 (b): same word-fusion check on the visible HTML surface (not
  // just JSON-LD) \u2014 reproduced concretely by dist/en/this-week.html's hero
  // description, which legitimately contains "\u0627\u0644\u0623\u062d\u062f\u0627\u062b" and must never
  // render the corrupted "Sunday\u0627\u062b" fusion.
  assert.ok(!WORD_FUSION_PATTERN.test(en.source), `${relative} contains a month/day name fused into an Arabic word (word-boundary regression): ${en.source.match(WORD_FUSION_PATTERN)?.[0]}`);

  // WO Aug1 (a): trust-tooltip chrome leak \u2014 "\u0627\u0644\u0645\u0635\u062f\u0631: X \u00b7 \u0622\u062e\u0631 \u062a\u062d\u0642\u0642: DATE"
  // must translate in full. Checked wherever it occurs (not every route has
  // a trust span) so the test still fails loudly if the pattern regresses.
  const trustTitles = [...en.source.matchAll(/class="trust" title="([^"]*)"/g)].map((match) => match[1]);
  for (const title of trustTitles) {
    assert.ok(!/[\u0621-\u064a]/u.test(title), `${relative} trust tooltip still contains Arabic: ${title}`);
    assert.match(title, /Last verified:/, `${relative} trust tooltip must translate "\u0622\u062e\u0631 \u062a\u062d\u0642\u0642:" to "Last verified:"`);
    trustTooltipChecked = true;
  }

  // WO Aug1 (c): embedded "\u0627\u0644\u0645\u0648\u0642\u0639:"/"\u0627\u0644\u0645\u0646\u0638\u0645:" chrome leak \u2014 the recurring-
  // debt report's top three offenders were all variants of "The event takes
  // place in <city>, \u0627\u0644\u0645\u0648\u0642\u0639: <venue>." (33/30/29 pages). Scoped to that
  // exact comma-prefixed chrome signature, not a bare substring check \u2014 raw
  // event.description prose (unrelated, still-pending MT content, tolerated
  // by en-surface-sweep's own policy) can legitimately contain "\u0627\u0644\u0645\u0648\u0642\u0639:"/
  // "\u0627\u0644\u0645\u0646\u0638\u0645:" as part of an ordinary Arabic sentence.
  const embeddedLabelLeak = /,\s*(?:\u0627\u0644\u0645\u0648\u0642\u0639|\u0627\u0644\u0645\u0646\u0638\u0645):/u.test(en.source);
  assert.ok(!embeddedLabelLeak, `${relative} exposes an untranslated "\u0627\u0644\u0645\u0648\u0642\u0639:"/"\u0627\u0644\u0645\u0646\u0638\u0645:" label embedded in the "takes place in" sentence chrome`);
  // Anchored on content, not a specific event slug (which can shift as the
  // catalog churns) \u2014 passes whichever currently-built page reproduces the
  // exact reports/i18n-en-surface.json top offender.
  if (en.source.includes("The event takes place in Dhahran, Venue: Children's Museum.")) venueLeakChecked = true;
}

assert.ok(trustTooltipChecked, 'expected at least one built EN page with a trust tooltip to validate the "\u0622\u062e\u0631 \u062a\u062d\u0642\u0642:" -> "Last verified:" translation fix');
assert.ok(venueLeakChecked, "expected to find the Dhahran/Children's Museum venue-leak reproduction case (reports/i18n-en-surface.json's top recurring-debt example) among the built EN event pages");

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const locCount = [...sitemap.matchAll(/<loc>/g)].length;
// Routes and sitemap entries are no longer 1:1: a duplicate event record is a
// real localized route (both surfaces exist and link to each other) that is
// deliberately not submitted for indexing, because its canonical points at the
// primary. Every OTHER route must still appear on both surfaces.
// The same exception, second class: a page that is public and localized on both
// surfaces but withdrawn from indexing because a crawler cannot see its content
// (its body is fetched from a robots-disallowed file). Its English copy must
// keep existing — deleting it would kill a published URL — so it is a real
// route that is deliberately not submitted. See scripts/noindex-public-pages.mjs.
const unsubmittedRoutes = registry.routes.filter((route) =>
  canonicalEventPage(route.key) || redirectTargetFor(route.key) || NOINDEX_PUBLIC_PAGES.has(route.key)).length;
assert.equal(locCount, (registry.routes.length - unsubmittedRoutes) * 2, 'sitemap must contain one Arabic and one English URL per submitted route');
assert.equal([...sitemap.matchAll(/hreflang="en-SA"/g)].length, locCount, 'every sitemap URL needs an English alternate');
assert.equal([...sitemap.matchAll(/hreflang="ar-SA"/g)].length, locCount, 'every sitemap URL needs an Arabic alternate');

const arCatalog = JSON.parse(fs.readFileSync(path.join(dist, 'events-catalog.json'), 'utf8'));
const enCatalog = JSON.parse(fs.readFileSync(path.join(dist, 'en', 'events-catalog.json'), 'utf8'));
assert.equal(enCatalog.locale, 'en-SA');
assert.equal(enCatalog.events.length, arCatalog.events.length, 'localized catalog must preserve every event');
const publicEvents = JSON.parse(fs.readFileSync(path.join(dist, 'events.json'), 'utf8')).events || [];
const missingFileSlugIds = publicEvents
  .filter((event) => typeof event.file_slug !== 'string' || !event.file_slug)
  .map((event) => event.id);
assert.deepEqual(missingFileSlugIds, [], `every built public event must include a file_slug: ${missingFileSlugIds.join(', ')}`);
const fileSlugCounts = publicEvents.reduce(
  (counts, event) => counts.set(event.file_slug, (counts.get(event.file_slug) || 0) + 1),
  new Map()
);
const duplicateFileSlugs = [...fileSlugCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([fileSlug]) => fileSlug);
assert.deepEqual(
  duplicateFileSlugs,
  [],
  `built event catalog must not contain duplicate file_slug values: ${duplicateFileSlugs.join(', ')}`
);
const eventRouteValues = arCatalog.events
  .flatMap((event) => [event.file_slug, event.detail_url])
  .filter((value) => typeof value === 'string' && value);
assert.deepEqual(
  eventRouteValues.filter((value) => value !== value.normalize('NFC')),
  [],
  'event routes must use NFC so Arabic paths resolve identically on Linux and macOS'
);

const enManifest = JSON.parse(fs.readFileSync(path.join(dist, 'en', 'manifest.webmanifest'), 'utf8'));
assert.equal(enManifest.lang, 'en-SA');
assert.equal(enManifest.dir, 'ltr');
assert.equal(enManifest.start_url, '/en/');
const serviceWorker = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
assert.ok(serviceWorker.includes('"./en/index.html"'), 'service worker must precache the English offline shell');
assert.ok(serviceWorker.includes("pathname.startsWith('/en/')"), 'service worker must use an English offline fallback');
assert.ok(fs.readFileSync(path.join(dist, 'en', 'index.html'), 'utf8').includes("serviceWorker.register('/sw.js', { scope: '/' })"), 'English pages must register the root service worker');
assert.ok(fs.readFileSync(path.join(dist, 'llms.txt'), 'utf8').includes('https://eventme.live/en/'), 'root llms.txt must advertise the English site');

console.log(`I18N_SITE_OK routes=${registry.routes.length} pages=${registry.routes.length * 2} events=${enCatalog.events.length} event_nodes=${eventJsonLdNodesChecked}`);
