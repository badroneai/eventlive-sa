import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'visit-saudi-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const visitSaudiCatalog = catalogEvents.filter((event) => event.source_label === 'Visit Saudi Calendar');
const enrichedCatalog = visitSaudiCatalog.filter((event) => event.program_outline?.provider === 'Visit Saudi Calendar');

assert.ok(visitSaudiCatalog.length >= 8, 'catalog must include multiple Visit Saudi Calendar rows');
assert.equal(enrichedCatalog.length, visitSaudiCatalog.length, 'Visit Saudi enrichment must cover every catalog row');

for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official description`);
  assert.ok(event.program_outline.features.length >= 4, `${event.id} must include rich attendance metadata`);
  assert.ok(event.highlights?.length >= 3, `${event.id} must expose card highlights`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const imageRichRows = enrichedCatalog.filter((event) => /scene7\.com\/is\/image\/scth/i.test(event.image_url || ''));
assert.ok(imageRichRows.length >= 5, 'Visit Saudi enrichment must preserve or discover high quality official Scene7 images');

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'Visit Saudi Calendar');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry Visit Saudi program outlines into dist/events.json');

const sample = distEnriched.find((event) => event.id === 'event-leap-2026') || distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render Visit Saudi outline');
assert.ok(html.includes('Visit Saudi Calendar'), 'event detail page must include Visit Saudi provider');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'Visit Saudi enrichment report totals must match rows');
  assert.equal(report.totals.fetch_failures, report.failed.length, 'Visit Saudi enrichment failure totals must match rows');
}

console.log(`visit-saudi-enrichment-regression-test: ok enriched=${enrichedCatalog.length} images=${imageRichRows.length}`);
