import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

const pages = [
  { file: 'about.html', minBlocks: 2, types: ['AboutPage', 'Organization'] },
  { file: 'events.html', minBlocks: 3, types: ['WebPage', 'Dataset', 'ItemList'], datasetUrl: 'https://eventme.live/events.html', minItems: 20 },
  { file: 'activation.html', minBlocks: 2, types: ['WebPage', 'Dataset'], datasetUrl: 'https://eventme.live/activation.json' },
  { file: 'trust.html', minBlocks: 2, types: ['WebPage', 'Dataset'], datasetUrl: 'https://eventme.live/trust.json' },
  { file: 'readiness.html', minBlocks: 2, types: ['WebPage', 'Dataset'], datasetUrl: 'https://eventme.live/readiness.json' },
  { file: 'sources.html', minBlocks: 2, types: ['WebPage', 'Dataset'], datasetUrl: 'https://eventme.live/sources.json' },
  { file: 'methodology.html', minBlocks: 4, types: ['WebPage', 'Article', 'Dataset'], datasetUrl: 'https://eventme.live/methodology.json' },
  { file: 'organizer-intake.html', minBlocks: 3, types: ['ContactPage', 'Dataset'], datasetUrl: 'https://eventme.live/organizer-intake.json' },
  { file: 'source-health.html', minBlocks: 2, types: ['WebPage', 'Dataset'], datasetUrl: 'https://eventme.live/source-health.json' },
  { file: 'regions.html', minBlocks: 3, types: ['WebPage', 'Dataset', 'ItemList'], datasetUrl: 'https://eventme.live/regions.json' },
  { file: 'cities.html', minBlocks: 4, types: ['CollectionPage', 'Dataset', 'ItemList'], datasetUrl: 'https://eventme.live/cities.json' },
  { file: 'categories.html', minBlocks: 4, types: ['CollectionPage', 'Dataset', 'ItemList'], datasetUrl: 'https://eventme.live/categories.json' },
  { file: 'audiences.html', minBlocks: 4, types: ['CollectionPage', 'Dataset', 'ItemList'], datasetUrl: 'https://eventme.live/audiences.json' },
  { file: 'source-coverage-gaps.html', minBlocks: 1, types: ['WebPage'] },
  { file: 'saudi-events-today.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 1 },
  { file: 'saudi-events-tomorrow.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 1 },
  { file: 'saudi-events-weekend.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 1 },
  { file: 'saudi-events-this-month.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 1 },
  { file: 'riyadh-events-today.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 5 },
  { file: 'jeddah-events.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 1 },
  { file: 'online-tech-courses.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 5 },
  { file: 'saudi-ticketed-events.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 5 },
  { file: 'saudi-conferences-exhibitions.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 5 },
  { file: 'saudi-sports-matches.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 5 },
  { file: 'free-saudi-events.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 1 },
  { file: 'saudi-events-faq.html', minBlocks: 4, types: ['CollectionPage', 'ItemList', 'FAQPage'], minItems: 5 }
];

function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

function typeOf(entry) {
  return entry['@type'];
}

function assertDiscoverabilityHead(html, pageFile) {
  const ownerOnly = /^(sources|methodology|trust|source-health|owner-status)\.html$/.test(pageFile);
  if (ownerOnly) {
    assert.match(html, /<meta name="robots" content="noindex,nofollow"/, `${pageFile} must stay owner-only in robots meta`);
  } else {
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/, `${pageFile} must expose rich-result-friendly robots directives`);
  }
  assert.match(html, /<link rel="alternate" hreflang="ar-SA" href="https:\/\/eventme\.live\/[^"]*"/, `${pageFile} must expose ar-SA hreflang`);
  assert.match(html, /<meta property="og:updated_time" content="[^"]+"/, `${pageFile} must expose OpenGraph update time`);
  assert.match(html, /rel="alternate" type="text\/calendar"[^>]+events\.ics/, `${pageFile} must expose the all-events calendar alternate`);
  assert.match(html, /rel="alternate" type="application\/rss\+xml"[^>]+feeds\/all\.xml/, `${pageFile} must expose the all-events RSS alternate`);
  assert.match(html, /rel="alternate" type="application\/feed\+json"[^>]+feeds\/all\.json/, `${pageFile} must expose the all-events JSON Feed alternate`);
}

function assertWebSiteSearchAction(jsonLd, pageFile) {
  const website = jsonLd.find((entry) => typeOf(entry) === 'WebSite');
  assert.ok(website, `${pageFile} must include WebSite JSON-LD`);
  assert.equal(website.url, 'https://eventme.live/', `${pageFile} WebSite URL must be the canonical domain root`);
  assert.equal(website['@id'], 'https://eventme.live/#website', `${pageFile} WebSite must expose a stable entity ID`);
  assert.deepEqual(website.inLanguage, ['ar-SA', 'en-SA'], `${pageFile} WebSite must declare both supported languages`);
  assert.equal(website.potentialAction?.['@type'], 'SearchAction', `${pageFile} WebSite must expose SearchAction`);
  assert.equal(website.potentialAction?.target?.urlTemplate, 'https://eventme.live/events.html?q={search_term_string}', `${pageFile} SearchAction must target the catalog query URL`);
  assert.equal(website.potentialAction?.['query-input'], 'required name=search_term_string', `${pageFile} SearchAction must declare query input`);
}

for (const page of pages) {
  const htmlPath = path.join(distDir, page.file);
  assert.ok(fs.existsSync(htmlPath), `${page.file} must exist`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const jsonLd = extractJsonLd(html);
  assert.ok(jsonLd.length >= page.minBlocks, `${page.file} must have at least ${page.minBlocks} JSON-LD blocks`);
  assert.match(html, /<link rel="canonical" href="https:\/\/eventme\.live\/[^"]*"/, `${page.file} must use eventme.live canonical`);
  assertDiscoverabilityHead(html, page.file);
  assert.equal(jsonLd.some((entry) => typeOf(entry) === 'WebSite'), false, `${page.file} must not repeat home-only WebSite schema`);

  for (const expectedType of page.types) {
    assert.ok(jsonLd.some((entry) => typeOf(entry) === expectedType), `${page.file} must include ${expectedType} JSON-LD`);
  }

  const webPage = jsonLd.find((entry) => ['WebPage', 'ContactPage', 'CollectionPage'].includes(typeOf(entry)));
  if (webPage) {
    assert.equal(webPage.inLanguage, 'ar-SA', `${page.file} WebPage language must be ar-SA`);
    assert.equal(webPage.isPartOf?.url, 'https://eventme.live', `${page.file} WebPage must belong to eventme.live`);
  }

  if (page.datasetUrl) {
    const dataset = jsonLd.find((entry) => typeOf(entry) === 'Dataset');
    assert.equal(dataset?.url, page.datasetUrl, `${page.file} Dataset must point to ${page.datasetUrl}`);
    assert.equal(dataset?.creator?.name, 'EventLive', `${page.file} Dataset creator must be EventLive`);
  }

  if (page.minItems) {
    const itemList = jsonLd.find((entry) => typeOf(entry) === 'ItemList');
    assert.ok(itemList?.numberOfItems >= page.minItems, `${page.file} ItemList must advertise catalog size`);
    assert.ok(itemList?.itemListElement?.length >= page.minItems, `${page.file} ItemList must include a useful sample`);
    assert.ok(itemList.itemListElement.every((item) => String(item.url || '').startsWith('https://eventme.live/')), `${page.file} ItemList URLs must be canonical`);
  }
}

const homeHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const homeJsonLd = extractJsonLd(homeHtml);
const googleSiteVerification = fs.readFileSync(path.join(root, 'data', 'google-site-verification.txt'), 'utf8').trim();
const verificationMeta = [...homeHtml.matchAll(/<meta name="google-site-verification" content="([^"]+)"/g)];
assert.equal(verificationMeta.length, 1, 'home must expose exactly one Google Search Console verification tag');
assert.equal(verificationMeta[0][1], googleSiteVerification, 'home verification tag must match the tracked Google token');
assert.doesNotMatch(homeHtml, /rel="icon" href="data:image/, 'home must not expose the legacy embedded favicon');
assert.match(homeHtml, /rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"/, 'home must expose the EventLive favicon');
assert.doesNotMatch(homeHtml, /href="\.\/index\.html"/, 'home links must consolidate on the canonical root URL');
assertWebSiteSearchAction(homeJsonLd, 'index.html');
const organization = homeJsonLd.find((entry) => typeOf(entry) === 'Organization');
assert.equal(organization?.['@id'], 'https://eventme.live/#organization', 'home must expose a stable EventLive Organization entity');
assert.equal(organization?.name, 'EventLive');
assert.equal(organization?.url, 'https://eventme.live/');
assert.equal(organization?.logo?.url, 'https://eventme.live/icon.svg');
assert.ok(Number(organization?.logo?.width) >= 112 && Number(organization?.logo?.height) >= 112, 'organization logo must meet Google minimum dimensions');
const indexNowKey = fs.readFileSync(path.join(root, 'data', 'indexnow-key.txt'), 'utf8').trim();
assert.ok(fs.existsSync(path.join(distDir, `${indexNowKey}.txt`)), 'build must publish the IndexNow ownership key');

const eventsFeedPath = path.join(distDir, 'events.json');
assert.ok(fs.existsSync(eventsFeedPath), 'events.json must exist');
const eventsFeed = JSON.parse(fs.readFileSync(eventsFeedPath, 'utf8'));
const events = Array.isArray(eventsFeed) ? eventsFeed : eventsFeed.events || [];
const eventSamples = events
  .filter((event) => event.file_slug && (event.source_url || event.evidence_url))
  .slice(0, 12);

assert.ok(eventSamples.length >= 8, 'SEO event detail sample must include enough sourced events');

for (const event of eventSamples) {
  const htmlFile = `events/${event.file_slug}.html`;
  const jsonFile = `events/${event.file_slug}.json`;
  const htmlPath = path.join(distDir, htmlFile);
  const jsonPath = path.join(distDir, jsonFile);
  assert.ok(fs.existsSync(htmlPath), `${htmlFile} must exist`);
  assert.ok(fs.existsSync(jsonPath), `${jsonFile} must exist`);

  const html = fs.readFileSync(htmlPath, 'utf8');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const jsonLd = extractJsonLd(html);
  const eventJsonLd = jsonLd.find((entry) => typeOf(entry) === 'Event');
  const faqJsonLd = jsonLd.find((entry) => typeOf(entry) === 'FAQPage');
  const canonical = `https://eventme.live/events/${event.file_slug}.html`;

  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), `${htmlFile} must use canonical event URL`);
  assertDiscoverabilityHead(html, htmlFile);
  assert.equal(jsonLd.some((entry) => typeOf(entry) === 'WebSite'), false, `${htmlFile} must not repeat home-only WebSite schema`);
  assert.match(html, new RegExp(`<link rel="alternate" type="application/json"[^>]+href="${event.file_slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.json"`), `${htmlFile} must link its event JSON`);
  assert.match(html, new RegExp(`<link rel="alternate" type="text/calendar"[^>]+href="${event.file_slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.ics"`), `${htmlFile} must link its event ICS`);

  assert.equal(eventJsonLd?.url, canonical, `${htmlFile} Event JSON-LD must use canonical URL`);
  assert.equal(eventJsonLd?.mainEntityOfPage, canonical, `${htmlFile} Event JSON-LD must point mainEntityOfPage to canonical URL`);
  assert.ok(eventJsonLd?.location?.['@type'], `${htmlFile} Event JSON-LD must include a typed location`);
  if (eventJsonLd?.location?.['@type'] === 'Place') {
    assert.equal(eventJsonLd.location.address?.['@type'], 'PostalAddress', `${htmlFile} physical location must expose PostalAddress`);
    assert.equal(eventJsonLd.location.address?.addressCountry, 'SA', `${htmlFile} physical location must expose Saudi country code`);
    assert.ok(eventJsonLd.location.address?.addressLocality, `${htmlFile} physical location must expose addressLocality`);
  }
  assert.ok(eventJsonLd?.organizer?.name, `${htmlFile} Event JSON-LD must include organizer name`);
  assert.ok(String(eventJsonLd?.keywords || '').length > 20, `${htmlFile} Event JSON-LD must include useful keywords`);
  assert.ok(Array.isArray(eventJsonLd?.audience) && eventJsonLd.audience.length > 0, `${htmlFile} Event JSON-LD must include audience`);
  assert.ok(Array.isArray(eventJsonLd?.sameAs) && eventJsonLd.sameAs.length > 0, `${htmlFile} Event JSON-LD must include source sameAs links`);
  if (event.status === 'ended' || (!event.ticket_url && !event.registration_url)) {
    assert.equal(eventJsonLd?.offers, undefined, `${htmlFile} must not claim a ticket offer without an active ticket or registration URL`);
  } else {
    assert.equal(eventJsonLd?.offers?.['@type'], 'Offer', `${htmlFile} may expose a verified ticket or registration offer`);
    assert.ok([event.ticket_url, event.registration_url].includes(eventJsonLd.offers.url), `${htmlFile} offer must use the ticket or registration URL`);
  }
  assert.ok(Array.isArray(faqJsonLd?.mainEntity) && faqJsonLd.mainEntity.length >= 3, `${htmlFile} must expose visitor FAQ JSON-LD`);
  assert.match(html, /ما يحتاجه الزائر بسرعة/, `${htmlFile} must render visible visitor FAQ content`);

  assert.equal(json.canonical_url, canonical, `${jsonFile} must expose canonical_url`);
  assert.equal(json.schema_org?.['@type'], 'Event', `${jsonFile} must expose Event schema`);
  assert.equal(json.schema_org?.url, canonical, `${jsonFile} schema must use canonical URL`);
  assert.ok(json.page_modified_at, `${jsonFile} must expose stable page_modified_at`);
  assert.ok(Array.isArray(json.sessions), `${jsonFile} must expose sessions array`);
  assert.ok(Array.isArray(json.keywords) && json.keywords.length >= 4, `${jsonFile} must expose useful keywords`);
  assert.ok(json.source_url || json.evidence_url, `${jsonFile} must preserve source evidence`);
}

const unknownAvailabilityOffers = events
  .filter((event) => event.status !== 'ended'
    && (event.ticket_url || event.registration_url)
    && !String(event.registration_status || event.ticket_status || '').trim())
  .slice(0, 20);
assert.ok(unknownAvailabilityOffers.length > 0, 'SEO offer sample must cover unknown registration availability');
for (const event of unknownAvailabilityOffers) {
  const html = fs.readFileSync(path.join(distDir, 'events', `${event.file_slug}.html`), 'utf8');
  const eventJsonLd = extractJsonLd(html).find((entry) => typeOf(entry) === 'Event');
  assert.equal(eventJsonLd?.offers?.availability, undefined, `${event.file_slug} must not invent ticket availability`);
}

console.log('seo-structured-data-regression-test: ok');
