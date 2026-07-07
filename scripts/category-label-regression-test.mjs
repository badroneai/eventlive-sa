import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const eventsHtmlPath = path.join(root, 'dist', 'events.html');
const categoriesDir = path.join(root, 'dist', 'categories');

assert.equal(fs.existsSync(eventsHtmlPath), true, 'dist/events.html must exist; run npm run build first');
assert.equal(fs.existsSync(categoriesDir), true, 'dist/categories must exist; run npm run build first');

const rawLabels = [
  'Accelerator',
  'AI entrepreneurship',
  'chamber event',
  'Digital Series',
  'gaming program',
  'incubator',
  'regulatory workshop',
  'space',
  'conference',
  'exhibition',
  'university event',
  'venue event',
  'business forum',
  'community',
  'workshop',
  'space education',
  'auction',
  'Sports / Families',
  'Culture & History / Families',
  'technology bootcamp',
  'training',
  'awards',
  'music'
];

const htmlFiles = [
  eventsHtmlPath,
  ...fs.readdirSync(categoriesDir)
    .filter((file) => file.endsWith('.html'))
    .map((file) => path.join(categoriesDir, file))
];

const visibleTextPattern = (label) => new RegExp(`>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`, 'i');

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const label of rawLabels) {
    assert.doesNotMatch(
      html,
      visibleTextPattern(label),
      `${path.relative(root, file)} must not expose raw category label "${label}" as visible text`
    );
  }
}

const eventsPath = path.join(root, 'dist', 'events.json');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events || [];
const byId = new Map(events.map((event) => [event.id, event]));

assert.equal(byId.get('event-the-groves')?.category_slug, 'entertainment-families', 'The Groves must be entertainment/families, not technology training');
assert.equal(byId.get('event-the-groves')?.category_label, 'ترفيه وعائلات', 'The Groves must show an Arabic entertainment label');
assert.equal(byId.get('event-coca-cola-fan-zone-at-jax-district')?.category_slug, 'sports', 'Coca-Cola Fan Zone must be sports, not science/space');
assert.equal(byId.get('event-arabic-language-exhibition-28')?.category_slug, 'culture-arts', 'Arabic Language Exhibition must be culture/arts, not generic exhibition');
assert.equal(byId.get('event-global-prize-for-innovation-in-water')?.category_slug, 'awards-ceremonies', 'Global Water prize must be awards/ceremonies, not raw awards');
assert.equal(byId.get('event-global-prize-for-innovation-in-water')?.category_label, 'جوائز وتكريم', 'Global Water prize must show an Arabic awards label');
assert.equal(byId.get('event-soundstorm-26')?.category_slug, 'entertainment-families', 'SOUNDSTORM must be entertainment/families, not raw music');
assert.equal(byId.get('event-soundstorm-26')?.category_label, 'ترفيه وعائلات', 'SOUNDSTORM must show an Arabic entertainment label');
assert.equal(events.some((event) => event.category_slug === 'culture-arts'), true, 'catalog must expose the culture/arts category');

console.log('category-label-regression-test: ok');
