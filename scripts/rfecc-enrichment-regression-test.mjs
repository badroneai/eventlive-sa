import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'rfecc-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const rfeccCatalog = catalogEvents.filter((event) => event.source_label === "RFECC What's On");
const enrichedCatalog = rfeccCatalog.filter((event) => event.program_outline?.provider === 'RFECC What’s On');

assert.ok(rfeccCatalog.length >= 4, 'catalog must retain the four deduplicated RFECC rows');
assert.equal(enrichedCatalog.length, rfeccCatalog.length, 'RFECC enrichment must cover every catalog row');

for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official description fallback`);
  assert.ok(event.program_outline.source_url.includes('rfecc.sa'), `${event.id} must keep official RFECC source URL`);
  assert.ok(event.program_outline.features.length >= 5, `${event.id} must include rich attendance metadata`);
  assert.ok(event.highlights?.length >= 3, `${event.id} must expose card highlights`);
  assert.match(event.image_url || '', /cdn\.rfecc\.sa\//, `${event.id} must preserve official RFECC CDN image`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'RFECC What’s On');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry RFECC program outlines into dist/events.json');

const sample = distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render RFECC outline');
assert.ok(html.includes('RFECC What’s On'), 'event detail page must include RFECC provider');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'RFECC enrichment report totals must match rows');
  assert.equal(report.totals.fetch_failures, report.failed.length, 'RFECC enrichment failure totals must match rows');
}

console.log(`rfecc-enrichment-regression-test: ok enriched=${enrichedCatalog.length}`);
