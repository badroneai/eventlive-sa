import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

const jsonPath = path.join(distDir, 'regions.json');
const eventsPath = path.join(distDir, 'events.json');
const htmlPath = path.join(distDir, 'regions.html');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const manifestPath = path.join(distDir, 'manifest.webmanifest');
const serviceWorkerPath = path.join(distDir, 'sw.js');

for (const filePath of [jsonPath, eventsPath, htmlPath, sitemapPath, manifestPath, serviceWorkerPath]) {
  assert.ok(fs.existsSync(filePath), `${path.relative(root, filePath)} must exist`);
}

const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const publicEvents = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events || [];
assert.equal(report.intent, 'eventlive-saudi-region-coverage', 'regions report must declare its intent');
assert.equal(report.canonical_domain, 'eventme.live', 'regions report must keep the real domain');
assert.equal(report.totals.regions, 13, 'regions report must cover all 13 Saudi regions');
assert.ok(report.totals.events >= 200, 'regions report must analyze the public catalog');
assert.equal(report.totals.events, publicEvents.length, 'regions report event total must match dist/events.json');
assert.ok(report.totals.weak_regions >= 1, 'regions report must expose weak regions for acquisition planning');
assert.ok(report.priority_queue.length >= 5, 'regions report must include an actionable priority queue');
assert.ok(report.regions.some((region) => region.key === 'riyadh-region' && region.total > 0), 'Riyadh region must be represented');
assert.ok(report.regions.some((region) => region.key === 'eastern-region' && region.total > 0), 'Eastern region must be represented');
assert.ok(report.regions.some((region) => region.key === 'jazan-region'), 'Jazan region must be tracked even when weak');
assert.ok(report.regions.every((region) => Array.isArray(region.target_cities) && region.target_cities.length >= 1), 'each region must have target cities');

const html = fs.readFileSync(htmlPath, 'utf8');
assert.match(html, /تغطية مناطق المملكة/, 'regions page must have the Arabic page title');
assert.match(html, /طابور المناطق/, 'regions page must show the priority queue');
assert.match(html, /regions\.json/, 'regions page must link the JSON feed');
assert.match(html, /application\/ld\+json/, 'regions page must include structured data');

const sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.match(sitemap, /https:\/\/eventme\.live\/regions\.html/, 'regions page must be in sitemap');

const manifest = fs.readFileSync(manifestPath, 'utf8');
assert.match(manifest, /regions\.html/, 'regions page must be available from the PWA manifest');

const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
assert.match(serviceWorker, /"\.\/regions\.html"/, 'regions page must be precached');
assert.match(serviceWorker, /"\.\/regions\.json"/, 'regions JSON must be precached');

console.log('regions-coverage-regression-test: ok');
