import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OWNER_ONLY_PAGES } from './owner-only-pages.mjs';
import { isRedirectStubPath } from './published-url-ledger.mjs';
import { EVENT_ALIAS_PAGES } from './event-canonical-aliases.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const siteUrl = 'https://eventme.live';

assert.equal(fs.existsSync(distDir), true, 'dist directory must exist; run npm run build first');
assert.equal(fs.existsSync(sitemapPath), true, 'dist/sitemap.xml must exist; run npm run build first');

function walkHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkHtml(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(path.relative(distDir, fullPath).replace(/\\/g, '/'));
    }
  }
  return files;
}

// Legacy category redirect stubs are deliberately kept out of the sitemap —
// their own <link rel="canonical"> already points crawlers at the real page.
// Shared single source of truth: scripts/legacy-redirect-pages.mjs.


// WO-4: single source of truth for owner-only pages — scripts/owner-only-pages.mjs.
// Duplicate event records canonicalise to their primary (see
// scripts/event-canonical-aliases.mjs) and are deliberately kept out of the
// sitemap for the same reason as the legacy stubs above: submitting a URL for
// indexing while its own canonical points elsewhere is a contradiction Search
// Console reports back as an error.
const htmlFiles = walkHtml(distDir)
  .filter((file) => !OWNER_ONLY_PAGES.has(file))
  .filter((file) => !isRedirectStubPath(file))
  .filter((file) => !EVENT_ALIAS_PAGES.has(file.normalize('NFC').replace(/^en\//, '')))
  .sort();
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].normalize('NFC'));
const uniqueUrls = [...new Set(urls)];
const eventsFeedPath = path.join(distDir, 'events.json');
assert.equal(fs.existsSync(eventsFeedPath), true, 'dist/events.json must exist for sitemap event coverage checks');
const eventsFeed = JSON.parse(fs.readFileSync(eventsFeedPath, 'utf8'));
const events = Array.isArray(eventsFeed) ? eventsFeed : eventsFeed.events || [];

assert.equal(urls.length, uniqueUrls.length, 'sitemap must not contain duplicate URLs');
assert.ok(urls.length >= htmlFiles.length - 1, 'sitemap must be near-complete for generated HTML pages');

const publicUrlForFile = (file) => {
  if (file === 'index.html') return `${siteUrl}/`;
  if (file.endsWith('/index.html')) return `${siteUrl}/${file.slice(0, -'index.html'.length)}`;
  return `${siteUrl}/${file}`;
};
const expectedUrls = htmlFiles.map((file) => publicUrlForFile(file).normalize('NFC'));
const missing = expectedUrls.filter((url) => !urls.includes(url));
assert.deepEqual(missing, [], `sitemap missing generated HTML pages:\n${missing.join('\n')}`);

const staleUrls = urls
  .filter((url) => url.startsWith(`${siteUrl}/`))
  .map((url) => {
    const relative = url.slice(`${siteUrl}/`.length);
    return !relative || relative.endsWith('/') ? `${relative}index.html` : relative;
  })
  .filter((relativePath) => !fs.existsSync(path.join(distDir, relativePath)));

assert.deepEqual(staleUrls, [], `sitemap contains URLs without generated files:\n${staleUrls.join('\n')}`);

assert.doesNotMatch(sitemap, /Users\/baderalsalman|\/Users\//, 'sitemap must not leak local filesystem paths');
assert.doesNotMatch(sitemap, /eventlive\.sa|eventlife/i, 'sitemap must not include legacy domains or spellings');
const ownerOnlyNames = [...OWNER_ONLY_PAGES].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
assert.doesNotMatch(sitemap, new RegExp(`/(?:${ownerOnlyNames})<`), 'sitemap must not include owner-only pages');

assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/, 'sitemap must include the Google image sitemap namespace');

const imageBlocks = [...sitemap.matchAll(/<image:image>[\s\S]*?<\/image:image>/g)].map((match) => match[0]);
assert.ok(imageBlocks.length >= events.length - EVENT_ALIAS_PAGES.size, 'sitemap must include an image block for every submitted event page');

// Duplicate records canonicalise to their primary and are intentionally not
// submitted; sample from the events that ARE submitted.
const submittedEvents = events.filter((event) => !EVENT_ALIAS_PAGES.has(`events/${event.file_slug}.html`.normalize('NFC')));
assert.ok(submittedEvents.length >= events.length - EVENT_ALIAS_PAGES.size, 'only aliased duplicates may be missing from the sitemap');
for (const event of submittedEvents.slice(0, 24)) {
  const eventUrl = `${siteUrl}/events/${event.file_slug}.html`;
  const eventUrlIndex = sitemap.indexOf(`<loc>${eventUrl}</loc>`);
  assert.ok(eventUrlIndex >= 0, `sitemap must include event page ${eventUrl}`);
  const nextUrlIndex = sitemap.indexOf('<url>', eventUrlIndex + 1);
  const eventBlock = sitemap.slice(eventUrlIndex, nextUrlIndex >= 0 ? nextUrlIndex : undefined);
  assert.match(eventBlock, /<image:image>/, `${event.file_slug} sitemap entry must include an image block`);
  assert.match(eventBlock, /<image:loc>https:\/\/eventme\.live\/assets\/event-(?:images|covers)\//, `${event.file_slug} sitemap image must point to a public EventLive asset`);
  assert.match(eventBlock, /<image:title>[^<]+<\/image:title>/, `${event.file_slug} sitemap image must include title`);
  assert.match(eventBlock, /<image:caption>[^<]+<\/image:caption>/, `${event.file_slug} sitemap image must include caption`);
}

console.log(`sitemap-coverage-regression-test: ok html=${htmlFiles.length} urls=${urls.length} images=${imageBlocks.length}`);
