import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'mdlbeast-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const mdlbeastCatalog = catalogEvents.filter((event) => event.source_label === 'MDLBEAST Events');
const enrichedCatalog = mdlbeastCatalog.filter((event) => event.program_outline?.provider === 'MDLBEAST');

assert.ok(mdlbeastCatalog.length >= 5, 'catalog must include multiple MDLBEAST rows');
assert.equal(enrichedCatalog.length, mdlbeastCatalog.length, 'MDLBEAST enrichment must cover every catalog row');

for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official description`);
  assert.ok(event.program_outline.source_url.includes('mdlbeast.com'), `${event.id} must keep official MDLBEAST source URL`);
  assert.ok(event.program_outline.features.length >= 5, `${event.id} must include rich attendance metadata`);
  assert.ok(event.highlights?.length >= 3, `${event.id} must expose card highlights`);
  assert.match(event.image_url || '', /datocms-assets\.com/, `${event.id} must use an official DatoCMS image`);
  assert.match(event.image_url || '', /\.(jpe?g|png|webp|avif)(\?|$)/i, `${event.id} must use a still image, not a video asset`);
  assert.ok(!/1751801189-mdlbeast\.png/.test(event.image_url || ''), `${event.id} must not keep the generic MDLBEAST logo image as event cover`);
  if (event.live_schedule_ready) {
    assert.equal(event.sessions?.length, 1, `${event.id} live-ready MDLBEAST event must expose one official session`);
    assert.match(event.sessions[0].session_type, /^official-/, `${event.id} live-ready session must be official`);
  }
}

const soundstorm = enrichedCatalog.find((event) => event.id === 'event-soundstorm-26');
assert.ok(soundstorm?.ticket_url?.includes('nofomo.com'), 'Soundstorm must carry the official ticket CTA when published on MDLBEAST');

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'MDLBEAST');
assert.ok(distEnriched.length >= enrichedCatalog.length, 'build must carry MDLBEAST program outlines into dist/events.json');
assert.ok(distEnriched.some((event) => event.category_label === 'ترفيه وعائلات'), 'MDLBEAST music category must render as an Arabic entertainment label');

const sample = distEnriched.find((event) => event.id === 'event-soundstorm-26') || distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render MDLBEAST outline');
assert.ok(html.includes('MDLBEAST'), 'event detail page must include MDLBEAST provider');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'MDLBEAST enrichment report totals must match rows');
  assert.equal(report.totals.fetch_failures, report.failed.length, 'MDLBEAST enrichment failure totals must match rows');
}

console.log(`mdlbeast-enrichment-regression-test: ok enriched=${enrichedCatalog.length}`);
