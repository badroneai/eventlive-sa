import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const eventsPath = path.join(distDir, 'events.json');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const manifestPath = path.join(distDir, 'manifest.webmanifest');
const serviceWorkerPath = path.join(distDir, 'sw.js');

for (const filePath of [eventsPath, sitemapPath, manifestPath, serviceWorkerPath]) {
  assert.equal(fs.existsSync(filePath), true, `${path.relative(root, filePath)} must exist; run npm run build first`);
}

const publicEvents = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events || [];
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');

for (const page of [
  { base: 'readiness', intent: 'eventlive-operational-readiness', title: /جاهزية التشغيل/, ownerOnly: false },
  { base: 'trust', intent: 'public-trust-and-source-evidence', title: /مركز الثقة/, ownerOnly: true }
]) {
  const jsonPath = path.join(distDir, `${page.base}.json`);
  const htmlPath = path.join(distDir, `${page.base}.html`);
  assert.equal(fs.existsSync(jsonPath), true, `${page.base}.json must exist`);
  assert.equal(fs.existsSync(htmlPath), true, `${page.base}.html must exist`);

  const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.equal(report.intent, page.intent, `${page.base}.json must declare its intent`);
  assert.equal(report.canonical_domain, 'eventme.live', `${page.base}.json must keep eventme.live`);
  assert.equal(report.totals.events, publicEvents.length, `${page.base}.json event total must match dist/events.json`);
  assert.equal(report.totals.attendance_windows, publicEvents.filter((event) => event.attendance_window_ready).length, `${page.base}.json attendance window total must match dist/events.json`);
  assert.equal(report.totals.basic_windows, publicEvents.filter((event) => event.schedule_quality === 'basic-window').length, `${page.base}.json basic window total must match dist/events.json`);
  assert.equal(Array.isArray(report.events), true, `${page.base}.json must include event rows`);
  assert.equal(report.events.length, publicEvents.length, `${page.base}.json event rows must match dist/events.json`);
  assert.equal(report.events.every((event) => event.id && event.title && event.detail_url), true, `${page.base}.json rows must be actionable`);
  assert.equal(report.events.every((event) => /^(detailed|basic-window|missing)$/.test(event.schedule_quality || '')), true, `${page.base}.json rows must expose schedule_quality`);
  if (page.base === 'readiness') {
    assert.equal(report.totals.basic_window_stage, report.stages?.['basic-window'] || 0, 'readiness.json must keep the basic-window stage total consistent');
    assert.equal(report.totals.basic_window_stage, report.events.filter((event) => event.stage?.key === 'basic-window').length, 'readiness.json basic-window stage must match event rows');
  }
  assert.match(html, page.title, `${page.base}.html must render its Arabic title`);
  assert.match(html, new RegExp(`${page.base}\\.json`), `${page.base}.html must link its JSON feed`);
  assert.match(html, /application\/ld\+json/, `${page.base}.html must include structured data`);
  if (page.ownerOnly) {
    assert.doesNotMatch(sitemap, new RegExp(`https://eventme\\.live/${page.base}\\.html`), `${page.base}.html is owner-only and must not be in sitemap`);
    assert.doesNotMatch(manifest, new RegExp(`${page.base}\\.html`), `${page.base}.html is owner-only and must not be in the PWA manifest`);
    assert.doesNotMatch(serviceWorker, new RegExp(`"\\./${page.base}\\.html"`), `${page.base}.html is owner-only and must not be precached`);
    assert.doesNotMatch(serviceWorker, new RegExp(`"\\./${page.base}\\.json"`), `${page.base}.json is owner-only and must not be precached`);
  } else {
    assert.match(sitemap, new RegExp(`https://eventme\\.live/${page.base}\\.html`), `${page.base}.html must be in sitemap`);
    assert.match(manifest, new RegExp(`${page.base}\\.html`), `${page.base}.html must be available from the PWA manifest`);
    assert.match(serviceWorker, new RegExp(`"\\./${page.base}\\.html"`), `${page.base}.html must be precached`);
    assert.match(serviceWorker, new RegExp(`"\\./${page.base}\\.json"`), `${page.base}.json must be precached`);
  }
}

console.log('readiness-trust-regression-test: ok');
