// Gate for the city-profiles destination layer (EVENTME-CITY-PROFILES-BRIEF.md).
// Structural (dist-aware) checks that complement scripts/validate-city-places.mjs
// (which only validates data/city_places.json in isolation, before a build
// exists). Born-wired into ci:site-gates per GATES-GOVERNANCE.md rule #4.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cityPlacesBySlug, hasOsmPlace, loadCityPlacesFile } from './city-places-data.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const ARABIC_LETTERS = /[ء-ي]/u;

const cityPlacesData = loadCityPlacesFile();
const cityPlacesMap = cityPlacesBySlug(cityPlacesData);
assert.ok(cityPlacesMap.size >= 2, 'data/city_places.json must carry at least the two fixture cities for this gate to mean anything');

function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

function readDistFile(relativePath) {
  const filePath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(filePath, 'utf8');
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
  const sectionText = sectionHtml.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(
    sectionText,
    ARABIC_LETTERS,
    `dist/en/cities/${slug}.html places section must contain zero Arabic chrome/content — found Arabic in: ${sectionText.slice(0, 200)}`
  );
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

console.log(`city-places-regression-test: ok cities=${cityPlacesMap.size}`);
