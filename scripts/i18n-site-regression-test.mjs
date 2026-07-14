import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { load } from 'cheerio';

const root = process.cwd();
const dist = path.join(root, 'dist');
const routeFile = path.join(dist, 'locale-routes.json');
assert.ok(fs.existsSync(routeFile), 'locale-routes.json must be generated');

const registry = JSON.parse(fs.readFileSync(routeFile, 'utf8'));
assert.deepEqual(registry.locales, ['ar-SA', 'en-SA']);
assert.ok(registry.routes.length > 1000, 'all public routes must be localized');
let eventDetailScriptChecked = false;
let eventJsonLdNodesChecked = 0;

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

function inspect(file, locale, direction, canonical) {
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
  for (const alternate of ['ar-SA', 'en-SA', 'x-default']) {
    assert.equal($(`link[rel="alternate"][hreflang="${alternate}"]`).length, 1, `${file} must have one ${alternate} alternate`);
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
  const arCanonical = `https://eventme.live/${relative === 'index.html' ? '' : relative}`;
  const enCanonical = `https://eventme.live/en/${relative === 'index.html' ? '' : relative}`;
  const ar = inspect(resolveUnicodePath(dist, relative), 'ar-SA', 'rtl', arCanonical);
  const en = inspect(resolveUnicodePath(path.join(dist, 'en'), relative), 'en-SA', 'ltr', enCanonical);
  assert.equal(ar.$('.language-switch').attr('href'), route['en-SA']);
  assert.equal(en.$('.language-switch').attr('href'), route['ar-SA']);
  assert.equal(ar.$('link[hreflang="en-SA"]').attr('href'), enCanonical);
  assert.equal(en.$('link[hreflang="ar-SA"]').attr('href'), arCanonical);

  if (/^events\/.+\.html$/u.test(relative)) {
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
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value['@type'] === 'WebSite') {
        assert.deepEqual(value.inLanguage, ['ar-SA', 'en-SA'], 'the global WebSite entity must declare both supported languages');
      } else {
        assert.equal(value.inLanguage, 'en-SA');
      }
    }
  });
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const locCount = [...sitemap.matchAll(/<loc>/g)].length;
assert.equal(locCount, registry.routes.length * 2, 'sitemap must contain one Arabic and one English URL per route');
assert.equal([...sitemap.matchAll(/hreflang="en-SA"/g)].length, locCount, 'every sitemap URL needs an English alternate');
assert.equal([...sitemap.matchAll(/hreflang="ar-SA"/g)].length, locCount, 'every sitemap URL needs an Arabic alternate');

const arCatalog = JSON.parse(fs.readFileSync(path.join(dist, 'events-catalog.json'), 'utf8'));
const enCatalog = JSON.parse(fs.readFileSync(path.join(dist, 'en', 'events-catalog.json'), 'utf8'));
assert.equal(enCatalog.locale, 'en-SA');
assert.equal(enCatalog.events.length, arCatalog.events.length, 'localized catalog must preserve every event');
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
