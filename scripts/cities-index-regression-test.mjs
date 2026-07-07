import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const htmlPath = path.join(distDir, 'cities.html');
const jsonPath = path.join(distDir, 'cities.json');
const eventsPath = path.join(distDir, 'events.json');
const sitemapPath = path.join(distDir, 'sitemap.xml');

assert.equal(fs.existsSync(htmlPath), true, 'dist/cities.html must exist; run npm run build first');
assert.equal(fs.existsSync(jsonPath), true, 'dist/cities.json must exist; run npm run build first');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(sitemapPath), true, 'dist/sitemap.xml must exist; run npm run build first');

const html = fs.readFileSync(htmlPath, 'utf8');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events;

assert.match(sitemap, /https:\/\/eventme\.live\/cities\.html/, 'cities.html must be listed in sitemap');
assert.match(html, /فعاليات مدن السعودية/, 'cities page must carry a city-directory heading');
assert.match(html, /تغطية المدن/, 'cities page must explain city coverage');
assert.match(html, /feeds\/city-[a-z0-9-]+\.ics/, 'cities page must expose city calendar feeds');
assert.ok(payload.cities_count >= 10, 'cities index must cover a useful number of cities');
assert.equal(payload.cities_count, payload.cities.length, 'cities_count must match cities array length');
assert.equal(payload.totals.events, events.length, 'cities totals must match public catalog count');

for (const city of payload.cities) {
  assert.ok(city.slug, 'city row must include slug');
  assert.ok(city.label, 'city row must include label');
  assert.ok(city.url?.startsWith('./cities/'), `${city.label} must link to a city page`);
  assert.equal(fs.existsSync(path.join(distDir, city.url.replace(/^\.\//, ''))), true, `${city.label} city page must exist`);
  assert.equal(city.total_events, city.upcoming_or_active + city.ended, `${city.label} totals must balance`);
  assert.ok(city.sources_count >= 1, `${city.label} must include at least one source`);
}

const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
assert.ok(jsonLd.some((item) => item['@type'] === 'CollectionPage'), 'cities page must include CollectionPage JSON-LD');
assert.ok(jsonLd.some((item) => item['@type'] === 'Dataset' && item.url === 'https://eventme.live/cities.json'), 'cities page must include Dataset JSON-LD');
const itemList = jsonLd.find((item) => item['@type'] === 'ItemList');
assert.equal(itemList?.numberOfItems, payload.cities_count, 'cities ItemList must advertise all city entries');

console.log(`cities-index-regression-test: ok cities=${payload.cities_count}`);
