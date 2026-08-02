// Gate for the city-profiles destination layer (EVENTME-CITY-PROFILES-BRIEF.md).
// Structural (dist-aware) checks that complement scripts/validate-city-places.mjs
// (which only validates data/city_places.json in isolation, before a build
// exists). Born-wired into ci:site-gates per GATES-GOVERNANCE.md rule #4.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cityPlacesBySlug, hasOsmPlace, loadCityPlacesFile, loadPlaceImageManifest, placeImageRecord } from './city-places-data.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const ARABIC_LETTERS = /[ء-ي]/u;

const cityPlacesData = loadCityPlacesFile();
const cityPlacesMap = cityPlacesBySlug(cityPlacesData);
assert.ok(cityPlacesMap.size >= 2, 'data/city_places.json must carry at least the two fixture cities for this gate to mean anything');

const placeImageManifest = loadPlaceImageManifest();
const manifestPlaceCount = Object.keys(placeImageManifest.images || {}).length;
assert.ok(manifestPlaceCount > 0, 'data/place_image_manifest.json must carry at least one cached place image for the image-attribution assertions below to mean anything; run npm run images:cache-places first');

function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

function readDistFile(relativePath) {
  const filePath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(filePath, 'utf8');
}

function escapeHtmlForTest(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function placeArticleHtml(sectionHtml, placeId) {
  const match = sectionHtml.match(new RegExp(`<article class="card place-card" data-place-id="${placeId}"[\\s\\S]*?</article>`));
  return match ? match[0] : '';
}

// Gate 6 (EVENTME-CITY-PROFILES-BRIEF.md place-image pilot): when a place
// has a cached image, the card must show it via a LOCAL <img src> plus a
// VISIBLE credit line (not a title/tooltip attribute — CC BY/CC BY-SA
// require reasonable attribution) naming the artist and license, linked to
// the Commons file page. Runs against whichever language's rendered HTML is
// passed in — same assertions, different label text.
function assertPlaceImageAttribution(sectionHtml, cityEntry, distLabel) {
  for (const place of cityEntry.places) {
    const record = placeImageRecord(placeImageManifest, place.id);
    if (!record) continue;
    const articleHtml = placeArticleHtml(sectionHtml, place.id);
    assert.ok(articleHtml, `${distLabel}: place "${place.id}" has a cached image but its card markup was not found`);
    assert.match(
      articleHtml,
      new RegExp(`<img src="${record.public_path.replace(/\//g, '\\/')}"`),
      `${distLabel}: place "${place.id}" must render its cached image via a local <img src="${record.public_path}">`
    );
    const escapedArtist = escapeHtmlForTest(record.artist);
    const escapedLicense = escapeHtmlForTest(record.license);
    assert.ok(articleHtml.includes(escapedArtist), `${distLabel}: place "${place.id}" credit line must name the artist ("${record.artist}")`);
    assert.ok(articleHtml.includes(escapedLicense), `${distLabel}: place "${place.id}" credit line must name the license ("${record.license}")`);
    assert.match(
      articleHtml,
      /<p class="place-photo-credit">/,
      `${distLabel}: place "${place.id}" credit must be VISIBLE page text (a rendered element), not hidden in a title/aria-label/alt attribute`
    );
    const commonsLinkMatch = articleHtml.match(/<a href="([^"]+)">(?:ويكيميديا كومنز|Wikimedia Commons)<\/a>/);
    assert.ok(commonsLinkMatch, `${distLabel}: place "${place.id}" credit must link to Wikimedia Commons`);
    assert.equal(commonsLinkMatch[1], escapeHtmlForTest(record.commons_page_url), `${distLabel}: place "${place.id}" Commons link must point at the cached commons_page_url`);
  }
}

