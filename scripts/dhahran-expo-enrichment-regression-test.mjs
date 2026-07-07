import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'dhahran-expo-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const dhahranCatalog = catalogEvents.filter((event) => /Dhahran Expo Calendar/i.test(`${event.source_label || ''} ${event.source_url || ''}`));
const enrichedCatalog = dhahranCatalog.filter((event) => event.program_outline?.provider === 'Dhahran Expo Calendar');

assert.ok(dhahranCatalog.length >= 10, 'catalog must include multiple Dhahran Expo calendar rows');
assert.equal(enrichedCatalog.length, dhahranCatalog.length, 'Dhahran Expo calendar enrichment must cover every catalog row');

for (const event of enrichedCatalog) {
  assert.equal(event.program_outline.source_method, 'official-calendar-html', `${event.id} must use official calendar source method`);
  assert.ok(event.program_outline.official_description.includes('Dhahran Expo'), `${event.id} must include official calendar context`);
  assert.ok(event.program_outline.features.some((item) => /المنظم|organizer/i.test(item)), `${event.id} must include organizer metadata`);
  assert.ok(event.program_outline.features.some((item) => /الموقع|venue|Dhahran/i.test(item)), `${event.id} must include venue metadata`);
  assert.ok(event.highlights?.length >= 3, `${event.id} must expose rich card highlights`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'Dhahran Expo Calendar');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry Dhahran Expo program outlines into dist/events.json');

const sample = distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render Dhahran Expo outline');
assert.ok(html.includes('Dhahran Expo Calendar'), 'event detail page must include Dhahran Expo provider');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'Dhahran enrichment report totals must match rows');
  assert.equal(report.totals.skipped, report.skipped.length, 'Dhahran enrichment skipped totals must match rows');
}

console.log(`dhahran-expo-enrichment-regression-test: ok enriched=${enrichedCatalog.length}`);
