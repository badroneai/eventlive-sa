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
  'guide-ended-events-value.html'
];

function jsonLdScripts(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

for (const page of expectedPages) {
  const filePath = path.join(distDir, page);
  assert.equal(fs.existsSync(filePath), true, `${page} must be generated`);
  assert.match(sitemap, new RegExp(`https://eventme\\.live/${page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${page} must be in sitemap`);

  const html = fs.readFileSync(filePath, 'utf8');
  assert.match(html, /<nav class="breadcrumbs"/, `${page} must render visible breadcrumbs`);
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
}

console.log('seo-content-regression-test: ok');
