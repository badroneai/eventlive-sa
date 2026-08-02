import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const eventsPath = path.join(distDir, 'events.json');
const citiesPath = path.join(distDir, 'cities.json');
const categoriesPath = path.join(distDir, 'categories.json');
const feedsDir = path.join(distDir, 'feeds');

assert.ok(fs.existsSync(eventsPath), 'dist/events.json must exist; run npm run build first');
assert.ok(fs.existsSync(citiesPath), 'dist/cities.json must exist; run npm run build first');
assert.ok(fs.existsSync(categoriesPath), 'dist/categories.json must exist; run npm run build first');
assert.ok(fs.existsSync(feedsDir), 'dist/feeds must exist');

const eventsEnvelope = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const citiesEnvelope = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
const categoriesEnvelope = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
const events = Array.isArray(eventsEnvelope.events) ? eventsEnvelope.events : [];
const upcoming = events.filter((event) => {
  const end = new Date(event.ends_at || event.starts_at).getTime();
  return Number.isNaN(end) || end >= new Date(eventsEnvelope.generated_at).getTime();
});

const allFeedPath = path.join(feedsDir, 'all.ics');
const allRssPath = path.join(feedsDir, 'all.xml');
const allJsonPath = path.join(feedsDir, 'all.json');
const indexPath = path.join(feedsDir, 'index.json');
assert.ok(fs.existsSync(allFeedPath), 'all subscription feed must exist');
assert.ok(fs.existsSync(allRssPath), 'all RSS feed must exist');
assert.ok(fs.existsSync(allJsonPath), 'all JSON feed must exist');
assert.ok(fs.existsSync(indexPath), 'feed index must exist');
const allFeed = fs.readFileSync(allFeedPath, 'utf8');
const allRss = fs.readFileSync(allRssPath, 'utf8');
const allJson = JSON.parse(fs.readFileSync(allJsonPath, 'utf8'));
const feedIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
assert.match(allFeed, /^BEGIN:VCALENDAR\r?\n/);
assert.match(allFeed, /VERSION:2\.0/);
assert.match(allFeed, /X-WR-TIMEZONE:Asia\/Riyadh/);
assert.ok(allFeed.includes('فعاليات') || allFeed.includes('EventLive'), 'feed should preserve Arabic or EventLive text');
assert.match(allRss, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0">/);
assert.match(allRss, /<language>ar-SA<\/language>/);
assert.equal(allJson.version, 'https://jsonfeed.org/version/1.1', 'all JSON feed must use JSON Feed 1.1');
assert.equal(allJson.language, 'ar-SA', 'all JSON feed must declare Arabic Saudi locale');
assert.ok(Array.isArray(feedIndex.feeds), 'feed index must list generated feeds');
assert.ok(feedIndex.feeds.some((feed) => feed.slug === 'all' && feed.rss_url === './feeds/all.xml'), 'feed index must include the all RSS feed');

for (const event of upcoming) {
  assert.ok(allFeed.includes(`UID:${event.id}@eventme.live`), `all feed missing ${event.id}`);
  assert.ok(allRss.includes(event.detail_url.replace(/^\.\//, 'https://eventme.live/')), `all RSS feed missing ${event.id}`);
  assert.ok(allJson.items.some((item) => item.id === event.detail_url.replace(/^\.\//, 'https://eventme.live/')), `all JSON feed missing ${event.id}`);
}

const cityFeedFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('city-') && file.endsWith('.ics'));
const categoryFeedFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('category-') && file.endsWith('.ics'));
const audienceFeedFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('for-') && file.endsWith('.ics'));
const cityRssFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('city-') && file.endsWith('.xml'));
const categoryRssFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('category-') && file.endsWith('.xml'));
const audienceRssFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('for-') && file.endsWith('.xml'));
const cityJsonFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('city-') && file.endsWith('.json'));
const categoryJsonFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('category-') && file.endsWith('.json'));
const audienceJsonFiles = fs.readdirSync(feedsDir).filter((file) => file.startsWith('for-') && file.endsWith('.json'));
assert.ok(cityFeedFiles.length > 0, 'city feeds must be generated');
assert.ok(categoryFeedFiles.length > 0, 'category feeds must be generated');
assert.ok(audienceFeedFiles.length > 0, 'audience feeds must be generated');
assert.equal(cityRssFiles.length, cityFeedFiles.length, 'every city ICS feed must have RSS pair');
assert.equal(categoryRssFiles.length, categoryFeedFiles.length, 'every category ICS feed must have RSS pair');
assert.equal(audienceRssFiles.length, audienceFeedFiles.length, 'every audience ICS feed must have RSS pair');
assert.equal(cityJsonFiles.length, cityFeedFiles.length, 'every city ICS feed must have JSON pair');
assert.equal(categoryJsonFiles.length, categoryFeedFiles.length, 'every category ICS feed must have JSON pair');
assert.equal(audienceJsonFiles.length, audienceFeedFiles.length, 'every audience ICS feed must have JSON pair');

