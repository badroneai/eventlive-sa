import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');

const expectedPages = [
  'guides.html',
  'methodology.html',
  'guide-live-events-saudi.html',
  'guide-event-sources-methodology.html',
  'guide-organizers-live-schedule.html',
  'guide-saudi-events-data.html',
  'guide-riyadh-events-live.html',
  'guide-online-tech-courses-saudi.html',
  'guide-summer-events-saudi.html',
  'guide-ended-events-value.html',
  'saudi-events-today.html',
  'saudi-events-tomorrow.html',
  'saudi-events-weekend.html',
  'saudi-events-this-month.html',
  'riyadh-events-today.html',
  'jeddah-events.html',
  'online-tech-courses.html',
  'saudi-ticketed-events.html',
  'saudi-conferences-exhibitions.html',
  'saudi-sports-matches.html',
  'free-saudi-events.html',
  'saudi-events-faq.html'
];
const ownerOnlyPages = new Set(['methodology.html', 'sources.html', 'trust.html']);

function jsonLdScripts(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

for (const page of expectedPages) {
  const filePath = path.join(distDir, page);
  assert.equal(fs.existsSync(filePath), true, `${page} must be generated`);
  const sitemapPattern = new RegExp(`https://eventme\\.live/${page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (ownerOnlyPages.has(page)) {
    assert.doesNotMatch(sitemap, sitemapPattern, `${page} is owner-only and must not be in sitemap`);
  } else {
    assert.match(sitemap, sitemapPattern, `${page} must be in sitemap`);
  }

  const html = fs.readFileSync(filePath, 'utf8');
  assert.match(html, /<nav\b[^>]*class="[^"]*\bbreadcrumbs\b[^"]*"/, `${page} must render visible breadcrumbs`);
  assert.match(html, /انتقل للمنصة الحية/, `${page} must keep the visitor action panel`);

  const ld = jsonLdScripts(html);
  const primary = ld.find((item) => ['Article', 'CollectionPage'].includes(item['@type']));
  assert.ok(primary, `${page} must include primary Article/CollectionPage JSON-LD`);
  assert.equal(primary.inLanguage, 'ar-SA', `${page} must declare Arabic Saudi language`);
  assert.ok(primary.mainEntityOfPage?.startsWith('https://eventme.live/'), `${page} must have canonical mainEntityOfPage`);

  const breadcrumb = ld.find((item) => item['@type'] === 'BreadcrumbList');
  assert.ok(breadcrumb, `${page} must include BreadcrumbList JSON-LD`);
  assert.ok(Array.isArray(breadcrumb.itemListElement), `${page} breadcrumb must list items`);
  assert.equal(breadcrumb.itemListElement.at(-1)?.item, `https://eventme.live/${page}`, `${page} breadcrumb must end at the page URL`);

  if (/^(saudi-events-today|saudi-events-tomorrow|saudi-events-weekend|saudi-events-this-month|riyadh-events-today|jeddah-events|online-tech-courses|saudi-ticketed-events|saudi-conferences-exhibitions|saudi-sports-matches|free-saudi-events|saudi-events-faq)\.html$/.test(page)) {
    assert.ok(ld.some((item) => item['@type'] === 'FAQPage'), `${page} must include FAQPage JSON-LD`);
    const itemList = ld.find((item) => item['@type'] === 'ItemList');
    assert.ok(itemList, `${page} must include ItemList JSON-LD`);
    assert.ok(Array.isArray(itemList.itemListElement), `${page} ItemList must expose event links`);
  }
}

console.log('seo-content-regression-test: ok');
