import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
  assert.ok(event.program_outline.features.length >= 2, `${event.id} must include attendance/language metadata`);
  assert.ok(event.starts_at.includes('T'), `${event.id} must include precise starts_at`);
  assert.ok(event.ends_at.includes('T'), `${event.id} must include precise ends_at`);
  assert.notEqual(event.ends_at.slice(11, 19), '18:00:00', `${event.id} must not keep generic all-day workshop end time after enrichment`);
  if (event.live_schedule_ready) {
    assert.equal(event.sessions?.length, 1, `${event.id} live-ready workshop must expose one official session`);
    assert.match(event.sessions[0].session_type, /^official-/, `${event.id} session must be official`);
  }
}

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