function slugify(value = 'event') {
  const slug = String(value || 'event')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
  return slug || 'event';
}

const expectedCityFeeds = new Set(events.map((event) => `city-${slugify(event.city)}.ics`));
for (const file of expectedCityFeeds) {
  assert.ok(cityFeedFiles.includes(file), `missing city subscription feed ${file}`);
  assert.ok(cityRssFiles.includes(file.replace(/\.ics$/, '.xml')), `missing city RSS feed ${file}`);
  assert.ok(cityJsonFiles.includes(file.replace(/\.ics$/, '.json')), `missing city JSON feed ${file}`);
}

const expectedCategoryFeeds = new Set(events.map((event) => `category-${event.category_slug}.ics`));
for (const file of expectedCategoryFeeds) {
  assert.ok(categoryFeedFiles.includes(file), `missing category subscription feed ${file}`);
  assert.ok(categoryRssFiles.includes(file.replace(/\.ics$/, '.xml')), `missing category RSS feed ${file}`);
  assert.ok(categoryJsonFiles.includes(file.replace(/\.ics$/, '.json')), `missing category JSON feed ${file}`);
}

const expectedAudienceFeeds = new Set(upcoming.flatMap((event) => (event.audiences?.length ? event.audiences : ['general']).map((audience) => `for-${audience}.ics`)));
for (const file of expectedAudienceFeeds) {
  assert.ok(audienceFeedFiles.includes(file), `missing audience subscription feed ${file}`);
  assert.ok(audienceRssFiles.includes(file.replace(/\.ics$/, '.xml')), `missing audience RSS feed ${file}`);
  assert.ok(audienceJsonFiles.includes(file.replace(/\.ics$/, '.json')), `missing audience JSON feed ${file}`);
}

