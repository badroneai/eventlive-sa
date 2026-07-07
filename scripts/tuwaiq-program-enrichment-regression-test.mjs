import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'tuwaiq-program-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const tuwaiqCatalog = catalogEvents.filter((event) => /tuwaiq/i.test(`${event.source_label || ''} ${event.source_url || ''}`));
const enrichedCatalog = tuwaiqCatalog.filter((event) => event.program_outline?.source_method === 'official-api');

assert.ok(tuwaiqCatalog.length >= 5, 'catalog must include Tuwaiq events');
assert.ok(enrichedCatalog.length >= Math.min(5, tuwaiqCatalog.length), 'Tuwaiq official API enrichment must cover multiple catalog rows');

for (const event of enrichedCatalog.slice(0, 10)) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official description`);
  assert.ok(event.program_outline.goals.length > 0, `${event.id} must include official goals`);
  assert.ok(event.program_outline.requirements.length > 0, `${event.id} must include official requirements`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const distEnriched = distEvents.filter((event) => event.program_outline?.source_method === 'official-api');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry Tuwaiq program outlines into dist/events.json');

const sample = distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render official program outline');
assert.ok(html.includes(sample.program_outline.goals[0]), 'event detail page must include an official goal');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'Tuwaiq enrichment report totals must match rows');
}

console.log(`tuwaiq-program-enrichment-regression-test: ok enriched=${enrichedCatalog.length}`);
