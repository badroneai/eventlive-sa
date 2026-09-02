import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'misk-program-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const miskCatalog = catalogEvents.filter((event) => /misk hub/i.test(`${event.source_label || ''} ${event.source_url || ''}`));
const enrichedCatalog = miskCatalog.filter((event) => event.program_outline?.provider === 'Misk Hub');

assert.ok(miskCatalog.length >= 5, 'catalog must include multiple Misk programs');
assert.ok(enrichedCatalog.length >= Math.min(5, miskCatalog.length), 'Misk official HTML enrichment must cover multiple program rows');

// Per-row floor + corpus ratio (AGENTS.md law 2.7). Misk sometimes publishes a
// program page with the metadata grid but no prose body — that is THEIR editorial
// choice, not our defect, and demanding a description from every single row made a
// third-party content gap look like a code regression. What we always control is
// the structural shape: our writer must never emit an outline without the verified
// metadata it read off the page.
for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.features.length > 0, `${event.id} must preserve highlights or verified metadata features`);
  assert.ok(event.program_outline.faqs.program_format || event.program_outline.faqs.language || event.program_outline.faqs.who_should_apply, `${event.id} must include program metadata`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const withOverview = enrichedCatalog.filter((event) => event.program_outline.official_description);
const withGoals = enrichedCatalog.filter((event) => event.program_outline.goals.length > 0);
const overviewRatio = withOverview.length / enrichedCatalog.length;
assert.ok(
  overviewRatio >= 0.8,
  `Misk overview coverage collapsed: ${withOverview.length}/${enrichedCatalog.length} rows carry an official overview (floor 80%). A ratio this low means the extractor broke, not that Misk went quiet.`
);
assert.ok(
  withGoals.length / enrichedCatalog.length >= 0.8,
  `Misk outcome/audience coverage collapsed: ${withGoals.length}/${enrichedCatalog.length} rows carry goals (floor 80%)`
);

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'Misk Hub');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry Misk program outlines into dist/events.json');

const sample = distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render Misk program outline');
assert.ok(html.includes('Misk Hub'), 'event detail page must include Misk provider');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'Misk enrichment report totals must match rows');
}

console.log(`misk-program-enrichment-regression-test: ok enriched=${enrichedCatalog.length} overview=${withOverview.length} goals=${withGoals.length}`);
