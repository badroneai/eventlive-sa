import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeArabicSearch } from './arabic-normalize.mjs';
import { normalizeSaudiCity } from './city-utils.mjs';
import {
  canonicalDedupeTitle,
  findPublicNearDuplicatePairs
} from './event-dedupe-utils.mjs';

const eventsPath = path.join(process.cwd(), 'dist', 'events.json');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events || [];
const keys = new Map();
for (const event of events) {
  const key = [
    normalizeArabicSearch(event.title),
    normalizeSaudiCity(event.city, event.city),
    event.starts_at,
    event.ends_at,
    normalizeArabicSearch(event.source_label || event.organizer)
  ].join('|');
  keys.set(key, (keys.get(key) || 0) + 1);
}
const duplicates = [...keys.entries()].filter(([, count]) => count > 1);
assert.deepEqual(duplicates, [], `public event feed contains ${duplicates.length} exact duplicate groups`);

const catalogPath = path.join(process.cwd(), 'data', 'events_catalog.json');
const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const publicCatalogEvents = catalogEvents.filter((event) => event.approval_status === 'published');
const saudiIndustrialTitleKey = canonicalDedupeTitle('Saudi Industrial Series');
const saudiIndustrialEvents = catalogEvents.filter((event) => canonicalDedupeTitle(event.title) === saudiIndustrialTitleKey);
assert.equal(
  saudiIndustrialEvents.length,
  1,
  `full catalog must contain one Saudi Industrial Series record, found ${saudiIndustrialEvents.length}`
);
assert.equal(saudiIndustrialEvents[0].approval_status, 'published', 'the sole Saudi Industrial Series record must be public');

const nearDuplicates = findPublicNearDuplicatePairs(publicCatalogEvents);
assert.equal(
  nearDuplicates.length,
  0,
  `published catalog contains normalized title + venue duplicates within the ±3-day window: ${JSON.stringify(nearDuplicates.map((pair) => [pair.first_event_id, pair.second_event_id]))}`
);

const endedPath = path.join(process.cwd(), 'data', 'source_ended_events.json');
const endedEvents = JSON.parse(fs.readFileSync(endedPath, 'utf8')).ended_events || [];
const isChamberDetail = (event) => /mcci\.org\.sa\/Event\/eventDetails\?[^#]*\bcircular=/i.test(String(event.source_url || event.evidence_url || ''));
const semanticKey = (event) => [
  normalizeArabicSearch(event.title),
  normalizeSaudiCity(event.city, event.city),
  event.starts_at,
  event.ends_at,
  normalizeArabicSearch(event.source_label || event.organizer)
].join('|');
const collectedChamberKeys = [...new Set(endedEvents.filter(isChamberDetail).map(semanticKey))].sort();
const publicChamberKeys = new Set(events.filter(isChamberDetail).map(semanticKey));
// SUBSET, not equality. `source_ended_events.json` records only circulars that have
// ENDED, while the public feed carries live and upcoming ones too — so the two sets
// coincide exactly only while every Madinah circular happens to be in the past. On
// 2026-08-31 the chamber published a workshop dated 2026-09-01 and this equality
// went red for four consecutive runs (33323362370 → 33400355073), freezing the
// publish, over a future-dated event that was not a defect at all. What the WO
// actually bought is the direction below: a distinct circular the collector
// recorded must never be silently swallowed by the dedupe pass (or, per AGENTS.md
// law 10, quietly lose its published page). The other half of the intent — exact
// duplicates STAY deduplicated — is the duplicate-group assertion at the top of
// this file, which already covers the whole public feed.
const missingChamberKeys = collectedChamberKeys.filter((key) => !publicChamberKeys.has(key));
assert.deepEqual(
  missingChamberKeys,
  [],
  'Madinah Chamber detail pages must remain distinct while exact duplicate circulars stay deduplicated — ' +
    'these collected circulars have no public page left'
);
const notYetEnded = [...publicChamberKeys].filter((key) => !collectedChamberKeys.includes(key)).length;

console.log(`PUBLIC_DEDUPE_TEST_OK events=${events.length} catalog_published=${publicCatalogEvents.length} duplicate_groups=0 near_duplicate_pairs=0 saudi_industrial_records=1 chamber_collected=${collectedChamberKeys.length} chamber_public=${publicChamberKeys.size} chamber_not_yet_ended=${notYetEnded}`);
