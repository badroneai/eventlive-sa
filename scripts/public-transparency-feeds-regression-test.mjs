import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

function readJson(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist; run npm run build first`);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function readText(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(fullPath, 'utf8');
}

const eventsFeed = readJson('events.json');
const publicEvents = eventsFeed.events || [];
const sources = readJson('sources.json');
const updates = readJson('updates.json');
const sourcesHtml = readText('sources.html');
const updatesHtml = readText('updates.html');
const serviceWorker = readText('sw.js');

assert.equal(sources.generated_at, eventsFeed.generated_at, 'sources.json must be regenerated with events.json');
assert.equal(updates.generated_at, eventsFeed.generated_at, 'updates.json must be regenerated with events.json');
assert.equal(sources.canonical_domain, 'eventme.live', 'sources.json must keep the production domain');
assert.equal(updates.canonical_domain, 'eventme.live', 'updates.json must keep the production domain');

assert.equal(sources.intent, 'eventlive-source-acquisition-pipeline', 'sources.json must declare its public source intent');
assert.equal(sources.totals.events, publicEvents.length, 'sources.json total must match events.json');
assert.equal(Array.isArray(sources.events), true, 'sources.json must include event source rows');
assert.equal(sources.events.length, publicEvents.length, 'sources rows must match events.json');
assert.equal(sources.events.every((event) => event.id && event.title && event.detail_url && event.source_need?.key), true, 'source rows must be actionable and classified');
assert.match(sourcesHtml, new RegExp(`<b>${publicEvents.length}</b>`), 'sources.html must render the current event total');
assert.match(sourcesHtml, /sources\.json/, 'sources.html must link sources.json');
assert.match(sourcesHtml, /application\/ld\+json/, 'sources.html must include structured data');

const expectedUpdates = publicEvents.reduce((total, event) => total + (Array.isArray(event.live_updates) ? event.live_updates.length : 0), 0);
const expectedEventsWithUpdates = publicEvents.filter((event) => Number(event.live_updates_count || 0) > 0 || (Array.isArray(event.live_updates) && event.live_updates.length > 0)).length;
assert.equal(updates.intent, 'eventlive-live-updates-center', 'updates.json must declare its public updates intent');
assert.equal(updates.totals.updates, expectedUpdates, 'updates total must match event live_updates arrays');
assert.equal(updates.totals.catalog_events_with_updates, expectedEventsWithUpdates, 'updates event total must match events with live updates');
assert.equal(Array.isArray(updates.updates), true, 'updates.json must include update rows');
assert.equal(updates.updates.length, expectedUpdates, 'updates rows must match totals');
assert.equal(updates.updates.every((update) => update.id && update.event_id && update.detail_url && update.priority?.rank), true, 'update rows must be actionable and prioritized');
assert.match(updatesHtml, new RegExp(`<b>${expectedUpdates}</b>`), 'updates.html must render the current update total');
assert.match(updatesHtml, /updates\.json/, 'updates.html must link updates.json');
assert.match(updatesHtml, /application\/ld\+json/, 'updates.html must include structured data');

for (const asset of ['./updates.html', './updates.json']) {
  assert.ok(serviceWorker.includes(JSON.stringify(asset)), `${asset} must be precached`);
}
for (const ownerOnlyAsset of ['./sources.html', './sources.json']) {
  assert.equal(serviceWorker.includes(JSON.stringify(ownerOnlyAsset)), false, `${ownerOnlyAsset} is owner-only and must not be precached`);
}

console.log(`public-transparency-feeds-regression-test: ok events=${publicEvents.length} updates=${expectedUpdates}`);