for (const file of [...cityFeedFiles, ...categoryFeedFiles, ...audienceFeedFiles]) {
  const content = fs.readFileSync(path.join(feedsDir, file), 'utf8');
  const rssFile = file.replace(/\.ics$/, '.xml');
  const jsonFile = file.replace(/\.ics$/, '.json');
  const rss = fs.readFileSync(path.join(feedsDir, rssFile), 'utf8');
  const json = JSON.parse(fs.readFileSync(path.join(feedsDir, jsonFile), 'utf8'));
  assert.match(content, /^BEGIN:VCALENDAR\r?\n/, `${file} is not an ICS calendar`);
  assert.match(content, /END:VCALENDAR\r?\n?$/, `${file} does not end as an ICS calendar`);
  assert.match(content, /X-WR-CALNAME:/, `${file} is missing a calendar name`);
  assert.match(content, /X-WR-TIMEZONE:Asia\/Riyadh/, `${file} is missing Riyadh timezone`);
  assert.match(rss, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0">/, `${rssFile} is not an RSS feed`);
  assert.equal(json.version, 'https://jsonfeed.org/version/1.1', `${jsonFile} is not a JSON Feed`);
  assert.ok(Array.isArray(json.items), `${jsonFile} items must be an array`);
}

for (const event of upcoming) {
  const cityFeed = fs.readFileSync(path.join(feedsDir, `city-${slugify(event.city)}.ics`), 'utf8');
  const cityRss = fs.readFileSync(path.join(feedsDir, `city-${slugify(event.city)}.xml`), 'utf8');
  const cityJson = JSON.parse(fs.readFileSync(path.join(feedsDir, `city-${slugify(event.city)}.json`), 'utf8'));
  const categoryFeed = fs.readFileSync(path.join(feedsDir, `category-${event.category_slug}.ics`), 'utf8');
  const categoryRss = fs.readFileSync(path.join(feedsDir, `category-${event.category_slug}.xml`), 'utf8');
  const categoryJson = JSON.parse(fs.readFileSync(path.join(feedsDir, `category-${event.category_slug}.json`), 'utf8'));
  const eventUrl = event.detail_url.replace(/^\.\//, 'https://eventme.live/');
  assert.ok(cityFeed.includes(`UID:${event.id}@eventme.live`), `city feed missing ${event.id}`);
  assert.ok(cityRss.includes(eventUrl), `city RSS feed missing ${event.id}`);
  assert.ok(cityJson.items.some((item) => item.id === eventUrl), `city JSON feed missing ${event.id}`);
  assert.ok(categoryFeed.includes(`UID:${event.id}@eventme.live`), `category feed missing ${event.id}`);
  assert.ok(categoryRss.includes(eventUrl), `category RSS feed missing ${event.id}`);
  assert.ok(categoryJson.items.some((item) => item.id === eventUrl), `category JSON feed missing ${event.id}`);
  for (const audience of event.audiences?.length ? event.audiences : ['general']) {
    const audienceFeed = fs.readFileSync(path.join(feedsDir, `for-${audience}.ics`), 'utf8');
    const audienceRss = fs.readFileSync(path.join(feedsDir, `for-${audience}.xml`), 'utf8');
    const audienceJson = JSON.parse(fs.readFileSync(path.join(feedsDir, `for-${audience}.json`), 'utf8'));
    assert.ok(audienceFeed.includes(`UID:${event.id}@eventme.live`), `audience feed ${audience} missing ${event.id}`);
    assert.ok(audienceRss.includes(eventUrl), `audience RSS feed ${audience} missing ${event.id}`);
    assert.ok(audienceJson.items.some((item) => item.id === eventUrl), `audience JSON feed ${audience} missing ${event.id}`);
  }
}

function assertFacetFeedLinks(kind, slug, pagePath, feedSlug) {
  assert.ok(fs.existsSync(pagePath), `${kind} page ${slug} must exist`);
  const html = fs.readFileSync(pagePath, 'utf8');
  const feedBase = `../feeds/${feedSlug}`;
  for (const extension of ['ics', 'xml', 'json']) {
    assert.ok(html.includes(`${feedBase}.${extension}`), `${kind} page ${slug} must link ${feedSlug}.${extension}`);
  }
  assert.match(html, /rel="alternate" type="text\/calendar"/, `${kind} page ${slug} must expose calendar alternate`);
  assert.match(html, /rel="alternate" type="application\/rss\+xml"/, `${kind} page ${slug} must expose RSS alternate`);
  assert.match(html, /rel="alternate" type="application\/feed\+json"/, `${kind} page ${slug} must expose JSON feed alternate`);
  assert.match(html, /اشترك/, `${kind} page ${slug} must include a visible subscribe action`);
}

// National-rollout unlock: a places-only city (zero events — see
// scripts/generate-site.mjs's placesOnlyCitySlugs()) never gets its own
// feeds/city-<slug>.* bundle (writeSubscriptionFeeds() only ever derives
// city feeds from the events array), so its page's alternate/subscribe
// links fall back to the sitewide "all" feed (renderFacetPage()'s own
// fs.existsSync fallback, mirrored in cityDirectoryCard()). Compute the
// SAME expected slug here rather than assuming every city has its own feed.
for (const city of citiesEnvelope.cities || []) {
  const expectedFeedSlug = cityFeedFiles.includes(`city-${city.slug}.ics`) ? `city-${city.slug}` : 'all';
  assertFacetFeedLinks('city', city.slug, path.join(distDir, 'cities', `${city.slug}.html`), expectedFeedSlug);
}

for (const category of categoriesEnvelope.categories || []) {
  assertFacetFeedLinks('category', category.slug, path.join(distDir, 'categories', `${category.slug}.html`), `category-${category.slug}`);
}

console.log('feeds-regression-test: ok');
