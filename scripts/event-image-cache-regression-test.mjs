import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isRejectedImageAssetUrl, isSourcePageLikeImageUrl } from './image-asset-utils.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'event_image_cache_manifest.json');
const eventsPath = path.join(root, 'dist', 'events.json');
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const endedPath = path.join(root, 'data', 'source_ended_events.json');
const cacheScriptPath = path.join(root, 'scripts', 'cache-event-images.mjs');

assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
const cacheScript = fs.readFileSync(cacheScriptPath, 'utf8');
assert.match(cacheScript, /tlsRelaxationAllowedHosts[^\n]+najran\.gov\.sa/, 'official Najran images must have a narrowly scoped TLS recovery path');
assert.match(cacheScript, /new https\.Agent\(\{ rejectUnauthorized: false \}\)/, 'TLS recovery must use an explicit host-scoped agent');

if (!fs.existsSync(manifestPath)) {
  console.log('event-image-cache-regression-test: skipped (manifest not generated yet)');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const images = manifest.images && typeof manifest.images === 'object' ? manifest.images : {};
const records = Object.values(images).filter((record) => record.file && record.public_path);
const catalogEvents = fs.existsSync(catalogPath)
  ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || []
  : [];
const endedEvents = fs.existsSync(endedPath)
  ? JSON.parse(fs.readFileSync(endedPath, 'utf8')).ended_events || []
  : [];
const discoveredCatalogImageUrls = catalogEvents
  .filter((event) => event.image_discovered_at && /^https?:\/\//i.test(String(event.original_image_url || event.image_url || '')))
  .map((event) => event.original_image_url || event.image_url);

assert.ok(records.length > 0, 'image cache manifest must include at least one cached image');
assert.equal(
  discoveredCatalogImageUrls.every((url) => images[url] || manifest.failures?.[url]),
  true,
  'discovered catalog image URLs must be visible to the image cache manifest or failure ledger'
);

for (const record of records) {
  assert.equal(record.public_path.startsWith('/assets/event-images/'), true, `${record.source_url} must use the public event image path`);
  assert.equal(fs.existsSync(path.join(root, record.file)), true, `${record.file} must exist on disk`);
  assert.ok(Number(record.bytes || 0) > 200, `${record.file} must have a plausible image size`);
}

const rejectedManifestRecords = records.filter((record) => {
  const value = `${record.source_url || ''} ${record.public_path || ''} ${record.file || ''}`;
  return isRejectedImageAssetUrl(value) || isSourcePageLikeImageUrl(record.source_url || '');
});

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events || [];
const builtById = new Map(events.map((event) => [event.id, event]));
for (const rawEvent of [...catalogEvents, ...endedEvents]) {
  const rawUrl = String(rawEvent.original_image_url || rawEvent.image_url || '');
  if (!/^https?:\/\//i.test(rawUrl)) continue;
  let normalizedUrl = rawUrl;
  try {
    normalizedUrl = new URL(rawUrl).href;
  } catch {
    normalizedUrl = rawUrl;
  }
  if (normalizedUrl === rawUrl) continue;
  const cachedRecord = images[normalizedUrl];
  if (!cachedRecord?.public_path || !cachedRecord.file || !fs.existsSync(path.join(root, cachedRecord.file))) continue;
  assert.equal(builtById.get(rawEvent.id)?.image_url, cachedRecord.public_path, `${rawEvent.id} must resolve encoded Unicode image URLs from the cache manifest`);
}
const cachedEvents = events.filter((event) => String(event.image_url || '').startsWith('/assets/event-images/'));
const eventsWithImages = events.filter((event) => event.image_url);
const generatedCoverEvents = events.filter((event) => event.generated_image);
const htmlishOriginalImages = events.filter((event) => {
  const value = String(event.original_image_url || '');
  return isSourcePageLikeImageUrl(value);
});
const rejectedImageAssets = events.filter((event) => {
  return [event.original_image_url, event.image_url]
    .filter(Boolean)
    .some((value) => isRejectedImageAssetUrl(value));
});

assert.ok(cachedEvents.length > 0, 'built event feed must use cached local images after cache/build cycle');
assert.equal(cachedEvents.every((event) => event.original_image_url || event.image_source_url), true, 'cached image events must preserve original/source image URL');
assert.equal(eventsWithImages.length, events.length, 'every event must have either a source image or an EventLive generated cover');
assert.ok(generatedCoverEvents.length > 0, 'build must generate local covers for events without source images');
assert.deepEqual(rejectedManifestRecords.map((record) => ({ source_url: record.source_url, public_path: record.public_path, file: record.file })), [], 'image cache manifest must not retain logos, placeholders, unsupported assets, or source HTML pages');
assert.deepEqual(htmlishOriginalImages.map((event) => ({ id: event.id, original_image_url: event.original_image_url })), [], 'original_image_url must point to image assets, not source HTML pages');
assert.deepEqual(rejectedImageAssets.map((event) => ({ id: event.id, image_url: event.image_url, original_image_url: event.original_image_url })), [], 'event images must not use logos, placeholders, unsupported assets, or decorative source-site images');

for (const event of generatedCoverEvents.slice(0, 20)) {
  assert.equal(String(event.image_url || '').startsWith('/assets/event-covers/'), true, `${event.id} generated cover must use the event-covers path`);
  assert.equal(event.generated_image, true, `${event.id} must mark generated covers explicitly`);
  const coverPath = path.join(root, 'dist', event.image_url.replace(/^\//, ''));
  assert.equal(fs.existsSync(coverPath), true, `${event.image_url} must exist on disk`);
  const svg = fs.readFileSync(coverPath, 'utf8');
  assert.match(svg, /<svg /, `${event.image_url} must be an SVG cover`);
  assert.match(svg, /EventLive/, `${event.image_url} must identify EventLive as the generated-cover provider`);
}

console.log('event-image-cache-regression-test: ok');
