import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const jsonPath = path.join(distDir, 'source-coverage-gaps.json');
const eventsPath = path.join(distDir, 'events.json');
const htmlPath = path.join(distDir, 'source-coverage-gaps.html');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const manifestPath = path.join(distDir, 'manifest.webmanifest');
const serviceWorkerPath = path.join(distDir, 'sw.js');

for (const filePath of [jsonPath, eventsPath, htmlPath, sitemapPath, manifestPath, serviceWorkerPath]) {
  assert.equal(fs.existsSync(filePath), true, `${path.relative(root, filePath)} must exist; run npm run build first`);
}

const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const publicEvents = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events || [];
assert.equal(report.intent, 'eventlive-source-coverage-gaps', 'coverage report must declare its intent');
assert.equal(report.canonical_domain, 'eventme.live', 'coverage report must keep eventme.live as canonical domain');
assert.ok(Number(report.totals?.events || 0) >= 200, 'coverage report must analyze the public event catalog');
assert.equal(report.totals.events, publicEvents.length, 'coverage report event total must match dist/events.json');
assert.equal(report.totals.active_events, publicEvents.filter((event) => event.status !== 'ended').length, 'coverage report active total must match dist/events.json');
assert.equal(report.totals.active_generated_covers, publicEvents.filter((event) => event.status !== 'ended' && event.generated_image).length, 'coverage report active generated cover total must match dist/events.json');
assert.equal(report.totals.active_source_images, publicEvents.filter((event) => event.status !== 'ended' && !event.generated_image && /\/assets\/event-images\//.test(event.image_url || '')).length, 'coverage report active source image total must match dist/events.json');
assert.ok(Array.isArray(report.cities) && report.cities.length >= 10, 'coverage report must include strategic city coverage');
assert.ok(Array.isArray(report.categories) && report.categories.length >= 10, 'coverage report must include strategic category coverage');
assert.ok(Array.isArray(report.media_gaps), 'coverage report must expose active media gaps');
assert.equal(report.totals.media_gaps, report.media_gaps.length, 'coverage report media gap total must match rows');
assert.ok(report.media_gaps.every((item) => item.id && item.title && item.reason && item.next_action && item.detail_url), 'media gap rows must be actionable');
assert.ok(Array.isArray(report.priority_queue) && report.priority_queue.length > 0, 'coverage report must include a priority queue');
assert.ok(report.priority_queue.every((item) => item.kind && item.label && item.next_action), 'priority queue rows must be actionable');
assert.ok(report.cities.some((row) => row.key === 'Riyadh'), 'coverage report must include Riyadh');
assert.ok(report.cities.some((row) => row.key === 'Madinah'), 'coverage report must include strategic gap cities even with no events');
assert.ok(report.categories.some((row) => row.key === 'technology training'), 'coverage report must include technology training');

const html = fs.readFileSync(htmlPath, 'utf8');
assert.match(html, /فجوات تغطية المصادر/, 'coverage page must render its title');
assert.match(html, /طابور الأولويات/, 'coverage page must render the priority queue');
assert.match(html, /فجوات الصور النشطة/, 'coverage page must render the active media gap queue');
assert.match(html, /أضعف المدن/, 'coverage page must render weak city table');
assert.match(html, /أضعف الفئات/, 'coverage page must render weak category table');
assert.match(html, /source-coverage-gaps\.json/, 'coverage page must link its JSON feed');

const sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.match(sitemap, /https:\/\/eventme\.live\/source-coverage-gaps\.html/, 'coverage page must be in sitemap');

const manifest = fs.readFileSync(manifestPath, 'utf8');
assert.match(manifest, /source-coverage-gaps\.html/, 'coverage page must be available from the PWA manifest');

const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
assert.match(serviceWorker, /"\.\/source-coverage-gaps\.html"/, 'coverage page must be precached');
assert.match(serviceWorker, /"\.\/source-coverage-gaps\.json"/, 'coverage JSON must be precached');

console.log('source-coverage-gaps-regression-test: ok');