// Gate 6: the places section must NEVER hotlink an external image — every
// <img src> in it has to be a local /assets/place-images/... path (site
// policy: local caching only, per scripts/cache-place-images.mjs's header
// and prelaunch's external_images idiom for events).
function assertNoExternalImageSources(sectionHtml, distLabel) {
  const sources = [...sectionHtml.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  for (const src of sources) {
    assert.equal(/^https?:\/\//i.test(src), false, `${distLabel}: places section <img src="${src}"> must not hotlink an external URL`);
    assert.equal(src.startsWith('/assets/place-images/'), true, `${distLabel}: places section <img src="${src}"> must be a locally cached place image path`);
  }
}

// --- Per fixture city: AR page structure + JSON-LD + OSM attribution ------

for (const [slug, cityEntry] of cityPlacesMap) {
  const html = readDistFile(`cities/${slug}.html`);

  assert.match(html, /id="city-places"/, `cities/${slug}.html must render the places section`);
  assert.match(html, new RegExp(`data-city-slug="${slug}"`), `cities/${slug}.html places section must self-identify its city slug`);

  const placeIdMatches = [...html.matchAll(/data-place-id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(
    [...placeIdMatches].sort(),
    cityEntry.places.map((place) => place.id).sort(),
    `cities/${slug}.html must render exactly the places in data/city_places.json (right count, right ids)`
  );

  const jsonLd = extractJsonLd(html);
  const destination = jsonLd.find((entry) => entry['@type'] === 'TouristDestination');
  assert.ok(destination, `cities/${slug}.html must include TouristDestination JSON-LD`);
  assert.equal(
    destination.includesAttraction?.length,
    cityEntry.places.length,
    `cities/${slug}.html TouristDestination must list every place as includesAttraction`
  );
  assert.ok(
    destination.includesAttraction.every((attraction) => attraction['@type'] === 'TouristAttraction'),
    `cities/${slug}.html includesAttraction entries must each be a TouristAttraction`
  );
  const itemLists = jsonLd.filter((entry) => entry['@type'] === 'ItemList' && String(entry['@id'] || '').includes('#places-itemlist-'));
  assert.ok(itemLists.length >= 1, `cities/${slug}.html must include at least one places ItemList grouped by category`);

  const expectOsmAttribution = hasOsmPlace(cityEntry);
  const hasAttribution = /openstreetmap\.org\/copyright/.test(html);
  assert.equal(
    hasAttribution,
    expectOsmAttribution,
    `cities/${slug}.html OSM attribution must appear iff the city has an osm-sourced place (expected ${expectOsmAttribution}, got ${hasAttribution})`
  );

  const arSectionMatch = html.match(/<section class="section city-places"[\s\S]*?<\/section>/);
  assert.ok(arSectionMatch, `cities/${slug}.html must render the places section for image assertions`);
  assertPlaceImageAttribution(arSectionMatch[0], cityEntry, `cities/${slug}.html`);
  assertNoExternalImageSources(arSectionMatch[0], `cities/${slug}.html`);
}

// --- A city NOT in the data file renders exactly as before -----------------

const cityFiles = fs.readdirSync(path.join(distDir, 'cities')).filter((name) => name.endsWith('.html'));
const undataedCitySlug = cityFiles
  .map((name) => name.replace(/\.html$/, ''))
  .find((slug) => !cityPlacesMap.has(slug));
assert.ok(undataedCitySlug, 'expected at least one built city page with no city_places.json entry to prove the "no data, no section" contract');
const undataedHtml = readDistFile(`cities/${undataedCitySlug}.html`);
assert.doesNotMatch(undataedHtml, /id="city-places"/, `cities/${undataedCitySlug}.html has no data/city_places.json entry and must render no places section`);
assert.doesNotMatch(undataedHtml, /TouristDestination/, `cities/${undataedCitySlug}.html must not emit TouristDestination JSON-LD without place data`);

// --- EN pages: EN names, zero Arabic in the places section chrome ----------

for (const [slug, cityEntry] of cityPlacesMap) {
  const enPath = path.join(root, 'dist', 'en', 'cities', `${slug}.html`);
  assert.ok(fs.existsSync(enPath), `dist/en/cities/${slug}.html must exist; run npm run build first`);
  const enHtml = fs.readFileSync(enPath, 'utf8');

  const sectionMatch = enHtml.match(/<section class="section city-places"[\s\S]*?<\/section>/);
  assert.ok(sectionMatch, `dist/en/cities/${slug}.html must render the EN places section`);
  const sectionHtml = sectionMatch[0];
  let sectionText = sectionHtml.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  // Photo-credit artist names are Wikimedia Commons attribution DATA, not
  // template chrome — a Commons contributor's own name is exactly the kind
  // of proper noun this repo's EN-surface philosophy already treats as
  // legitimate content rather than a leak (see en-surface-sweep-regression-test.mjs's
  // INTENTIONAL set and isCatalogContent()): translating or transliterating
  // someone's name would be fabrication, not localization. Strip only the
  // known artist values sourced from the manifest before the zero-Arabic
  // check below, so the check still catches an actual UNTRANSLATED CHROME
  // regression (heading/"Photo:"/"Directions"/etc. reverting to Arabic).
  for (const place of cityEntry.places) {
    const record = placeImageRecord(placeImageManifest, place.id);
    if (record?.artist) sectionText = sectionText.split(record.artist).join('');
  }
  assert.doesNotMatch(
    sectionText,
    ARABIC_LETTERS,
    `dist/en/cities/${slug}.html places section must contain zero Arabic chrome/content (photo-credit artist names excluded — they are un-translatable proper nouns) — found Arabic in: ${sectionText.slice(0, 200)}`
  );
  assertPlaceImageAttribution(sectionHtml, cityEntry, `dist/en/cities/${slug}.html`);
  assertNoExternalImageSources(sectionHtml, `dist/en/cities/${slug}.html`);
  for (const place of cityEntry.places) {
    // The renderer HTML-escapes names (e.g. "&" -> "&amp;"), so the expected
    // string must be escaped the same way — same idiom as escapeHtmlForTest
    // in event-agenda-ui-regression-test.mjs.
    const escapedName = String(place.name_en)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    assert.ok(sectionHtml.includes(escapedName), `dist/en/cities/${slug}.html places section must show "${place.name_en}"`);
  }

  const enJsonLd = extractJsonLd(enHtml);
  const enDestination = enJsonLd.find((entry) => entry['@type'] === 'TouristDestination');
  assert.ok(enDestination, `dist/en/cities/${slug}.html must include TouristDestination JSON-LD`);
  assert.equal(enDestination.inLanguage, 'en-SA', `dist/en/cities/${slug}.html TouristDestination must declare en-SA`);
  assert.ok(String(enDestination['@id'] || '').startsWith('https://eventme.live/en/'), `dist/en/cities/${slug}.html TouristDestination @id must point at the EN URL`);
}

// --- Places-only city contract (national-rollout unlock, board decision Q1)
// A city can carry destination places with ZERO events in the catalog (see
// placesOnlyCitySlugs() in scripts/generate-site.mjs) — its page must still
// render: chrome + places section + an honest empty-events state + a link
// back to all events, and the city must appear in dist/cities.json and
// sitemap.xml like any other city.
//
// No such city exists in the checked-in data/city_places.json today (every
// entry currently overlaps a city that already has events) — GATES-
// GOVERNANCE.md rule 1 keeps blocking-structural gates in ci:site-gates
// CHEAP (~3 minutes total), so this block does not spin up a second full
// site rebuild with injected fixture data (that mutate+rebuild+restore
// idiom, see cover-content-freshness-regression-test.mjs, belongs in
// launch:preflight if ever needed). Instead it asserts the real dist/
// output produced by the ONE build this gate already runs against, and
// SKIPS with a loud note when no places-only city exists yet — which keeps
// this a genuine, live-firing check the moment the parallel Qassim-cities
// data PR (unaizah, al-bukayriyah, ...) lands a places-only slug, with zero
// added cost today. The feature was proven end-to-end locally for this PR
// via a temporary unaizah fixture — see reports/pm-review/unaizah-*-360.png
// and the PR description.
const citiesJsonPath = path.join(distDir, 'cities.json');
assert.ok(fs.existsSync(citiesJsonPath), 'dist/cities.json must exist; run npm run build first');
const citiesPayload = JSON.parse(fs.readFileSync(citiesJsonPath, 'utf8'));
const placesOnlyRow = (citiesPayload.cities || []).find((city) => cityPlacesMap.has(city.slug) && city.total_events === 0);

if (!placesOnlyRow) {
  console.log('city-places-regression-test: SKIP placesOnlyCityContract — no places-only city (a data/city_places.json entry with zero catalog events) exists in this build. Expected until a data PR adds one (e.g. a Qassim city); see scripts/generate-site.mjs placesOnlyCitySlugs().');
} else {
  const slug = placesOnlyRow.slug;
  const cityEntry = cityPlacesMap.get(slug);
  const html = readDistFile(`cities/${slug}.html`);

  assert.match(html, /id="city-places"/, `places-only city cities/${slug}.html must still render its places section`);
  assert.match(html, /class="empty-state"/, `places-only city cities/${slug}.html must render an honest empty-events state, not a silent blank grid`);
  assert.match(html, /href="\.\.\/events\.html"/, `places-only city cities/${slug}.html empty-events state must link back to all events`);

  const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, new RegExp(`https://eventme\\.live/cities/${slug}\\.html`), `places-only city cities/${slug}.html must be a first-class sitemap entry, not omitted like a redirect stub`);

  const enHtml = readDistFile(`en/cities/${slug}.html`);
  assert.match(enHtml, /class="empty-state"/, `places-only city dist/en/cities/${slug}.html must render the empty-events state too`);
  assert.match(enHtml, /No confirmed events are available in this window yet\./, `places-only city dist/en/cities/${slug}.html empty-events state must be in English`);
  assert.doesNotMatch(enHtml.match(/<p class="empty-state">[\s\S]*?<\/p>/)?.[0] || '', ARABIC_LETTERS, `places-only city dist/en/cities/${slug}.html empty-events state must contain zero Arabic`);
  for (const place of cityEntry.places) {
    const escapedName = String(place.name_en).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    assert.ok(enHtml.includes(escapedName), `places-only city dist/en/cities/${slug}.html must show "${place.name_en}"`);
  }

  console.log(`city-places-regression-test: placesOnlyCityContract OK slug=${slug} places=${cityEntry.places.length}`);
}

console.log(`city-places-regression-test: ok cities=${cityPlacesMap.size}`);
