import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');

const pages = [
  { file: 'cities/riyadh.html', expectedTitle: 'فعاليات الرياض' },
  { file: 'categories/technology-innovation.html', expectedTitle: 'التقنية والابتكار' },
  { file: 'categories/business-entrepreneurship.html', expectedTitle: 'الأعمال وريادة الأعمال' }
];

function jsonLdScripts(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

for (const page of pages) {
  const filePath = path.join(distDir, page.file);
  assert.equal(fs.existsSync(filePath), true, `${page.file} must be generated`);
  assert.match(sitemap, new RegExp(`https://eventme\\.live/${page.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${page.file} must be in sitemap`);

  const html = fs.readFileSync(filePath, 'utf8');
  assert.match(html, new RegExp(page.expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${page.file} must render the expected Arabic title`);
  assert.match(html, /class="signal-strip"/, `${page.file} must show discovery signal metrics`);
  assert.match(html, /قادمة/, `${page.file} must show upcoming count label`);
  assert.match(html, /مباشرة\/جارية/, `${page.file} must show live or ongoing count label`);
  assert.match(html, /مصادر/, `${page.file} must show source-count label`);
  assert.match(html, /class="facet-focus"/, `${page.file} must show the focused current or next event`);
  assert.match(html, /اشترك بالتقويم/, `${page.file} must keep calendar subscription action`);

  const ld = jsonLdScripts(html);
  const collection = ld.find((item) => item['@type'] === 'CollectionPage');
  assert.ok(collection, `${page.file} must include CollectionPage JSON-LD`);
  assert.equal(collection.inLanguage, 'ar-SA', `${page.file} CollectionPage must declare ar-SA`);
  assert.equal(collection.isPartOf?.url, 'https://eventme.live', `${page.file} must keep eventme.live as the website URL`);

  const itemList = ld.find((item) => item['@type'] === 'ItemList');
  assert.ok(itemList, `${page.file} must include ItemList JSON-LD`);
  assert.ok(Number(itemList.numberOfItems) >= 1, `${page.file} ItemList must describe at least one event`);
  assert.ok(Array.isArray(itemList.itemListElement), `${page.file} ItemList must include list items`);
}

console.log('facet-pages-regression-test: ok');
