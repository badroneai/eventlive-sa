import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// This gate asserts POST-ENRICHMENT catalog state, so run order matters: on a
// fresh checkout it reads whatever the committed catalog last carried, which
// can predate an extractor fix. In CI that is never a problem — source-sync.yml
// runs the whole `sources:sync` pipeline (collect → auto-publish → details →
// validate → build) before its Regression checks step, so the catalog is
// current by the time this runs. Locally, run `npm run sources:sfda:details`
// (or a full sync) and `npm run build` first, or you are grading stale data.
const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'sfda-workshop-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const sfdaCatalog = catalogEvents.filter((event) => /saudi food and drug authority|sfda/i.test(`${event.source_label || ''} ${event.source_url || ''}`));
const enrichedCatalog = sfdaCatalog.filter((event) => event.program_outline?.provider === 'Saudi Food and Drug Authority');

assert.ok(sfdaCatalog.length >= 5, 'catalog must include multiple SFDA workshops');
assert.ok(enrichedCatalog.length >= Math.min(5, sfdaCatalog.length), 'SFDA official HTML enrichment must cover multiple workshop rows');

for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official description`);
  // Floor, per event: attendance mode is always derivable, so every enriched
  // workshop carries at least one feature. The richer metadata (نوع الورشة /
  // لغة العرض) is asserted as a CORPUS ratio below, not per event, and that
  // is deliberate: SFDA does not publish those table rows for every workshop
  // — verified 2026-08-02 against https://www.sfda.gov.sa/ar/workshop/5522068,
  // whose page genuinely has no such rows. Demanding them per event would
  // mean either a permanently red gate or manufacturing the values from
  // platform defaults, and inventing metadata about a real public event is
  // the one thing this catalog may never do.
  assert.ok(event.program_outline.features.length >= 1, `${event.id} must carry at least the attendance-mode feature`);
  assert.ok(event.starts_at.includes('T'), `${event.id} must include precise starts_at`);
  assert.ok(event.ends_at.includes('T'), `${event.id} must include precise ends_at`);
  assert.notEqual(event.ends_at.slice(11, 19), '18:00:00', `${event.id} must not keep generic all-day workshop end time after enrichment`);
  if (event.live_schedule_ready) {
    assert.equal(event.sessions?.length, 1, `${event.id} live-ready workshop must expose one official session`);
    assert.match(event.sessions[0].session_type, /^official-/, `${event.id} session must be official`);
  }
}

// Corpus-level teeth for the richer metadata. The extractor reads نوع الورشة
// and لغة العرض as independent optional matches, so a regression in it (a
// broken pattern, a changed SFDA table layout) collapses nearly every
// workshop to the attendance-only feature — which this ratio catches loudly
// — while a single source-side gap stays tolerated. Measured 2026-08-02:
// 14 workshops carry 5 features, 1 carries 2, 1 carries 1 → 93.75%.
const RICH_METADATA_FLOOR = 0.8;
const richEnough = enrichedCatalog.filter((event) => event.program_outline.features.length >= 2).length;
assert.ok(
  richEnough >= Math.ceil(enrichedCatalog.length * RICH_METADATA_FLOOR),
  `SFDA workshop metadata collapsed: only ${richEnough}/${enrichedCatalog.length} enriched workshops carry نوع الورشة/لغة العرض features (floor ${Math.round(RICH_METADATA_FLOOR * 100)}%). A single workshop missing them is a source-side gap and tolerated; a corpus-wide drop means scripts/enrich-sfda-workshop-details.mjs stopped parsing the SFDA detail table`
);

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'Saudi Food and Drug Authority');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry SFDA program outlines into dist/events.json');

const sample = distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render SFDA official details');
assert.ok(html.includes('لغة العرض') || html.includes('طريقة الحضور'), 'event detail page must include SFDA attendance metadata');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'SFDA enrichment report totals must match rows');
}

console.log(`sfda-workshop-enrichment-regression-test: ok enriched=${enrichedCatalog.length}`);
