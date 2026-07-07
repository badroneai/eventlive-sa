import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const htmlPath = path.join(distDir, 'categories.html');
const jsonPath = path.join(distDir, 'categories.json');
const eventsPath = path.join(distDir, 'events.json');
const sitemapPath = path.join(distDir, 'sitemap.xml');

assert.equal(fs.existsSync(htmlPath), true, 'dist/categories.html must exist; run npm run build first');
assert.equal(fs.existsSync(jsonPath), true, 'dist/categories.json must exist; run npm run build first');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(sitemapPath), true, 'dist/sitemap.xml must exist; run npm run build first');

const html = fs.readFileSync(htmlPath, 'utf8');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events;

assert.match(sitemap, /https:\/\/eventme\.live\/categories\.html/, 'categories.html must be listed in sitemap');
assert.match(html, /تصنيفات فعاليات السعودية/, 'categories page must carry a category-directory heading');
assert.match(html, /اكتشاف حسب الاهتمام/, 'categories page must explain discovery by interest');
assert.match(html, /feeds\/category-[a-z0-9-]+\.ics/, 'categories page must expose category calendar feeds');
assert.ok(payload.categories_count >= 6, 'categories index must cover a useful number of categories');
assert.equal(payload.categories_count, payload.categories.length, 'categories_count must match categories array length');
assert.equal(payload.totals.events, events.length, 'categories totals must match public catalog count');

const eventCategorySlugs = new Set(events.map((event) => event.category_slug));
const publishedCategoryFiles = fs.readdirSync(path.join(distDir, 'categories'))
  .filter((fileName) => fileName.endsWith('.html'))
  .map((fileName) => fileName.replace(/\.html$/, ''))
  .sort();
const indexedCategorySlugs = payload.categories.map((category) => category.slug).sort();
assert.deepEqual(publishedCategoryFiles, indexedCategorySlugs, 'published category pages must match categories.json exactly');
for (const staleSlug of [
  'conferences-forums',
  'technology-bootcamp',
  'sports-families',
  'sports-and-community',
  'culture-history-families',
  'skills-program',
  'saudi-seasons',
  'معسكر-هندسة-الميكاترونكس'
]) {
  assert.equal(publishedCategoryFiles.includes(staleSlug), false, `stale category page must not be published: ${staleSlug}`);
}

for (const slug of eventCategorySlugs) {
  assert.ok(payload.categories.some((category) => category.slug === slug), `categories index missing ${slug}`);
}

for (const category of payload.categories) {
  assert.ok(category.slug, 'category row must include slug');
  assert.ok(category.label, 'category row must include label');
  assert.ok(category.url?.startsWith('./categories/'), `${category.label} must link to a category page`);
  assert.equal(fs.existsSync(path.join(distDir, category.url.replace(/^\.\//, ''))), true, `${category.label} category page must exist`);
  assert.equal(category.total_events, category.upcoming_or_active + category.ended, `${category.label} totals must balance`);
  assert.ok(category.sources_count >= 1, `${category.label} must include at least one source`);
  assert.ok(category.cities_count >= 1, `${category.label} must include at least one city`);
}

const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
assert.ok(jsonLd.some((item) => item['@type'] === 'CollectionPage'), 'categories page must include CollectionPage JSON-LD');
assert.ok(jsonLd.some((item) => item['@type'] === 'Dataset' && item.url === 'https://eventme.live/categories.json'), 'categories page must include Dataset JSON-LD');
const itemList = jsonLd.find((item) => item['@type'] === 'ItemList');
assert.equal(itemList?.numberOfItems, payload.categories_count, 'categories ItemList must advertise all category entries');

console.log(`categories-index-regression-test: ok categories=${payload.categories_count}`);
