import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'saudi-water-authority-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const swaCatalog = catalogEvents.filter((event) => event.source_label === 'Saudi Water Authority Events');
const enrichedCatalog = swaCatalog.filter((event) => event.program_outline?.provider === 'Saudi Water Authority');

assert.ok(swaCatalog.length >= 7, 'catalog must include multiple Saudi Water Authority event rows');
assert.equal(enrichedCatalog.length, swaCatalog.length, 'Saudi Water Authority enrichment must cover every catalog row');

for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official description`);
  assert.ok(event.program_outline.source_url.includes('swa.gov.sa'), `${event.id} must keep official SWA source URL`);
  assert.ok(event.program_outline.features.length >= 5, `${event.id} must include rich attendance metadata`);
  assert.ok(event.highlights?.length >= 3, `${event.id} must expose card highlights`);
  assert.match(event.image_url || '', /swa-cdn\.swa\.gov\.sa\/Events\//, `${event.id} must preserve official SWA CDN image`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'Saudi Water Authority');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry SWA program outlines into dist/events.json');

const sample = distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render SWA outline');
assert.ok(html.includes('Saudi Water Authority'), 'event detail page must include SWA provider');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'SWA enrichment report totals must match rows');
  assert.equal(report.totals.fetch_failures, report.failed.length, 'SWA enrichment failure totals must match rows');
}

console.log(`saudi-water-authority-enrichment-regression-test: ok enriched=${enrichedCatalog.length}`);
