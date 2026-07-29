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
assert.ok(report.national_coverage && typeof report.national_coverage.score === 'number', 'national coverage score must exist');
assert.ok(['PASS', 'NEEDS_WORK'].includes(report.national_coverage.verdict), 'national coverage verdict must be explicit');
assert.equal(report.national_coverage.active_regions + report.national_coverage.zero_active_regions, 13, 'active and zero-active regions must reconcile');
assert.equal(report.national_coverage.target_cities, report.regions.reduce((sum, region) => sum + region.target_cities.length, 0), 'target-city total must reconcile');
assert.ok(report.national_coverage.riyadh_active_share >= 0 && report.national_coverage.riyadh_active_share <= 1, 'Riyadh share must be a ratio');
assert.ok(report.priority_queue.length >= 5, 'regions report must include an actionable priority queue');
assert.ok(report.regions.some((region) => region.key === 'riyadh-region' && region.total > 0), 'Riyadh region must be represented');
assert.ok(report.regions.some((region) => region.key === 'eastern-region' && region.total > 0), 'Eastern region must be represented');
assert.ok(report.regions.some((region) => region.key === 'jazan-region'), 'Jazan region must be tracked even when weak');
assert.ok(report.regions.every((region) => Array.isArray(region.target_cities) && region.target_cities.length >= 1), 'each region must have target cities');
assert.ok(report.regions.every((region) => region.active_target_city_count === region.active_cities.length), 'active target-city count must reconcile');
assert.ok(report.regions.every((region) => region.coverage_score >= 0 && region.coverage_score <= 100), 'region score must remain bounded');

const html = fs.readFileSync(htmlPath, 'utf8');
assert.match(html, /تغطية مناطق المملكة/, 'regions page must have the Arabic page title');
assert.match(html, /طابور المناطق/, 'regions page must show the priority queue');
assert.match(html, /regions\.json/, 'regions page must link the JSON feed');
assert.match(html, /application\/ld\+json/, 'regions page must include structured data');

// regions.html was flipped to owner-only by PM ruling on PR #30 (WO-4): it
// is a fetch-source coverage dashboard, and the owner's original complaint
// was exactly this class of page reaching visitors. Data-integrity
// assertions above are unchanged; only the public-surface assertions below
// flip. See scripts/owner-only-pages.mjs for the canonical list.
assert.match(html, /<meta name="robots" content="noindex/, 'regions page is owner-only and must be noindex');

const sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.doesNotMatch(sitemap, /https:\/\/eventme\.live\/regions\.html/, 'regions page is owner-only and must not be in sitemap');

const manifest = fs.readFileSync(manifestPath, 'utf8');
assert.doesNotMatch(manifest, /"\.\/regions\.html"/, 'regions page is owner-only and must not be a PWA manifest shortcut');

const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
assert.doesNotMatch(serviceWorker, /"\.\/regions\.html"/, 'regions page is owner-only and must not be precached');
assert.doesNotMatch(serviceWorker, /"\.\/regions\.json"/, 'regions JSON is owner-only and must not be precached');

console.log('regions-coverage-regression-test: ok');
