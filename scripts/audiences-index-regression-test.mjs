import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AUDIENCE_TAXONOMY } from './audience-utils.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const htmlPath = path.join(distDir, 'audiences.html');
const jsonPath = path.join(distDir, 'audiences.json');
const eventsPath = path.join(distDir, 'events.json');
const sitemapPath = path.join(distDir, 'sitemap.xml');

assert.equal(fs.existsSync(htmlPath), true, 'dist/audiences.html must exist; run npm run build first');
assert.equal(fs.existsSync(jsonPath), true, 'dist/audiences.json must exist; run npm run build first');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(sitemapPath), true, 'dist/sitemap.xml must exist; run npm run build first');

const html = fs.readFileSync(htmlPath, 'utf8');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events;

assert.match(sitemap, /https:\/\/eventme\.live\/audiences\.html/, 'audiences.html must be listed in sitemap');
assert.match(html, /فعاليات حسب الجمهور/, 'audiences page must carry an audience-directory heading');
assert.match(html, /اكتشاف حسب الشخص/, 'audiences page must explain discovery by person type');
assert.match(html, /feeds\/for-[a-z0-9-]+\.ics/, 'audiences page must expose audience calendar feeds');
assert.ok(payload.audiences_count >= 10, 'audiences index must cover a useful number of audience groups');
assert.equal(payload.audiences_count, payload.audiences.length, 'audiences_count must match audiences array length');
assert.equal(payload.totals.events, events.length, 'audiences totals must match public catalog count');

const slugs = new Set(payload.audiences.map((audience) => audience.slug));
for (const audience of AUDIENCE_TAXONOMY) {
  assert.ok(slugs.has(audience.slug), `audiences index missing taxonomy audience ${audience.slug}`);
}

for (const audience of payload.audiences) {
  assert.ok(audience.slug, 'audience row must include slug');
  assert.ok(audience.label, 'audience row must include label');
  assert.ok(audience.url?.startsWith('./for/'), `${audience.label} must link to an audience page`);
  assert.equal(fs.existsSync(path.join(distDir, audience.url.replace(/^\.\//, ''))), true, `${audience.label} audience page must exist`);
  assert.equal(audience.total_events, audience.upcoming_or_active + audience.ended, `${audience.label} totals must balance`);
  assert.equal(audience.count, audience.total_events, `${audience.label} must keep count compatibility`);
  if (audience.total_events > 0) {
    assert.ok(audience.sources_count >= 1, `${audience.label} must include at least one source`);
    assert.ok(audience.categories_count >= 1, `${audience.label} must include at least one category`);
  }
}

const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
assert.ok(jsonLd.some((item) => item['@type'] === 'CollectionPage'), 'audiences page must include CollectionPage JSON-LD');
assert.ok(jsonLd.some((item) => item['@type'] === 'Dataset' && item.url === 'https://eventme.live/audiences.json'), 'audiences page must include Dataset JSON-LD');
const itemList = jsonLd.find((item) => item['@type'] === 'ItemList');
assert.equal(itemList?.numberOfItems, payload.audiences_count, 'audiences ItemList must advertise all audience entries');

console.log(`audiences-index-regression-test: ok audiences=${payload.audiences_count}`);
