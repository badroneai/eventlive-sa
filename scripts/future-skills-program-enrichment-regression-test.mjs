import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'future-skills-program-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const futureCatalog = catalogEvents.filter((event) => /future skills/i.test(`${event.source_label || ''} ${event.source_url || ''}`));
const enrichedCatalog = futureCatalog.filter((event) => event.program_outline?.source_method === 'official-html');

assert.ok(futureCatalog.length >= 4, 'catalog must include multiple Future Skills events');
assert.ok(enrichedCatalog.length >= Math.min(4, futureCatalog.length), 'Future Skills official HTML enrichment must cover multiple catalog rows');

for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official training goal`);
  assert.ok(event.program_outline.goals.length > 0, `${event.id} must include learning outcomes`);
  assert.ok(event.program_outline.features.length > 0, `${event.id} must include topic index`);
  assert.ok(event.program_outline.requirements.length > 0, `${event.id} must include prerequisites`);
  assert.ok(event.program_outline.faqs.delivery_method || event.program_outline.faqs.course_level, `${event.id} must include course metadata`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const distEnriched = distEvents.filter((event) => event.program_outline?.source_method === 'official-html');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry Future Skills program outlines into dist/events.json');

const sample = distEnriched.find((event) => /future skills/i.test(`${event.source_label || ''} ${event.source_url || ''}`));
assert.ok(sample, 'dist must include enriched Future Skills sample');
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render Future Skills program outline');
assert.ok(html.includes(sample.program_outline.goals[0]), 'event detail page must include a learning outcome');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'Future Skills enrichment report totals must match rows');
}

console.log(`future-skills-program-enrichment-regression-test: ok enriched=${enrichedCatalog.length}`);
