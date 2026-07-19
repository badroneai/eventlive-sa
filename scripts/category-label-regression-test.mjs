import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import {
  CATEGORY_KEYS,
  CATEGORY_TAXONOMY,
  canonicalCategorySlug,
  normalizeCategoryAlias,
  normalizeEventCategory,
  normalizeEventCategoryMetadata
} from './category-taxonomy.mjs';

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const MINIMUM_CATALOG_EVENTS = 490;

function normalizedVisibleValue(value = '') {
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function categoryPhraseValues($) {
  const values = [];
  $('body *').each((_, element) => {
    const node = $(element);
    if (node.children().length) return;
    const text = node.text().normalize('NFKC').replace(/\s+/g, ' ').trim();
    const match = text.match(/^(?:التصنيف|الفئة|category)\s*:\s*(.+)$/iu);
    if (match) values.push(match[1].trim());
  });
  return values;
}

function explicitCategoryValue(value = '') {
  const text = String(value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  return text.match(/^(?:التصنيف|الفئة|category)\s*:\s*(.+)$/iu)?.[1]?.trim()
    || text.match(/تصنيف الفعالية في EventLive\s*:\s*([^.\n]+)\.?/iu)?.[1]?.trim()
    || '';
}

function assertCategoryLinksUseCanonicalLabels($, relativePath, labelIndex) {
  $('a[href*="categories/"]').each((_, element) => {
    const link = $(element);
    if (link.hasClass('language-switch') || link.hasClass('cta') || link.attr('hreflang')) return;
    const slug = String(link.attr('href') || '').match(/categories\/([^/?#]+)\.html(?:[?#]|$)/)?.[1];
    if (!slug || !EXPECTED_TAXONOMY[slug]) return;
    assert.equal(
      link.text().replace(/\s+/g, ' ').trim(),
      EXPECTED_TAXONOMY[slug][labelIndex],
      `${relativePath} category link ${slug} must use its canonical visible label`
    );
  });
}

const EXPECTED_TAXONOMY = Object.freeze({
  'exhibitions-conferences': ['المعارض والمؤتمرات', 'Exhibitions & Conferences'],
  'family-entertainment': ['الترفيه والعائلات', 'Entertainment & Family'],
  'culture-arts': ['الثقافة والفنون', 'Culture & Arts'],
  'education-training': ['التعليم والتدريب', 'Education & Training'],
  'technology-innovation': ['التقنية والابتكار', 'Technology & Innovation'],
  'sports-outdoors': ['الرياضة والمغامرات', 'Sports & Outdoors'],
  'tourism-experiences': ['السياحة والتجارب', 'Tourism & Experiences'],
  'business-entrepreneurship': ['الأعمال وريادة الأعمال', 'Business & Entrepreneurship'],
  'health-regulation': ['الصحة والتنظيم', 'Health & Regulation'],
  'community-occasions': ['المجتمع والمناسبات', 'Community & Occasions']
});
const EXPECTED_KEYS = Object.freeze(Object.keys(EXPECTED_TAXONOMY));

const EXPECTED_RAW_GROUPS = Object.freeze({
  'exhibitions-conferences': [
    'Exhibitions & Conferences', 'exhibition', 'Exhibition / Families', 'conference', 'Forum', 'Summit',
    'venue event', 'مؤتمرات وملتقيات'
  ],
  'family-entertainment': [
    'family', 'entertainment', 'festival', 'Concerts & Shows / Families', 'Entertainment / Families',
    'Comedy Show / Families', 'Family & Kids', 'Festivals & Celebrations', 'entertainment families',
    'Immersive Experience', 'music'
  ],
  'culture-arts': [
    'culture', 'culture and arts', 'cultural initiative', 'performance', 'Culture & Community', 'Film',
    'Culture & History / Families', 'culture arts', 'architecture design festival', 'ثقافة وإبداع'
  ],
  'education-training': [
    'learning', 'skills program', 'education training', 'workshop', 'summer program', 'application deadline',
    'university event', 'Workshop, Explorers Thematic'
  ],
  'technology-innovation': [
    'technology training', 'banking and AI conference', 'enterprise AI conference', 'معسكر - أنظمة الشبكات',
    'معسكر - الأمن السيبراني', 'معسكر - الحوسبة السحابية', 'معسكر - تطوير البرمجيات والتطبيقات',
    'معسكر - علم البيانات والذكاء الاصطناعي', 'معسكر - هندسة البرمجيات', 'معسكر - هندسة الميكاترونكس'
  ],
  'sports-outdoors': ['sports', 'Entertainment & Sports', 'sports and community', 'Sports / Families', 'Adventure / Families'],
  'tourism-experiences': ['tourism experience', 'destination event', 'outdoor experience', 'Saudi Seasons'],
  'business-entrepreneurship': ['entrepreneurship', 'business forum', 'chamber event', 'أسبوع الاعمال', 'ريادة أعمال'],
  'health-regulation': ['regulatory workshop'],
  'community-occasions': ['Public Holidays', 'national day', 'awards', 'community']
});

const EXPECTED_EVENT_OVERRIDES = Object.freeze({
  'event-alula-arts-festival': 'culture-arts',
  'event-alula-wellness-festival': 'health-regulation',
  'event-ancient-kingdoms-festival': 'culture-arts',
  'event-bio-middle-east-biome': 'health-regulation',
  'event-immersive-experience-flying-over-saudi': 'tourism-experiences',
  'event-in-act-act-ix': 'family-entertainment',
  'event-in-act-act-x': 'family-entertainment',
  'event-kashtah': 'tourism-experiences',
  'event-on-this-carpet': 'education-training',
  'event-pfl-mena-final': 'sports-outdoors',
  'event-the-art-of-looking-at-art': 'education-training',
  'event-the-comeback': 'sports-outdoors',
  'event-who-lived-here': 'education-training',
  'event-join-us-at-kaust-health-for-respiratory-health-day': 'health-regulation',
  'event-ultra-gobi-alula': 'sports-outdoors',
  'event-ضحكات-الرياض': 'family-entertainment',
  'event-كايف-المزرعة': 'tourism-experiences',
  'event-منعً-في-لاحراج-عرض-ستاند-أب-كوميدي-من-عبدالرحمن-محمد-2': 'family-entertainment',
  'event-تيفو-فان-زون': 'sports-outdoors',
  'event-ليالي-المونديال': 'sports-outdoors',
  'event-jameel-library-summer-reading-challenge': 'education-training',
  'event-registration-for-international-research-competition-on-non-terrestrial-n': 'technology-innovation',
  'event-hayy-arts': 'culture-arts',
  'event-hayy-arts-red-wind-coral-worlds': 'culture-arts',
  'event-echoes-of-the-familiar': 'culture-arts',
  'event-tafasahu-make-room': 'culture-arts',
  'event-business-sector-annual-reception': 'business-entrepreneurship'
});

const expectedRawCategory = new Map();
for (const [category, aliases] of Object.entries(EXPECTED_RAW_GROUPS)) {
  for (const alias of aliases) {
    const normalized = normalizeCategoryAlias(alias);
    const existing = expectedRawCategory.get(normalized);
    assert.ok(!existing || existing === category, `test fixture alias ${alias} must have one owner`);
    expectedRawCategory.set(normalized, category);
  }
}

assert.deepEqual(CATEGORY_KEYS, EXPECTED_KEYS, 'runtime taxonomy must remain the approved closed ten-category set');
assert.ok(CATEGORY_KEYS.length <= 12, 'no more than 12 categories may be visible');
assert.equal(new Set(CATEGORY_KEYS.map((key) => key.toLowerCase())).size, CATEGORY_KEYS.length, 'canonical keys must have no case duplicates');
assert.equal(new Set(CATEGORY_TAXONOMY.map((item) => item.label_en.toLowerCase())).size, CATEGORY_TAXONOMY.length, 'English labels must have no case duplicates');
for (const category of CATEGORY_TAXONOMY) {
  assert.deepEqual(
    [category.label_ar, category.label_en],
    EXPECTED_TAXONOMY[category.key],
    `${category.key} must retain its visitor-facing Arabic and English labels`
  );
}
for (const forbidden of ['general-events', 'other', 'uncategorized', 'فعاليات عامة']) {
  assert.equal(CATEGORY_KEYS.includes(forbidden), false, `fallback category ${forbidden} is forbidden`);
}

const schema = readJson('data/events-catalog.schema.json');
const schemaItems = schema.properties.events.items;
assert.equal(schemaItems.required.includes('raw_category'), true, 'schema must require raw_category lineage');
assert.deepEqual(schemaItems.properties.category.enum, EXPECTED_KEYS, 'schema category enum must equal the closed taxonomy');

const catalogEvents = readJson('data/events_catalog.json').events || [];
assert.ok(
  catalogEvents.length >= MINIMUM_CATALOG_EVENTS,
  `source catalog must retain the T1.2 baseline of at least ${MINIMUM_CATALOG_EVENTS} events`
);
const rawLabelsCount = new Set(catalogEvents.map((event) => event.raw_category)).size;
const foldedRawLabelsCount = new Set(catalogEvents.map((event) => normalizeCategoryAlias(event.raw_category))).size;
let mappedCatalogEvents = 0;
let preservedUnknownRawCategories = 0;
for (const event of catalogEvents) {
  assert.equal(typeof event.raw_category, 'string', `${event.id} must preserve raw_category`);
  assert.ok(event.raw_category.trim(), `${event.id} raw_category must not be empty`);
  const rawExpected = expectedRawCategory.get(normalizeCategoryAlias(event.raw_category));
  const expected = EXPECTED_EVENT_OVERRIDES[event.id] || rawExpected || event.category;
  assert.ok(EXPECTED_TAXONOMY[expected], `${event.id} must resolve to one approved canonical category`);
  if (!EXPECTED_EVENT_OVERRIDES[event.id] && !rawExpected) preservedUnknownRawCategories += 1;
  assert.equal(event.category, expected, `${event.id} must map to exactly one approved category`);
  assert.equal(event.category, event.category.toLowerCase(), `${event.id} canonical category must be lowercase`);
  const normalizedAgain = normalizeEventCategory(event);
  assert.equal(normalizedAgain.category, event.category, `${event.id} normalization must be idempotent`);
  assert.equal(normalizedAgain.raw_category, event.raw_category, `${event.id} must retain raw lineage on repeated normalization`);
  const expectedLabel = EXPECTED_TAXONOMY[expected][0];
  for (const value of [
    ...(Array.isArray(event.highlights) ? event.highlights : []),
    ...(Array.isArray(event.program_outline?.features) ? event.program_outline.features : []),
    event.program_outline?.official_description,
    event.description,
    event.rich_summary
  ].filter((value) => typeof value === 'string')) {
    const explicitValue = explicitCategoryValue(value);
    if (explicitValue) assert.equal(explicitValue, expectedLabel, `${event.id} explicit category text must use its canonical Arabic label`);
  }
  if (event.program_outline?.faqs && 'category' in event.program_outline.faqs) {
    assert.equal(event.program_outline.faqs.category, expectedLabel, `${event.id} nested category metadata must use its canonical Arabic label`);
  }
  mappedCatalogEvents += 1;
}
assert.equal(mappedCatalogEvents, catalogEvents.length, 'every catalog event must map exactly once');
const rawLineageFixture = normalizeEventCategory({ id: 'raw-lineage-fixture', category: 'Exhibition' });
assert.equal(rawLineageFixture.category, 'exhibitions-conferences', 'raw lineage fixture must map to the approved category');
assert.equal(rawLineageFixture.raw_category, 'Exhibition', 'first normalization must preserve the exact incoming raw category');
const metadataFixture = normalizeEventCategoryMetadata({
  id: 'metadata-fixture',
  category: 'Exhibition',
  tags: ['Exhibition', 'industry'],
  highlights: ['التصنيف: Exhibition'],
  program_outline: {
    official_description: 'تصنيف الفعالية في EventLive: Exhibition.',
    features: ['التصنيف: Exhibition'],
    faqs: { category: 'Exhibition' }
  }
});
assert.equal(metadataFixture.raw_category, 'Exhibition', 'display metadata normalization must preserve exact raw lineage');
assert.equal(metadataFixture.tags[0], 'Exhibition', 'visitor tags must retain their independent search meaning');
assert.equal(metadataFixture.highlights[0], 'التصنيف: المعارض والمؤتمرات', 'highlight category text must be canonical');
assert.equal(metadataFixture.program_outline.faqs.category, 'المعارض والمؤتمرات', 'nested category metadata must be canonical');
assert.equal(
  normalizeEventCategory({ id: 'case-lower', category: 'exhibition' }).category,
  normalizeEventCategory({ id: 'case-upper', category: 'Exhibition' }).category,
  'case variants must fold into one category'
);
const officialFallbackFixture = normalizeEventCategory({
  id: 'official-fallback-fixture',
  category: 'community-occasions',
  raw_category: 'Emerging Civic Experience'
});
assert.equal(officialFallbackFixture.category, 'community-occasions', 'a stored official fallback must retain its canonical category');
assert.equal(officialFallbackFixture.raw_category, 'Emerging Civic Experience', 'a stored official fallback must retain its unknown raw lineage');
assert.equal(normalizeEventCategory({ id: 'unknown', category: 'invented category' }, { strict: false }), null, 'unknown categories must not get an invented fallback');
assert.equal(canonicalCategorySlug('invented-category'), '', 'unknown category slugs must fail closed');
assert.throws(
  () => normalizeEventCategory({ id: 'unknown', category: 'invented category' }),
  /Unknown category/,
  'strict storage normalization must reject unknown categories'
);

const publicEvents = readJson('dist/events.json').events || [];
const compactEvents = readJson('dist/events-catalog.json').events || [];
const englishCompactEvents = readJson('dist/en/events-catalog.json').events || [];
const publicById = new Map(publicEvents.map((event) => [event.id, event]));
const compactById = new Map(compactEvents.map((event) => [event.id, event]));
const englishCompactById = new Map(englishCompactEvents.map((event) => [event.id, event]));
const publishedCatalogEvents = catalogEvents.filter((event) => event.approval_status === 'published');

for (const event of publishedCatalogEvents) {
  assert.ok(publicById.has(event.id), `${event.id} published source event must exist in dist/events.json`);
  assert.ok(compactById.has(event.id), `${event.id} published source event must exist in dist/events-catalog.json`);
  assert.ok(englishCompactById.has(event.id), `${event.id} published source event must exist in dist/en/events-catalog.json`);
}
for (const event of publicEvents) {
  const expectedLabels = EXPECTED_TAXONOMY[event.category];
  assert.ok(expectedLabels, `${event.id} public category must be canonical`);
  assert.equal(event.category_slug, event.category, `${event.id} category slug must equal canonical storage key`);
  assert.equal(event.category_label, expectedLabels[0], `${event.id} must expose the approved Arabic label`);
  assert.equal(event.category_label_en, expectedLabels[1], `${event.id} must expose the approved English label`);
  assert.ok(String(event.raw_category || '').trim(), `${event.id} public output must retain raw_category`);
}
for (const event of compactEvents) {
  assert.ok(EXPECTED_TAXONOMY[event.category], `${event.id} compact category must be canonical`);
  assert.equal(event.category_slug, event.category, `${event.id} compact feed must expose category_slug`);
  assert.equal(event.category_label, EXPECTED_TAXONOMY[event.category][0], `${event.id} compact feed needs Arabic label`);
  assert.equal(event.category_label_en, EXPECTED_TAXONOMY[event.category][1], `${event.id} compact feed needs English label`);
  assert.ok(String(event.raw_category || '').trim(), `${event.id} compact feed must retain raw_category`);
}
assert.equal(englishCompactEvents.length, compactEvents.length, 'English compact feed must retain every Arabic compact event');
for (const event of compactEvents) {
  const englishEvent = englishCompactById.get(event.id);
  assert.ok(englishEvent, `${event.id} must exist in the English compact feed`);
  assert.equal(englishEvent.category, event.category, `${event.id} English compact category must keep the canonical slug`);
  assert.equal(englishEvent.category_slug, event.category_slug, `${event.id} English compact category_slug must match Arabic`);
  assert.equal(englishEvent.category_label, EXPECTED_TAXONOMY[event.category][1], `${event.id} English compact feed needs its English label`);
  assert.equal(englishEvent.raw_category, event.raw_category, `${event.id} English compact feed must retain the same raw lineage`);
}

const arCategories = readJson('dist/categories.json').categories || [];
const enCategories = readJson('dist/en/categories.json').categories || [];
assert.ok(arCategories.length <= 12, 'Arabic site must expose at most 12 categories');
assert.equal(arCategories.length, EXPECTED_KEYS.length, 'Arabic category directory must expose the closed taxonomy once');
assert.deepEqual(
  [...arCategories.map((row) => row.slug)].sort(),
  [...EXPECTED_KEYS].sort(),
  'Arabic visible category slugs must equal the closed taxonomy'
);
assert.deepEqual(
  [...enCategories.map((row) => row.slug)].sort(),
  [...EXPECTED_KEYS].sort(),
  'English visible category slugs must equal the Arabic set'
);
for (const row of arCategories) assert.equal(row.label, EXPECTED_TAXONOMY[row.slug][0], `${row.slug} must use its Arabic label`);
for (const row of enCategories) assert.equal(row.label, EXPECTED_TAXONOMY[row.slug][1], `${row.slug} must use its English label`);
assert.equal(new Set(arCategories.map((row) => row.label.toLowerCase())).size, arCategories.length, 'Arabic visible labels must not repeat by case');
assert.equal(new Set(enCategories.map((row) => row.label.toLowerCase())).size, enCategories.length, 'English visible labels must not repeat by case');

for (const [slug, [arabic, english]] of Object.entries(EXPECTED_TAXONOMY)) {
  for (const [localeDirectory, expectedLabel, labelIndex] of [['', arabic, 0], ['en', english, 1]]) {
    const relativePath = path.join(localeDirectory, 'categories', `${slug}.html`);
    const filePath = path.join(root, 'dist', relativePath);
    assert.equal(fs.existsSync(filePath), true, `${relativePath} must exist`);
    const $ = load(fs.readFileSync(filePath, 'utf8'));
    assert.equal($('h1').first().text().replace(/\s+/g, ' ').trim(), expectedLabel, `${relativePath} must expose the canonical H1`);
    assertCategoryLinksUseCanonicalLabels($, relativePath, labelIndex);
  }
}

for (const [id, expected] of Object.entries({
  'event-the-groves': 'family-entertainment',
  'event-immersive-experience-flying-over-saudi': 'tourism-experiences',
  'event-kashtah': 'tourism-experiences',
  'event-كايف-المزرعة': 'tourism-experiences',
  'event-the-comeback': 'sports-outdoors',
  'event-in-act-act-ix': 'family-entertainment',
  'event-in-act-act-x': 'family-entertainment',
  'event-ضحكات-الرياض': 'family-entertainment',
  'event-who-lived-here': 'education-training',
  'event-alula-wellness-festival': 'health-regulation',
  'event-ancient-kingdoms-festival': 'culture-arts',
  'event-coca-cola-fan-zone-at-jax-district': 'sports-outdoors',
  'event-arabic-language-exhibition-28': 'culture-arts',
  'event-global-prize-for-innovation-in-water': 'community-occasions',
  'event-soundstorm-26': 'family-entertainment',
  'event-registration-for-international-research-competition-on-non-terrestrial-n': 'technology-innovation',
  'event-business-sector-annual-reception': 'business-entrepreneurship'
})) {
  assert.equal(publicById.get(id)?.category, expected, `${id} must not regress to prose-based classification`);
}

const arHtml = fs.readFileSync(path.join(root, 'dist', 'categories.html'), 'utf8');
const enHtml = fs.readFileSync(path.join(root, 'dist', 'en', 'categories.html'), 'utf8');
for (const [arabic, english] of Object.values(EXPECTED_TAXONOMY)) {
  assert.ok(arHtml.includes(arabic), `Arabic category page must visibly include ${arabic}`);
  assert.ok(enHtml.includes(english), `English category page must visibly include ${english}`);
}
assertCategoryLinksUseCanonicalLabels(load(arHtml), 'categories.html', 0);
assertCategoryLinksUseCanonicalLabels(load(enHtml), 'en/categories.html', 1);
assertCategoryLinksUseCanonicalLabels(load(fs.readFileSync(path.join(root, 'dist', 'events.html'), 'utf8')), 'events.html', 0);

let detailPagesChecked = 0;
for (const sourceEvent of publishedCatalogEvents) {
  const event = publicById.get(sourceEvent.id);
  const relativeDetailPath = String(event.detail_url || '').replace(/^\.\//, '');
  assert.ok(relativeDetailPath, `${event.id} public event must expose detail_url`);
  const expectedLabels = EXPECTED_TAXONOMY[event.category];
  for (const [localeDirectory, expectedLabel, labelIndex] of [['', expectedLabels[0], 0], ['en', expectedLabels[1], 1]]) {
    const relativePath = path.join(localeDirectory, relativeDetailPath);
    const filePath = path.join(root, 'dist', relativePath);
    assert.equal(fs.existsSync(filePath), true, `${relativePath} must exist`);
    const $ = load(fs.readFileSync(filePath, 'utf8'));
    assertCategoryLinksUseCanonicalLabels($, relativePath, labelIndex);
    const rawCategory = normalizedVisibleValue(event.raw_category);
    const canonicalLabel = normalizedVisibleValue(expectedLabel);
    if (rawCategory !== canonicalLabel) {
      const exposedRawPhrases = categoryPhraseValues($)
        .filter((value) => normalizedVisibleValue(value) === rawCategory);
      assert.deepEqual(
        exposedRawPhrases,
        [],
        `${relativePath} must not expose raw category phrase "${event.raw_category}"; use "${expectedLabel}"`
      );
    }
    detailPagesChecked += 1;
  }
}

console.log(
  `CATEGORY_LABELS_OK taxonomy=${CATEGORY_KEYS.length} catalog_events=${catalogEvents.length} raw_labels=${rawLabelsCount} casefolded_raw_labels=${foldedRawLabelsCount} mapped=${mappedCatalogEvents} preserved_unknown_raw=${preservedUnknownRawCategories} published_ids=${publishedCatalogEvents.length} public_events=${publicEvents.length} visible_ar=${arCategories.length} visible_en=${enCategories.length} detail_pages=${detailPagesChecked} unmapped=0 ambiguous=0 case_duplicates=0 raw_category_phrases=0`
);
